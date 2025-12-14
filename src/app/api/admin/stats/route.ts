import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupère les statistiques
    const [
      totalTalents,
      totalClients,
      totalOffres,
      totalCandidatures,
      clientsEnAttente,
      offresEnAttente,
      candidaturesNouvelles,
    ] = await Promise.all([
      prisma.talent.count(),
      prisma.client.count(),
      prisma.offre.count(),
      prisma.candidature.count(),
      prisma.client.count({ where: { statut: 'EN_ATTENTE' } }),
      prisma.offre.count({ where: { statut: 'EN_ATTENTE_VALIDATION' } }),
      prisma.candidature.count({ where: { statut: 'NOUVELLE' } }),
    ])

    return NextResponse.json({
      totalTalents,
      totalClients,
      totalOffres,
      totalCandidatures,
      clientsEnAttente,
      offresEnAttente,
      candidaturesNouvelles,
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/stats:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
