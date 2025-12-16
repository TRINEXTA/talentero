/**
 * API Planning Freelance
 * Gestion des disponibilités et du calendrier
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Récupérer le planning du talent
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('end') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Récupère les entrées du planning
    const planning = await prisma.talentPlanning.findMany({
      where: {
        talentId: talent.id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        mission: {
          select: {
            uid: true,
            titre: true,
            clientNom: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    // Récupère les missions en cours
    const missions = await prisma.mission.findMany({
      where: {
        talentId: talent.id,
        statut: 'EN_COURS'
      },
      orderBy: { dateDebut: 'desc' }
    })

    // Statistiques
    const stats = {
      joursDisponibles: planning.filter(p => p.type === 'DISPONIBLE').length,
      joursEnMission: planning.filter(p => p.type === 'EN_MISSION').length,
      joursConge: planning.filter(p => p.type === 'CONGE').length,
      joursArret: planning.filter(p => p.type === 'ARRET_MALADIE').length,
      joursIndisponibles: planning.filter(p => p.type === 'INDISPONIBLE').length,
      missionsEnCours: missions.length
    }

    return NextResponse.json({
      planning: planning.map(p => ({
        id: p.id,
        date: p.date.toISOString().split('T')[0],
        type: p.type,
        notes: p.notes,
        mission: p.mission
      })),
      missions,
      stats
    })

  } catch (error) {
    console.error('Erreur GET planning:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajouter/modifier des jours de planning
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
    const { dates, type, notes } = body

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'Dates requises' }, { status: 400 })
    }

    if (!type) {
      return NextResponse.json({ error: 'Type requis' }, { status: 400 })
    }

    // Valide le type
    const validTypes = ['DISPONIBLE', 'INDISPONIBLE', 'CONGE', 'ARRET_MALADIE', 'FORMATION', 'INTERCONTRAT']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // Upsert chaque date
    const results = await Promise.all(
      dates.map(async (dateStr: string) => {
        const date = new Date(dateStr)

        return prisma.talentPlanning.upsert({
          where: {
            talentId_date: {
              talentId: talent.id,
              date
            }
          },
          update: {
            type,
            notes: notes || null
          },
          create: {
            talentId: talent.id,
            date,
            type,
            notes: notes || null
          }
        })
      })
    )

    // Si le talent était indisponible et repasse disponible, mettre à jour le statut
    if (type === 'DISPONIBLE') {
      await prisma.talent.update({
        where: { id: talent.id },
        data: { disponibilite: 'IMMEDIATE' }
      })
    }

    return NextResponse.json({
      success: true,
      updated: results.length
    })

  } catch (error) {
    console.error('Erreur POST planning:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprimer des entrées de planning (revient à disponible par défaut)
export async function DELETE(request: NextRequest) {
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
    const { dates } = body

    if (!dates || !Array.isArray(dates)) {
      return NextResponse.json({ error: 'Dates requises' }, { status: 400 })
    }

    // Supprime les entrées
    await prisma.talentPlanning.deleteMany({
      where: {
        talentId: talent.id,
        date: {
          in: dates.map((d: string) => new Date(d))
        },
        // Ne pas supprimer les jours en mission
        type: { not: 'EN_MISSION' }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur DELETE planning:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
