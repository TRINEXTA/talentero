/**
 * API Talent - Gestion des loisirs/centres d'intérêt
 * GET: Liste les loisirs du talent connecté
 * PUT: Met à jour la liste des loisirs
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste les loisirs
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      select: { loisirs: true }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ loisirs: talent.loisirs })
  } catch (error) {
    console.error('Erreur GET loisirs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Met à jour les loisirs
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const { loisirs } = body

    if (!Array.isArray(loisirs)) {
      return NextResponse.json({ error: 'Loisirs doit être un tableau' }, { status: 400 })
    }

    // Filtre et nettoie les loisirs
    const loisirsClean = loisirs
      .filter((l: unknown) => typeof l === 'string' && l.trim())
      .map((l: string) => l.trim())

    await prisma.talent.update({
      where: { id: talent.id },
      data: { loisirs: loisirsClean }
    })

    return NextResponse.json({ loisirs: loisirsClean })
  } catch (error) {
    console.error('Erreur PUT loisirs:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
