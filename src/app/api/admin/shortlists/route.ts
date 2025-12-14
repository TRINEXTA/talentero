/**
 * API Admin - Gestion des Shortlists
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendShortlistNotification } from '@/lib/microsoft-graph'

// GET - Liste des shortlists
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const statut = searchParams.get('statut') || ''

    const where: Record<string, unknown> = {}

    if (statut) {
      where.statut = statut
    }

    const [shortlists, total] = await Promise.all([
      prisma.shortlist.findMany({
        where,
        include: {
          offre: {
            select: {
              uid: true,
              titre: true,
              typeOffre: true,
              client: {
                select: {
                  uid: true,
                  raisonSociale: true,
                  typeClient: true,
                },
              },
            },
          },
          _count: {
            select: { candidats: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shortlist.count({ where }),
    ])

    return NextResponse.json({
      shortlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET shortlists admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une shortlist pour une offre
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const body = await request.json()
    const { offreId, candidatureIds, notes } = body

    if (!offreId) {
      return NextResponse.json({ error: 'offreId requis' }, { status: 400 })
    }

    // Vérifie l'offre
    const offre = await prisma.offre.findUnique({
      where: { id: offreId },
      include: {
        shortlist: true,
        client: {
          include: { contacts: { where: { estContactPrincipal: true } } },
        },
      },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    if (offre.shortlist) {
      return NextResponse.json(
        { error: 'Une shortlist existe déjà pour cette offre' },
        { status: 400 }
      )
    }

    // Crée la shortlist
    const shortlist = await prisma.shortlist.create({
      data: {
        offreId,
        notes,
        statut: 'EN_COURS',
      },
    })

    // Ajoute les candidatures à la shortlist
    if (candidatureIds?.length) {
      for (let i = 0; i < candidatureIds.length; i++) {
        await prisma.shortlistCandidat.create({
          data: {
            shortlistId: shortlist.id,
            candidatureId: candidatureIds[i],
            ordre: i + 1,
          },
        })

        // Met à jour le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidatureIds[i] },
          data: { statut: 'SHORTLIST' },
        })
      }
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_SHORTLIST',
        entite: 'Shortlist',
        entiteId: shortlist.id,
        details: {
          offreId,
          nbCandidats: candidatureIds?.length || 0,
        },
      },
    })

    return NextResponse.json({
      success: true,
      shortlist: {
        uid: shortlist.uid,
        statut: shortlist.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST shortlist admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
