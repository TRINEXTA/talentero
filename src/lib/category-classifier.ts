/**
 * Classificateur automatique de catégories professionnelles
 * Analyse le titre de poste et les compétences pour déterminer la catégorie
 */

import { CategorieProfessionnelle } from '@prisma/client'

// Mots-clés pour chaque catégorie (ordre de priorité important)
const CATEGORY_KEYWORDS: Record<CategorieProfessionnelle, string[]> = {
  ARCHITECTE: [
    'architecte', 'architect', 'solution architect', 'enterprise architect',
    'architecte technique', 'architecte si', 'architecte logiciel'
  ],
  CHEF_DE_PROJET: [
    'chef de projet', 'project manager', 'project lead', 'lead project',
    'responsable projet', 'directeur de projet', 'delivery manager',
    'program manager', 'programme manager'
  ],
  SCRUM_MASTER: [
    'scrum master', 'agile coach', 'coach agile', 'agiliste'
  ],
  PRODUCT_OWNER: [
    'product owner', 'po', 'product manager', 'responsable produit'
  ],
  CYBERSECURITE: [
    'cybersécurité', 'cybersecurity', 'security', 'sécurité', 'soc',
    'pentester', 'pentest', 'rssi', 'ciso', 'analyste soc', 'security analyst',
    'ethical hacker', 'consultant sécurité'
  ],
  INGENIEUR_CLOUD: [
    'cloud', 'aws', 'azure', 'gcp', 'google cloud', 'cloud engineer',
    'ingénieur cloud', 'cloud architect', 'devops', 'sre', 'site reliability',
    'plateforme', 'platform engineer', 'kubernetes', 'k8s'
  ],
  DATA_BI: [
    'data', 'bi', 'business intelligence', 'data engineer', 'data analyst',
    'data scientist', 'analytics', 'big data', 'machine learning', 'ml',
    'ia', 'ai', 'intelligence artificielle', 'etl', 'datawarehouse',
    'power bi', 'tableau', 'qlik'
  ],
  DEVOPS_SRE: [
    'devops', 'sre', 'site reliability', 'infrastructure', 'ci/cd',
    'automation', 'devsecops', 'release manager', 'build engineer'
  ],
  DEVELOPPEUR: [
    'développeur', 'developer', 'dev', 'fullstack', 'full-stack', 'full stack',
    'frontend', 'front-end', 'front end', 'backend', 'back-end', 'back end',
    'software engineer', 'ingénieur développement', 'programmeur',
    'web developer', 'mobile developer', 'lead dev', 'lead développeur',
    'tech lead', 'software developer'
  ],
  CONSULTANT_FONCTIONNEL: [
    'consultant fonctionnel', 'functional consultant', 'business analyst',
    'analyste fonctionnel', 'moa', 'amoa', 'consultant erp', 'consultant sap',
    'consultant oracle', 'consultant salesforce', 'consultant dynamics'
  ],
  INGENIEUR_SYSTEME_RESEAU: [
    'ingénieur système', 'system engineer', 'ingénieur réseau', 'network engineer',
    'administrateur système', 'sysadmin', 'admin système', 'admin réseau',
    'administrateur réseau', 'ingénieur infrastructure', 'network admin',
    'linux admin', 'windows admin', 'vmware', 'virtualisation'
  ],
  TECHNICIEN_HELPDESK_N2: [
    'technicien n2', 'helpdesk n2', 'support n2', 'niveau 2', 'n2',
    'technicien support n2', 'technicien confirmé', 'technicien senior'
  ],
  TECHNICIEN_HELPDESK_N1: [
    'technicien n1', 'helpdesk n1', 'support n1', 'niveau 1', 'n1',
    'technicien support n1', 'technicien débutant', 'technicien junior'
  ],
  SUPPORT_TECHNICIEN: [
    'technicien', 'support', 'helpdesk', 'help desk', 'technicien support',
    'technicien informatique', 'technicien de proximité', 'technicien poste de travail',
    'desktop support', 'it support', 'maintenance', 'dépanneur'
  ],
  AUTRE: []
}

