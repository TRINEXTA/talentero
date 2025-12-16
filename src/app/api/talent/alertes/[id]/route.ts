/**
 * API Talent - Gestion d'une alerte spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AlerteFrequence, Mobilite } from '@prisma/client'

// GET - Détails d'une alerte
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const alerteId = parseInt(id)

    if (isNaN(alerteId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const alerte = await prisma.alerte.findUnique({
      where: { id: alerteId },
    })

    if (!alerte) {
      return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })
    }

    if (alerte.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ alerte })
  } catch (error) {
    console.error('Erreur GET /api/talent/alertes/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Modifier une alerte
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const alerteId = parseInt(id)

    if (isNaN(alerteId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const alerte = await prisma.alerte.findUnique({
      where: { id: alerteId },
    })

    if (!alerte) {
      return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })
    }

    if (alerte.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { nom, competences, tjmMin, mobilite, lieux, frequence, active } = body

    const updatedAlerte = await prisma.alerte.update({
      where: { id: alerteId },
      data: {
        ...(nom !== undefined && { nom }),
        ...(competences !== undefined && { competences }),
        ...(tjmMin !== undefined && { tjmMin: tjmMin ? parseInt(tjmMin) : null }),
        ...(mobilite !== undefined && { mobilite: mobilite as Mobilite | null }),
        ...(lieux !== undefined && { lieux }),
        ...(frequence !== undefined && { frequence: frequence as AlerteFrequence }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json({ alerte: updatedAlerte, message: 'Alerte mise à jour' })
  } catch (error) {
    console.error('Erreur PATCH /api/talent/alertes/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer une alerte
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const alerteId = parseInt(id)

    if (isNaN(alerteId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const alerte = await prisma.alerte.findUnique({
      where: { id: alerteId },
    })

    if (!alerte) {
      return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })
    }

    if (alerte.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.alerte.delete({
      where: { id: alerteId },
    })

    return NextResponse.json({ success: true, message: 'Alerte supprimée' })
  } catch (error) {
    console.error('Erreur DELETE /api/talent/alertes/[id]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
