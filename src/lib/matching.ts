/**
 * Service de Matching IA avec Claude
 * Calcule automatiquement les correspondances entre talents et offres
 * Génère des feedbacks personnalisés (TJM, compétences manquantes)
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { sendMatchingWithFeedback } from './microsoft-graph'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface MatchResult {
  talentId: number
  score: number
  scoreDetails: {
    competences: number
    experience: number
    mobilite: number
    disponibilite: number
    tjm: number
  }
  competencesMatchees: string[]
  competencesManquantes: string[]
  analyse: string
  // Nouveau: feedback pour le talent
  feedback: {
    tjmTropHaut: boolean
    tjmFourchette?: string
    experienceManquante: string[]
  }
}

/**
 * Calcule le score de matching entre un talent et une offre avec Claude
 */
export async function calculateMatchWithAI(
  talentData: {
    id: number
    competences: string[]
    anneesExperience: number
    tjm: number | null
    tjmMin: number | null
    tjmMax: number | null
    mobilite: string
    zonesGeographiques: string[]
    disponibilite: string
    disponibleLe: Date | null
    nationalite: string | null
    permisConduire: boolean
    accepteDeplacementEtranger: boolean
    certifications: string[]
    langues: string[]
  },
  offreData: {
    id: number
    competencesRequises: string[]
    competencesSouhaitees: string[]
    experienceMin: number | null
    tjmMin: number | null
    tjmMax: number | null
    mobilite: string
    lieu: string | null
    deplacementEtranger: boolean
    habilitationRequise: boolean
    typeHabilitation: string | null
    dateDebut: Date | null
  }
): Promise<MatchResult> {
  const prompt = `Tu es un expert en recrutement IT. Analyse la compatibilité entre ce profil freelance et cette offre de mission.

PROFIL FREELANCE:
- Compétences: ${talentData.competences.join(', ')}
- Années d'expérience: ${talentData.anneesExperience}
- TJM souhaité: ${talentData.tjm || 'Non défini'} (min: ${talentData.tjmMin || 'N/A'}, max: ${talentData.tjmMax || 'N/A'})
- Mobilité: ${talentData.mobilite}
- Zones géographiques: ${talentData.zonesGeographiques.join(', ') || 'Toutes'}
- Disponibilité: ${talentData.disponibilite}${talentData.disponibleLe ? ` (à partir du ${talentData.disponibleLe.toLocaleDateString('fr-FR')})` : ''}
- Nationalité: ${talentData.nationalite || 'Non précisée'}
- Permis de conduire: ${talentData.permisConduire ? 'Oui' : 'Non'}
- Accepte déplacements étranger: ${talentData.accepteDeplacementEtranger ? 'Oui' : 'Non'}
- Certifications: ${talentData.certifications.join(', ') || 'Aucune'}
- Langues: ${talentData.langues.join(', ') || 'Non précisé'}

OFFRE DE MISSION:
- Compétences requises: ${offreData.competencesRequises.join(', ')}
- Compétences souhaitées: ${offreData.competencesSouhaitees.join(', ') || 'Aucune'}
- Expérience minimum: ${offreData.experienceMin || 'Non précisé'} ans
- TJM: ${offreData.tjmMin || 'N/A'} - ${offreData.tjmMax || 'N/A'}
- Mobilité: ${offreData.mobilite}
- Lieu: ${offreData.lieu || 'Non précisé'}
- Déplacements étranger: ${offreData.deplacementEtranger ? 'Oui' : 'Non'}
- Habilitation requise: ${offreData.habilitationRequise ? offreData.typeHabilitation || 'Oui' : 'Non'}
- Début mission: ${offreData.dateDebut ? offreData.dateDebut.toLocaleDateString('fr-FR') : 'Flexible'}

Analyse et retourne UNIQUEMENT un JSON avec cette structure:
{
  "score": <score global 0-100>,
  "scoreDetails": {
    "competences": <0-100>,
    "experience": <0-100>,
    "mobilite": <0-100>,
    "disponibilite": <0-100>,
    "tjm": <0-100>
  },
  "competencesMatchees": ["liste des compétences qui matchent"],
  "competencesManquantes": ["liste des compétences requises manquantes"],
  "analyse": "Résumé en 2-3 phrases de la compatibilité",
  "feedback": {
    "tjmTropHaut": true/false,
    "tjmFourchette": "si tjmTropHaut, indiquer la fourchette acceptable ex: '400-500€/jour'",
    "experienceManquante": ["liste des compétences/expériences manquantes importantes"]
  }
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Réponse invalide de Claude')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Pas de JSON trouvé')
    }

    const result = JSON.parse(jsonMatch[0])

    return {
      talentId: talentData.id,
      score: result.score,
      scoreDetails: result.scoreDetails,
      competencesMatchees: result.competencesMatchees,
      competencesManquantes: result.competencesManquantes,
      analyse: result.analyse,
      feedback: result.feedback || {
        tjmTropHaut: false,
        experienceManquante: result.competencesManquantes || []
      },
    }
  } catch (error) {
    console.error('Erreur matching IA:', error)
    // Fallback: calcul basique sans IA
    return calculateBasicMatch(talentData, offreData)
  }
}

/**
 * Calcul de matching basique (fallback si IA indisponible)
 */
function calculateBasicMatch(
  talentData: {
    id: number
    competences: string[]
    anneesExperience: number
    tjm: number | null
    tjmMin: number | null
    tjmMax: number | null
    mobilite: string
    disponibilite: string
  },
  offreData: {
    competencesRequises: string[]
    competencesSouhaitees: string[]
    experienceMin: number | null
    tjmMin: number | null
    tjmMax: number | null
    mobilite: string
  }
): MatchResult {
  const normalize = (s: string) => s.toLowerCase().trim()
  const talentSkills = talentData.competences.map(normalize)

  // Compétences matchées
  const matchedRequired = offreData.competencesRequises.filter(skill =>
    talentSkills.includes(normalize(skill))
  )
  const matchedOptional = offreData.competencesSouhaitees.filter(skill =>
    talentSkills.includes(normalize(skill))
  )
  const missingRequired = offreData.competencesRequises.filter(skill =>
    !talentSkills.includes(normalize(skill))
  )

  // Score compétences (60% du total)
  const competenceScore = offreData.competencesRequises.length > 0
    ? (matchedRequired.length / offreData.competencesRequises.length) * 100
    : 100

  // Score expérience (15% du total)
  const experienceScore = !offreData.experienceMin
    ? 100
    : talentData.anneesExperience >= offreData.experienceMin
      ? 100
      : (talentData.anneesExperience / offreData.experienceMin) * 100

  // Score TJM (15% du total) et feedback
  let tjmScore = 100
  let tjmTropHaut = false
  let tjmFourchette: string | undefined

  if (offreData.tjmMax && talentData.tjmMin && talentData.tjmMin > offreData.tjmMax) {
    tjmScore = 50 // TJM trop élevé
    tjmTropHaut = true
    tjmFourchette = `${offreData.tjmMin || 'N/A'}-${offreData.tjmMax}€/jour`
  } else if (offreData.tjmMin && talentData.tjmMax && talentData.tjmMax < offreData.tjmMin) {
    tjmScore = 50 // TJM trop bas
  }

  // Score mobilité (10% du total)
  const mobiliteScore = talentData.mobilite === 'FLEXIBLE' || talentData.mobilite === offreData.mobilite
    ? 100
    : 70

  // Score final pondéré
  const score = Math.round(
    competenceScore * 0.6 +
    experienceScore * 0.15 +
    tjmScore * 0.15 +
    mobiliteScore * 0.1
  )

  return {
    talentId: talentData.id,
    score,
    scoreDetails: {
      competences: Math.round(competenceScore),
      experience: Math.round(experienceScore),
      mobilite: Math.round(mobiliteScore),
      disponibilite: 100,
      tjm: Math.round(tjmScore),
    },
    competencesMatchees: [...matchedRequired, ...matchedOptional],
    competencesManquantes: missingRequired,
    analyse: `Matching ${score}% basé sur ${matchedRequired.length}/${offreData.competencesRequises.length} compétences requises.`,
    feedback: {
      tjmTropHaut,
      tjmFourchette,
      experienceManquante: missingRequired,
    },
  }
}

/**
 * Trouve et crée les matches pour une offre nouvellement créée
 * Notifie automatiquement les talents qui matchent
 */
export async function matchTalentsForOffer(
  offreId: number,
  minScore: number = 60,
  sendNotifications: boolean = true
): Promise<MatchResult[]> {
  // Récupère l'offre
  const offre = await prisma.offre.findUnique({
    where: { id: offreId },
    include: { client: true },
  })

  if (!offre) {
    throw new Error('Offre non trouvée')
  }

  // Récupère tous les talents actifs et disponibles
  const talents = await prisma.talent.findMany({
    where: {
      statut: 'ACTIF',
      user: { isActive: true },
      // On ne prend que les profils avec au moins une compétence
      competences: { isEmpty: false },
    },
    include: {
      user: { select: { email: true } },
    },
  })

  const results: MatchResult[] = []

  for (const talent of talents) {
    // Vérifie si un match existe déjà
    const existingMatch = await prisma.match.findUnique({
      where: {
        offreId_talentId: {
          offreId: offre.id,
          talentId: talent.id,
        },
      },
    })

    if (existingMatch) continue

    // Calcule le score de matching
    const matchResult = await calculateMatchWithAI(
      {
        id: talent.id,
        competences: talent.competences,
        anneesExperience: talent.anneesExperience,
        tjm: talent.tjm,
        tjmMin: talent.tjmMin,
        tjmMax: talent.tjmMax,
        mobilite: talent.mobilite,
        zonesGeographiques: talent.zonesGeographiques,
        disponibilite: talent.disponibilite,
        disponibleLe: talent.disponibleLe,
        nationalite: talent.nationalite,
        permisConduire: talent.permisConduire,
        accepteDeplacementEtranger: talent.accepteDeplacementEtranger,
        certifications: talent.certifications,
        langues: talent.langues,
      },
      {
        id: offre.id,
        competencesRequises: offre.competencesRequises,
        competencesSouhaitees: offre.competencesSouhaitees,
        experienceMin: offre.experienceMin,
        tjmMin: offre.tjmMin,
        tjmMax: offre.tjmMax,
        mobilite: offre.mobilite,
        lieu: offre.lieu,
        deplacementEtranger: offre.deplacementEtranger,
        habilitationRequise: offre.habilitationRequise,
        typeHabilitation: offre.typeHabilitation,
        dateDebut: offre.dateDebut,
      }
    )

    // Ne garde que les matchs au-dessus du seuil minimum
    if (matchResult.score >= minScore) {
      // Crée le match en base
      await prisma.match.create({
        data: {
          offreId: offre.id,
          talentId: talent.id,
          score: matchResult.score,
          scoreDetails: matchResult.scoreDetails,
          competencesMatchees: matchResult.competencesMatchees,
          competencesManquantes: matchResult.competencesManquantes,
          notes: matchResult.analyse,
        },
      })

      results.push(matchResult)

      // Envoie une notification par email si demandé (score >= 60%)
      if (sendNotifications && matchResult.score >= 60) {
        // Utilise Microsoft Graph avec feedback TJM/expérience
        sendMatchingWithFeedback(
          talent.user.email,
          talent.prenom,
          offre.titre,
          offre.slug,
          matchResult.score,
          matchResult.competencesMatchees,
          {
            tjmTropHaut: matchResult.feedback.tjmTropHaut,
            tjmFourchette: matchResult.feedback.tjmFourchette,
            experienceManquante: matchResult.feedback.experienceManquante,
          }
        ).catch(console.error)

        // Marque la notification comme envoyée avec les détails du feedback
        await prisma.match.updateMany({
          where: {
            offreId: offre.id,
            talentId: talent.id,
          },
          data: {
            notificationEnvoyee: true,
            notificationEnvoyeeLe: new Date(),
            tjmTropHaut: matchResult.feedback.tjmTropHaut,
            experienceInsuffisante: matchResult.feedback.experienceManquante.length > 0,
            feedbackTjm: matchResult.feedback.tjmTropHaut
              ? `Votre TJM est supérieur au budget. Fourchette: ${matchResult.feedback.tjmFourchette}`
              : null,
            feedbackExperience: matchResult.feedback.experienceManquante.length > 0
              ? `Compétences manquantes: ${matchResult.feedback.experienceManquante.join(', ')}`
              : null,
          },
        })

        // Crée une notification dans le système
        await prisma.notification.create({
          data: {
            userId: talent.userId,
            type: 'NOUVELLE_OFFRE_MATCH',
            titre: `Nouvelle mission ${matchResult.score}% compatible`,
            message: `La mission "${offre.titre}" correspond à votre profil !`,
            lien: `/offres/${offre.slug}`,
            data: {
              offreId: offre.id,
              score: matchResult.score,
              feedback: matchResult.feedback,
            },
          },
        })
      }
    }
  }

  return results
}

/**
 * Met à jour les matches pour un talent qui modifie son profil
 */
export async function updateMatchesForTalent(talentId: number): Promise<void> {
  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    include: { user: { select: { email: true } } },
  })

  if (!talent) return

  // Récupère toutes les offres publiées
  const offres = await prisma.offre.findMany({
    where: { statut: 'PUBLIEE' },
  })

  for (const offre of offres) {
    const matchResult = await calculateMatchWithAI(
      {
        id: talent.id,
        competences: talent.competences,
        anneesExperience: talent.anneesExperience,
        tjm: talent.tjm,
        tjmMin: talent.tjmMin,
        tjmMax: talent.tjmMax,
        mobilite: talent.mobilite,
        zonesGeographiques: talent.zonesGeographiques,
        disponibilite: talent.disponibilite,
        disponibleLe: talent.disponibleLe,
        nationalite: talent.nationalite,
        permisConduire: talent.permisConduire,
        accepteDeplacementEtranger: talent.accepteDeplacementEtranger,
        certifications: talent.certifications,
        langues: talent.langues,
      },
      {
        id: offre.id,
        competencesRequises: offre.competencesRequises,
        competencesSouhaitees: offre.competencesSouhaitees,
        experienceMin: offre.experienceMin,
        tjmMin: offre.tjmMin,
        tjmMax: offre.tjmMax,
        mobilite: offre.mobilite,
        lieu: offre.lieu,
        deplacementEtranger: offre.deplacementEtranger,
        habilitationRequise: offre.habilitationRequise,
        typeHabilitation: offre.typeHabilitation,
        dateDebut: offre.dateDebut,
      }
    )

    // Met à jour ou crée le match
    await prisma.match.upsert({
      where: {
        offreId_talentId: {
          offreId: offre.id,
          talentId: talent.id,
        },
      },
      update: {
        score: matchResult.score,
        scoreDetails: matchResult.scoreDetails,
        competencesMatchees: matchResult.competencesMatchees,
        competencesManquantes: matchResult.competencesManquantes,
        notes: matchResult.analyse,
      },
      create: {
        offreId: offre.id,
        talentId: talent.id,
        score: matchResult.score,
        scoreDetails: matchResult.scoreDetails,
        competencesMatchees: matchResult.competencesMatchees,
        competencesManquantes: matchResult.competencesManquantes,
        notes: matchResult.analyse,
      },
    })
  }
}

/**
 * Récupère les meilleurs matches pour une offre (pour la shortlist)
 */
export async function getBestMatchesForOffer(
  offreId: number,
  limit: number = 20
): Promise<Array<{
  talent: {
    id: number
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    competences: string[]
    anneesExperience: number
    tjm: number | null
    disponibilite: string
    photoUrl: string | null
  }
  score: number
  competencesMatchees: string[]
  competencesManquantes: string[]
}>> {
  const matches = await prisma.match.findMany({
    where: { offreId },
    orderBy: { score: 'desc' },
    take: limit,
    include: {
      talent: {
        select: {
          id: true,
          uid: true,
          prenom: true,
          nom: true,
          titrePoste: true,
          competences: true,
          anneesExperience: true,
          tjm: true,
          disponibilite: true,
          photoUrl: true,
        },
      },
    },
  })

  return matches.map(m => ({
    talent: m.talent,
    score: m.score,
    competencesMatchees: m.competencesMatchees,
    competencesManquantes: m.competencesManquantes,
  }))
}
