import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { prisma } from "./db"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Génère un slug URL-friendly à partir d'un texte
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '') // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Évite les tirets multiples
    .substring(0, 100) // Limite la longueur
}

// ============================================
// GÉNÉRATION DE CODES UNIQUES
// Format: PREFIX + 4 chiffres aléatoires
// TA4523 (Talent), CL1287 (Client), MI7834 (Mission)
// ============================================

type CodePrefix = 'TA' | 'CL' | 'MI'

/**
 * Génère un code unique pour Talent (TA), Client (CL) ou Mission (MI)
 */
export async function generateUniqueCode(prefix: CodePrefix): Promise<string> {
  let code: string
  let exists = true
  let attempts = 0
  const maxAttempts = 100

  while (exists && attempts < maxAttempts) {
    // Génère 4 chiffres aléatoires
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    code = `${prefix}${randomNum}`

    // Vérifie si le code existe déjà
    switch (prefix) {
      case 'TA':
        const talent = await prisma.talent.findUnique({
          where: { codeUnique: code }
        })
        exists = !!talent
        break
      case 'CL':
        const client = await prisma.client.findUnique({
          where: { codeUnique: code }
        })
        exists = !!client
        break
      case 'MI':
        const offre = await prisma.offre.findUnique({
          where: { codeUnique: code }
        })
        exists = !!offre
        break
    }

    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error(`Impossible de générer un code unique pour ${prefix} après ${maxAttempts} tentatives`)
  }

  return code!
}

/**
 * Génère un code talent (TA + 4 chiffres)
 */
export async function generateTalentCode(): Promise<string> {
  return generateUniqueCode('TA')
}

/**
 * Génère un code client (CL + 4 chiffres)
 */
export async function generateClientCode(): Promise<string> {
  return generateUniqueCode('CL')
}

/**
 * Génère un code mission/offre (MI + 4 chiffres)
 */
export async function generateMissionCode(): Promise<string> {
  return generateUniqueCode('MI')
}

// ============================================
// FORMATAGE
// ============================================

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d)
}

/**
 * Formate une date courte
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

/**
 * Formate une date avec heure
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

/**
 * Formate une durée en français
 */
export function formatDuree(nombre: number, unite: 'JOURS' | 'MOIS'): string {
  if (unite === 'JOURS') {
    return nombre === 1 ? '1 jour' : `${nombre} jours`
  }
  return nombre === 1 ? '1 mois' : `${nombre} mois`
}

/**
 * Formate le TJM pour affichage
 */
export function formatTjm(tjm?: number | null, tjmMin?: number | null, tjmMax?: number | null, tjmADefinir?: boolean): string {
  if (tjmADefinir) {
    return 'TJM à définir'
  }
  if (tjmMin && tjmMax) {
    return `${tjmMin}€ - ${tjmMax}€ / jour`
  }
  if (tjm) {
    return `${tjm}€ / jour`
  }
  return 'TJM à définir'
}

/**
 * Formate la mobilité pour affichage
 */
export function formatMobilite(mobilite: string): string {
  const labels: Record<string, string> = {
    'FULL_REMOTE': 'Full Remote',
    'HYBRIDE': 'Hybride',
    'SUR_SITE': 'Sur site',
    'FLEXIBLE': 'Flexible',
    'DEPLACEMENT_MULTI_SITE': 'Multi-sites'
  }
  return labels[mobilite] || mobilite
}

/**
 * Formate la disponibilité pour affichage
 */
export function formatDisponibilite(disponibilite: string): string {
  const labels: Record<string, string> = {
    'IMMEDIATE': 'Immédiate',
    'SOUS_15_JOURS': 'Sous 15 jours',
    'SOUS_1_MOIS': 'Sous 1 mois',
    'SOUS_2_MOIS': 'Sous 2 mois',
    'SOUS_3_MOIS': 'Sous 3 mois',
    'DATE_PRECISE': 'Date précise',
    'NON_DISPONIBLE': 'Non disponible'
  }
  return labels[disponibilite] || disponibilite
}

