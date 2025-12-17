/**
 * API Admin - Re-synchronisation du CV d'un talent
 * Re-parse le CV existant et met à jour les données du talent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { extractTextFromFile, parseCV } from '@/lib/cv-parser'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const user = await getCurrentUser()
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: {
        experiences: true,
        formations: true,
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    if (!talent.cvUrl) {
      return NextResponse.json({ error: 'Aucun CV associé à ce talent' }, { status: 400 })
    }

    // Trouver le fichier CV
    const filename = talent.cvUrl.split('/').pop()
    if (!filename) {
      return NextResponse.json({ error: 'URL du CV invalide' }, { status: 400 })
    }

    // Chercher le fichier dans les deux emplacements possibles
    let cvPath = path.join(process.cwd(), 'data', 'cv', filename)
    if (!existsSync(cvPath)) {
      cvPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
    }

    if (!existsSync(cvPath)) {
      return NextResponse.json({
        error: 'Fichier CV non trouvé. Le freelance doit re-uploader son CV.',
        cvUrl: talent.cvUrl,
        searched: [
          path.join('data', 'cv', filename),
          path.join('public', 'uploads', 'cv', filename)
        ]
      }, { status: 404 })
    }

    // Lire et parser le CV
    const fileBuffer = await readFile(cvPath)
    const cvText = await extractTextFromFile(fileBuffer, filename)

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json({
        error: 'Impossible d\'extraire le texte du CV. Le fichier est peut-être corrompu.'
      }, { status: 400 })
    }

    // Parser le CV avec Claude
    const extractedData = await parseCV(cvText)

    // Paramètres de la requête
    const body = await request.json().catch(() => ({}))
    const {
      replaceExperiences = true,  // Remplacer les expériences existantes
      replaceFormations = true,   // Remplacer les formations existantes
      updateProfile = true,       // Mettre à jour les infos du profil
    } = body

    // Supprimer les anciennes données si demandé
    if (replaceExperiences) {
      await prisma.experience.deleteMany({
        where: { talentId: talent.id }
      })
    }

    if (replaceFormations) {
      await prisma.formation.deleteMany({
        where: { talentId: talent.id }
      })
    }

    // Mettre à jour le profil
    const updateData: Record<string, unknown> = {}

    if (updateProfile) {
      if (extractedData.titrePoste) {
        updateData.titrePoste = extractedData.titrePoste
      }
      if (extractedData.bio) {
        updateData.bio = extractedData.bio
      }
      if (extractedData.competences?.length > 0) {
        updateData.competences = extractedData.competences
      }
      if (extractedData.anneesExperience) {
        updateData.anneesExperience = extractedData.anneesExperience
      }
      if (extractedData.langues?.length > 0) {
        updateData.langues = extractedData.langues
      }
      if (extractedData.certifications?.length > 0) {
        updateData.certifications = extractedData.certifications
      }
      if (extractedData.softSkills?.length > 0) {
        updateData.softSkills = extractedData.softSkills
      }
      if (extractedData.linkedinUrl) {
        updateData.linkedinUrl = extractedData.linkedinUrl
      }
      if (extractedData.githubUrl) {
        updateData.githubUrl = extractedData.githubUrl
      }
      if (extractedData.telephone && !talent.telephone) {
        updateData.telephone = extractedData.telephone
      }
    }

    // Mettre à jour le talent
    if (Object.keys(updateData).length > 0) {
      await prisma.talent.update({
        where: { id: talent.id },
        data: updateData,
      })
    }

    // Créer les nouvelles expériences
    let experiencesCreated = 0
    if (extractedData.experiences?.length > 0) {
      for (const exp of extractedData.experiences) {
        try {
          await prisma.experience.create({
            data: {
              talentId: talent.id,
              poste: exp.poste,
              entreprise: exp.entreprise || '',
              lieu: exp.lieu,
              dateDebut: new Date(exp.dateDebut),
              dateFin: exp.dateFin ? new Date(exp.dateFin) : null,
              enCours: !exp.dateFin,
              description: exp.description,
              competences: exp.competences || [],
            },
          })
          experiencesCreated++
        } catch (expError) {
          console.error('Erreur création expérience:', expError)
        }
      }
    }

    // Créer les nouvelles formations
    let formationsCreated = 0
    if (extractedData.formations?.length > 0) {
      for (const formation of extractedData.formations) {
        try {
          await prisma.formation.create({
            data: {
              talentId: talent.id,
              diplome: formation.diplome,
              etablissement: formation.etablissement,
              annee: formation.annee,
            },
          })
          formationsCreated++
        } catch (formError) {
          console.error('Erreur création formation:', formError)
        }
      }
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action: 'CV_RESYNC',
        entite: 'Talent',
        entiteId: talent.id,
        details: {
          experiencesCreated,
          formationsCreated,
          competences: extractedData.competences?.length || 0,
          anneesExperience: extractedData.anneesExperience,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'CV re-synchronisé avec succès',
      stats: {
        experiencesCreated,
        formationsCreated,
        competencesExtracted: extractedData.competences?.length || 0,
        anneesExperience: extractedData.anneesExperience,
        langues: extractedData.langues?.length || 0,
        certifications: extractedData.certifications?.length || 0,
      },
      extractedData: {
        prenom: extractedData.prenom,
        nom: extractedData.nom,
        titrePoste: extractedData.titrePoste,
        anneesExperience: extractedData.anneesExperience,
        experiences: extractedData.experiences?.map(e => ({
          poste: e.poste,
          entreprise: e.entreprise,
          dateDebut: e.dateDebut,
          dateFin: e.dateFin,
        })),
      }
    })
  } catch (error) {
    console.error('Erreur resync CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Prévisualisation de ce qui serait extrait
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    if (!talent.cvUrl) {
      return NextResponse.json({ error: 'Aucun CV associé à ce talent' }, { status: 400 })
    }

    // Trouver le fichier CV
    const filename = talent.cvUrl.split('/').pop()
    if (!filename) {
      return NextResponse.json({ error: 'URL du CV invalide' }, { status: 400 })
    }

    // Chercher le fichier dans les deux emplacements possibles
    let cvPath = path.join(process.cwd(), 'data', 'cv', filename)
    if (!existsSync(cvPath)) {
      cvPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
    }

    if (!existsSync(cvPath)) {
      return NextResponse.json({
        error: 'Fichier CV non trouvé',
        cvUrl: talent.cvUrl,
      }, { status: 404 })
    }

    // Lire et parser le CV
    const fileBuffer = await readFile(cvPath)
    const cvText = await extractTextFromFile(fileBuffer, filename)

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json({
        error: 'Impossible d\'extraire le texte du CV'
      }, { status: 400 })
    }

    // Parser le CV avec Claude
    const extractedData = await parseCV(cvText)

    return NextResponse.json({
      preview: true,
      cvTextLength: cvText.length,
      extractedData,
    })
  } catch (error) {
    console.error('Erreur preview CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
