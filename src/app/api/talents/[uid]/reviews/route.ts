/**
 * API publique - Reviews d'un talent
 * Permet de consulter les reviews publiques d'un talent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Liste des reviews publiques d'un talent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
      select: { id: true, prenom: true, nom: true },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    const reviews = await prisma.review.findMany({
      where: {
        talentId: talent.id,
        statut: 'PUBLIEE',
        public: true,
      },
      include: {
        client: {
          select: {
            raisonSociale: true,
            logoUrl: true,
            secteurActivite: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Stats publiques
    const stats = {
      total: reviews.length,
      moyenneGlobale: reviews.length > 0
        ? Math.round(reviews.reduce((sum, r) => sum + r.noteGlobale, 0) / reviews.length * 10) / 10
        : 0,
      recommandations: reviews.filter((r) => r.recommande).length,
      pourcentageRecommande: reviews.length > 0
        ? Math.round((reviews.filter((r) => r.recommande).length / reviews.length) * 100)
        : 0,
      distribution: {
        5: reviews.filter((r) => r.noteGlobale === 5).length,
        4: reviews.filter((r) => r.noteGlobale === 4).length,
        3: reviews.filter((r) => r.noteGlobale === 3).length,
        2: reviews.filter((r) => r.noteGlobale === 2).length,
        1: reviews.filter((r) => r.noteGlobale === 1).length,
      },
    }

    // Formatter les reviews pour affichage public
    const publicReviews = reviews.map((r) => ({
      id: r.id,
      uid: r.uid,
      noteGlobale: r.noteGlobale,
      noteCompetences: r.noteCompetences,
      noteCommunication: r.noteCommunication,
      notePonctualite: r.notePonctualite,
      noteQualite: r.noteQualite,
      titre: r.titre,
      commentaire: r.commentaire,
      recommande: r.recommande,
      reponse: r.reponse,
      reponduLe: r.reponduLe,
      createdAt: r.createdAt,
      client: {
        nom: r.client.raisonSociale,
        logo: r.client.logoUrl,
        secteur: r.client.secteurActivite,
      },
    }))

    return NextResponse.json({
      talent: { prenom: talent.prenom, nom: talent.nom },
      reviews: publicReviews,
      stats,
    })
  } catch (error) {
    console.error('Erreur GET /api/talents/[uid]/reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
