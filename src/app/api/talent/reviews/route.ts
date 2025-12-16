/**
 * API Talent - Consultation des reviews reçues
 * Permet aux talents de voir les évaluations reçues des clients
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des reviews reçues par le talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const reviews = await prisma.review.findMany({
      where: {
        talentId: user.talentId!,
        statut: 'PUBLIEE', // Seulement les reviews publiées
        public: true,
      },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculer les stats
    const allReviews = await prisma.review.findMany({
      where: {
        talentId: user.talentId!,
        statut: 'PUBLIEE',
      },
    })

    const stats = {
      total: allReviews.length,
      moyenneGlobale: allReviews.length > 0
        ? Math.round(allReviews.reduce((sum, r) => sum + r.noteGlobale, 0) / allReviews.length * 10) / 10
        : 0,
      moyenneCompetences: getAverageNote(allReviews, 'noteCompetences'),
      moyenneCommunication: getAverageNote(allReviews, 'noteCommunication'),
      moyennePonctualite: getAverageNote(allReviews, 'notePonctualite'),
      moyenneQualite: getAverageNote(allReviews, 'noteQualite'),
      recommandations: allReviews.filter((r) => r.recommande).length,
      distribution: {
        5: allReviews.filter((r) => r.noteGlobale === 5).length,
        4: allReviews.filter((r) => r.noteGlobale === 4).length,
        3: allReviews.filter((r) => r.noteGlobale === 3).length,
        2: allReviews.filter((r) => r.noteGlobale === 2).length,
        1: allReviews.filter((r) => r.noteGlobale === 1).length,
      },
    }

    return NextResponse.json({ reviews, stats })
  } catch (error) {
    console.error('Erreur GET /api/talent/reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

function getAverageNote(reviews: { [key: string]: number | null | boolean | string | Date }[], field: string): number {
  const withNote = reviews.filter((r) => r[field] !== null && r[field] !== undefined)
  if (withNote.length === 0) return 0
  return Math.round(withNote.reduce((sum, r) => sum + (r[field] as number), 0) / withNote.length * 10) / 10
}
