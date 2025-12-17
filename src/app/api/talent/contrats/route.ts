/**
 * API Talent - Consultation des contrats
 * Permet aux talents de voir et signer leurs contrats
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getContratStats } from '@/lib/contrats'

// GET - Liste des contrats du talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const where = {
      talentId: user.talentId!,
      // Ne pas montrer les brouillons aux talents
      statut: statut
        ? (statut as never)
        : { not: 'BROUILLON' as never },
    }

    const [contrats, stats] = await Promise.all([
      prisma.contrat.findMany({
        where,
        include: {
          client: {
            select: {
              uid: true,
              raisonSociale: true,
              logoUrl: true,
            },
          },
          avenants: {
            where: { statut: { not: 'BROUILLON' } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getContratStats({ talentId: user.talentId! }),
    ])

    return NextResponse.json({ contrats, stats })
  } catch (error) {
    console.error('Erreur GET /api/talent/contrats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
