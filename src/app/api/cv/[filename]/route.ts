/**
 * API pour servir les fichiers CV
 * Les CVs sont stockés dans /data/cv/ pour persister après les builds
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import path from 'path'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { filename } = await params

    // Validation du nom de fichier pour éviter les traversées de répertoire
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    // Le fichier est accessible si:
    // 1. L'utilisateur est admin
    // 2. L'utilisateur est le propriétaire du CV

    // Extraire l'UID du talent du nom de fichier (format: {uid}_{timestamp}.{ext})
    const talentUid = filename.split('_')[0]

    // Vérification des permissions
    if (user.role !== 'ADMIN') {
      const talent = await prisma.talent.findFirst({
        where: {
          userId: user.id,
          uid: talentUid
        }
      })

      if (!talent) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
    }

    // Chemin vers le fichier CV
    const cvPath = path.join(process.cwd(), 'data', 'cv', filename)

    if (!existsSync(cvPath)) {
      // Essayer aussi dans public/uploads/cv pour compatibilité
      const publicPath = path.join(process.cwd(), 'public', 'uploads', 'cv', filename)
      if (existsSync(publicPath)) {
        const fileBuffer = await readFile(publicPath)
        const fileStats = await stat(publicPath)

        const ext = path.extname(filename).toLowerCase()
        const mimeTypes: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Content-Length': fileStats.size.toString(),
            'Content-Disposition': `inline; filename="${filename}"`,
            'Cache-Control': 'private, max-age=3600',
          },
        })
      }
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }

    const fileBuffer = await readFile(cvPath)
    const fileStats = await stat(cvPath)

    const ext = path.extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Content-Length': fileStats.size.toString(),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erreur lecture CV:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