// Compétences associées à chaque catégorie (pour affiner la classification)
const CATEGORY_SKILLS: Record<CategorieProfessionnelle, string[]> = {
  ARCHITECTE: ['architecture', 'design patterns', 'uml', 'togaf', 'microservices'],
  CHEF_DE_PROJET: ['gestion de projet', 'ms project', 'jira', 'confluence', 'planning', 'budget'],
  SCRUM_MASTER: ['scrum', 'agile', 'kanban', 'safe', 'sprint', 'retrospective'],
  PRODUCT_OWNER: ['backlog', 'user stories', 'roadmap', 'product vision', 'stakeholder'],
  CYBERSECURITE: ['firewall', 'ids', 'ips', 'siem', 'pentest', 'iso 27001', 'nist'],
  INGENIEUR_CLOUD: ['aws', 'azure', 'gcp', 'terraform', 'ansible', 'docker', 'kubernetes'],
  DATA_BI: ['sql', 'python', 'r', 'spark', 'hadoop', 'tableau', 'power bi'],
  DEVOPS_SRE: ['jenkins', 'gitlab ci', 'docker', 'kubernetes', 'terraform', 'ansible'],
  DEVELOPPEUR: ['javascript', 'typescript', 'python', 'java', 'c#', 'react', 'angular', 'vue', 'node'],
  CONSULTANT_FONCTIONNEL: ['sap', 'oracle', 'salesforce', 'dynamics', 'processus métier'],
  INGENIEUR_SYSTEME_RESEAU: ['linux', 'windows server', 'vmware', 'cisco', 'active directory', 'dns', 'dhcp'],
  TECHNICIEN_HELPDESK_N2: ['ad', 'exchange', 'o365', 'scripting', 'powershell'],
  TECHNICIEN_HELPDESK_N1: ['windows', 'office', 'ticketing', 'glpi', 'itil'],
  SUPPORT_TECHNICIEN: ['windows', 'office', 'imprimante', 'réseau', 'dépannage'],
  AUTRE: []
}

// Hiérarchie des catégories (un ingénieur peut faire du technicien)
export const CATEGORY_HIERARCHY: Partial<Record<CategorieProfessionnelle, CategorieProfessionnelle[]>> = {
  ARCHITECTE: [
    'INGENIEUR_SYSTEME_RESEAU', 'INGENIEUR_CLOUD', 'DEVELOPPEUR', 'DEVOPS_SRE'
  ],
  INGENIEUR_SYSTEME_RESEAU: [
    'SUPPORT_TECHNICIEN', 'TECHNICIEN_HELPDESK_N1', 'TECHNICIEN_HELPDESK_N2'
  ],
  INGENIEUR_CLOUD: [
    'DEVOPS_SRE', 'SUPPORT_TECHNICIEN'
  ],
  TECHNICIEN_HELPDESK_N2: [
    'TECHNICIEN_HELPDESK_N1', 'SUPPORT_TECHNICIEN'
  ],
  TECHNICIEN_HELPDESK_N1: [
    'SUPPORT_TECHNICIEN'
  ],
  CHEF_DE_PROJET: [
    'SCRUM_MASTER', 'PRODUCT_OWNER'
  ],
  DEVELOPPEUR: [
    'DEVOPS_SRE'
  ]
}

/**
 * Normalise un texte pour la comparaison
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Garde lettres, chiffres, espaces
    .replace(/\s+/g, ' ')            // Normalise les espaces
    .trim()
}

/**
 * Calcule un score de matching entre un texte et des mots-clés
 */
function calculateKeywordScore(text: string, keywords: string[]): number {
  const normalizedText = normalize(text)
  let score = 0

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword)
    if (normalizedText.includes(normalizedKeyword)) {
      // Plus le mot-clé est long, plus il est spécifique → plus de points
      score += normalizedKeyword.length
    }
  }

  return score
}

/**
 * Classifie automatiquement un talent dans une catégorie professionnelle
 * basé sur son titre de poste et ses compétences
 */
