import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createCandidatureSchema } from '@/lib/validations'
import { calculateMatchScore } from '@/lib/cv-parser'

// GET /api/candidatures - Liste des candidatures
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const statut = searchParams.get('statut')

    const skip = (page - 1) * limit

    let where: any = {}

    // Filtre selon le rôle
    if (user.role === 'TALENT') {
      where.talentId = user.talentId
    } else if (user.role === 'CLIENT') {
      where.offre = { clientId: user.clientId }
    }
    // Admin voit toutes les candidatures

    if (statut) {
      where.statut = statut
    }

    const [candidatures, total] = await Promise.all([
      prisma.candidature.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
              tjmMin: true,
              tjmMax: true,
              lieu: true,
              client: {
                select: {
                  raisonSociale: true,
                },
              },
            },
          },
          talent: {
            select: {
              uid: true,
              prenom: true,
              nom: true,
              titrePoste: true,
              competences: true,
              tjm: true,
              ville: true,
              photoUrl: true,
            },
          },
        },
      }),
      prisma.candidature.count({ where }),
    ])

    return NextResponse.json({
      candidatures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/candidatures:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST /api/candidatures - Créer une candidature
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json(
        { error: 'Vous devez être connecté en tant que freelance pour postuler' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Récupère l'offre par uid ou id
    const offre = await prisma.offre.findFirst({
      where: {
        OR: [
          { uid: body.offreId },
          { id: typeof body.offreId === 'number' ? body.offreId : undefined },
        ],
        statut: 'PUBLIEE',
      },
      include: {
        client: {
          select: {
            contactEmail: true,
          },
        },
      },
    })

    if (!offre) {
      return NextResponse.json(
        { error: 'Offre non trouvée ou non disponible' },
        { status: 404 }
      )
    }

    // Vérifie si déjà candidaté
    const existingCandidature = await prisma.candidature.findUnique({
      where: {
        offreId_talentId: {
          offreId: offre.id,
          talentId: user.talentId!,
        },
      },
    })

    if (existingCandidature) {
      return NextResponse.json(
        { error: 'Vous avez déjà postulé à cette offre' },
        { status: 400 }
      )
    }

    // Récupère le profil talent pour calculer le score
    const talent = await prisma.talent.findUnique({
      where: { id: user.talentId! },
      select: {
        competences: true,
        disponibilite: true,
      },
    })

    // Calcule le score de matching
    const matchResult = calculateMatchScore(
      talent?.competences || [],
      offre.competencesRequises,
      offre.competencesSouhaitees
    )

    // Crée la candidature
    const candidature = await prisma.candidature.create({
      data: {
        offreId: offre.id,
        talentId: user.talentId!,
        tjmPropose: body.tjmPropose || null,
        motivation: body.motivation || null,
        disponibilite: talent?.disponibilite,
        scoreMatch: matchResult.score,
        statut: 'NOUVELLE',
      },
    })

    // Met à jour le compteur de candidatures de l'offre
    await prisma.offre.update({
      where: { id: offre.id },
      data: { nbCandidatures: { increment: 1 } },
    })

    // Crée ou met à jour le match
    await prisma.match.upsert({
      where: {
        offreId_talentId: {
          offreId: offre.id,
          talentId: user.talentId!,
        },
      },
      create: {
        offreId: offre.id,
        talentId: user.talentId!,
        score: matchResult.score,
        competencesMatchees: matchResult.matchedRequired,
        competencesManquantes: matchResult.missingRequired,
      },
      update: {
        score: matchResult.score,
        competencesMatchees: matchResult.matchedRequired,
        competencesManquantes: matchResult.missingRequired,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_CANDIDATURE',
        entite: 'Candidature',
        entiteId: candidature.id,
        details: {
          offreId: offre.id,
          offreTitre: offre.titre,
          scoreMatch: matchResult.score,
        },
      },
    })

    // Crée une notification pour le client/admin
    await prisma.notification.create({
      data: {
        type: 'NOUVELLE_CANDIDATURE',
        titre: 'Nouvelle candidature',
        message: `Nouvelle candidature pour "${offre.titre}" (Score: ${matchResult.score}%)`,
        lien: `/c/candidatures/${candidature.uid}`,
      },
    })

    return NextResponse.json({
      success: true,
      candidature: {
        uid: candidature.uid,
        scoreMatch: matchResult.score,
        statut: candidature.statut,
      },
      matchDetails: {
        score: matchResult.score,
        matchedRequired: matchResult.matchedRequired,
        matchedOptional: matchResult.matchedOptional,
        missingRequired: matchResult.missingRequired,
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/candidatures:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
