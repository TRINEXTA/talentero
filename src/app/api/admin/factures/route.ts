/**
 * API Admin - Gestion des factures
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createFacture, getFacturationStats } from '@/lib/facturation'

// GET - Liste des factures
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where = {
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(statut && { statut: statut as never }),
    }

    const [factures, total] = await Promise.all([
      prisma.facture.findMany({
        where,
        include: {
          client: {
            select: {
              uid: true,
              raisonSociale: true,
              logoUrl: true,
            },
          },
          lignes: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.facture.count({ where }),
    ])

    const stats = await getFacturationStats()

    return NextResponse.json({
      factures,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/factures:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une facture
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientUid,
      missionId,
      offreId,
      talentId,
      description,
      periodeDebut,
      periodeFin,
      lignes,
      tauxTVA,
      remise,
      remiseMotif,
      notes,
      notesInternes,
      dateEcheance,
    } = body

    if (!clientUid || !description || !lignes?.length) {
      return NextResponse.json(
        { error: 'Client, description et lignes requis' },
        { status: 400 }
      )
    }

    // Trouver le client
    const client = await prisma.client.findUnique({
      where: { uid: clientUid },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const facture = await createFacture({
      clientId: client.id,
      missionId,
      offreId,
      talentId,
      description,
      periodeDebut: periodeDebut ? new Date(periodeDebut) : undefined,
      periodeFin: periodeFin ? new Date(periodeFin) : undefined,
      lignes,
      tauxTVA,
      remise,
      remiseMotif,
      notes,
      notesInternes,
      dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
      createdBy: user.id,
    })

    return NextResponse.json({
      facture,
      message: 'Facture créée avec succès',
    })
  } catch (error) {
    console.error('Erreur POST /api/admin/factures:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
