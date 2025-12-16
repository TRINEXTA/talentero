/**
 * API Talent - Gestion des alertes personnalisées
 * Permet aux talents de créer et gérer leurs alertes emploi
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AlerteFrequence, Mobilite } from '@prisma/client'

// GET - Liste des alertes du talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const alertes = await prisma.alerte.findMany({
      where: { talentId: user.talentId! },
      orderBy: { createdAt: 'desc' },
    })

    // Statistiques
    const stats = {
      total: alertes.length,
      actives: alertes.filter((a) => a.active).length,
      totalOffresEnvoyees: alertes.reduce((sum, a) => sum + a.nbOffresEnvoyees, 0),
    }

    return NextResponse.json({ alertes, stats })
  } catch (error) {
    console.error('Erreur GET /api/talent/alertes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une nouvelle alerte
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { nom, competences, tjmMin, mobilite, lieux, frequence } = body

    // Validation basique
    if (!competences?.length && !lieux?.length && !tjmMin) {
      return NextResponse.json(
        { error: 'Au moins un critère requis (compétences, lieu ou TJM)' },
        { status: 400 }
      )
    }

    // Limiter le nombre d'alertes par talent
    const existingCount = await prisma.alerte.count({
      where: { talentId: user.talentId! },
    })

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Limite de 10 alertes atteinte' },
        { status: 400 }
      )
    }

    const alerte = await prisma.alerte.create({
      data: {
        talentId: user.talentId!,
        nom: nom || `Alerte ${existingCount + 1}`,
        competences: competences || [],
        tjmMin: tjmMin ? parseInt(tjmMin) : undefined,
        mobilite: mobilite as Mobilite | undefined,
        lieux: lieux || [],
        frequence: (frequence as AlerteFrequence) || 'INSTANTANEE',
        active: true,
      },
    })

    return NextResponse.json({ alerte, message: 'Alerte créée avec succès' })
  } catch (error) {
    console.error('Erreur POST /api/talent/alertes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
