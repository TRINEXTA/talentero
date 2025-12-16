/**
 * API Admin - Analytics et Statistiques avancées
 * Fournit les données pour le dashboard analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { subDays, startOfDay, endOfDay, format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'

// GET /api/admin/analytics
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // 7, 30, 90, 365 jours
    const days = parseInt(period)

    const startDate = subDays(new Date(), days)
    const previousStartDate = subDays(startDate, days)

    // ==========================================
    // KPIs PRINCIPAUX
    // ==========================================

    const [
      totalTalents,
      talentsActifs,
      totalClients,
      clientsActifs,
      totalOffres,
      offresPubliees,
      totalCandidatures,
      candidaturesRecentes,
      totalMatchs,
      // Période précédente pour comparaison
      talentsPeriodePrecedente,
      candidaturesPeriodePrecedente,
      matchsPeriodePrecedente,
    ] = await Promise.all([
      prisma.talent.count(),
      prisma.talent.count({ where: { statut: 'ACTIF', user: { emailVerified: true } } }),
      prisma.client.count(),
      prisma.client.count({ where: { statut: 'ACTIF' } }),
      prisma.offre.count(),
      prisma.offre.count({ where: { statut: 'PUBLIEE' } }),
      prisma.candidature.count(),
      prisma.candidature.count({ where: { createdAt: { gte: startDate } } }),
      prisma.match.count(),
      // Comparaison
      prisma.talent.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      prisma.candidature.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
      prisma.match.count({ where: { createdAt: { gte: previousStartDate, lt: startDate } } }),
    ])

    const talentsNouveaux = await prisma.talent.count({ where: { createdAt: { gte: startDate } } })

    // Calcul des variations
    const calcVariation = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return Math.round(((current - previous) / previous) * 100)
    }

    // ==========================================
    // TENDANCES PAR JOUR
    // ==========================================

    const dailyStats = await getDailyStats(days)

    // ==========================================
    // RÉPARTITION PAR CATÉGORIE
    // ==========================================

    const categoriesData = await prisma.talent.groupBy({
      by: ['categorieProfessionnelle'],
      _count: { id: true },
      where: {
        categorieProfessionnelle: { not: null },
        statut: 'ACTIF',
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const categories = categoriesData.map((c) => ({
      name: formatCategory(c.categorieProfessionnelle || ''),
      value: c._count.id,
    }))

    // ==========================================
    // TOP COMPÉTENCES DEMANDÉES
    // ==========================================

    const offresRecentes = await prisma.offre.findMany({
      where: { createdAt: { gte: startDate } },
      select: { competencesRequises: true },
    })

    const skillsCount: Record<string, number> = {}
    offresRecentes.forEach((offre) => {
      offre.competencesRequises.forEach((skill) => {
        const normalized = skill.toLowerCase().trim()
        skillsCount[normalized] = (skillsCount[normalized] || 0) + 1
      })
    })

    const topSkills = Object.entries(skillsCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([skill, count]) => ({ skill: capitalizeFirst(skill), count }))

    // ==========================================
    // FUNNEL DE CONVERSION
    // ==========================================

    const [
      offresAvecCandidatures,
      candidaturesShortlist,
      candidaturesEntretien,
      candidaturesAcceptees,
    ] = await Promise.all([
      prisma.offre.count({ where: { nbCandidatures: { gt: 0 }, createdAt: { gte: startDate } } }),
      prisma.candidature.count({ where: { statut: 'SHORTLIST', createdAt: { gte: startDate } } }),
      prisma.candidature.count({
        where: {
          statut: { in: ['ENTRETIEN_DEMANDE', 'ENTRETIEN_PLANIFIE', 'ENTRETIEN_REALISE'] },
          createdAt: { gte: startDate },
        },
      }),
      prisma.candidature.count({ where: { statut: 'ACCEPTEE', createdAt: { gte: startDate } } }),
    ])

    const funnel = [
      { stage: 'Candidatures', count: candidaturesRecentes },
      { stage: 'Shortlist', count: candidaturesShortlist },
      { stage: 'Entretiens', count: candidaturesEntretien },
      { stage: 'Acceptées', count: candidaturesAcceptees },
    ]

    // ==========================================
    // RÉPARTITION GÉOGRAPHIQUE
    // ==========================================

    const geoData = await prisma.talent.groupBy({
      by: ['ville'],
      _count: { id: true },
      where: {
        ville: { not: null },
        statut: 'ACTIF',
      },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const geographic = geoData.map((g) => ({
      ville: g.ville || 'Non précisé',
      count: g._count.id,
    }))

    // ==========================================
    // STATUTS DES OFFRES
    // ==========================================

    const offresStatuts = await prisma.offre.groupBy({
      by: ['statut'],
      _count: { id: true },
    })

    const offresParStatut = offresStatuts.map((o) => ({
      statut: formatOffreStatus(o.statut),
      count: o._count.id,
    }))

    // ==========================================
    // TJM MOYEN
    // ==========================================

    const tjmStats = await prisma.talent.aggregate({
      _avg: { tjm: true },
      _min: { tjm: true },
      _max: { tjm: true },
      where: { tjm: { not: null }, statut: 'ACTIF' },
    })

    // ==========================================
    // SCORE MOYEN DE MATCHING
    // ==========================================

    const matchingStats = await prisma.match.aggregate({
      _avg: { score: true },
      _min: { score: true },
      _max: { score: true },
      where: { createdAt: { gte: startDate } },
    })

    // ==========================================
    // ACTIVITÉ RÉCENTE
    // ==========================================

    const [
      dernieresCandidatures,
      derniersMatchs,
    ] = await Promise.all([
      prisma.candidature.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          uid: true,
          statut: true,
          scoreMatch: true,
          createdAt: true,
          talent: { select: { prenom: true, nom: true } },
          offre: { select: { titre: true, uid: true } },
        },
      }),
      prisma.match.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          score: true,
          createdAt: true,
          talent: { select: { prenom: true, nom: true } },
          offre: { select: { titre: true } },
        },
      }),
    ])

    return NextResponse.json({
      period: days,
      kpis: {
        talents: {
          total: totalTalents,
          actifs: talentsActifs,
          nouveaux: talentsNouveaux,
          variation: calcVariation(talentsNouveaux, talentsPeriodePrecedente),
        },
        clients: {
          total: totalClients,
          actifs: clientsActifs,
        },
        offres: {
          total: totalOffres,
          publiees: offresPubliees,
          avecCandidatures: offresAvecCandidatures,
        },
        candidatures: {
          total: totalCandidatures,
          recentes: candidaturesRecentes,
          variation: calcVariation(candidaturesRecentes, candidaturesPeriodePrecedente),
        },
        matchs: {
          total: totalMatchs,
          scoresMoyen: Math.round(matchingStats._avg?.score || 0),
          scoresMin: matchingStats._min?.score || 0,
          scoresMax: matchingStats._max?.score || 0,
        },
        tjm: {
          moyen: Math.round(tjmStats._avg?.tjm || 0),
          min: tjmStats._min?.tjm || 0,
          max: tjmStats._max?.tjm || 0,
        },
      },
      trends: dailyStats,
      categories,
      topSkills,
      funnel,
      geographic,
      offresParStatut,
      activiteRecente: {
        candidatures: dernieresCandidatures,
        matchs: derniersMatchs,
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/analytics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// ==========================================
// HELPERS
// ==========================================

async function getDailyStats(days: number) {
  const results = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const [talents, candidatures, matchs, offres] = await Promise.all([
      prisma.talent.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.candidature.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.match.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.offre.count({ where: { createdAt: { gte: dayStart, lte: dayEnd } } }),
    ])

    results.push({
      date: format(date, 'dd MMM', { locale: fr }),
      dateISO: format(date, 'yyyy-MM-dd'),
      talents,
      candidatures,
      matchs,
      offres,
    })
  }

  return results
}

function formatCategory(cat: string): string {
  const mapping: Record<string, string> = {
    DEVELOPPEUR: 'Développeur',
    CHEF_DE_PROJET: 'Chef de Projet',
    SUPPORT_TECHNICIEN: 'Support/Technicien',
    TECHNICIEN_HELPDESK_N1: 'Helpdesk N1',
    TECHNICIEN_HELPDESK_N2: 'Helpdesk N2',
    INGENIEUR_SYSTEME_RESEAU: 'Ingénieur Sys/Réseau',
    INGENIEUR_CLOUD: 'Ingénieur Cloud',
    DATA_BI: 'Data/BI',
    DEVOPS_SRE: 'DevOps/SRE',
    CYBERSECURITE: 'Cybersécurité',
    CONSULTANT_FONCTIONNEL: 'Consultant Fonctionnel',
    ARCHITECTE: 'Architecte',
    SCRUM_MASTER: 'Scrum Master',
    PRODUCT_OWNER: 'Product Owner',
    AUTRE: 'Autre',
  }
  return mapping[cat] || cat
}

function formatOffreStatus(status: string): string {
  const mapping: Record<string, string> = {
    BROUILLON: 'Brouillon',
    ENVOYEE: 'Envoyée',
    EN_ATTENTE_VALIDATION: 'En attente',
    PUBLIEE: 'Publiée',
    SHORTLIST_ENVOYEE: 'Shortlist envoyée',
    ENTRETIENS_EN_COURS: 'Entretiens',
    POURVUE: 'Pourvue',
    FERMEE: 'Fermée',
    ANNULEE: 'Annulée',
    EXPIREE: 'Expirée',
  }
  return mapping[status] || status
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
