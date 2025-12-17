/**
 * API Talent - Mes Matchs
 * Récupère toutes les offres où le talent a un match
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des matchs du talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const minScore = parseInt(searchParams.get('minScore') || '0')

    // Récupérer tous les matchs du talent avec les offres publiées
    const matchs = await prisma.match.findMany({
      where: {
        talentId: user.talentId!,
        score: { gte: minScore },
        offre: {
          statut: { in: ['PUBLIEE', 'SHORTLIST_ENVOYEE', 'ENTRETIENS_EN_COURS'] },
        },
      },
      include: {
        offre: {
          select: {
            uid: true,
            codeUnique: true,
            slug: true,
            titre: true,
            description: true,
            competencesRequises: true,
            tjmMin: true,
            tjmMax: true,
            tjmAffiche: true,
            ville: true,
            mobilite: true,
            dureeNombre: true,
            dureeUnite: true,
            dateDebut: true,
            statut: true,
            publieLe: true,
            client: {
              select: {
                raisonSociale: true,
                logoUrl: true,
                secteurActivite: true,
              },
            },
          },
        },
      },
      orderBy: { score: 'desc' },
    })

    // Vérifier si le talent a déjà candidaté sur ces offres
    const offreIds = matchs.map(m => m.offre.uid)
    const candidatures = await prisma.candidature.findMany({
      where: {
        talentId: user.talentId!,
        offre: { uid: { in: offreIds } },
      },
      select: {
        offre: { select: { uid: true } },
        statut: true,
      },
    })

    const candidaturesMap = new Map(
      candidatures.map(c => [c.offre.uid, c.statut])
    )

    // Enrichir les matchs avec le statut de candidature
    const enrichedMatchs = matchs.map(match => ({
      id: match.id,
      score: match.score,
      scoreDetails: match.scoreDetails,
      competencesMatchees: match.competencesMatchees,
      competencesManquantes: match.competencesManquantes,
      vuParTalent: match.vuParTalent,
      createdAt: match.createdAt,
      offre: match.offre,
      candidatureStatut: candidaturesMap.get(match.offre.uid) || null,
      aPostule: candidaturesMap.has(match.offre.uid),
    }))

    // Stats
    const stats = {
      totalMatchs: matchs.length,
      matchsNonVus: matchs.filter(m => !m.vuParTalent).length,
      matchsExcellents: matchs.filter(m => m.score >= 80).length,
      matchsBons: matchs.filter(m => m.score >= 60 && m.score < 80).length,
      dejaPostule: candidatures.length,
    }

    return NextResponse.json({ matchs: enrichedMatchs, stats })
  } catch (error) {
    console.error('Erreur GET /api/talent/matchs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Marquer un match comme vu
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { matchId, action } = body

    if (action === 'markAsViewed' && matchId) {
      await prisma.match.updateMany({
        where: {
          id: matchId,
          talentId: user.talentId!,
        },
        data: {
          vuParTalent: true,
          vuLe: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    if (action === 'markAllAsViewed') {
      await prisma.match.updateMany({
        where: {
          talentId: user.talentId!,
          vuParTalent: false,
        },
        data: {
          vuParTalent: true,
          vuLe: new Date(),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur PATCH /api/talent/matchs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
