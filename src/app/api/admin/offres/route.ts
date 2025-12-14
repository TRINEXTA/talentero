/**
 * API Admin - Gestion des Offres
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { matchTalentsForOffer } from '@/lib/matching'
import { generateMissionCode } from '@/lib/utils'

// GET - Liste des offres avec filtres
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statut = searchParams.get('statut') || ''
    const typeOffre = searchParams.get('typeOffre') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { titre: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { codeUnique: { contains: search, mode: 'insensitive' } },
        { client: { raisonSociale: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (statut) {
      where.statut = statut
    }

    if (typeOffre) {
      where.typeOffre = typeOffre
    }

    const [offres, total] = await Promise.all([
      prisma.offre.findMany({
        where,
        include: {
          client: {
            select: {
              uid: true,
              codeUnique: true,
              raisonSociale: true,
              typeClient: true,
            },
          },
          shortlist: {
            select: {
              uid: true,
              statut: true,
              _count: { select: { candidats: true } },
            },
          },
          _count: {
            select: {
              candidatures: true,
              matchs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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
    console.error('Erreur GET offres admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle offre (par admin)
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const body = await request.json()

    const {
      clientId,
      typeOffre = 'TRINEXTA',
      titre,
      description,
      responsabilites,
      profilRecherche,
      competencesRequises,
      competencesSouhaitees,
      secteur,
      tjmClientReel, // TJM réel du client (jamais affiché)
      tjmAffiche, // TJM affiché (notre marge)
      tjmMin,
      tjmMax,
      tjmADefinir,
      dureeNombre,
      dureeUnite,
      dateDebut,
      dateFin,
      renouvelable,
      nombrePostes,
      lieu,
      codePostal,
      mobilite,
      deplacementMultiSite,
      deplacementEtranger,
      experienceMin,
      habilitationRequise,
      typeHabilitation,
      visiblePublic,
      publierMaintenant,
    } = body

    if (!titre || !description || !competencesRequises?.length) {
      return NextResponse.json(
        { error: 'Titre, description et compétences requises obligatoires' },
        { status: 400 }
      )
    }

    // Génère le code unique mission (MI + 4 chiffres)
    const codeUnique = await generateMissionCode()

    // Génère un slug unique
    const baseSlug = titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    let slug = baseSlug
    let counter = 1
    while (await prisma.offre.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    const offre = await prisma.offre.create({
      data: {
        codeUnique,
        slug,
        clientId: clientId || null,
        createdByAdmin: true,
        offreTrinexta: !clientId, // Offre TRINEXTA si pas de client
        typeOffre,
        titre,
        description,
        responsabilites,
        profilRecherche,
        competencesRequises,
        competencesSouhaitees: competencesSouhaitees || [],
        secteur,
        tjmClientReel,
        tjmAffiche,
        tjmMin,
        tjmMax,
        tjmADefinir: tjmADefinir || false,
        dureeNombre,
        dureeUnite: dureeUnite || 'MOIS',
        dateDebut: dateDebut ? new Date(dateDebut) : null,
        dateFin: dateFin ? new Date(dateFin) : null,
        renouvelable: renouvelable || false,
        nombrePostes: nombrePostes || 1,
        lieu,
        codePostal,
        mobilite: mobilite || 'FLEXIBLE',
        deplacementMultiSite: deplacementMultiSite || false,
        deplacementEtranger: deplacementEtranger || false,
        experienceMin,
        habilitationRequise: habilitationRequise || false,
        typeHabilitation,
        visiblePublic: visiblePublic !== false,
        statut: publierMaintenant ? 'PUBLIEE' : 'BROUILLON',
        publieLe: publierMaintenant ? new Date() : null,
      },
    })

    // Si publiée, lance le matching automatique
    if (publierMaintenant) {
      // Lance le matching en arrière-plan
      matchTalentsForOffer(offre.id, 60, true).catch(console.error)
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_OFFRE_ADMIN',
        entite: 'Offre',
        entiteId: offre.id,
        details: { titre, codeUnique, typeOffre, publierMaintenant },
      },
    })

    return NextResponse.json({
      success: true,
      offre: {
        uid: offre.uid,
        codeUnique: offre.codeUnique,
        slug: offre.slug,
        titre: offre.titre,
        statut: offre.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST offre admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
