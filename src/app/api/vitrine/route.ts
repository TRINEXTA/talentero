/**
 * API Publique - Vitrine des Freelances
 * Affiche des profils anonymisés pour attirer du trafic
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Liste des profils vitrine (anonymisés)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const specialite = searchParams.get('specialite') || ''
    const competence = searchParams.get('competence') || ''

    const where: Record<string, unknown> = {
      visibleVitrine: true,
      statut: 'ACTIF',
      user: { isActive: true },
    }

    if (specialite) {
      where.titrePoste = { contains: specialite, mode: 'insensitive' }
    }

    if (competence) {
      where.competences = { hasSome: [competence] }
    }

    const [talents, total] = await Promise.all([
      prisma.talent.findMany({
        where,
        select: {
          uid: true,
          titrePoste: true,
          competences: true,
          anneesExperience: true,
          mobilite: true,
          disponibilite: true,
          ville: true,
          // Pas de nom, prénom, email, téléphone - anonymisé
        },
        orderBy: { anneesExperience: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.talent.count({ where }),
    ])

    // Anonymise les données pour la vitrine
    const profilesAnonymes = talents.map((talent, index) => ({
      id: talent.uid,
      reference: `TALENT-${String(index + 1 + (page - 1) * limit).padStart(4, '0')}`,
      titre: talent.titrePoste || 'Consultant IT',
      competences: talent.competences.slice(0, 8),
      experience: talent.anneesExperience,
      mobilite: talent.mobilite,
      disponibilite: talent.disponibilite,
      localisation: talent.ville ? `Région ${talent.ville}` : 'France',
    }))

    // Récupère les spécialités populaires pour les filtres
    const specialites = await prisma.talent.groupBy({
      by: ['titrePoste'],
      where: { visibleVitrine: true, statut: 'ACTIF', titrePoste: { not: null } },
      _count: true,
      orderBy: { _count: { titrePoste: 'desc' } },
      take: 10,
    })

    return NextResponse.json({
      profiles: profilesAnonymes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        specialites: specialites
          .filter(s => s.titrePoste)
          .map(s => ({
            label: s.titrePoste,
            count: s._count,
          })),
      },
    })
  } catch (error) {
    console.error('Erreur GET vitrine:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
