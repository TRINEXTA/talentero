/**
 * API Matching Détaillé
 * Calcule le matching entre un talent et une offre spécifique
 * avec feedback détaillé pour permettre de postuler ou non
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface MatchResult {
  score: number
  canApply: boolean
  recommendation: 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE' | 'NON_RECOMMANDE'
  message: string
  details: {
    competences: {
      matched: string[]
      missing: string[]
      bonus: string[]
      score: number
    }
    experience: {
      required: number | null
      yours: number
      status: 'OK' | 'INSUFFISANT' | 'SURQUALIFIE'
      message: string
    }
    tjm: {
      offreMin: number | null
      offreMax: number | null
      yours: number | null
      status: 'OK' | 'TROP_HAUT' | 'TROP_BAS' | 'NON_RENSEIGNE'
      message: string
    }
    disponibilite: {
      status: 'DISPONIBLE' | 'BIENTOT' | 'NON_DISPONIBLE' | 'EN_MISSION'
      message: string
      conflits: string[]
    }
    localisation: {
      status: 'OK' | 'ELOIGNE' | 'NON_COMPATIBLE'
      message: string
    }
  }
  alreadyApplied: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: { offreId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupère le talent avec ses infos
    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        planning: {
          where: {
            date: { gte: new Date() },
            type: { in: ['EN_MISSION', 'CONGE', 'ARRET_MALADIE', 'INDISPONIBLE'] }
          }
        },
        candidatures: {
          select: { offreId: true }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Récupère l'offre
    const offre = await prisma.offre.findFirst({
      where: {
        OR: [
          { uid: params.offreId },
          { slug: params.offreId }
        ],
        statut: 'PUBLIEE'
      }
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Vérifie si déjà candidaté
    const alreadyApplied = talent.candidatures.some(c => c.offreId === offre.id)

    // === CALCUL DU MATCHING ===

    // 1. Compétences (50% du score)
    const talentComps = talent.competences.map(c => c.toLowerCase())
    const offreCompsRequises = offre.competencesRequises.map(c => c.toLowerCase())
    const offreCompsSouhaitees = offre.competencesSouhaitees.map(c => c.toLowerCase())

    const matchedRequises = offreCompsRequises.filter(c =>
      talentComps.some(tc => tc.includes(c) || c.includes(tc))
    )
    const missingRequises = offreCompsRequises.filter(c =>
      !talentComps.some(tc => tc.includes(c) || c.includes(tc))
    )
    const bonusComps = offreCompsSouhaitees.filter(c =>
      talentComps.some(tc => tc.includes(c) || c.includes(tc))
    )

    const competenceScore = offreCompsRequises.length > 0
      ? Math.round((matchedRequises.length / offreCompsRequises.length) * 100)
      : 100

    // 2. Expérience (20% du score)
    let experienceScore = 100
    let experienceStatus: 'OK' | 'INSUFFISANT' | 'SURQUALIFIE' = 'OK'
    let experienceMessage = 'Expérience adaptée'

    if (offre.experienceMin) {
      const diff = (talent.anneesExperience || 0) - offre.experienceMin
      if (diff < 0) {
        experienceScore = Math.max(0, 100 + (diff * 20)) // -20 points par année manquante
        experienceStatus = 'INSUFFISANT'
        experienceMessage = `Il vous manque ${Math.abs(diff)} année(s) d'expérience`
      } else if (diff > 5) {
        experienceScore = 90
        experienceStatus = 'SURQUALIFIE'
        experienceMessage = 'Vous êtes surqualifié pour cette mission'
      }
    }

    // 3. TJM (15% du score)
    let tjmScore = 100
    let tjmStatus: 'OK' | 'TROP_HAUT' | 'TROP_BAS' | 'NON_RENSEIGNE' = 'OK'
    let tjmMessage = 'TJM compatible'

    if (!talent.tjm) {
      tjmScore = 80
      tjmStatus = 'NON_RENSEIGNE'
      tjmMessage = 'Renseignez votre TJM pour une meilleure compatibilité'
    } else if (offre.tjmMax && talent.tjm > offre.tjmMax * 1.2) {
      tjmScore = 40
      tjmStatus = 'TROP_HAUT'
      tjmMessage = `Votre TJM (${talent.tjm}€) dépasse la fourchette (max ${offre.tjmMax}€)`
    } else if (offre.tjmMin && talent.tjm < offre.tjmMin * 0.7) {
      tjmScore = 70
      tjmStatus = 'TROP_BAS'
      tjmMessage = `Votre TJM (${talent.tjm}€) est en dessous de la fourchette`
    }

    // 4. Disponibilité (15% du score)
    let dispoScore = 100
    let dispoStatus: 'DISPONIBLE' | 'BIENTOT' | 'NON_DISPONIBLE' | 'EN_MISSION' = 'DISPONIBLE'
    let dispoMessage = 'Vous êtes disponible'
    const conflits: string[] = []

    // Vérifie les conflits avec le planning
    if (offre.dateDebut) {
      const offreStart = new Date(offre.dateDebut)
      const offreEnd = offre.dateFin ? new Date(offre.dateFin) : new Date(offreStart.getTime() + 90 * 24 * 60 * 60 * 1000)

      const conflitsPlanning = talent.planning.filter(p => {
        const planDate = new Date(p.date)
        return planDate >= offreStart && planDate <= offreEnd
      })

      if (conflitsPlanning.length > 0) {
        const missionConflits = conflitsPlanning.filter(p => p.type === 'EN_MISSION')
        if (missionConflits.length > 0) {
          dispoScore = 20
          dispoStatus = 'EN_MISSION'
          dispoMessage = 'Vous avez une mission sur cette période'
          conflits.push(`${missionConflits.length} jour(s) en mission`)
        } else {
          dispoScore = 60
          dispoStatus = 'NON_DISPONIBLE'
          dispoMessage = 'Vous avez des indisponibilités sur cette période'
          const congeCount = conflitsPlanning.filter(p => p.type === 'CONGE').length
          const arretCount = conflitsPlanning.filter(p => p.type === 'ARRET_MALADIE').length
          if (congeCount > 0) conflits.push(`${congeCount} jour(s) de congé`)
          if (arretCount > 0) conflits.push(`${arretCount} jour(s) d'arrêt`)
        }
      }
    }

    if (talent.disponibilite === 'NON_DISPONIBLE') {
      dispoScore = 30
      dispoStatus = 'NON_DISPONIBLE'
      dispoMessage = 'Votre profil indique que vous n\'êtes pas disponible'
    } else if (talent.disponibilite !== 'IMMEDIATE' && talent.disponibilite !== 'SOUS_15_JOURS') {
      dispoScore = 80
      dispoStatus = 'BIENTOT'
      dispoMessage = 'Disponible prochainement'
    }

    // 5. Localisation (bonus)
    let locaStatus: 'OK' | 'ELOIGNE' | 'NON_COMPATIBLE' = 'OK'
    let locaMessage = 'Localisation compatible'

    if (offre.mobilite === 'SUR_SITE' && talent.mobilite === 'FULL_REMOTE') {
      locaStatus = 'NON_COMPATIBLE'
      locaMessage = 'Cette mission requiert une présence sur site'
    }

    // === SCORE FINAL ===
    const finalScore = Math.round(
      (competenceScore * 0.50) +
      (experienceScore * 0.20) +
      (tjmScore * 0.15) +
      (dispoScore * 0.15)
    )

    // === RECOMMENDATION ===
    let recommendation: MatchResult['recommendation']
    let message: string
    let canApply = true

    if (finalScore >= 80) {
      recommendation = 'EXCELLENT'
      message = 'Votre profil correspond parfaitement à cette mission. Nous vous recommandons fortement de postuler !'
    } else if (finalScore >= 65) {
      recommendation = 'BON'
      message = 'Votre profil correspond bien à cette mission. Vous avez de bonnes chances d\'être retenu.'
    } else if (finalScore >= 50) {
      recommendation = 'MOYEN'
      message = 'Votre profil correspond partiellement. Certains points pourraient être améliorés.'
    } else if (finalScore >= 35) {
      recommendation = 'FAIBLE'
      message = 'Correspondance faible. Vous pouvez postuler mais vos chances sont limitées.'
    } else {
      recommendation = 'NON_RECOMMANDE'
      message = 'Ce poste ne correspond pas à votre profil actuel. Nous ne recommandons pas de postuler.'
      canApply = competenceScore >= 30 // Au moins 30% des compétences requises
    }

    // Si en mission pendant cette période, on bloque
    if (dispoStatus === 'EN_MISSION') {
      canApply = false
      message = 'Vous ne pouvez pas postuler car vous avez déjà une mission sur cette période.'
    }

    const result: MatchResult = {
      score: finalScore,
      canApply,
      recommendation,
      message,
      details: {
        competences: {
          matched: offre.competencesRequises.filter(c =>
            matchedRequises.includes(c.toLowerCase())
          ),
          missing: offre.competencesRequises.filter(c =>
            missingRequises.includes(c.toLowerCase())
          ),
          bonus: offre.competencesSouhaitees.filter(c =>
            bonusComps.includes(c.toLowerCase())
          ),
          score: competenceScore
        },
        experience: {
          required: offre.experienceMin,
          yours: talent.anneesExperience || 0,
          status: experienceStatus,
          message: experienceMessage
        },
        tjm: {
          offreMin: offre.tjmMin,
          offreMax: offre.tjmMax,
          yours: talent.tjm,
          status: tjmStatus,
          message: tjmMessage
        },
        disponibilite: {
          status: dispoStatus,
          message: dispoMessage,
          conflits
        },
        localisation: {
          status: locaStatus,
          message: locaMessage
        }
      },
      alreadyApplied
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erreur matching:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
