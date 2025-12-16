/**
 * Générateur de CV Anonymisé pour TRINEXTA
 * Masque les informations personnelles, conserve les compétences
 * Format optimisé pour la sous-traitance
 */

import { prisma } from './db'
import { CATEGORY_LABELS } from './category-classifier'

export interface AnonymizedCV {
  codeUnique: string
  categorie: string
  categorieLabel: string
  titrePoste: string | null
  anneesExperience: number
  competences: string[]
  langues: string[]
  certifications: string[]
  mobilite: string
  disponibilite: string
  tjm: number | null
  tjmMin: number | null
  tjmMax: number | null
  experiences: {
    poste: string
    duree: string
    description: string | null
    competences: string[]
  }[]
  formations: {
    diplome: string
    annee: number | null
  }[]
}

/**
 * Labels français pour la mobilité
 */
const MOBILITE_LABELS: Record<string, string> = {
  FULL_REMOTE: 'Full Remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
  FLEXIBLE: 'Flexible',
  DEPLACEMENT_MULTI_SITE: 'Multi-sites'
}

/**
 * Labels français pour la disponibilité
 */
const DISPONIBILITE_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immédiate',
  SOUS_15_JOURS: 'Sous 15 jours',
  SOUS_1_MOIS: 'Sous 1 mois',
  SOUS_2_MOIS: 'Sous 2 mois',
  SOUS_3_MOIS: 'Sous 3 mois',
  DATE_PRECISE: 'Date précise',
  NON_DISPONIBLE: 'Non disponible'
}

/**
 * Calcule la durée entre deux dates en format lisible
 */