/**
 * Formate la catégorie professionnelle pour affichage
 */
export function formatCategorie(categorie: string): string {
  const labels: Record<string, string> = {
    'DEVELOPPEUR': 'Développeur',
    'CHEF_DE_PROJET': 'Chef de projet',
    'SUPPORT_TECHNICIEN': 'Support / Technicien',
    'TECHNICIEN_HELPDESK_N1': 'Technicien Helpdesk N1',
    'TECHNICIEN_HELPDESK_N2': 'Technicien Helpdesk N2',
    'INGENIEUR_SYSTEME_RESEAU': 'Ingénieur Système / Réseau',
    'INGENIEUR_CLOUD': 'Ingénieur Cloud',
    'DATA_BI': 'Data / BI',
    'DEVOPS_SRE': 'DevOps / SRE',
    'CYBERSECURITE': 'Cybersécurité',
    'CONSULTANT_FONCTIONNEL': 'Consultant Fonctionnel',
    'ARCHITECTE': 'Architecte',
    'SCRUM_MASTER': 'Scrum Master',
    'PRODUCT_OWNER': 'Product Owner',
    'AUTRE': 'Autre'
  }
  return labels[categorie] || categorie
}

/**
 * Formate le statut d'une offre pour affichage
 */
export function formatOffreStatus(statut: string): string {
  const labels: Record<string, string> = {
    'BROUILLON': 'Brouillon',
    'ENVOYEE': 'Envoyée',
    'EN_ATTENTE_VALIDATION': 'En attente de validation',
    'PUBLIEE': 'Publiée',
    'SHORTLIST_ENVOYEE': 'Shortlist envoyée',
    'ENTRETIENS_EN_COURS': 'Entretiens en cours',
    'POURVUE': 'Pourvue',
    'FERMEE': 'Fermée',
    'ANNULEE': 'Annulée',
    'EXPIREE': 'Expirée'
  }
  return labels[statut] || statut
}

/**
 * Formate le statut d'une candidature pour affichage
 */
export function formatCandidatureStatus(statut: string): string {
  const labels: Record<string, string> = {
    'NOUVELLE': 'Nouvelle',
    'VUE': 'Vue',
    'EN_REVUE': 'En revue',
    'PRE_SELECTIONNE': 'Pré-sélectionné',
    'SHORTLIST': 'En shortlist',
    'PROPOSEE_CLIENT': 'Proposée au client',
    'ENTRETIEN_DEMANDE': 'Entretien demandé',
    'ENTRETIEN_PLANIFIE': 'Entretien planifié',
    'ENTRETIEN_REALISE': 'Entretien réalisé',
    'ACCEPTEE': 'Acceptée',
    'REFUSEE': 'Refusée',
    'MISSION_PERDUE': 'Mission perdue',
    'RETIREE': 'Retirée'
  }
  return labels[statut] || statut
}

// ============================================
// VALIDATION
// ============================================

/**
 * Valide un numéro SIRET (14 chiffres + clé de Luhn)
 */
export function isValidSiret(siret: string): boolean {
  // Supprime les espaces
  const cleanSiret = siret.replace(/\s/g, '')

  // Vérifie le format (14 chiffres)
  if (!/^\d{14}$/.test(cleanSiret)) {
    return false
  }

  // Algorithme de Luhn
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleanSiret[i], 10)
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }

  return sum % 10 === 0
}

/**
 * Valide un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valide un numéro de téléphone français
 */
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s.-]/g, '')
  return /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/.test(cleanPhone)
}

// ============================================
// TEXTE
// ============================================

/**
 * Tronque un texte avec ellipse
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Met en majuscule la première lettre
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Génère les initiales d'un nom
 */
export function getInitials(prenom: string, nom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
}

// ============================================
// CONSTANTES
// ============================================