export function classifyTalent(
  titrePoste: string | null | undefined,
  competences: string[]
): CategorieProfessionnelle {
  const scores: Map<CategorieProfessionnelle, number> = new Map()

  // Initialise les scores
  for (const category of Object.keys(CATEGORY_KEYWORDS) as CategorieProfessionnelle[]) {
    scores.set(category, 0)
  }

  // Score basé sur le titre (poids x3)
  if (titrePoste) {
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const titleScore = calculateKeywordScore(titrePoste, keywords) * 3
      scores.set(category as CategorieProfessionnelle, (scores.get(category as CategorieProfessionnelle) || 0) + titleScore)
    }
  }

  // Score basé sur les compétences (poids x1)
  const competencesText = competences.join(' ')
  for (const [category, skills] of Object.entries(CATEGORY_SKILLS)) {
    const skillScore = calculateKeywordScore(competencesText, skills)
    scores.set(category as CategorieProfessionnelle, (scores.get(category as CategorieProfessionnelle) || 0) + skillScore)
  }

  // Bonus pour les mots-clés de catégorie dans les compétences
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const competenceKeywordScore = calculateKeywordScore(competencesText, keywords)
    scores.set(category as CategorieProfessionnelle, (scores.get(category as CategorieProfessionnelle) || 0) + competenceKeywordScore)
  }

  // Trouve la catégorie avec le meilleur score
  let bestCategory: CategorieProfessionnelle = 'AUTRE'
  let bestScore = 0

  for (const [category, score] of scores.entries()) {
    if (score > bestScore && category !== 'AUTRE') {
      bestScore = score
      bestCategory = category
    }
  }

  // Si aucun score significatif, retourne AUTRE
  if (bestScore < 5) {
    return 'AUTRE'
  }

  return bestCategory
}

/**
 * Vérifie si une catégorie peut matcher avec une autre (hiérarchie)
 * Ex: Un INGENIEUR_SYSTEME_RESEAU peut matcher avec SUPPORT_TECHNICIEN
 */
export function canCategoryMatch(
  talentCategory: CategorieProfessionnelle,
  offreCategory: CategorieProfessionnelle | null | undefined
): boolean {
  // Même catégorie = match
  if (talentCategory === offreCategory) {
    return true
  }

  // Pas de catégorie sur l'offre = match avec tout
  if (!offreCategory) {
    return true
  }

  // Vérifie la hiérarchie
  const acceptedCategories = CATEGORY_HIERARCHY[talentCategory]
  if (acceptedCategories && acceptedCategories.includes(offreCategory)) {
    return true
  }

  return false
}

/**
 * Retourne toutes les catégories compatibles pour un talent
 */
export function getCompatibleCategories(
  talentCategory: CategorieProfessionnelle
): CategorieProfessionnelle[] {
  const compatible: CategorieProfessionnelle[] = [talentCategory]

  const lowerCategories = CATEGORY_HIERARCHY[talentCategory]
  if (lowerCategories) {
    compatible.push(...lowerCategories)
  }

  return compatible
}

/**
 * Liste des sociétés de portage salarial françaises
 */
export const SOCIETES_PORTAGE = [
  { value: 'itg', label: 'ITG (Institut du Temps Géré)' },
  { value: 'admissions', label: "AD'Missions" },
  { value: 'portageo', label: 'Portageo' },
  { value: 'webportage', label: 'Webportage' },
  { value: 'jump', label: 'Jump' },
  { value: 'umalis', label: 'Umalis' },
  { value: 'cadresenmission', label: 'Cadres en Mission' },
  { value: 'freelancecom', label: 'Freelance.com' },
  { value: 'rhapsody', label: 'Rhapsody' },
  { value: 'ventoris', label: 'Ventoris' },
  { value: 'autre', label: 'Autre société de portage' }
]

/**
 * Labels français pour les catégories
 */
export const CATEGORY_LABELS: Record<CategorieProfessionnelle, string> = {
  DEVELOPPEUR: 'Développeur',
  CHEF_DE_PROJET: 'Chef de Projet',
  SUPPORT_TECHNICIEN: 'Technicien Support',
  TECHNICIEN_HELPDESK_N1: 'Technicien Helpdesk N1',
  TECHNICIEN_HELPDESK_N2: 'Technicien Helpdesk N2',
  INGENIEUR_SYSTEME_RESEAU: 'Ingénieur Système & Réseau',
  INGENIEUR_CLOUD: 'Ingénieur Cloud',
  DATA_BI: 'Data / BI',
  DEVOPS_SRE: 'DevOps / SRE',
  CYBERSECURITE: 'Cybersécurité',
  CONSULTANT_FONCTIONNEL: 'Consultant Fonctionnel',
  ARCHITECTE: 'Architecte',
  SCRUM_MASTER: 'Scrum Master',
  PRODUCT_OWNER: 'Product Owner',
  AUTRE: 'Autre'
}
