/**
 * Schémas de validation Zod
 */

import { z } from 'zod'

// ============================================
// AUTH
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const registerTalentSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide (14 chiffres)'),
  telephone: z.string().optional(),
})

export const registerClientSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  raisonSociale: z.string().min(2, 'Raison sociale requise'),
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide (14 chiffres)'),
  contactNom: z.string().min(2, 'Nom du contact requis'),
  contactPrenom: z.string().min(2, 'Prénom du contact requis'),
  contactEmail: z.string().email('Email du contact invalide'),
  contactTelephone: z.string().optional(),
  contactPoste: z.string().optional(),
})

// ============================================
// TALENT
// ============================================

export const updateTalentProfileSchema = z.object({
  prenom: z.string().min(2).optional(),
  nom: z.string().min(2).optional(),
  telephone: z.string().optional(),
  titrePoste: z.string().optional(),
  bio: z.string().max(1000).optional(),
  competences: z.array(z.string()).optional(),
  anneesExperience: z.number().min(0).optional(),
  tjm: z.number().min(0).optional(),
  tjmMin: z.number().min(0).optional(),
  tjmMax: z.number().min(0).optional(),
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE']).optional(),
  zonesGeographiques: z.array(z.string()).optional(),
  disponibilite: z.enum([
    'IMMEDIATE',
    'SOUS_15_JOURS',
    'SOUS_1_MOIS',
    'SOUS_2_MOIS',
    'SOUS_3_MOIS',
    'DATE_PRECISE',
    'NON_DISPONIBLE',
  ]).optional(),
  disponibleLe: z.string().datetime().optional().nullable(),
  softSkills: z.array(z.string()).optional(),
  langues: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
})

export const addExperienceSchema = z.object({
  poste: z.string().min(2, 'Poste requis'),
  entreprise: z.string().optional(),
  lieu: z.string().optional(),
  dateDebut: z.string(),
  dateFin: z.string().optional().nullable(),
  enCours: z.boolean().optional(),
  description: z.string().optional(),
  competences: z.array(z.string()).optional(),
})

export const addFormationSchema = z.object({
  diplome: z.string().min(2, 'Diplôme requis'),
  etablissement: z.string().optional(),
  annee: z.number().optional(),
  description: z.string().optional(),
})

// ============================================
// CLIENT
// ============================================

export const updateClientProfileSchema = z.object({
  contactNom: z.string().min(2).optional(),
  contactPrenom: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
  contactTelephone: z.string().optional(),
  contactPoste: z.string().optional(),
  description: z.string().max(2000).optional(),
  secteurActivite: z.string().optional(),
  tailleEntreprise: z.enum(['TPE', 'PME', 'ETI', 'GRANDE']).optional(),
  siteWeb: z.string().url().optional().nullable(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
})

// ============================================
// OFFRES
// ============================================

export const createOffreSchema = z.object({
  titre: z.string().min(5, 'Titre minimum 5 caractères'),
  description: z.string().min(50, 'Description minimum 50 caractères'),
  responsabilites: z.string().optional(),
  profilRecherche: z.string().optional(),
  competencesRequises: z.array(z.string()).min(1, 'Au moins une compétence requise'),
  competencesSouhaitees: z.array(z.string()).optional(),
  tjmMin: z.number().min(0).optional(),
  tjmMax: z.number().min(0).optional(),
  dureeJours: z.number().min(1).optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),
  renouvelable: z.boolean().optional(),
  lieu: z.string().optional(),
  codePostal: z.string().optional(),
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE']).optional(),
  experienceMin: z.number().min(0).optional(),
})

export const updateOffreSchema = createOffreSchema.partial()

// ============================================
// CANDIDATURES
// ============================================

export const createCandidatureSchema = z.object({
  offreId: z.number(),
  tjmPropose: z.number().min(0).optional(),
  motivation: z.string().max(2000).optional(),
  disponibilite: z.enum([
    'IMMEDIATE',
    'SOUS_15_JOURS',
    'SOUS_1_MOIS',
    'SOUS_2_MOIS',
    'SOUS_3_MOIS',
    'DATE_PRECISE',
    'NON_DISPONIBLE',
  ]).optional(),
})

export const updateCandidatureStatusSchema = z.object({
  statut: z.enum([
    'NOUVELLE',
    'VUE',
    'EN_REVUE',
    'SHORTLIST',
    'PROPOSEE_CLIENT',
    'ENTRETIEN',
    'ACCEPTEE',
    'REFUSEE',
    'RETIREE',
  ]),
  notesTrinexta: z.string().optional(),
  notesClient: z.string().optional(),
})

// ============================================
// ALERTES
// ============================================

export const createAlerteSchema = z.object({
  nom: z.string().optional(),
  competences: z.array(z.string()).optional(),
  tjmMin: z.number().min(0).optional(),
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE']).optional(),
  lieux: z.array(z.string()).optional(),
  frequence: z.enum(['INSTANTANEE', 'QUOTIDIENNE', 'HEBDOMADAIRE']).optional(),
})

// ============================================
// MESSAGES
// ============================================

export const sendMessageSchema = z.object({
  destinataireType: z.enum(['TALENT', 'CLIENT', 'ADMIN']),
  destinataireId: z.number().optional(),
  offreId: z.number().optional(),
  sujet: z.string().optional(),
  contenu: z.string().min(1, 'Message requis'),
})

// Types exports
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterTalentInput = z.infer<typeof registerTalentSchema>
export type RegisterClientInput = z.infer<typeof registerClientSchema>
export type UpdateTalentProfileInput = z.infer<typeof updateTalentProfileSchema>
export type AddExperienceInput = z.infer<typeof addExperienceSchema>
export type AddFormationInput = z.infer<typeof addFormationSchema>
export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
export type CreateOffreInput = z.infer<typeof createOffreSchema>
export type UpdateOffreInput = z.infer<typeof updateOffreSchema>
export type CreateCandidatureInput = z.infer<typeof createCandidatureSchema>
export type UpdateCandidatureStatusInput = z.infer<typeof updateCandidatureStatusSchema>
export type CreateAlerteInput = z.infer<typeof createAlerteSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
