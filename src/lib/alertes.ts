/**
 * Service d'alertes personnalisées
 * Vérifie les nouvelles offres par rapport aux alertes des talents
 */

import { prisma } from '@/lib/db'
import { Alerte, Mobilite } from '@prisma/client'

interface OffreForMatching {
  id: number
  uid: string
  titre: string
  competencesRequises: string[]
  competencesSouhaitees: string[]
  tjmMin: number | null
  tjmMax: number | null
  lieu: string | null
  mobilite: Mobilite
  client: { raisonSociale: string } | null
}

/**
 * Vérifie si une offre correspond aux critères d'une alerte
 */
export function offreMatchesAlerte(offre: OffreForMatching, alerte: Alerte): boolean {
  let matches = false

  // Vérifier les compétences (requises + souhaitées)
  const offreCompetences = [...offre.competencesRequises, ...offre.competencesSouhaitees]

  if (alerte.competences.length > 0 && offreCompetences.length > 0) {
    const offreCompetencesLower = offreCompetences.map((c) => c.toLowerCase())
    const alerteCompetencesLower = alerte.competences.map((c) => c.toLowerCase())

    const hasMatchingCompetence = alerteCompetencesLower.some((comp) =>
      offreCompetencesLower.some((offreComp) => offreComp.includes(comp) || comp.includes(offreComp))
    )

    if (hasMatchingCompetence) {
      matches = true
    }
  }

  // Vérifier le TJM minimum
  if (alerte.tjmMin && offre.tjmMax) {
    if (offre.tjmMax >= alerte.tjmMin) {
      matches = true
    }
  }

  // Vérifier les lieux
  if (alerte.lieux.length > 0 && offre.lieu) {
    const offreLieuLower = offre.lieu.toLowerCase()
    const hasMatchingLieu = alerte.lieux.some((lieu) =>
      offreLieuLower.includes(lieu.toLowerCase()) || lieu.toLowerCase().includes(offreLieuLower)
    )

    if (hasMatchingLieu) {
      matches = true
    }
  }

  // Vérifier la mobilité
  if (alerte.mobilite && offre.mobilite) {
    // Si l'alerte demande du full remote et l'offre le propose
    if (alerte.mobilite === 'FULL_REMOTE' && offre.mobilite === 'FULL_REMOTE') {
      matches = true
    }
    // Si l'alerte demande du hybride et l'offre le propose
    if (alerte.mobilite === 'HYBRIDE' && (offre.mobilite === 'HYBRIDE' || offre.mobilite === 'FULL_REMOTE')) {
      matches = true
    }
    // Si l'alerte demande flexible, tout correspond
    if (alerte.mobilite === 'FLEXIBLE') {
      matches = true
    }
  }

  return matches
}

/**
 * Traite les alertes pour une nouvelle offre publiée
 * Envoie des notifications aux talents dont les alertes correspondent
 */
export async function processAlertesForNewOffre(offreId: number): Promise<number> {
  try {
    const offre = await prisma.offre.findUnique({
      where: { id: offreId },
      select: {
        id: true,
        uid: true,
        titre: true,
        competencesRequises: true,
        competencesSouhaitees: true,
        tjmMin: true,
        tjmMax: true,
        lieu: true,
        mobilite: true,
        statut: true,
        client: { select: { raisonSociale: true } },
      },
    })

    if (!offre || offre.statut !== 'PUBLIEE') {
      return 0
    }

    // Récupérer toutes les alertes actives instantanées
    const alertes = await prisma.alerte.findMany({
      where: {
        active: true,
        frequence: 'INSTANTANEE',
      },
      include: {
        talent: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            user: { select: { id: true } },
          },
        },
      },
    })

    let notificationsSent = 0
    const offreForMatching: OffreForMatching = {
      id: offre.id,
      uid: offre.uid,
      titre: offre.titre,
      competencesRequises: offre.competencesRequises,
      competencesSouhaitees: offre.competencesSouhaitees,
      tjmMin: offre.tjmMin,
      tjmMax: offre.tjmMax,
      lieu: offre.lieu,
      mobilite: offre.mobilite,
      client: offre.client,
    }

    for (const alerte of alertes) {
      if (offreMatchesAlerte(offreForMatching, alerte)) {
        // Vérifier si une notification n'a pas déjà été envoyée pour cette offre
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: alerte.talent.user?.id,
            type: 'NOUVELLE_OFFRE_MATCH',
            lien: `/offres/${offre.uid}`,
          },
        })

        if (!existingNotif && alerte.talent.user) {
          // Créer la notification
          await prisma.notification.create({
            data: {
              userId: alerte.talent.user.id,
              type: 'NOUVELLE_OFFRE_MATCH',
              titre: 'Nouvelle offre correspondant à vos critères',
              message: `"${offre.titre}" chez ${offre.client?.raisonSociale || 'une entreprise'} correspond à votre alerte "${alerte.nom}"`,
              lien: `/offres/${offre.uid}`,
            },
          })

          // Mettre à jour les stats de l'alerte
          await prisma.alerte.update({
            where: { id: alerte.id },
            data: {
              derniereNotif: new Date(),
              nbOffresEnvoyees: { increment: 1 },
            },
          })

          notificationsSent++
        }
      }
    }

    return notificationsSent
  } catch (error) {
    console.error('Erreur processAlertesForNewOffre:', error)
    return 0
  }
}

