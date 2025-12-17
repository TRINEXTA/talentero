/**
 * API Admin - Gestion des contrats
 * Liste et création de contrats
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createContrat, getContratStats } from '@/lib/contrats'

// GET - Liste des contrats
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const clientId = searchParams.get('clientId')
    const talentId = searchParams.get('talentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where = {
      ...(statut && { statut: statut as never }),
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(talentId && { talentId: parseInt(talentId) }),
    }

    const [contrats, total, stats] = await Promise.all([
      prisma.contrat.findMany({
        where,
        include: {
          talent: {
            select: {
              uid: true,
              prenom: true,
              nom: true,
              titrePoste: true,
              photoUrl: true,
            },
          },
          client: {
            select: {
              uid: true,
              raisonSociale: true,
              logoUrl: true,
            },
          },
          avenants: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contrat.count({ where }),
      getContratStats(),
    ])

    return NextResponse.json({
      contrats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/contrats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un nouveau contrat
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()

    // Validation
    if (!body.talentUid || !body.clientUid || !body.titre || !body.tjm || !body.dateDebut) {
      return NextResponse.json(
        { error: 'Données manquantes (talent, client, titre, tjm, dateDebut requis)' },
        { status: 400 }
      )
    }

    // Récupérer les IDs
    const [talent, client] = await Promise.all([
      prisma.talent.findUnique({ where: { uid: body.talentUid }, select: { id: true } }),
      prisma.client.findUnique({ where: { uid: body.clientUid }, select: { id: true } }),
    ])

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const contrat = await createContrat({
      talentId: talent.id,
      clientId: client.id,
      offreId: body.offreId,
      candidatureId: body.candidatureId,
      missionId: body.missionId,
      typeContrat: body.typeContrat,
      titre: body.titre,
      description: body.description,
      lieu: body.lieu,
      mobilite: body.mobilite,
      dateDebut: new Date(body.dateDebut),
      dateFin: body.dateFin ? new Date(body.dateFin) : undefined,
      dureeNombre: body.dureeNombre,
      dureeUnite: body.dureeUnite,
      renouvelable: body.renouvelable,
      conditionsRenouvellement: body.conditionsRenouvellement,
      preavisJours: body.preavisJours,
      tjm: parseInt(body.tjm),
      tauxTVA: body.tauxTVA,
      plafondJours: body.plafondJours,
      plafondMontant: body.plafondMontant,
      clauses: body.clauses,
      conditionsParticulieres: body.conditionsParticulieres,
      notes: body.notes,
      notesInternes: body.notesInternes,
      createdBy: user.id,
    })

    return NextResponse.json({ contrat }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/admin/contrats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
