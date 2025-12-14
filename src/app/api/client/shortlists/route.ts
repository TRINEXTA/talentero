/**
 * API Client - Shortlists reçues
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des shortlists envoyées au client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.clientId) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {
      offre: { clientId: user.clientId },
      // Pas les EN_COURS (brouillons)
      statut: { in: ['PRETE', 'ENVOYEE', 'EN_ATTENTE_RETOUR', 'FINALISEE'] },
    }

    if (statut) {
      where.statut = statut
    }

    const [shortlists, total] = await Promise.all([
      prisma.shortlist.findMany({
        where,
        orderBy: { envoyeeLe: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
            },
          },
          candidats: {
            orderBy: { ordre: 'asc' },
            include: {
              candidature: {
                include: {
                  talent: {
                    select: {
                      uid: true,
                      prenom: true,
                      nom: true,
                      titrePoste: true,
                      photoUrl: true,
                      competences: true,
                      tjm: true,
                      anneesExperience: true,
                      disponibilite: true,
                      ville: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { candidats: true },
          },
        },
      }),
      prisma.shortlist.count({ where }),
    ])

    return NextResponse.json({
      shortlists: shortlists.map(s => ({
        uid: s.uid,
        statut: s.statut,
        notes: s.notes,
        envoyeeLe: s.envoyeeLe,
        offre: s.offre,
        nbCandidats: s._count.candidats,
        candidats: s.candidats.map(c => ({
          id: c.id,
          ordre: c.ordre,
          retenuParClient: c.retenuParClient,
          commentaireClient: c.commentaireClient,
          talent: c.candidature.talent,
          scoreMatch: c.candidature.scoreMatch,
          motivation: c.candidature.motivation,
          tjmPropose: c.candidature.tjmPropose,
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/client/shortlists:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
