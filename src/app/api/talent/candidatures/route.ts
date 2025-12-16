/**
 * API Talent Candidatures
 * Gestion des candidatures d'un freelance
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Récupérer les candidatures du talent
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
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = { talentId: talent.id }
    if (statut) {
      where.statut = statut
    }

    const candidatures = await prisma.candidature.findMany({
      where,
      include: {
        offre: {
          select: {
            uid: true,
            slug: true,
            titre: true,
            lieu: true,
            tjmMin: true,
            tjmMax: true,
            tjmAffiche: true,
            dateDebut: true,
            statut: true,
            client: {
              select: {
                raisonSociale: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      candidatures: candidatures.map(c => ({
        uid: c.uid,
        statut: c.statut,
        motivation: c.motivation,
        scoreMatch: c.scoreMatch,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        offre: {
          uid: c.offre.uid,
          slug: c.offre.slug,
          titre: c.offre.titre,
          lieu: c.offre.lieu,
          tjmMin: c.offre.tjmMin,
          tjmMax: c.offre.tjmMax,
          tjmAffiche: c.offre.tjmAffiche,
          dateDebut: c.offre.dateDebut,
          statut: c.offre.statut,
          client: c.offre.client?.raisonSociale || 'TRINEXTA'
        }
      }))
    })

  } catch (error) {
    console.error('Erreur GET candidatures:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une candidature
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        candidatures: {
          select: { offreId: true }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const { offreId, motivation } = body

    if (!offreId) {
      return NextResponse.json({ error: 'Offre requise' }, { status: 400 })
    }

    // Récupère l'offre
    const offre = await prisma.offre.findFirst({
      where: {
        OR: [
          { uid: offreId },
          { slug: offreId }
        ],
        statut: 'PUBLIEE'
      }
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée ou non disponible' }, { status: 404 })
    }

    // Vérifie si déjà candidaté
    const alreadyApplied = talent.candidatures.some(c => c.offreId === offre.id)
    if (alreadyApplied) {
      return NextResponse.json({ error: 'Vous avez déjà postulé à cette offre' }, { status: 400 })
    }

    // Calcule le score de matching
    const talentComps = talent.competences.map(c => c.toLowerCase())
    const offreCompsRequises = offre.competencesRequises.map(c => c.toLowerCase())

    const matchedRequises = offreCompsRequises.filter(c =>
      talentComps.some(tc => tc.includes(c) || c.includes(tc))
    )

    const competenceScore = offreCompsRequises.length > 0
      ? Math.round((matchedRequises.length / offreCompsRequises.length) * 100)
      : 100

    // Expérience
    let experienceScore = 100
    if (offre.experienceMin) {
      const diff = (talent.anneesExperience || 0) - offre.experienceMin
      if (diff < 0) {
        experienceScore = Math.max(0, 100 + (diff * 20))
      }
    }

    const scoreMatch = Math.round((competenceScore * 0.7) + (experienceScore * 0.3))

    // Crée la candidature
    const candidature = await prisma.candidature.create({
      data: {
        talentId: talent.id,
        offreId: offre.id,
        motivation: motivation || null,
        scoreMatch,
        statut: 'NOUVELLE'
      }
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'CANDIDATURE_CREEE',
        entite: 'Candidature',
        entiteId: candidature.id,
        userId: user.id,
        details: {
          offreId: offre.uid,
          offreTitre: offre.titre,
          scoreMatch
        }
      }
    })

    return NextResponse.json({
      success: true,
      candidature: {
        uid: candidature.uid,
        scoreMatch,
        createdAt: candidature.createdAt
      }
    })

  } catch (error) {
    console.error('Erreur POST candidature:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Retirer une candidature
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
    const { candidatureId } = body

    if (!candidatureId) {
      return NextResponse.json({ error: 'ID candidature requis' }, { status: 400 })
    }

    // Vérifie que la candidature appartient au talent
    const candidature = await prisma.candidature.findFirst({
      where: {
        uid: candidatureId,
        talentId: talent.id,
        // Ne peut retirer que si statut NOUVELLE ou VUE
        statut: { in: ['NOUVELLE', 'VUE'] }
      }
    })

    if (!candidature) {
      return NextResponse.json({ error: 'Candidature non trouvée ou ne peut pas être retirée' }, { status: 404 })
    }

    // Supprime la candidature
    await prisma.candidature.delete({
      where: { id: candidature.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur DELETE candidature:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
