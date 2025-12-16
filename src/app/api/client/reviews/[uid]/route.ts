/**
 * API Client - Gestion d'une review spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Détails d'une review
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

    const review = await prisma.review.findUnique({
      where: { uid },
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
      },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review non trouvée' }, { status: 404 })
    }

    if (review.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Erreur GET /api/client/reviews/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Modifier une review (seulement si EN_ATTENTE)
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

    const review = await prisma.review.findUnique({
      where: { uid },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review non trouvée' }, { status: 404 })
    }

    if (review.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Ne peut modifier que les reviews en attente
    if (review.statut !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Impossible de modifier une review déjà publiée' },
        { status: 400 }
      )
    }

    const {
      noteGlobale,
      noteCompetences,
      noteCommunication,
      notePonctualite,
      noteQualite,
      titre,
      commentaire,
      recommande,
    } = body

    const updatedReview = await prisma.review.update({
      where: { uid },
      data: {
        ...(noteGlobale !== undefined && { noteGlobale }),
        ...(noteCompetences !== undefined && { noteCompetences }),
        ...(noteCommunication !== undefined && { noteCommunication }),
        ...(notePonctualite !== undefined && { notePonctualite }),
        ...(noteQualite !== undefined && { noteQualite }),
        ...(titre !== undefined && { titre }),
        ...(commentaire !== undefined && { commentaire }),
        ...(recommande !== undefined && { recommande }),
      },
    })

    return NextResponse.json({ review: updatedReview, message: 'Review mise à jour' })
  } catch (error) {
    console.error('Erreur PATCH /api/client/reviews/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une review (seulement si EN_ATTENTE)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const review = await prisma.review.findUnique({
      where: { uid },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review non trouvée' }, { status: 404 })
    }

    if (review.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Ne peut supprimer que les reviews en attente
    if (review.statut !== 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Impossible de supprimer une review déjà publiée' },
        { status: 400 }
      )
    }

    await prisma.review.delete({ where: { uid } })

    return NextResponse.json({ success: true, message: 'Review supprimée' })
  } catch (error) {
    console.error('Erreur DELETE /api/client/reviews/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
