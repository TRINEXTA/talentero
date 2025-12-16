/**
 * API Admin - Matches pour une offre
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// GET - Liste des matches pour une offre
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const offre = await prisma.offre.findUnique({
      where: { uid },
      select: { id: true },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 })
    }

    const matches = await prisma.match.findMany({
      where: { offreId: offre.id },
      include: {
        talent: {
          select: {
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
            ville: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { score: 'desc' },
      take: 50,
    })

    return NextResponse.json({ matches })
  } catch (error) {
    console.error('Erreur GET matches offre:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