/**
 * Traite les alertes quotidiennes/hebdomadaires (à appeler via cron)
 */
export async function processScheduledAlertes(frequence: 'QUOTIDIENNE' | 'HEBDOMADAIRE'): Promise<number> {
  try {
    const now = new Date()
    const periodStart = new Date()

    if (frequence === 'QUOTIDIENNE') {
      periodStart.setDate(periodStart.getDate() - 1)
    } else {
      periodStart.setDate(periodStart.getDate() - 7)
    }

    // Récupérer les nouvelles offres publiées pendant la période
    const newOffres = await prisma.offre.findMany({
      where: {
        statut: 'PUBLIEE',
        createdAt: {
          gte: periodStart,
          lte: now,
        },
      },
      select: {
        id: true,
        uid: true,
        titre: true,
        competencesRequises: true,
        competencesSouhaitees: true,
        tjmMin: true,
        tjmMax: true,
        lieu: true,
        mobilite: true,
        client: { select: { raisonSociale: true } },
      },
    })

    if (newOffres.length === 0) {
      return 0
    }

    // Récupérer les alertes avec cette fréquence
    const alertes = await prisma.alerte.findMany({
      where: {
        active: true,
        frequence,
      },
      include: {
        talent: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            user: { select: { id: true } },
          },
        },
      },
    })

    let notificationsSent = 0

    for (const alerte of alertes) {
      const matchingOffres = newOffres.filter((offre) => {
        const offreForMatching: OffreForMatching = {
          id: offre.id,
          uid: offre.uid,
          titre: offre.titre,
          competencesRequises: offre.competencesRequises,
          competencesSouhaitees: offre.competencesSouhaitees,
          tjmMin: offre.tjmMin,
          tjmMax: offre.tjmMax,
          lieu: offre.lieu,
          mobilite: offre.mobilite,
          client: offre.client,
        }
        return offreMatchesAlerte(offreForMatching, alerte)
      })

      if (matchingOffres.length > 0 && alerte.talent.user) {
        const message =
          matchingOffres.length === 1
            ? `1 nouvelle offre correspond à votre alerte "${alerte.nom}"`
            : `${matchingOffres.length} nouvelles offres correspondent à votre alerte "${alerte.nom}"`

        await prisma.notification.create({
          data: {
            userId: alerte.talent.user.id,
            type: 'NOUVELLE_OFFRE_MATCH',
            titre: frequence === 'QUOTIDIENNE' ? 'Résumé quotidien' : 'Résumé hebdomadaire',
            message,
            lien: '/offres',
          },
        })

        await prisma.alerte.update({
          where: { id: alerte.id },
          data: {
            derniereNotif: new Date(),
            nbOffresEnvoyees: { increment: matchingOffres.length },
          },
        })

        notificationsSent++
      }
    }

    return notificationsSent
  } catch (error) {
    console.error('Erreur processScheduledAlertes:', error)
    return 0
  }
}

/**
 * Prévisualise les offres correspondant à une alerte
 */
export async function previewAlerte(alerte: Partial<Alerte>): Promise<number> {
  try {
    const offres = await prisma.offre.findMany({
      where: { statut: 'PUBLIEE' },
      select: {
        id: true,
        uid: true,
        titre: true,
        competencesRequises: true,
        competencesSouhaitees: true,
        tjmMin: true,
        tjmMax: true,
        lieu: true,
        mobilite: true,
        client: { select: { raisonSociale: true } },
      },
      take: 100, // Limiter pour la performance
    })

    const mockAlerte = {
      id: 0,
      talentId: 0,
      nom: alerte.nom || '',
      competences: alerte.competences || [],
      tjmMin: alerte.tjmMin || null,
      mobilite: alerte.mobilite || null,
      lieux: alerte.lieux || [],
      frequence: alerte.frequence || 'INSTANTANEE',
      active: true,
      derniereNotif: null,
      nbOffresEnvoyees: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Alerte

    const matchingCount = offres.filter((offre) => {
      const offreForMatching: OffreForMatching = {
        id: offre.id,
        uid: offre.uid,
        titre: offre.titre,
        competencesRequises: offre.competencesRequises,
        competencesSouhaitees: offre.competencesSouhaitees,
        tjmMin: offre.tjmMin,
        tjmMax: offre.tjmMax,
        lieu: offre.lieu,
        mobilite: offre.mobilite,
        client: offre.client,
      }
      return offreMatchesAlerte(offreForMatching, mockAlerte)
    }).length

    return matchingCount
  } catch (error) {
    console.error('Erreur previewAlerte:', error)
    return 0
  }
}
