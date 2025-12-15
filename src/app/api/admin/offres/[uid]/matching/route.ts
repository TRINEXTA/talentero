/**
 * API Admin - Lancer le matching pour une offre
 * POST /api/admin/offres/[uid]/matching
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { matchTalentsForOffer } from '@/lib/matching'

export async function POST(
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

    // Lance le matching
    const results = await matchTalentsForOffer(offre.id, 50, true)

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RUN_MATCHING',
        entite: 'Offre',
        entiteId: offre.id,
        details: { matchCount: results.length },
      },
    })

    return NextResponse.json({
      success: true,
      matchCount: results.length,
      matches: results.map(r => ({
        talentId: r.talentId,
        score: r.score,
        competencesMatchees: r.competencesMatchees,
      })),
    })
  } catch (error) {
    console.error('Erreur matching:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
