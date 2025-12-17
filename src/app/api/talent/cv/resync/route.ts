/**
 * API Talent - Re-synchronisation du CV
 * Permet au freelance de re-parser son CV existant
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { extractTextFromFile, parseCV } from '@/lib/cv-parser'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        experiences: true,
        formations: true,
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil talent non trouvé' }, { status: 404 })
    }

    if (!talent.cvUrl) {
      return NextResponse.json({ error: 'Aucun CV associé à votre profil' }, { status: 400 })
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
        error: 'Fichier CV non trouvé. Veuillez uploader à nouveau votre CV.',
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

    // Options de mise à jour (par défaut: remplacer tout)
    const body = await request.json().catch(() => ({}))
    const {
      replaceExperiences = true,
      replaceFormations = true,
      updateProfile = true,
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
      if (extractedData.linkedinUrl && !talent.linkedinUrl) {
        updateData.linkedinUrl = extractedData.linkedinUrl
      }
      if (extractedData.githubUrl && !talent.githubUrl) {
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

    return NextResponse.json({
      success: true,
      message: 'CV re-synchronisé avec succès',
      stats: {
        experiencesCreated,
        formationsCreated,
        competencesExtracted: extractedData.competences?.length || 0,
        anneesExperience: extractedData.anneesExperience,
      },
    })
  } catch (error) {
    console.error('Erreur resync CV talent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
