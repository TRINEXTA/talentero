/**
 * Schémas de validation Zod
 * Talentero - Plateforme de recrutement freelance IT
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
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide (14 chiffres)').optional(),
  siretEnCoursCreation: z.boolean().optional(),
  telephone: z.string().optional(),
})

export const registerClientSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
  raisonSociale: z.string().min(2, 'Raison sociale requise'),
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide (14 chiffres)').optional(),
  typeClient: z.enum(['DIRECT', 'SOUSTRAITANCE']).optional(),
  nombreSites: z.number().min(1).optional(),
  // Contact principal
  contactPrenom: z.string().min(2, 'Prénom du contact requis'),
  contactNom: z.string().min(2, 'Nom du contact requis'),
  contactEmail: z.string().email('Email du contact invalide'),
  contactTelephone: z.string().optional(),
  contactPoste: z.string().optional(),
  // Adresse
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
})

export const activateAccountSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

export const newPasswordSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(8, 'Mot de passe minimum 8 caractères'),
})

// ============================================
// TALENT
// ============================================

export const updateTalentProfileSchema = z.object({
  // Non modifiable: prenom, nom, siret (seulement par admin)
  telephone: z.string().optional(),
  photoUrl: z.string().url().optional().nullable().or(z.literal('')),
  nationalite: z.string().optional(),

  // Adresse
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),

  // Mobilité
  zonesIntervention: z.array(z.string()).optional(),
  permisConduire: z.boolean().optional(),
  vehicule: z.boolean().optional(),
  accepteDeplacementEtranger: z.boolean().optional(),

  // Profil Professionnel
  titrePoste: z.string().optional(),
  categorieProfessionnelle: z.enum([
    'DEVELOPPEUR',
    'CHEF_DE_PROJET',
    'SUPPORT_TECHNICIEN',
    'TECHNICIEN_HELPDESK_N1',
    'TECHNICIEN_HELPDESK_N2',
    'INGENIEUR_SYSTEME_RESEAU',
    'INGENIEUR_CLOUD',
    'DATA_BI',
    'DEVOPS_SRE',
    'CYBERSECURITE',
    'CONSULTANT_FONCTIONNEL',
    'ARCHITECTE',
    'SCRUM_MASTER',
    'PRODUCT_OWNER',
    'AUTRE',
  ]).optional(),
  bio: z.string().max(2000).optional(),
  competences: z.array(z.string()).optional(),
  anneesExperience: z.number().min(0).optional(),

  // TJM
  tjm: z.number().min(0).optional(),
  tjmMin: z.number().min(0).optional(),
  tjmMax: z.number().min(0).optional(),

  // Mobilité de travail
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE', 'DEPLACEMENT_MULTI_SITE']).optional(),
  zonesGeographiques: z.array(z.string()).optional(),

  // Disponibilité
  disponibilite: z.enum([
    'IMMEDIATE',
    'SOUS_15_JOURS',
    'SOUS_1_MOIS',
    'SOUS_2_MOIS',
    'SOUS_3_MOIS',
    'DATE_PRECISE',
    'NON_DISPONIBLE',
  ]).optional(),
  disponibleLe: z.string().datetime().optional().nullable().or(z.literal('')),

  // Compétences détaillées
  logiciels: z.array(z.string()).optional(),
  frameworks: z.array(z.string()).optional(),
  baseDonnees: z.array(z.string()).optional(),
  methodologies: z.array(z.string()).optional(),
  outils: z.array(z.string()).optional(),

  // Extras
  softSkills: z.array(z.string()).optional(),
  langues: z.array(z.string()).optional(),
  loisirs: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
  githubUrl: z.string().url().optional().nullable().or(z.literal('')),
  portfolioUrl: z.string().url().optional().nullable().or(z.literal('')),

  // Visibilité
  visiblePublic: z.boolean().optional(),
  visibleVitrine: z.boolean().optional(),
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
  description: z.string().max(2000).optional(),
  secteurActivite: z.string().optional(),
  tailleEntreprise: z.enum(['TPE', 'PME', 'ETI', 'GRANDE']).optional(),
  siteWeb: z.string().url().optional().nullable().or(z.literal('')),
  logoUrl: z.string().url().optional().nullable().or(z.literal('')),
  nombreSites: z.number().min(1).optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
})

export const addClientSiteSchema = z.object({
  nom: z.string().min(2, 'Nom du site requis'),
  adresse: z.string().min(2, 'Adresse requise'),
  codePostal: z.string().min(2, 'Code postal requis'),
  ville: z.string().min(2, 'Ville requise'),
  pays: z.string().optional(),
  telephone: z.string().optional(),
  estSiegeSocial: z.boolean().optional(),
})

export const addClientContactSchema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  poste: z.string().optional(),
  estContactPrincipal: z.boolean().optional(),
  recevoirNotifications: z.boolean().optional(),
})

// ============================================
// OFFRES
// ============================================

export const createOffreSchema = z.object({
  titre: z.string().min(5, 'Titre minimum 5 caractères'),
  description: z.string().min(50, 'Description minimum 50 caractères'),
  responsabilites: z.string().optional(),
  profilRecherche: z.string().optional(),

  // Compétences
  competencesRequises: z.array(z.string()).min(1, 'Au moins une compétence requise'),
  competencesSouhaitees: z.array(z.string()).optional(),

  // TJM (TRINEXTA gère tjmClientReel en interne)
  tjmAffiche: z.number().min(0).optional(),
  tjmMin: z.number().min(0).optional(),
  tjmMax: z.number().min(0).optional(),
  tjmADefinir: z.boolean().optional(),

  // Localisation
  secteur: z.string().optional(),
  lieu: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  region: z.string().optional(),

  // Mode de travail
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE', 'DEPLACEMENT_MULTI_SITE']).optional(),
  deplacementMultiSite: z.boolean().optional(),
  deplacementEtranger: z.boolean().optional(),

  // Durée
  dureeNombre: z.number().min(1).optional(),
  dureeUnite: z.enum(['JOURS', 'MOIS']).optional(),
  renouvelable: z.boolean().optional(),
  dateDebut: z.string().datetime().optional(),
  dateFin: z.string().datetime().optional(),

  // Postes
  nombrePostes: z.number().min(1).optional(),

  // Expérience
  experienceMin: z.number().min(0).optional(),

  // Habilitations
  habilitationRequise: z.boolean().optional(),
  typeHabilitation: z.string().optional(),

  // Type d'offre (admin seulement)
  typeOffre: z.enum(['CLIENT_DIRECT', 'SOUSTRAITANCE', 'TRINEXTA']).optional(),
})

export const updateOffreSchema = createOffreSchema.partial()

// Schema admin pour les offres (inclut tjmClientReel)
export const adminCreateOffreSchema = createOffreSchema.extend({
  tjmClientReel: z.number().min(0).optional(),
  clientId: z.number().optional(),
  offreTrinexta: z.boolean().optional(),
})

export const updateOffreStatusSchema = z.object({
  statut: z.enum([
    'BROUILLON',
    'ENVOYEE',
    'EN_ATTENTE_VALIDATION',
    'PUBLIEE',
    'SHORTLIST_ENVOYEE',
    'ENTRETIENS_EN_COURS',
    'POURVUE',
    'FERMEE',
    'ANNULEE',
    'EXPIREE',
  ]),
  resultatMission: z.enum(['EN_ATTENTE', 'GAGNEE', 'PERDUE']).optional(),
})

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
  dateDisponibilite: z.string().datetime().optional(),
})

export const updateCandidatureStatusSchema = z.object({
  statut: z.enum([
    'NOUVELLE',
    'VUE',
    'EN_REVUE',
    'PRE_SELECTIONNE',
    'SHORTLIST',
    'PROPOSEE_CLIENT',
    'ENTRETIEN_DEMANDE',
    'ENTRETIEN_PLANIFIE',
    'ENTRETIEN_REALISE',
    'ACCEPTEE',
    'REFUSEE',
    'MISSION_PERDUE',
    'RETIREE',
  ]),
  notesTrinexta: z.string().optional(),
  notesClient: z.string().optional(),
})

// ============================================
// SHORTLIST
// ============================================

export const createShortlistSchema = z.object({
  offreId: z.number(),
  candidatureIds: z.array(z.number()).min(1, 'Au moins un candidat requis'),
  notes: z.string().optional(),
})

export const updateShortlistCandidatSchema = z.object({
  statutClient: z.enum([
    'EN_ATTENTE',
    'VU',
    'DEMANDE_ENTRETIEN',
    'DEMANDE_INFOS',
    'SELECTIONNE',
    'REFUSE',
  ]),
  commentaireClient: z.string().optional(),
  questionClient: z.string().optional(),
})

// ============================================
// ENTRETIENS
// ============================================

export const createEntretienSchema = z.object({
  candidatureId: z.number(),
  dateProposee: z.string().datetime(),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis').optional(),
  typeVisio: z.enum(['TEAMS', 'MEET', 'ZOOM', 'AUTRE']).optional(),
})

export const confirmEntretienSchema = z.object({
  confirme: z.boolean(),
  dateAlternative: z.string().datetime().optional(),
  heureAlternative: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis').optional(),
})

export const updateEntretienResultatSchema = z.object({
  resultat: z.enum(['EN_ATTENTE', 'POSITIF', 'NEGATIF', 'RESERVE']),
  notesEntretien: z.string().optional(),
})

// ============================================
// MESSAGERIE
// ============================================

export const createConversationSchema = z.object({
  offreId: z.number(),
  sujet: z.string().optional(),
  premierMessage: z.string().min(1, 'Message requis'),
})

export const sendMessageSchema = z.object({
  conversationId: z.number(),
  contenu: z.string().min(1, 'Message requis'),
  pieceJointe: z.string().url().optional(),
  pieceJointeNom: z.string().optional(),
})

// ============================================
// ALERTES
// ============================================

export const createAlerteSchema = z.object({
  nom: z.string().optional(),
  competences: z.array(z.string()).optional(),
  tjmMin: z.number().min(0).optional(),
  mobilite: z.enum(['FULL_REMOTE', 'HYBRIDE', 'SUR_SITE', 'FLEXIBLE', 'DEPLACEMENT_MULTI_SITE']).optional(),
  lieux: z.array(z.string()).optional(),
  frequence: z.enum(['INSTANTANEE', 'QUOTIDIENNE', 'HEBDOMADAIRE']).optional(),
})

// ============================================
// ADMIN
// ============================================

export const adminUpdateTalentSchema = z.object({
  statut: z.enum(['ACTIF', 'INACTIF', 'EN_MISSION', 'SUSPENDU']).optional(),
  siretVerifie: z.boolean().optional(),
  visibleVitrine: z.boolean().optional(),
  prenom: z.string().min(2).optional(),
  nom: z.string().min(2).optional(),
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide').optional(),
})

export const adminUpdateClientSchema = z.object({
  statut: z.enum(['EN_ATTENTE', 'ACTIF', 'SUSPENDU', 'ARCHIVE']).optional(),
  valideParAdmin: z.boolean().optional(),
  typeClient: z.enum(['DIRECT', 'SOUSTRAITANCE']).optional(),
})

export const adminImportCVSchema = z.object({
  email: z.string().email('Email invalide'),
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  cvFile: z.string(), // Base64 ou URL
  siret: z.string().regex(/^\d{14}$/, 'SIRET invalide').optional(),
})

// ============================================
// Types exports
// ============================================

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterTalentInput = z.infer<typeof registerTalentSchema>
export type RegisterClientInput = z.infer<typeof registerClientSchema>
export type ActivateAccountInput = z.infer<typeof activateAccountSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type NewPasswordInput = z.infer<typeof newPasswordSchema>

export type UpdateTalentProfileInput = z.infer<typeof updateTalentProfileSchema>
export type AddExperienceInput = z.infer<typeof addExperienceSchema>
export type AddFormationInput = z.infer<typeof addFormationSchema>

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>
export type AddClientSiteInput = z.infer<typeof addClientSiteSchema>
export type AddClientContactInput = z.infer<typeof addClientContactSchema>

export type CreateOffreInput = z.infer<typeof createOffreSchema>
export type UpdateOffreInput = z.infer<typeof updateOffreSchema>
export type AdminCreateOffreInput = z.infer<typeof adminCreateOffreSchema>
export type UpdateOffreStatusInput = z.infer<typeof updateOffreStatusSchema>

export type CreateCandidatureInput = z.infer<typeof createCandidatureSchema>
export type UpdateCandidatureStatusInput = z.infer<typeof updateCandidatureStatusSchema>

export type CreateShortlistInput = z.infer<typeof createShortlistSchema>
export type UpdateShortlistCandidatInput = z.infer<typeof updateShortlistCandidatSchema>

export type CreateEntretienInput = z.infer<typeof createEntretienSchema>
export type ConfirmEntretienInput = z.infer<typeof confirmEntretienSchema>
export type UpdateEntretienResultatInput = z.infer<typeof updateEntretienResultatSchema>

export type CreateConversationInput = z.infer<typeof createConversationSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>

export type CreateAlerteInput = z.infer<typeof createAlerteSchema>

export type AdminUpdateTalentInput = z.infer<typeof adminUpdateTalentSchema>
export type AdminUpdateClientInput = z.infer<typeof adminUpdateClientSchema>
export type AdminImportCVInput = z.infer<typeof adminImportCVSchema>
