/**
 * API Talent - Upload/Delete CV with automatic data extraction
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { parseCVSmart } from '@/lib/cv-parser'

// POST - Upload CV with extraction
export async function POST(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil talent non trouve' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('cv') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validation
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporte. Utilisez PDF ou Word.' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 })
    }

    // Create uploads directory if needed (use data/cv instead of public for persistence)
    const uploadsDir = path.join(process.cwd(), 'data', 'cv')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old CV if exists
    if (talent.cvUrl) {
      // Handle both old format (/uploads/cv/...) and new format (/api/cv/...)
      const oldFilename = talent.cvUrl.split('/').pop()
      if (oldFilename) {
        const oldDataPath = path.join(process.cwd(), 'data', 'cv', oldFilename)
        const oldPublicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', oldFilename)
        if (existsSync(oldDataPath)) {
          await unlink(oldDataPath).catch(() => {})
        }
        if (existsSync(oldPublicPath)) {
          await unlink(oldPublicPath).catch(() => {})
        }
      }
    }

    // Save new file
    const ext = path.extname(file.name)
    const filename = `${talent.uid}_${Date.now()}${ext}`
    const filepath = path.join(uploadsDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Use API route for CV access (better persistence and security)
    const cvUrl = `/api/cv/${filename}`

    // Extract and parse CV data (supporte les CVs visuels/scannes)
    let extractedData = null
    try {
      extractedData = await parseCVSmart(buffer, file.name)
      if (extractedData) {

        // Update talent with extracted data (only non-empty fields)
        const updateData: Record<string, unknown> = {
          cvUrl,
          cvOriginalName: file.name,
        }

        if (extractedData.titrePoste && !talent.titrePoste) {
          updateData.titrePoste = extractedData.titrePoste
        }
        if (extractedData.bio && !talent.bio) {
          updateData.bio = extractedData.bio
        }
        if (extractedData.competences?.length > 0) {
          // Merge with existing competences
          const existingCompetences = talent.competences || []
          const newCompetences = Array.from(new Set([...existingCompetences, ...extractedData.competences]))
          updateData.competences = newCompetences
        }
        if (extractedData.anneesExperience && (!talent.anneesExperience || talent.anneesExperience === 0)) {
          updateData.anneesExperience = extractedData.anneesExperience
        }
        if (extractedData.langues?.length > 0) {
          const existingLangues = talent.langues || []
          updateData.langues = Array.from(new Set([...existingLangues, ...extractedData.langues]))
        }
        if (extractedData.certifications?.length > 0) {
          const existingCerts = talent.certifications || []
          updateData.certifications = Array.from(new Set([...existingCerts, ...extractedData.certifications]))
        }
        if (extractedData.softSkills?.length > 0) {
          const existingSoftSkills = talent.softSkills || []
          updateData.softSkills = Array.from(new Set([...existingSoftSkills, ...extractedData.softSkills]))
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

        await prisma.talent.update({
          where: { id: talent.id },
          data: updateData,
        })

        // Add experiences if any
        if (extractedData.experiences?.length > 0) {
          for (const exp of extractedData.experiences) {
            await prisma.experience.create({
              data: {
                talentId: talent.id,
                poste: exp.poste,
                entreprise: exp.entreprise || '',
                lieu: exp.lieu,
                dateDebut: new Date(exp.dateDebut),
                dateFin: exp.dateFin ? new Date(exp.dateFin) : null,
                description: exp.description,
                competences: exp.competences || [],
              },
            })
          }
        }

        // Add formations if any
        if (extractedData.formations?.length > 0) {
          for (const formation of extractedData.formations) {
            await prisma.formation.create({
              data: {
                talentId: talent.id,
                diplome: formation.diplome,
                etablissement: formation.etablissement,
                annee: formation.annee,
              },
            })
          }
        }
      } else {
        // Just update CV URL without extraction
        await prisma.talent.update({
          where: { id: talent.id },
          data: {
            cvUrl,
            cvOriginalName: file.name,
          },
        })
      }
    } catch (extractionError) {
      console.error('Erreur extraction CV (non bloquant):', extractionError)
      // Still save the CV even if extraction fails
      await prisma.talent.update({
        where: { id: talent.id },
        data: {
          cvUrl,
          cvOriginalName: file.name,
        },
      })
    }

    return NextResponse.json({
      success: true,
      cvUrl,
      cvOriginalName: file.name,
      extracted: extractedData !== null,
      extractedData: extractedData ? {
        competences: extractedData.competences,
        experiences: extractedData.experiences?.length || 0,
        formations: extractedData.formations?.length || 0,
      } : null,
    })

  } catch (error) {
    console.error('Erreur upload CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Delete CV
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil talent non trouve' }, { status: 404 })
    }

    // Delete file if exists
    if (talent.cvUrl) {
      const filepath = path.join(process.cwd(), 'public', talent.cvUrl)
      if (existsSync(filepath)) {
        await unlink(filepath).catch(() => {})
      }
    }

    // Update talent
    await prisma.talent.update({
      where: { id: talent.id },
      data: {
        cvUrl: null,
        cvOriginalName: null,
      },
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur suppression CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
