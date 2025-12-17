/**
 * API Talent - Gestion des langues
 * GET: Liste les langues du talent connecté
 * POST: Ajoute une nouvelle langue
 * DELETE: Supprime une langue
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { NiveauLangue } from '@prisma/client'

// GET - Liste les langues
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        languesDetail: {
          orderBy: { niveau: 'desc' }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ langues: talent.languesDetail })
  } catch (error) {
    console.error('Erreur GET langues:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajoute une langue
export async function POST(request: NextRequest) {
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
    const { langue, niveau, scoreCertification } = body

    if (!langue || !niveau) {
      return NextResponse.json({ error: 'La langue et le niveau sont requis' }, { status: 400 })
    }

    // Valide le niveau
    const niveauxValides = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIF']
    if (!niveauxValides.includes(niveau)) {
      return NextResponse.json({ error: 'Niveau invalide' }, { status: 400 })
    }

    const langueRecord = await prisma.langue.create({
      data: {
        talentId: talent.id,
        langue,
        niveau: niveau as NiveauLangue,
        scoreCertification: scoreCertification || null,
      }
    })

    return NextResponse.json({ langue: langueRecord }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST langue:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprime une langue
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Vérifie que la langue appartient au talent
    const langueRecord = await prisma.langue.findFirst({
      where: { id: parseInt(id), talentId: talent.id }
    })

    if (!langueRecord) {
      return NextResponse.json({ error: 'Langue non trouvée' }, { status: 404 })
    }

    await prisma.langue.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE langue:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
