/**
 * API Talent - Statistiques Dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    if (!user.talentId) {
      return NextResponse.json(
        { error: 'Profil talent non trouvé' },
        { status: 404 }
      )
    }

    // Récupère les stats
    const [
      totalCandidatures,
      candidaturesEnCours,
      candidaturesAcceptees,
      matchsRecents,
      candidaturesRecentes,
      offresRecommandees,
    ] = await Promise.all([
      // Total candidatures
      prisma.candidature.count({
        where: { talentId: user.talentId },
      }),

      // Candidatures en cours (pas refusées ni retirées)
      prisma.candidature.count({
        where: {
          talentId: user.talentId,
          statut: { in: ['NOUVELLE', 'VUE', 'EN_REVUE', 'SHORTLIST', 'PROPOSEE_CLIENT', 'ENTRETIEN'] },
        },
      }),

      // Candidatures acceptées/retenues
      prisma.candidature.count({
        where: {
          talentId: user.talentId,
          statut: 'ACCEPTEE',
        },
      }),

      // Matchs récents (score >= 70)
      prisma.match.count({
        where: {
          talentId: user.talentId,
          score: { gte: 70 },
        },
      }),

      // 5 dernières candidatures
      prisma.candidature.findMany({
        where: { talentId: user.talentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
              lieu: true,
              tjmMin: true,
              tjmMax: true,
              client: {
                select: {
                  raisonSociale: true,
                },
              },
            },
          },
        },
      }),

      // Offres recommandées (matchs récents avec score >= 60)
      prisma.match.findMany({
        where: {
          talentId: user.talentId,
          score: { gte: 60 },
          offre: { statut: 'PUBLIEE' },
        },
        orderBy: { score: 'desc' },
        take: 5,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
              lieu: true,
              tjmMin: true,
              tjmMax: true,
              mobilite: true,
              dureeNombre: true,
              dureeUnite: true,
              publieLe: true,
              client: {
                select: {
                  raisonSociale: true,
                  logoUrl: true,
                },
              },
            },
          },
        },
      }),
    ])

    // Vérifie si le talent a déjà candidaté aux offres recommandées
    const offresIds = offresRecommandees.map(m => m.offre.uid)
    const candidaturesExistantes = await prisma.candidature.findMany({
      where: {
        talentId: user.talentId,
        offre: { uid: { in: offresIds } },
      },
      select: { offre: { select: { uid: true } } },
    })
    const offresDejaPostulees = new Set(candidaturesExistantes.map(c => c.offre.uid))

    return NextResponse.json({
      stats: {
        totalCandidatures,
        candidaturesEnCours,
        candidaturesAcceptees,
        matchsRecents,
      },
      candidaturesRecentes: candidaturesRecentes.map(c => ({
        uid: c.uid,
        statut: c.statut,
        scoreMatch: c.scoreMatch,
        createdAt: c.createdAt,
        offre: {
          uid: c.offre.uid,
          slug: c.offre.slug,
          titre: c.offre.titre,
          lieu: c.offre.lieu,
          tjmMin: c.offre.tjmMin,
          tjmMax: c.offre.tjmMax,
          client: c.offre.client?.raisonSociale || 'Client anonyme',
        },
      })),
      offresRecommandees: offresRecommandees.map(m => ({
        score: m.score,
        dejaPostule: offresDejaPostulees.has(m.offre.uid),
        offre: {
          uid: m.offre.uid,
          slug: m.offre.slug,
          titre: m.offre.titre,
          lieu: m.offre.lieu,
          tjmMin: m.offre.tjmMin,
          tjmMax: m.offre.tjmMax,
          mobilite: m.offre.mobilite,
          dureeNombre: m.offre.dureeNombre,
          dureeUnite: m.offre.dureeUnite,
          publieLe: m.offre.publieLe,
          client: {
            nom: m.offre.client?.raisonSociale || 'Client anonyme',
            logo: m.offre.client?.logoUrl,
          },
        },
      })),
    })
  } catch (error) {
    console.error('Erreur GET /api/talent/stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