function calculateDuration(dateDebut: Date, dateFin: Date | null): string {
  const end = dateFin || new Date()
  const months = Math.floor((end.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24 * 30))
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) {
    return `${remainingMonths} mois`
  } else if (remainingMonths === 0) {
    return `${years} an${years > 1 ? 's' : ''}`
  } else {
    return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`
  }
}

/**
 * Récupère les données d'un talent pour génération CV anonyme
 */
export async function getAnonymizedCVData(talentId: number): Promise<AnonymizedCV | null> {
  const talent = await prisma.talent.findUnique({
    where: { id: talentId },
    include: {
      experiences: {
        orderBy: { dateDebut: 'desc' }
      },
      formations: {
        orderBy: { annee: 'desc' }
      }
    }
  })

  if (!talent) return null

  return {
    codeUnique: talent.codeUnique,
    categorie: talent.categorieProfessionnelle || 'AUTRE',
    categorieLabel: CATEGORY_LABELS[talent.categorieProfessionnelle || 'AUTRE'] || 'Autre',
    titrePoste: talent.titrePoste,
    anneesExperience: talent.anneesExperience,
    competences: talent.competences,
    langues: talent.langues,
    certifications: talent.certifications,
    mobilite: MOBILITE_LABELS[talent.mobilite] || talent.mobilite,
    disponibilite: DISPONIBILITE_LABELS[talent.disponibilite] || talent.disponibilite,
    tjm: talent.tjm,
    tjmMin: talent.tjmMin,
    tjmMax: talent.tjmMax,
    experiences: talent.experiences.map(exp => ({
      poste: exp.poste,
      duree: calculateDuration(exp.dateDebut, exp.dateFin),
      description: exp.description,
      competences: exp.competences
    })),
    formations: talent.formations.map(form => ({
      diplome: form.diplome,
      annee: form.annee
    }))
  }
}

/**
 * Génère le HTML d'un CV anonymisé
 */
export function generateAnonymizedCVHtml(cv: AnonymizedCV): string {
  const experiencesHtml = cv.experiences.map(exp => `
    <div class="experience">
      <div class="exp-header">
        <span class="exp-title">${exp.poste}</span>
        <span class="exp-duration">${exp.duree}</span>
      </div>
      ${exp.description ? `<p class="exp-desc">${exp.description}</p>` : ''}
      ${exp.competences.length > 0 ? `
        <div class="exp-skills">
          ${exp.competences.map(c => `<span class="skill-tag">${c}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')

  const formationsHtml = cv.formations.map(form => `
    <div class="formation">
      <span class="form-name">${form.diplome}</span>
      ${form.annee ? `<span class="form-year">${form.annee}</span>` : ''}
    </div>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CV Anonymisé - ${cv.codeUnique}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
    }
    .page {
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 20mm;
      background: #ffffff;
    }
    @media print {
      .page { padding: 15mm; }
    }

    /* Header TRINEXTA */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #1e3a5f;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: bold;
      font-size: 20px;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #1e3a5f;
    }
    .logo-subtitle {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .candidate-ref {
      text-align: right;
    }
    .candidate-code {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a5f;
    }
    .candidate-category {
      font-size: 12px;
      color: #2563eb;
      background: #eff6ff;
      padding: 4px 12px;
      border-radius: 20px;
      display: inline-block;
      margin-top: 4px;
    }

    /* Title Section */
    .title-section {
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .job-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .key-info {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 11px;
      color: #64748b;
    }
    .key-info span {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .key-info strong {
      color: #1e293b;
    }

    /* Skills Section */
    .skills-section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e3a5f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background: #eff6ff;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
    }
    .skill-tag.primary {
      background: #1e3a5f;
      color: #ffffff;
    }

    /* Experiences */
    .experiences-section {
      margin-bottom: 24px;
    }
    .experience {
      margin-bottom: 16px;
      padding-left: 16px;
      border-left: 3px solid #2563eb;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .exp-title {
      font-weight: 600;
      color: #1e293b;
    }
    .exp-duration {
      font-size: 10px;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .exp-desc {
      font-size: 10px;
      color: #475569;
      margin-bottom: 8px;
    }
    .exp-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .exp-skills .skill-tag {
      font-size: 9px;
      padding: 2px 8px;
    }

    /* Formations */
    .formations-section {
      margin-bottom: 24px;
    }
    .formation {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .form-name {
      font-weight: 500;
    }
    .form-year {
      color: #64748b;
      font-size: 10px;
    }

    /* Certifications & Languages */
    .certif-lang-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* Footer */
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
    .footer strong {
      color: #64748b;
    }
    .confidential {
      background: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <div class="logo-icon">T</div>
        <div>
          <div class="logo-text">TRINEXTA</div>
          <div class="logo-subtitle">by TrusTech IT Support</div>
        </div>
      </div>
      <div class="candidate-ref">
        <div class="candidate-code">${cv.codeUnique}</div>
        <div class="candidate-category">${cv.categorieLabel}</div>
      </div>
    </div>

    <!-- Title Section -->
    <div class="title-section">
      <div class="job-title">${cv.titrePoste || cv.categorieLabel}</div>
      <div class="key-info">
        <span><strong>${cv.anneesExperience}</strong> ans d'expérience</span>
        <span>Disponibilité: <strong>${cv.disponibilite}</strong></span>
        <span>Mobilité: <strong>${cv.mobilite}</strong></span>
        ${cv.tjm ? `<span>TJM: <strong>${cv.tjm}€</strong></span>` :
          (cv.tjmMin && cv.tjmMax ? `<span>TJM: <strong>${cv.tjmMin}-${cv.tjmMax}€</strong></span>` : '')}
      </div>
    </div>

    <!-- Skills Section -->
    <div class="skills-section">
      <div class="section-title">Compétences Techniques</div>
      <div class="skills-grid">
        ${cv.competences.slice(0, 5).map(c => `<span class="skill-tag primary">${c}</span>`).join('')}
        ${cv.competences.slice(5).map(c => `<span class="skill-tag">${c}</span>`).join('')}
      </div>
    </div>

    <!-- Experiences Section -->
    ${cv.experiences.length > 0 ? `
    <div class="experiences-section">
      <div class="section-title">Expériences Professionnelles</div>
      ${experiencesHtml}
    </div>
    ` : ''}

    <!-- Formations Section -->
    ${cv.formations.length > 0 ? `
    <div class="formations-section">
      <div class="section-title">Formations</div>
      ${formationsHtml}
    </div>
    ` : ''}

    <!-- Certifications & Languages -->
    <div class="certif-lang-section">
      ${cv.certifications.length > 0 ? `
      <div>
        <div class="section-title">Certifications</div>
        <div class="skills-grid">
          ${cv.certifications.map(c => `<span class="skill-tag">${c}</span>`).join('')}
        </div>
      </div>
      ` : '<div></div>'}
      ${cv.langues.length > 0 ? `
      <div>
        <div class="section-title">Langues</div>
        <div class="skills-grid">
          ${cv.langues.map(l => `<span class="skill-tag">${l}</span>`).join('')}
        </div>
      </div>
      ` : '<div></div>'}
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="confidential">Document Confidentiel</div>
      <p><strong>TRINEXTA</strong> - Plateforme Talentero</p>
      <p>Contact: contact@trinexta.fr | Ce profil est présenté de manière anonyme conformément aux bonnes pratiques du secteur.</p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Génère un CV anonymisé pour un talent
 */
export async function generateAnonymizedCV(talentId: number): Promise<{
  html: string
  data: AnonymizedCV
} | null> {
  const data = await getAnonymizedCVData(talentId)
  if (!data) return null

  const html = generateAnonymizedCVHtml(data)
  return { html, data }
}

/**
 * Génère les CVs anonymisés pour une shortlist complète
 */
export async function generateShortlistAnonymizedCVs(shortlistId: number): Promise<{
  shortlistUid: string
  offreTitre: string
  cvs: { html: string; data: AnonymizedCV }[]
} | null> {
  const shortlist = await prisma.shortlist.findUnique({
    where: { id: shortlistId },
    include: {
      offre: true,
      candidats: {
        include: {
          candidature: {
            include: {
              talent: {
                include: {
                  experiences: { orderBy: { dateDebut: 'desc' } },
                  formations: { orderBy: { annee: 'desc' } }
                }
              }
            }
          }
        },
        orderBy: { ordre: 'asc' }
      }
    }
  })

  if (!shortlist) return null

  const cvs: { html: string; data: AnonymizedCV }[] = []

  for (const candidat of shortlist.candidats) {
    const talent = candidat.candidature.talent
    const data: AnonymizedCV = {
      codeUnique: talent.codeUnique,
      categorie: talent.categorieProfessionnelle || 'AUTRE',
      categorieLabel: CATEGORY_LABELS[talent.categorieProfessionnelle || 'AUTRE'] || 'Autre',
      titrePoste: talent.titrePoste,
      anneesExperience: talent.anneesExperience,
      competences: talent.competences,
      langues: talent.langues,
      certifications: talent.certifications,
      mobilite: MOBILITE_LABELS[talent.mobilite] || talent.mobilite,
      disponibilite: DISPONIBILITE_LABELS[talent.disponibilite] || talent.disponibilite,
      tjm: talent.tjm,
      tjmMin: talent.tjmMin,
      tjmMax: talent.tjmMax,
      experiences: talent.experiences.map(exp => ({
        poste: exp.poste,
        duree: calculateDuration(exp.dateDebut, exp.dateFin),
        description: exp.description,
        competences: exp.competences
      })),
      formations: talent.formations.map(form => ({
        diplome: form.diplome,
        annee: form.annee
      }))
    }

    cvs.push({
      html: generateAnonymizedCVHtml(data),
      data
    })
  }

  return {
    shortlistUid: shortlist.uid,
    offreTitre: shortlist.offre.titre,
    cvs
  }
}
