/**
 * API Admin - Lancer le matching pour une offre
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { matchTalentsForOffer } from '@/lib/matching'

// POST - Lancer le matching pour une offre
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const offre = await prisma.offre.findUnique({
      where: { uid },
      select: { id: true, titre: true, statut: true },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 })
    }

    if (offre.statut !== 'PUBLIEE') {
      return NextResponse.json(
        { error: 'Le matching ne peut etre lance que sur une offre publiee' },
        { status: 400 }
      )
    }

    // Lance le matching
    const matches = await matchTalentsForOffer(offre.id, 50, true)

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'RUN_MATCHING_ADMIN',
        entite: 'Offre',
        entiteId: offre.id,
        details: { matchCount: matches.length },
      },
    })

    return NextResponse.json({
      success: true,
      matchCount: matches.length,
      message: `${matches.length} talents matches pour "${offre.titre}"`,
    })
  } catch (error) {
    console.error('Erreur POST matching offre:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
