import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Récupérer le profil client
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.clientId) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      include: {
        contacts: {
          orderBy: { estContactPrincipal: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ profile: client })
  } catch (error) {
    console.error('Erreur GET /api/client/profile:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Mettre à jour le profil client
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.clientId) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const body = await request.json()

    // Mise à jour du profil (certains champs ne sont pas modifiables)
    const updatedClient = await prisma.client.update({
      where: { id: user.clientId },
      data: {
        raisonSociale: body.raisonSociale,
        formeJuridique: body.formeJuridique || null,
        secteurActivite: body.secteurActivite || null,
        tailleEntreprise: body.tailleEntreprise || null,
        adresse: body.adresse || null,
        codePostal: body.codePostal || null,
        ville: body.ville || null,
        siteWeb: body.siteWeb || null,
        description: body.description || null,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_CLIENT_PROFILE',
        entite: 'Client',
        entiteId: updatedClient.id,
      },
    })

    return NextResponse.json({
      success: true,
      profile: updatedClient,
    })
  } catch (error) {
    console.error('Erreur PUT /api/client/profile:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
