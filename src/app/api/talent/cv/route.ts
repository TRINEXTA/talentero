/**
 * API Talent - Upload/Delete CV
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// POST - Upload CV
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

    // Create uploads directory if needed
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'cv')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Delete old CV if exists
    if (talent.cvUrl) {
      const oldPath = path.join(process.cwd(), 'public', talent.cvUrl)
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {})
      }
    }

    // Save new file
    const ext = path.extname(file.name)
    const filename = `${talent.uid}_${Date.now()}${ext}`
    const filepath = path.join(uploadsDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    const cvUrl = `/uploads/cv/${filename}`

    // Update talent
    await prisma.talent.update({
      where: { id: talent.id },
      data: {
        cvUrl,
        cvOriginalName: file.name,
      },
    })

    return NextResponse.json({
      success: true,
      cvUrl,
      cvOriginalName: file.name,
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
