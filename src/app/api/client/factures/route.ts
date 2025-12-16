/**
 * API Client - Consultation des factures
 * Permet aux clients de voir leurs factures
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getFacturationStats } from '@/lib/facturation'

// GET - Liste des factures du client
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

    const factures = await prisma.facture.findMany({
      where,
      include: {
        lignes: {
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Stats client (sans les brouillons)
    const stats = await getFacturationStats(user.clientId!)

    return NextResponse.json({ factures, stats })
  } catch (error) {
    console.error('Erreur GET /api/client/factures:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
