/**
 * API Admin - Export de données
 * Génère des fichiers CSV pour les exports
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateExport, getReportStats, ExportType } from '@/lib/exports'

// GET - Générer un export ou des statistiques
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ExportType | null
    const action = searchParams.get('action')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const statut = searchParams.get('statut')
    const clientId = searchParams.get('clientId')
    const talentId = searchParams.get('talentId')

    const filters = {
      ...(dateDebut && { dateDebut: new Date(dateDebut) }),
      ...(dateFin && { dateFin: new Date(dateFin) }),
      ...(statut && { statut }),
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(talentId && { talentId: parseInt(talentId) }),
    }

    // Si action=stats, retourner les statistiques pour le rapport
    if (action === 'stats') {
      const stats = await getReportStats(filters)
      return NextResponse.json({ stats })
    }

    // Sinon, générer l'export CSV
    if (!type) {
      return NextResponse.json(
        { error: 'Type d\'export requis (talents, clients, offres, candidatures, contrats, factures, reviews)' },
        { status: 400 }
      )
    }

    const validTypes: ExportType[] = ['talents', 'clients', 'offres', 'candidatures', 'contrats', 'factures', 'reviews']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type d'export invalide. Types valides: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await generateExport(type, filters)

    // Retourner le fichier CSV
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Export-Count': result.count.toString(),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/admin/exports:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Générer un export avec des filtres complexes
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { type, filters = {} } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Type d\'export requis' },
        { status: 400 }
      )
    }

    const validTypes: ExportType[] = ['talents', 'clients', 'offres', 'candidatures', 'contrats', 'factures', 'reviews']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type d'export invalide. Types valides: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Convertir les dates si présentes
    const parsedFilters = {
      ...filters,
      ...(filters.dateDebut && { dateDebut: new Date(filters.dateDebut) }),
      ...(filters.dateFin && { dateFin: new Date(filters.dateFin) }),
    }

    const result = await generateExport(type, parsedFilters)

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'X-Export-Count': result.count.toString(),
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/admin/exports:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
