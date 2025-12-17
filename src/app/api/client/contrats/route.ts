/**
 * API Client - Consultation des contrats
 * Permet aux clients de voir et signer leurs contrats
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getContratStats } from '@/lib/contrats'

// GET - Liste des contrats du client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const where = {
      clientId: user.clientId!,
      // Ne pas montrer les brouillons aux clients
      statut: statut
        ? (statut as never)
        : { not: 'BROUILLON' as never },
    }

    const [contrats, stats] = await Promise.all([
      prisma.contrat.findMany({
        where,
        include: {
          talent: {
            select: {
              uid: true,
              prenom: true,
              nom: true,
              titrePoste: true,
              photoUrl: true,
            },
          },
          avenants: {
            where: { statut: { not: 'BROUILLON' } },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      getContratStats({ clientId: user.clientId! }),
    ])

    return NextResponse.json({ contrats, stats })
  } catch (error) {
    console.error('Erreur GET /api/client/contrats:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
