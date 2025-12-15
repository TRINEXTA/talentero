/**
 * API Admin - Recuperer les matches d'une offre
 * GET /api/admin/offres/[uid]/matches
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid } = await params

    // Recupere l'offre
    const offre = await prisma.offre.findUnique({
      where: { uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 })
    }

    // Recupere les matches
    const matches = await prisma.match.findMany({
      where: { offreId: offre.id },
      orderBy: { score: 'desc' },
      include: {
        talent: {
          select: {
            id: true,
            uid: true,
            codeUnique: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            competences: true,
            tjm: true,
            tjmMin: true,
            tjmMax: true,
            disponibilite: true,
            mobilite: true,
            ville: true,
            photoUrl: true,
            anneesExperience: true,
          },
        },
      },
    })

    return NextResponse.json({
      matches: matches.map(m => ({
        id: m.id,
        score: m.score,
        scoreDetails: m.scoreDetails,
        competencesMatchees: m.competencesMatchees,
        competencesManquantes: m.competencesManquantes,
        feedbackTjm: m.feedbackTjm,
        feedbackExperience: m.feedbackExperience,
        tjmTropHaut: m.tjmTropHaut,
        experienceInsuffisante: m.experienceInsuffisante,
        notificationEnvoyee: m.notificationEnvoyee,
        talent: m.talent,
      })),
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
