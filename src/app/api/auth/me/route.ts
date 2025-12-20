import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupère les détails complets selon le rôle
    let details = null

    if (user.role === 'TALENT' && user.talentId) {
      details = await prisma.talent.findUnique({
        where: { id: user.talentId },
        select: {
          uid: true,
          prenom: true,
          nom: true,
          photoUrl: true,
          titrePoste: true,
          competences: true,
          statut: true,
        },
      })
    } else if (user.role === 'CLIENT' && user.clientId) {
      details = await prisma.client.findUnique({
        where: { id: user.clientId },
        select: {
          uid: true,
          codeUnique: true,
          raisonSociale: true,
          siret: true,
          siren: true,
          formeJuridique: true,
          secteurActivite: true,
          tailleEntreprise: true,
          adresse: true,
          codePostal: true,
          ville: true,
          pays: true,
          siteWeb: true,
          logoUrl: true,
          description: true,
          statut: true,
          typeClient: true,
          valideParAdmin: true,
          contacts: {
            select: {
              id: true,
              prenom: true,
              nom: true,
              email: true,
              telephone: true,
              poste: true,
              estContactPrincipal: true,
            },
          },
        },
      })
    }

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        details,
      },
    })
  } catch (error) {
    console.error('Erreur /api/auth/me:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
