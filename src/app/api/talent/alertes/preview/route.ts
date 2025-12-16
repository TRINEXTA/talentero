/**
 * API pour prévisualiser les offres correspondant aux critères d'une alerte
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { previewAlerte } from '@/lib/alertes'
import { AlerteFrequence, Mobilite } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { competences, tjmMin, mobilite, lieux, frequence } = body

    const matchingCount = await previewAlerte({
      competences: competences || [],
      tjmMin: tjmMin ? parseInt(tjmMin) : null,
      mobilite: mobilite as Mobilite | null,
      lieux: lieux || [],
      frequence: (frequence as AlerteFrequence) || 'INSTANTANEE',
    })

    return NextResponse.json({ matchingCount })
  } catch (error) {
    console.error('Erreur POST /api/talent/alertes/preview:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
