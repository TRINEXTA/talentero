/**
 * API Client - Shortlists reçues
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des shortlists envoyées au client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== 'CLIENT' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!user.clientId) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {
      offre: { clientId: user.clientId },
      // Pas les EN_COURS (brouillons)
      statut: { in: ['PRETE', 'ENVOYEE', 'EN_ATTENTE_RETOUR', 'FINALISEE'] },
    }

    if (statut) {
      where.statut = statut
    }

    const [shortlists, total] = await Promise.all([
      prisma.shortlist.findMany({
        where,
        orderBy: { envoyeeLe: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          offre: {
            select: {
              uid: true,
              slug: true,
              titre: true,
            },
          },
          candidats: {
            orderBy: { ordre: 'asc' },
            include: {
              candidature: {
                include: {
                  talent: {
                    select: {
                      uid: true,
                      codeUnique: true,
                      titrePoste: true,
                      competences: true,
                      anneesExperience: true,
                      disponibilite: true,
                      mobilite: true,
                      ville: true,
                      bio: true,
                      // PAS de nom, prenom, photo, TJM
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: { candidats: true },
          },
        },
      }),
      prisma.shortlist.count({ where }),
    ])

    return NextResponse.json({
      shortlists: shortlists.map(s => {
        return {
          uid: s.uid,
          nom: `Shortlist - ${s.offre.titre}`,
          statut: s.statut,
          commentaireAdmin: s.notes,
          envoyeeLe: s.envoyeeLe,
          offre: s.offre,
          nbCandidats: s._count.candidats,
          candidats: s.candidats.map((c, index) => {
            const talent = c.candidature.talent
            return {
              uid: c.candidature.uid,
              id: c.id,
              ordre: c.ordre,
              commentaireAdmin: null, // Pas de champ admin pour client
              retenuParClient: c.retenuParClient,
              commentaireClient: c.commentaireClient,
              feedbackClient: c.commentaireClient,
              noteClient: null,
              statutClient: c.statutClient,
              demandeInfos: c.demandeInfos,
              questionClient: c.questionClient,
              reponseCandidat: c.reponseCandidat,
              talent: {
                uid: talent.uid,
                codeUnique: talent.codeUnique || `CANDIDAT-${index + 1}`,
                displayName: `Candidat ${talent.codeUnique || (index + 1)}`,
                titrePoste: talent.titrePoste,
                competences: talent.competences,
                anneesExperience: talent.anneesExperience,
                disponibilite: talent.disponibilite,
                mobilite: talent.mobilite,
                ville: talent.ville,
                bio: talent.bio,
                // PAS de nom, prenom, photo, TJM
              },
              scoreMatch: c.candidature.scoreMatch,
            }
          }),
        }
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/client/shortlists:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
