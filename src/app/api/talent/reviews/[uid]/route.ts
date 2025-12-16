/**
 * API Talent - Gestion d'une review spécifique
 * Permet au talent de répondre à une review
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

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const review = await prisma.review.findUnique({
      where: { uid },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            logoUrl: true,
          },
        },
      },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review non trouvée' }, { status: 404 })
    }

    if (review.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ review })
  } catch (error) {
    console.error('Erreur GET /api/talent/reviews/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Répondre à une review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()
    const { reponse } = body

    if (!reponse || reponse.trim().length === 0) {
      return NextResponse.json({ error: 'La réponse est requise' }, { status: 400 })
    }

    const review = await prisma.review.findUnique({
      where: { uid },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review non trouvée' }, { status: 404 })
    }

    if (review.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Ne peut répondre qu'aux reviews publiées
    if (review.statut !== 'PUBLIEE') {
      return NextResponse.json(
        { error: 'Impossible de répondre à cette review' },
        { status: 400 }
      )
    }

    // Vérifier si déjà répondu
    if (review.reponse) {
      return NextResponse.json(
        { error: 'Vous avez déjà répondu à cette review' },
        { status: 400 }
      )
    }

    const updatedReview = await prisma.review.update({
      where: { uid },
      data: {
        reponse: reponse.trim(),
        reponduLe: new Date(),
      },
    })

    return NextResponse.json({
      review: updatedReview,
      message: 'Réponse enregistrée avec succès',
    })
  } catch (error) {
    console.error('Erreur PATCH /api/talent/reviews/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
