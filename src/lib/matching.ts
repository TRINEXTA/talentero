/**
 * Service de Matching IA avec Claude - Version Améliorée
 * Calcule automatiquement les correspondances entre talents et offres
 * Génère des feedbacks personnalisés (TJM, compétences manquantes)
 *
 * ALGORITHME DE SCORING STRICT:
 * - 50% Compétences requises (OBLIGATOIRES - pénalité forte si manquantes)
 * - 15% Compétences souhaitées (bonus)
 * - 15% Expérience
 * - 10% TJM compatible
 * - 10% Disponibilité/Mobilité
 *
 * RÈGLES:
 * - Si < 50% des compétences requises -> score plafonné à 40%
 * - Si TJM > budget + 20% -> pénalité de 30 points
 * - Si expérience < 50% du requis -> pénalité de 20 points
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './db'
import { sendMatchingWithFeedback } from './microsoft-graph'
import { CategorieProfessionnelle } from '@prisma/client'
import { canCategoryMatch, getCompatibleCategories } from './category-classifier'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Normalisation des compétences pour comparaison
const normalizeSkill = (skill: string): string => {
  return skill
    .toLowerCase()
    .trim()
    .replace(/[.\-_]/g, '')
    .replace(/\s+/g, ' ')
    // Normalisations courantes
    .replace(/^js$/, 'javascript')
    .replace(/^ts$/, 'typescript')
    .replace(/^node$/, 'nodejs')
    .replace(/^react\.js$/, 'react')
    .replace(/^vue\.js$/, 'vue')
    .replace(/^angular\.js$/, 'angular')
    .replace(/^c#$/, 'csharp')
    .replace(/^\.net$/, 'dotnet')
}

// Vérifie si deux compétences sont équivalentes
const skillsMatch = (skill1: string, skill2: string): boolean => {
  const s1 = normalizeSkill(skill1)
  const s2 = normalizeSkill(skill2)

  // Match exact
  if (s1 === s2) return true

  // Match partiel (ex: "React" match "React Native" partiellement)
  if (s1.includes(s2) || s2.includes(s1)) return true

  // Synonymes courants
  const synonyms: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'nodejs': ['node', 'node js'],
    'react': ['reactjs', 'react js'],
    'vue': ['vuejs', 'vue js'],
    'angular': ['angularjs', 'angular js'],
    'python': ['py', 'python3'],
    'postgresql': ['postgres', 'pgsql'],
    'mysql': ['mariadb'],
    'mongodb': ['mongo'],
    'kubernetes': ['k8s'],
    'docker': ['conteneur', 'container'],
    'aws': ['amazon web services'],
    'azure': ['microsoft azure'],
    'gcp': ['google cloud', 'google cloud platform'],
    'ci/cd': ['cicd', 'pipeline', 'devops'],
    'agile': ['scrum', 'kanban'],
  }

  for (const [key, values] of Object.entries(synonyms)) {
    const allVariants = [key, ...values]
    if (allVariants.includes(s1) && allVariants.includes(s2)) return true
  }

  return false
}

interface MatchResult {
  talentId: number
  score: number
  scoreDetails: {
    competences: number
    competencesSouhaitees: number
    experience: number
    mobilite: number
    disponibilite: number
    tjm: number
  }
  competencesMatchees: string[]
  competencesManquantes: string[]
  competencesSouhaiteesMatchees: string[]
  analyse: string
  feedback: {
    tjmTropHaut: boolean
    tjmFourchette?: string
    experienceManquante: string[]
    raisonScore: string
  }
  // Indicateurs de blocage
  bloqueurs: {
    competencesInsuffisantes: boolean
    tjmIncompatible: boolean
    experienceInsuffisante: boolean
    indisponible: boolean
  }
}

/**
 * Calcule le score de matching entre un talent et une offre
 * Utilise d'abord un calcul algorithmique strict, puis affine avec l'IA si nécessaire
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
    categorieProfessionnelle?: CategorieProfessionnelle | null
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
    categorieCible?: CategorieProfessionnelle | null
  }
): Promise<MatchResult> {
  // ==== ÉTAPE 1: CALCUL ALGORITHMIQUE STRICT ====

  // 1. Analyse des compétences REQUISES (le plus important)
  const competencesMatchees: string[] = []
  const competencesManquantes: string[] = []

  for (const reqSkill of offreData.competencesRequises) {
    const found = talentData.competences.some(talentSkill =>
      skillsMatch(talentSkill, reqSkill)
    )
    if (found) {
      competencesMatchees.push(reqSkill)
    } else {
      competencesManquantes.push(reqSkill)
    }
  }

  // 2. Analyse des compétences SOUHAITÉES (bonus)
  const competencesSouhaiteesMatchees: string[] = []
  for (const optSkill of offreData.competencesSouhaitees) {
    const found = talentData.competences.some(talentSkill =>
      skillsMatch(talentSkill, optSkill)
    )
    if (found) {
      competencesSouhaiteesMatchees.push(optSkill)
    }
  }

  // 3. Calcul des scores partiels
  const nbRequired = offreData.competencesRequises.length || 1
  const nbOptional = offreData.competencesSouhaitees.length || 1
  const ratioRequired = competencesMatchees.length / nbRequired
  const ratioOptional = competencesSouhaiteesMatchees.length / nbOptional

  // Score compétences requises (0-100)
  const scoreCompetences = Math.round(ratioRequired * 100)

  // Score compétences souhaitées (0-100)
  const scoreCompSouhaitees = Math.round(ratioOptional * 100)

  // 4. Score expérience
  let scoreExperience = 100
  const expMin = offreData.experienceMin || 0
  if (expMin > 0) {
    if (talentData.anneesExperience >= expMin) {
      scoreExperience = 100
    } else if (talentData.anneesExperience >= expMin * 0.7) {
      // 70-99% de l'expérience requise
      scoreExperience = 70
    } else if (talentData.anneesExperience >= expMin * 0.5) {
      // 50-69% de l'expérience requise
      scoreExperience = 50
    } else {
      // Moins de 50% -> pénalité forte
      scoreExperience = 30
    }
  }

  // 5. Score TJM
  let scoreTjm = 100
  let tjmTropHaut = false
  let tjmFourchette: string | undefined

  const talentTjm = talentData.tjmMin || talentData.tjm
  const offreTjmMax = offreData.tjmMax

  if (talentTjm && offreTjmMax) {
    if (talentTjm <= offreTjmMax) {
      scoreTjm = 100
    } else if (talentTjm <= offreTjmMax * 1.1) {
      // TJM jusqu'à +10% -> léger dépassement acceptable
      scoreTjm = 80
    } else if (talentTjm <= offreTjmMax * 1.2) {
      // TJM +10-20% -> négociable
      scoreTjm = 60
      tjmTropHaut = true
      tjmFourchette = `${offreData.tjmMin || 'N/A'}-${offreData.tjmMax}€/jour`
    } else {
      // TJM > +20% -> problème
      scoreTjm = 30
      tjmTropHaut = true
      tjmFourchette = `${offreData.tjmMin || 'N/A'}-${offreData.tjmMax}€/jour`
    }
  }

  // 6. Score disponibilité
  let scoreDisponibilite = 100
  if (talentData.disponibilite === 'NON_DISPONIBLE') {
    scoreDisponibilite = 0
  } else if (talentData.disponibilite === 'SOUS_3_MOIS') {
    scoreDisponibilite = 70
  } else if (talentData.disponibilite === 'SOUS_2_MOIS') {
    scoreDisponibilite = 80
  }

  // 7. Score mobilité
  let scoreMobilite = 100
  if (talentData.mobilite !== offreData.mobilite && talentData.mobilite !== 'FLEXIBLE') {
    // Vérifications croisées
    if (offreData.mobilite === 'SUR_SITE' && talentData.mobilite === 'FULL_REMOTE') {
      scoreMobilite = 30 // Incompatibilité forte
    } else if (offreData.mobilite === 'FULL_REMOTE' && talentData.mobilite === 'SUR_SITE') {
      scoreMobilite = 50
    } else {
      scoreMobilite = 70 // Autres cas
    }
  }

  // Vérification catégorie professionnelle
  let categoryBonus = 0
  if (talentData.categorieProfessionnelle && offreData.categorieCible) {
    const categoryMatch = canCategoryMatch(talentData.categorieProfessionnelle, offreData.categorieCible)
    if (!categoryMatch) {
      // Catégorie incompatible
      scoreMobilite = Math.min(scoreMobilite, 50)
    } else if (talentData.categorieProfessionnelle !== offreData.categorieCible) {
      const compatibleCats = getCompatibleCategories(talentData.categorieProfessionnelle)
      if (compatibleCats.includes(offreData.categorieCible)) {
        categoryBonus = 3
      }
    }
  }

  // ==== ÉTAPE 2: CALCUL DU SCORE FINAL AVEC PONDÉRATION ====

  // Pondérations strictes
  const weights = {
    competences: 0.50,      // 50% - Les compétences requises sont primordiales
    compSouhaitees: 0.10,   // 10% - Bonus pour les souhaitées
    experience: 0.15,       // 15%
    tjm: 0.10,              // 10%
    disponibilite: 0.08,    // 8%
    mobilite: 0.07,         // 7%
  }

  let scoreBase = Math.round(
    scoreCompetences * weights.competences +
    scoreCompSouhaitees * weights.compSouhaitees +
    scoreExperience * weights.experience +
    scoreTjm * weights.tjm +
    scoreDisponibilite * weights.disponibilite +
    scoreMobilite * weights.mobilite
  )

  // ==== ÉTAPE 3: RÈGLES DE PLAFONNEMENT STRICTES ====

  const bloqueurs = {
    competencesInsuffisantes: false,
    tjmIncompatible: false,
    experienceInsuffisante: false,
    indisponible: false,
  }

  let raisonScore = ''

  // RÈGLE 1: Si moins de 50% des compétences requises -> plafonné à 40%
  if (ratioRequired < 0.5) {
    scoreBase = Math.min(scoreBase, 40)
    bloqueurs.competencesInsuffisantes = true
    raisonScore = `Seulement ${competencesMatchees.length}/${nbRequired} compétences requises (${Math.round(ratioRequired * 100)}%)`
  }
  // RÈGLE 2: Si moins de 70% des compétences requises -> plafonné à 60%
  else if (ratioRequired < 0.7) {
    scoreBase = Math.min(scoreBase, 60)
    raisonScore = `${competencesMatchees.length}/${nbRequired} compétences requises - profil partiel`
  }
  // RÈGLE 3: Si moins de 85% des compétences requises -> plafonné à 75%
  else if (ratioRequired < 0.85) {
    scoreBase = Math.min(scoreBase, 75)
    raisonScore = `Quelques compétences manquantes: ${competencesManquantes.join(', ')}`
  }

  // RÈGLE 4: TJM trop élevé -> pénalité
  if (scoreTjm <= 30) {
    bloqueurs.tjmIncompatible = true
    scoreBase = Math.min(scoreBase, 50)
    if (!raisonScore) raisonScore = 'TJM significativement au-dessus du budget'
  }

  // RÈGLE 5: Expérience insuffisante
  if (scoreExperience <= 30) {
    bloqueurs.experienceInsuffisante = true
    scoreBase = Math.min(scoreBase, 55)
    if (!raisonScore) raisonScore = `Expérience insuffisante (${talentData.anneesExperience} ans vs ${expMin} requis)`
  }

  // RÈGLE 6: Indisponible
  if (scoreDisponibilite === 0) {
    bloqueurs.indisponible = true
    scoreBase = Math.min(scoreBase, 20)
    raisonScore = 'Candidat actuellement non disponible'
  }

  // Bonus catégorie (talent surqualifié)
  const finalScore = Math.min(100, scoreBase + categoryBonus)

  // Génération de l'analyse
  let analyse = ''
  if (finalScore >= 80) {
    analyse = `Excellent match (${finalScore}%). ${competencesMatchees.length}/${nbRequired} compétences requises.`
  } else if (finalScore >= 60) {
    analyse = `Bon profil (${finalScore}%). ${competencesManquantes.length > 0 ? `Manque: ${competencesManquantes.join(', ')}.` : ''}`
  } else if (finalScore >= 40) {
    analyse = `Profil partiel (${finalScore}%). ${raisonScore || `${competencesManquantes.length} compétences manquantes.`}`
  } else {
    analyse = `Profil peu adapté (${finalScore}%). ${raisonScore || 'Compétences insuffisantes pour cette mission.'}`
  }

  if (categoryBonus > 0) {
    analyse += ' [Bonus: profil surqualifié]'
  }

  return {
    talentId: talentData.id,
    score: finalScore,
    scoreDetails: {
      competences: scoreCompetences,
      competencesSouhaitees: scoreCompSouhaitees,
      experience: scoreExperience,
      mobilite: scoreMobilite,
      disponibilite: scoreDisponibilite,
      tjm: scoreTjm,
    },
    competencesMatchees,
    competencesManquantes,
    competencesSouhaiteesMatchees,
    analyse,
    feedback: {
      tjmTropHaut,
      tjmFourchette,
      experienceManquante: competencesManquantes,
      raisonScore: raisonScore || 'Score calculé selon les critères de l\'offre',
    },
    bloqueurs,
  }
}

// Note: L'ancienne fonction calculateBasicMatch a été supprimée
// Le calcul se fait maintenant de manière algorithmique dans calculateMatchWithAI

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

  // Récupère UNIQUEMENT les talents vraiment actifs et avec compte activé
  // IMPORTANT: Un talent doit avoir:
  // 1. statut ACTIF
  // 2. user.isActive = true
  // 3. user.emailVerified = true (compte activé)
  // 4. Au moins une compétence définie
  const talents = await prisma.talent.findMany({
    where: {
      statut: 'ACTIF',
      user: {
        isActive: true,
        emailVerified: true, // NOUVEAU: compte doit être activé
      },
      // On ne prend que les profils avec au moins une compétence
      competences: { isEmpty: false },
    },
    include: {
      user: { select: { email: true, emailVerified: true } },
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
        categorieProfessionnelle: talent.categorieProfessionnelle,
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
        // Note: categorieCible pourrait être ajoutée au modèle Offre si nécessaire
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