export const TRINEXTA_INFO = {
  nom: 'TRINEXTA by TrusTech IT Support',
  adresse: '74B Boulevard Henri Dunant',
  codePostal: '91100',
  ville: 'Corbeil-Essonnes',
  telephone: '09 78 25 07 46',
  email: 'contact@trinexta.fr',
  formeJuridique: 'Société par actions simplifiée (SAS)',
  capital: '300 €',
  siret: '94202008200015',
  codeNAF: '6202A',
  tvaIntra: 'FR81942020082',
  siteWeb: 'https://talentero.fr'
} as const

export const CATEGORIES_PROFESSIONNELLES = [
  { value: 'DEVELOPPEUR', label: 'Développeur' },
  { value: 'CHEF_DE_PROJET', label: 'Chef de projet' },
  { value: 'SUPPORT_TECHNICIEN', label: 'Support / Technicien' },
  { value: 'TECHNICIEN_HELPDESK_N1', label: 'Technicien Helpdesk N1' },
  { value: 'TECHNICIEN_HELPDESK_N2', label: 'Technicien Helpdesk N2' },
  { value: 'INGENIEUR_SYSTEME_RESEAU', label: 'Ingénieur Système / Réseau' },
  { value: 'INGENIEUR_CLOUD', label: 'Ingénieur Cloud' },
  { value: 'DATA_BI', label: 'Data / BI' },
  { value: 'DEVOPS_SRE', label: 'DevOps / SRE' },
  { value: 'CYBERSECURITE', label: 'Cybersécurité' },
  { value: 'CONSULTANT_FONCTIONNEL', label: 'Consultant Fonctionnel' },
  { value: 'ARCHITECTE', label: 'Architecte' },
  { value: 'SCRUM_MASTER', label: 'Scrum Master' },
  { value: 'PRODUCT_OWNER', label: 'Product Owner' },
  { value: 'AUTRE', label: 'Autre' }
] as const

export const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'DEPLACEMENT_MULTI_SITE', label: 'Déplacement multi-sites' }
] as const

export const DISPONIBILITE_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immédiate' },
  { value: 'SOUS_15_JOURS', label: 'Sous 15 jours' },
  { value: 'SOUS_1_MOIS', label: 'Sous 1 mois' },
  { value: 'SOUS_2_MOIS', label: 'Sous 2 mois' },
  { value: 'SOUS_3_MOIS', label: 'Sous 3 mois' },
  { value: 'DATE_PRECISE', label: 'Date précise' },
  { value: 'NON_DISPONIBLE', label: 'Non disponible' }
] as const

export const SECTEURS_IDF = [
  { value: 'paris', label: 'Paris (75)' },
  { value: '92', label: 'Hauts-de-Seine (92)' },
  { value: '93', label: 'Seine-Saint-Denis (93)' },
  { value: '94', label: 'Val-de-Marne (94)' },
  { value: '91', label: 'Essonne (91)' },
  { value: '78', label: 'Yvelines (78)' },
  { value: '77', label: 'Seine-et-Marne (77)' },
  { value: '95', label: 'Val-d\'Oise (95)' }
] as const

export const REGIONS_FRANCE = [
  { value: 'ile-de-france', label: 'Île-de-France' },
  { value: 'auvergne-rhone-alpes', label: 'Auvergne-Rhône-Alpes' },
  { value: 'nouvelle-aquitaine', label: 'Nouvelle-Aquitaine' },
  { value: 'occitanie', label: 'Occitanie' },
  { value: 'hauts-de-france', label: 'Hauts-de-France' },
  { value: 'provence-alpes-cote-azur', label: 'Provence-Alpes-Côte d\'Azur' },
  { value: 'grand-est', label: 'Grand Est' },
  { value: 'pays-de-la-loire', label: 'Pays de la Loire' },
  { value: 'bretagne', label: 'Bretagne' },
  { value: 'normandie', label: 'Normandie' },
  { value: 'bourgogne-franche-comte', label: 'Bourgogne-Franche-Comté' },
  { value: 'centre-val-de-loire', label: 'Centre-Val de Loire' },
  { value: 'corse', label: 'Corse' }
] as const
