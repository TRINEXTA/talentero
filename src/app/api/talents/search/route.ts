/**
 * API - Recherche de talents
 * Permet de rechercher des talents par nom
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ talents: [] })
    }

    const talents = await prisma.talent.findMany({
      where: {
        OR: [
          { prenom: { contains: query, mode: 'insensitive' } },
          { nom: { contains: query, mode: 'insensitive' } },
          { titrePoste: { contains: query, mode: 'insensitive' } },
        ],
        statut: { in: ['ACTIF', 'EN_MISSION'] },
      },
      select: {
        uid: true,
        prenom: true,
        nom: true,
        titrePoste: true,
        photoUrl: true,
      },
      take: 10,
      orderBy: [{ prenom: 'asc' }, { nom: 'asc' }],
    })

    return NextResponse.json({ talents })
  } catch (error) {
    console.error('Erreur GET /api/talents/search:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
