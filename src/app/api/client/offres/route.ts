/**
 * API Client - Gestion des Offres
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateSlug } from '@/lib/utils'

// GET - Liste des offres du client
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
      clientId: user.clientId,
    }

    if (statut) {
      where.statut = statut
    }

    const [offres, total] = await Promise.all([
      prisma.offre.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          shortlist: {
            select: {
              uid: true,
              statut: true,
            },
          },
          _count: {
            select: {
              candidatures: true,
            },
          },
        },
      }),
      prisma.offre.count({ where }),
    ])

    return NextResponse.json({
      offres,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/client/offres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une nouvelle offre
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.clientId) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const body = await request.json()

    // Génère le slug
    const baseSlug = generateSlug(body.titre)
    let slug = baseSlug
    let counter = 1

    // Vérifie l'unicité du slug
    while (await prisma.offre.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const offre = await prisma.offre.create({
      data: {
        clientId: user.clientId,
        titre: body.titre,
        slug,
        description: body.description || '',
        responsabilites: body.responsabilites || null,
        profilRecherche: body.profilRecherche || null,
        competencesRequises: body.competencesRequises || [],
        competencesSouhaitees: body.competencesSouhaitees || [],
        experienceMin: body.experienceMin || null,
        tjmMin: body.tjmMin || null,
        tjmMax: body.tjmMax || null,
        tjmClient: body.tjmClient || null,
        tjmAffiche: body.tjmAffiche || null,
        lieu: body.lieu || null,
        mobilite: body.mobilite || 'FLEXIBLE',
        dureeJours: body.dureeJours || null,
        dateDebut: body.dateDebut ? new Date(body.dateDebut) : null,
        dateFin: body.dateFin ? new Date(body.dateFin) : null,
        renouvelable: body.renouvelable || false,
        statut: 'BROUILLON',
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_OFFRE',
        entite: 'Offre',
        entiteId: offre.id,
        details: JSON.parse(JSON.stringify({ titre: offre.titre, slug: offre.slug })),
      },
    })

    return NextResponse.json({
      success: true,
      offre: {
        uid: offre.uid,
        slug: offre.slug,
        titre: offre.titre,
        statut: offre.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/client/offres:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
