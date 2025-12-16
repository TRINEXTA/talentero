/**
 * API Talent - Gestion des entretiens
 * Permet au talent de voir et répondre aux demandes d'entretien
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des entretiens du talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const entretiens = await prisma.entretien.findMany({
      where: {
        talentId: user.talentId!,
        ...(statut && { statut: statut as never }),
      },
      include: {
        offre: {
          select: {
            uid: true,
            titre: true,
            lieu: true,
            client: {
              select: {
                raisonSociale: true,
                logoUrl: true,
              },
            },
          },
        },
        candidature: {
          select: {
            uid: true,
            statut: true,
            scoreMatch: true,
          },
        },
      },
      orderBy: { dateProposee: 'asc' },
    })

    // Séparer les entretiens par statut
    const enAttente = entretiens.filter((e) => e.statut === 'EN_ATTENTE_CONFIRMATION')
    const confirmes = entretiens.filter((e) => e.statut === 'CONFIRME')
    const passes = entretiens.filter((e) => e.statut === 'REALISE')
    const annules = entretiens.filter((e) => e.statut === 'ANNULE')

    return NextResponse.json({
      entretiens,
      stats: {
        total: entretiens.length,
        enAttente: enAttente.length,
        confirmes: confirmes.length,
        passes: passes.length,
        annules: annules.length,
      },
      grouped: {
        enAttente,
        confirmes,
        passes,
        annules,
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/talent/entretiens:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
