/**
 * API Talent - Gestion des formations
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'

// POST - Ajouter une formation
export async function POST(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const { diplome, etablissement, annee, description } = body

    if (!diplome) {
      return NextResponse.json({ error: 'Diplôme requis' }, { status: 400 })
    }

    const formation = await prisma.formation.create({
      data: {
        talentId: talent.id,
        diplome,
        etablissement: etablissement || null,
        annee: annee ? parseInt(annee) : null,
        description: description || null,
      },
    })

    return NextResponse.json({ success: true, formation })
  } catch (error) {
    console.error('Erreur création formation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une formation
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['TALENT'])
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    // Vérifie que la formation appartient au talent
    const formation = await prisma.formation.findFirst({
      where: { id: parseInt(id), talentId: talent.id },
    })

    if (!formation) {
      return NextResponse.json({ error: 'Formation non trouvée' }, { status: 404 })
    }

    await prisma.formation.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression formation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
