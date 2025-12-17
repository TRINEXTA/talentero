/**
 * API Admin - Diagnostic et Réparation des CVs
 *
 * GET  - Liste les CVs manquants (fichier absent du disque)
 * POST - Répare les entrées (met cvUrl à null pour les fichiers manquants)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

interface CVStatus {
  talentId: number
  talentUid: string
  prenom: string
  nom: string
  email: string
  cvUrl: string | null
  cvOriginalName: string | null
  fileExists: boolean
  filePath: string | null
}

// GET - Diagnostic des CVs
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const onlyMissing = searchParams.get('onlyMissing') === 'true'

    // Récupère tous les talents avec un CV référencé
    const talents = await prisma.talent.findMany({
      where: onlyMissing ? { cvUrl: { not: null } } : {},
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const cvStatuses: CVStatus[] = []

    for (const talent of talents) {
      let fileExists = false
      let filePath: string | null = null

      if (talent.cvUrl) {
        const filename = talent.cvUrl.split('/').pop()
        if (filename) {
          const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
          const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)

          if (existsSync(dataPath)) {
            fileExists = true
            filePath = dataPath
          } else if (existsSync(publicPath)) {
            fileExists = true
            filePath = publicPath
          }
        }
      }

      // Si onlyMissing, n'inclure que ceux avec cvUrl mais sans fichier
      if (onlyMissing && (!talent.cvUrl || fileExists)) {
        continue
      }

      cvStatuses.push({
        talentId: talent.id,
        talentUid: talent.uid,
        prenom: talent.prenom,
        nom: talent.nom,
        email: talent.user.email,
        cvUrl: talent.cvUrl,
        cvOriginalName: talent.cvOriginalName,
        fileExists,
        filePath
      })
    }

    // Stats sur les fichiers physiques
    const dataCvDir = path.join(process.cwd(), 'data', 'cv')
    const publicCvDir = path.join(process.cwd(), 'public', 'uploads', 'cv')

    let dataFiles: string[] = []
    let publicFiles: string[] = []

    try {
      if (existsSync(dataCvDir)) {
        dataFiles = readdirSync(dataCvDir)
      }
    } catch {
      // Ignore
    }

    try {
      if (existsSync(publicCvDir)) {
        publicFiles = readdirSync(publicCvDir)
      }
    } catch {
      // Ignore
    }

    const missingCount = cvStatuses.filter(s => s.cvUrl && !s.fileExists).length
    const okCount = cvStatuses.filter(s => s.cvUrl && s.fileExists).length
    const noCvCount = cvStatuses.filter(s => !s.cvUrl).length

    return NextResponse.json({
      summary: {
        total: talents.length,
        withCvUrl: talents.filter(t => t.cvUrl).length,
        withFile: okCount,
        missingFile: missingCount,
        noCv: noCvCount,
        filesOnDisk: {
          dataDir: dataFiles.length,
          publicDir: publicFiles.length,
          total: dataFiles.length + publicFiles.length
        }
      },
      cvStatuses: onlyMissing ? cvStatuses : cvStatuses.slice(0, 100), // Limite à 100 pour la liste complète
      directories: {
        dataDir: dataCvDir,
        publicDir: publicCvDir
      }
    })
  } catch (error) {
    console.error('Erreur diagnostic CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Réparer les CVs manquants
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const user = await getCurrentUser()

    const body = await request.json().catch(() => ({}))
    const { action, talentUids } = body

    if (action !== 'fix-missing') {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez action: "fix-missing"' },
        { status: 400 }
      )
    }

    // Trouve les talents avec CV manquant
    const whereClause: Record<string, unknown> = {
      cvUrl: { not: null }
    }

    if (talentUids && Array.isArray(talentUids) && talentUids.length > 0) {
      whereClause.uid = { in: talentUids }
    }

    const talents = await prisma.talent.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true } }
      }
    })

    const fixed: string[] = []
    const skipped: string[] = []

    for (const talent of talents) {
      if (!talent.cvUrl) continue

      const filename = talent.cvUrl.split('/').pop()
      if (!filename) continue

      const dataPath = path.join(process.cwd(), 'data', 'cv', filename)
      const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
      const fileExists = existsSync(dataPath) || existsSync(publicPath)

      if (fileExists) {
        skipped.push(`${talent.prenom} ${talent.nom} (fichier existe)`)
        continue
      }

      // Mettre à jour le talent
      await prisma.talent.update({
        where: { id: talent.id },
        data: {
          cvUrl: null,
          cvOriginalName: null
        }
      })

      fixed.push(`${talent.prenom} ${talent.nom} (${talent.user.email})`)
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user?.id,
        action: 'FIX_MISSING_CVS',
        entite: 'Talent',
        entiteId: null,
        details: {
          fixedCount: fixed.length,
          skippedCount: skipped.length,
          fixed,
          skipped
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `${fixed.length} profil(s) corrigé(s)`,
      fixed,
      skipped
    })
  } catch (error) {
    console.error('Erreur réparation CV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
