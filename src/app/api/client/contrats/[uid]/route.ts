/**
 * API Client - Gestion d'un contrat spécifique
 * Consultation et signature
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { signerParClient, signerAvenantParClient } from '@/lib/contrats'

// GET - Détail d'un contrat
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const contrat = await prisma.contrat.findFirst({
      where: {
        uid,
        clientId: user.clientId!,
        statut: { not: 'BROUILLON' },
      },
      include: {
        talent: {
          select: {
            uid: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            photoUrl: true,
          },
        },
        avenants: {
          where: { statut: { not: 'BROUILLON' } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!contrat) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ contrat })
  } catch (error) {
    console.error('Erreur GET /api/client/contrats/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Signer un contrat
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()

    const contrat = await prisma.contrat.findFirst({
      where: {
        uid,
        clientId: user.clientId!,
      },
    })

    if (!contrat) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    if (body.action === 'signer') {
      // Vérifier que le contrat est en attente de signature
      if (
        contrat.statut !== 'EN_ATTENTE_SIGNATURE' &&
        contrat.statut !== 'SIGNE_TALENT'
      ) {
        return NextResponse.json(
          { error: 'Ce contrat ne peut pas être signé' },
          { status: 400 }
        )
      }

      // Vérifier que le client n'a pas déjà signé
      if (contrat.signeParClient) {
        return NextResponse.json(
          { error: 'Vous avez déjà signé ce contrat' },
          { status: 400 }
        )
      }

      const result = await signerParClient(contrat.id)

      return NextResponse.json({
        success: true,
        message: 'Contrat signé avec succès',
        contrat: result,
      })
    }

    if (body.action === 'signerAvenant') {
      if (!body.avenantUid) {
        return NextResponse.json(
          { error: 'UID de l\'avenant requis' },
          { status: 400 }
        )
      }

      const avenant = await prisma.avenant.findFirst({
        where: {
          uid: body.avenantUid,
          contratId: contrat.id,
        },
      })

      if (!avenant) {
        return NextResponse.json(
          { error: 'Avenant non trouvé' },
          { status: 404 }
        )
      }

      if (avenant.signeParClient) {
        return NextResponse.json(
          { error: 'Vous avez déjà signé cet avenant' },
          { status: 400 }
        )
      }

      const result = await signerAvenantParClient(avenant.id)

      return NextResponse.json({
        success: true,
        message: 'Avenant signé avec succès',
        avenant: result,
      })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur PATCH /api/client/contrats/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
