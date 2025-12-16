/**
 * API Talent - Gestion des expériences
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'

// POST - Ajouter une expérience
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
    const { poste, entreprise, lieu, dateDebut, dateFin, description, competences } = body

    if (!poste || !dateDebut) {
      return NextResponse.json({ error: 'Poste et date de début requis' }, { status: 400 })
    }

    const experience = await prisma.experience.create({
      data: {
        talentId: talent.id,
        poste,
        entreprise: entreprise || '',
        lieu: lieu || null,
        dateDebut: new Date(dateDebut),
        dateFin: dateFin ? new Date(dateFin) : null,
        description: description || null,
        competences: competences || [],
      },
    })

    return NextResponse.json({ success: true, experience })
  } catch (error) {
    console.error('Erreur création expérience:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une expérience
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

    // Vérifie que l'expérience appartient au talent
    const experience = await prisma.experience.findFirst({
      where: { id: parseInt(id), talentId: talent.id },
    })

    if (!experience) {
      return NextResponse.json({ error: 'Expérience non trouvée' }, { status: 404 })
    }

    await prisma.experience.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression expérience:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
