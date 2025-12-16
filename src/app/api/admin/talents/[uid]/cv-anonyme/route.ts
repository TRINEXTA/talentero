/**
 * API Admin - CV Talent (Anonymise ou Complet)
 * Genere un CV au format PDF (HTML) ou DOCX
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'

// GET - Genere le CV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])

    const { uid } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'
    const anonymous = searchParams.get('anonymous') === 'true'

    // Trouve le talent avec ses experiences et formations
    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: {
        experiences: { orderBy: { dateDebut: 'desc' } },
        formations: { orderBy: { annee: 'desc' } },
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouve' }, { status: 404 })
    }

    // Prepare les donnees
    const cvData = {
      reference: anonymous ? talent.codeUnique : `${talent.prenom} ${talent.nom}`,
      titre: talent.titrePoste || 'Consultant IT',
      bio: talent.bio || '',
      competences: talent.competences,
      anneesExperience: talent.anneesExperience,
      mobilite: talent.mobilite,
      disponibilite: talent.disponibilite,
      langues: talent.langues,
      certifications: talent.certifications,
      experiences: talent.experiences.map(exp => ({
        poste: exp.poste,
        entreprise: anonymous ? 'Entreprise confidentielle' : exp.entreprise,
        dateDebut: exp.dateDebut,
        dateFin: exp.dateFin,
        enCours: exp.enCours,
        description: exp.description,
      })),
      formations: talent.formations.map(form => ({
        diplome: form.diplome,
        etablissement: anonymous ? 'Etablissement' : form.etablissement,
        annee: form.annee,
      })),
      // Donnees non-anonymes seulement
      ...(!anonymous && {
        prenom: talent.prenom,
        nom: talent.nom,
        email: null, // Ne pas inclure l'email
        telephone: talent.telephone,
        ville: talent.ville,
        linkedinUrl: talent.linkedinUrl,
        githubUrl: talent.githubUrl,
      }),
    }

    if (format === 'docx') {
      const docx = generateDOCX(cvData, anonymous)
      const buffer = await Packer.toBuffer(docx)

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="CV_${cvData.reference.replace(/\s/g, '_')}.docx"`,
        },
      })
    }

    // Par defaut, genere du HTML pour impression PDF
    const html = generateHTML(cvData, anonymous)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="CV_${cvData.reference.replace(/\s/g, '_')}.html"`,
      },
    })

  } catch (error) {
    console.error('Erreur generation CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateHTML(data: any, anonymous: boolean): string {
  const mobiliteLabels: Record<string, string> = {
    FULL_REMOTE: 'Full Remote',
    HYBRIDE: 'Hybride',
    SUR_SITE: 'Sur site',
    FLEXIBLE: 'Flexible',
  }

  const dispoLabels: Record<string, string> = {
    IMMEDIATE: 'Immediate',
    SOUS_15_JOURS: 'Sous 15 jours',
    SOUS_1_MOIS: 'Sous 1 mois',
    SOUS_2_MOIS: 'Sous 2 mois',
    NON_DISPONIBLE: 'Non disponible',
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>CV ${data.reference}</title>
  <style>
    @page { margin: 1.5cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { color: #1e40af; margin: 0 0 5px 0; font-size: 28px; }
    .header .titre { color: #4b5563; font-size: 18px; margin: 0; }
    .header .meta { color: #6b7280; font-size: 14px; margin-top: 10px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #1e40af; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px; }
    .competences { display: flex; flex-wrap: wrap; gap: 8px; }
    .competence { background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 15px; font-size: 13px; }
    .experience { margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #f3f4f6; }
    .experience:last-child { border-bottom: none; }
    .experience h3 { margin: 0 0 5px 0; color: #111; font-size: 15px; }
    .experience .entreprise { color: #4b5563; font-size: 14px; }
    .experience .dates { color: #9ca3af; font-size: 13px; }
    .experience .description { color: #6b7280; font-size: 14px; margin-top: 8px; }
    .formation { margin-bottom: 10px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    .trinexta { color: #2563eb; font-weight: bold; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.reference}</h1>
    <p class="titre">${data.titre}</p>
    <p class="meta">
      ${data.anneesExperience} ans d'experience |
      ${mobiliteLabels[data.mobilite] || data.mobilite} |
      ${dispoLabels[data.disponibilite] || data.disponibilite}
      ${!anonymous && data.ville ? ` | ${data.ville}` : ''}
    </p>
  </div>

  ${data.bio ? `<div class="section"><h2>Profil</h2><p>${data.bio}</p></div>` : ''}

  <div class="section">
    <h2>Competences</h2>
    <div class="competences">
      ${data.competences.map((c: string) => `<span class="competence">${c}</span>`).join('')}
    </div>
  </div>

  ${data.experiences.length > 0 ? `
  <div class="section">
    <h2>Experiences professionnelles</h2>
    ${data.experiences.map((exp: { poste: string; entreprise: string | null; dateDebut: Date; dateFin: Date | null; enCours: boolean; description: string | null }) => `
      <div class="experience">
        <h3>${exp.poste}</h3>
        <p class="entreprise">${exp.entreprise || ''}</p>
        <p class="dates">${new Date(exp.dateDebut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} - ${exp.enCours ? 'Present' : exp.dateFin ? new Date(exp.dateFin).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}</p>
        ${exp.description ? `<p class="description">${exp.description}</p>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.formations.length > 0 ? `
  <div class="section">
    <h2>Formations</h2>
    ${data.formations.map((form: { diplome: string; etablissement: string | null; annee: number | null }) => `
      <div class="formation">
        <strong>${form.diplome}</strong>
        ${form.etablissement ? ` - ${form.etablissement}` : ''}
        ${form.annee ? ` (${form.annee})` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${data.langues.length > 0 ? `
  <div class="section">
    <h2>Langues</h2>
    <p>${data.langues.join(' | ')}</p>
  </div>
  ` : ''}

  ${data.certifications.length > 0 ? `
  <div class="section">
    <h2>Certifications</h2>
    <p>${data.certifications.join(' | ')}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>CV ${anonymous ? 'anonymise ' : ''}genere par <span class="trinexta">TRINEXTA</span> - Talentero</p>
  </div>
</body>
</html>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateDOCX(data: any, anonymous: boolean): Document {
  const mobiliteLabels: Record<string, string> = {
    FULL_REMOTE: 'Full Remote',
    HYBRIDE: 'Hybride',
    SUR_SITE: 'Sur site',
    FLEXIBLE: 'Flexible',
  }

  const dispoLabels: Record<string, string> = {
    IMMEDIATE: 'Immediate',
    SOUS_15_JOURS: 'Sous 15 jours',
    SOUS_1_MOIS: 'Sous 1 mois',
    SOUS_2_MOIS: 'Sous 2 mois',
    NON_DISPONIBLE: 'Non disponible',
  }

  const sections = []

  // Header
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: data.reference, bold: true, size: 48, color: '1e40af' })],
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [new TextRun({ text: data.titre, size: 28, color: '4b5563' })],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.anneesExperience} ans d'experience | ${mobiliteLabels[data.mobilite] || data.mobilite} | ${dispoLabels[data.disponibilite] || data.disponibilite}${!anonymous && data.ville ? ` | ${data.ville}` : ''}`,
          size: 22,
          color: '6b7280',
        }),
      ],
    }),
    new Paragraph({ text: '' })
  )

  // Bio
  if (data.bio) {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Profil', bold: true, size: 26 })], heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: data.bio, size: 22 })] }),
      new Paragraph({ text: '' })
    )
  }

  // Competences
  sections.push(
    new Paragraph({ children: [new TextRun({ text: 'Competences', bold: true, size: 26 })], heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: data.competences.join(' | '), size: 22, color: '1e40af' })] }),
    new Paragraph({ text: '' })
  )

  // Experiences
  if (data.experiences.length > 0) {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Experiences professionnelles', bold: true, size: 26 })], heading: HeadingLevel.HEADING_1 })
    )
    for (const exp of data.experiences) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: exp.poste, bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: exp.entreprise || '', size: 22, color: '4b5563' })] }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${new Date(exp.dateDebut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} - ${exp.enCours ? 'Present' : exp.dateFin ? new Date(exp.dateFin).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : ''}`,
              size: 20,
              color: '9ca3af',
            }),
          ],
        })
      )
      if (exp.description) {
        sections.push(new Paragraph({ children: [new TextRun({ text: exp.description, size: 22 })] }))
      }
      sections.push(new Paragraph({ text: '' }))
    }
  }

  // Formations
  if (data.formations.length > 0) {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Formations', bold: true, size: 26 })], heading: HeadingLevel.HEADING_1 })
    )
    for (const form of data.formations) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: form.diplome, bold: true, size: 22 }),
            new TextRun({ text: form.etablissement ? ` - ${form.etablissement}` : '', size: 22 }),
            new TextRun({ text: form.annee ? ` (${form.annee})` : '', size: 22, color: '6b7280' }),
          ],
        })
      )
    }
    sections.push(new Paragraph({ text: '' }))
  }

  // Langues
  if (data.langues.length > 0) {
    sections.push(
      new Paragraph({ children: [new TextRun({ text: 'Langues', bold: true, size: 26 })], heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: data.langues.join(' | '), size: 22 })] }),
      new Paragraph({ text: '' })
    )
  }

  // Footer
  sections.push(
    new Paragraph({ text: '' }),
    new Paragraph({
      children: [
        new TextRun({ text: `CV ${anonymous ? 'anonymise ' : ''}genere par `, size: 18, color: '9ca3af' }),
        new TextRun({ text: 'TRINEXTA', size: 18, color: '2563eb', bold: true }),
        new TextRun({ text: ' - Talentero', size: 18, color: '9ca3af' }),
      ],
      alignment: 'center' as const,
    })
  )

  return new Document({
    sections: [{ properties: {}, children: sections }],
  })
}
