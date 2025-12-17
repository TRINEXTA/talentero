/**
 * API Admin - Gestion du CV d'un talent
 * Permet de supprimer ou remplacer le CV
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { extractTextFromFile, parseCV } from '@/lib/cv-parser'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// DELETE - Supprimer le CV d'un talent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const user = await getCurrentUser()
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    if (!talent.cvUrl) {
      return NextResponse.json({ error: 'Aucun CV à supprimer' }, { status: 400 })
    }

    // Supprimer le fichier physique
    const filename = talent.cvUrl.split('/').pop()
    if (filename) {
      const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
      const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)

      if (existsSync(dataPath)) {
        await unlink(dataPath).catch(() => {})
      }
      if (existsSync(publicPath)) {
        await unlink(publicPath).catch(() => {})
      }
    }

    // Mettre à jour le talent
    await prisma.talent.update({
      where: { uid },
      data: {
        cvUrl: null,
        cvOriginalName: null,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action: 'DELETE_CV_ADMIN',
        entite: 'Talent',
        entiteId: talent.id,
        details: {
          deletedCvUrl: talent.cvUrl,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'CV supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur suppression CV admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Uploader/remplacer le CV d'un talent (par l'admin)
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
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('cv') as File | null
    const parseAndUpdate = formData.get('parseAndUpdate') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // Validation
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez PDF ou Word.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 400 })
    }

    // Créer le dossier si nécessaire
    const uploadsDir = path.join(process.cwd(), 'data', 'cv')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Supprimer l'ancien CV si existant
    if (talent.cvUrl) {
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

    // Sauvegarder le nouveau fichier
    const ext = path.extname(file.name)
    const filename = `${talent.uid}_${Date.now()}${ext}`
    const filepath = path.join(uploadsDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const cvUrl = `/api/cv/${filename}`

    // Mettre à jour le talent
    await prisma.talent.update({
      where: { uid },
      data: {
        cvUrl,
        cvOriginalName: file.name,
      },
    })

    let extractedData = null
    let statsInfo = null

    // Parser le CV si demandé
    if (parseAndUpdate) {
      try {
        const cvText = await extractTextFromFile(buffer, file.name)
        if (cvText && cvText.trim().length > 50) {
          extractedData = await parseCV(cvText)

          // Supprimer les anciennes expériences et formations
          await prisma.experience.deleteMany({
            where: { talentId: talent.id }
          })
          await prisma.formation.deleteMany({
            where: { talentId: talent.id }
          })

          // Mettre à jour le profil
          const updateData: Record<string, unknown> = {}
          if (extractedData.titrePoste) updateData.titrePoste = extractedData.titrePoste
          if (extractedData.bio) updateData.bio = extractedData.bio
          if (extractedData.competences?.length > 0) updateData.competences = extractedData.competences
          if (extractedData.anneesExperience) updateData.anneesExperience = extractedData.anneesExperience
          if (extractedData.langues?.length > 0) updateData.langues = extractedData.langues
          if (extractedData.certifications?.length > 0) updateData.certifications = extractedData.certifications
          if (extractedData.softSkills?.length > 0) updateData.softSkills = extractedData.softSkills

          if (Object.keys(updateData).length > 0) {
            await prisma.talent.update({
              where: { id: talent.id },
              data: updateData,
            })
          }

          // Créer les expériences
          let experiencesCreated = 0
          for (const exp of extractedData.experiences || []) {
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
            } catch (e) {
              console.error('Erreur création expérience:', e)
            }
          }

          // Créer les formations
          let formationsCreated = 0
          for (const formation of extractedData.formations || []) {
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
            } catch (e) {
              console.error('Erreur création formation:', e)
            }
          }

          statsInfo = {
            experiencesCreated,
            formationsCreated,
            competences: extractedData.competences?.length || 0,
            anneesExperience: extractedData.anneesExperience,
          }
        }
      } catch (parseError) {
        console.error('Erreur parsing CV:', parseError)
      }
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action: 'UPLOAD_CV_ADMIN',
        entite: 'Talent',
        entiteId: talent.id,
        details: {
          cvUrl,
          originalName: file.name,
          parsed: parseAndUpdate,
          stats: statsInfo,
        },
      },
    })

    return NextResponse.json({
      success: true,
      cvUrl,
      cvOriginalName: file.name,
      parsed: parseAndUpdate && extractedData !== null,
      stats: statsInfo,
    })
  } catch (error) {
    console.error('Erreur upload CV admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Récupérer les infos du CV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
      select: {
        cvUrl: true,
        cvOriginalName: true,
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    if (!talent.cvUrl) {
      return NextResponse.json({
        hasCv: false,
        cvUrl: null,
        cvOriginalName: null,
        fileExists: false,
      })
    }

    // Vérifier si le fichier existe
    const filename = talent.cvUrl.split('/').pop()
    let fileExists = false
    if (filename) {
      const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
      const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
      fileExists = existsSync(dataPath) || existsSync(publicPath)
    }

    return NextResponse.json({
      hasCv: true,
      cvUrl: talent.cvUrl,
      cvOriginalName: talent.cvOriginalName,
      fileExists,
    })
  } catch (error) {
    console.error('Erreur GET CV info:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
