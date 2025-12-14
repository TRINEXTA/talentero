/**
 * API Admin - Gestion d'une Offre spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { matchTalentsForOffer, getBestMatchesForOffer } from '@/lib/matching'
import { sendAOResultNotification } from '@/lib/microsoft-graph'

// GET - Détails d'une offre
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const offre = await prisma.offre.findUnique({
      where: { uid },
      include: {
        client: {
          select: {
            uid: true,
            raisonSociale: true,
            typeClient: true,
            contacts: true,
          },
        },
        candidatures: {
          include: {
            talent: {
              select: {
                uid: true,
                prenom: true,
                nom: true,
                titrePoste: true,
                competences: true,
                tjm: true,
                photoUrl: true,
                user: { select: { email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        matchs: {
          include: {
            talent: {
              select: {
                uid: true,
                prenom: true,
                nom: true,
                titrePoste: true,
                competences: true,
                tjm: true,
              },
            },
          },
          orderBy: { score: 'desc' },
          take: 50,
        },
        shortlist: {
          include: {
            candidats: {
              include: {
                candidature: {
                  include: {
                    talent: {
                      select: {
                        uid: true,
                        prenom: true,
                        nom: true,
                        titrePoste: true,
                      },
                    },
                  },
                },
              },
              orderBy: { ordre: 'asc' },
            },
          },
        },
      },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ offre })
  } catch (error) {
    console.error('Erreur GET offre admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier une offre
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()

    const offre = await prisma.offre.findUnique({
      where: { uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Champs modifiables
    const allowedFields = [
      'titre',
      'description',
      'responsabilites',
      'profilRecherche',
      'competencesRequises',
      'competencesSouhaitees',
      'tjmClient',
      'tjmAffiche',
      'tjmMin',
      'tjmMax',
      'tjmADefinir',
      'dureeJours',
      'dateDebut',
      'dateFin',
      'renouvelable',
      'nombrePostes',
      'lieu',
      'codePostal',
      'mobilite',
      'deplacementEtranger',
      'experienceMin',
      'habilitationRequise',
      'typeHabilitation',
      'visiblePublic',
      'statut',
      'resultatAO',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'dateDebut' || field === 'dateFin') {
          updateData[field] = body[field] ? new Date(body[field]) : null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    // Si on passe à PUBLIEE, on met à jour publieLe
    if (body.statut === 'PUBLIEE' && offre.statut !== 'PUBLIEE') {
      updateData.publieLe = new Date()
    }

    const updatedOffre = await prisma.offre.update({
      where: { uid },
      data: updateData,
    })

    // Si le résultat d'AO a changé, notifie les candidats
    if (body.resultatAO && body.resultatAO !== offre.resultatAO) {
      updateData.dateResultat = new Date()

      // Notifie les candidats de la shortlist
      const shortlist = await prisma.shortlist.findUnique({
        where: { offreId: offre.id },
        include: {
          candidats: {
            include: {
              candidature: {
                include: {
                  talent: {
                    include: { user: { select: { email: true } } },
                  },
                },
              },
            },
          },
        },
      })

      if (shortlist) {
        for (const candidat of shortlist.candidats) {
          const talent = candidat.candidature.talent
          sendAOResultNotification(
            talent.user.email,
            talent.prenom,
            offre.titre,
            body.resultatAO
          ).catch(console.error)
        }
      }
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_OFFRE_ADMIN',
        entite: 'Offre',
        entiteId: offre.id,
        details: JSON.parse(JSON.stringify({ modifications: updateData })),
      },
    })

    return NextResponse.json({ offre: updatedOffre })
  } catch (error) {
    console.error('Erreur PATCH offre admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer/Archiver une offre
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const offre = await prisma.offre.findUnique({
      where: { uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Archive l'offre au lieu de la supprimer
    await prisma.offre.update({
      where: { uid },
      data: { statut: 'FERMEE' },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'ARCHIVE_OFFRE_ADMIN',
        entite: 'Offre',
        entiteId: offre.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE offre admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Actions spéciales sur une offre
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()
    const { action } = body

    const offre = await prisma.offre.findUnique({
      where: { uid },
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    switch (action) {
      case 'publish': {
        await prisma.offre.update({
          where: { uid },
          data: {
            statut: 'PUBLIEE',
            publieLe: new Date(),
          },
        })

        // Lance le matching
        const matches = await matchTalentsForOffer(offre.id, 60, true)

        return NextResponse.json({
          success: true,
          message: 'Offre publiée',
          matchesCount: matches.length,
        })
      }

      case 'run_matching': {
        const minScore = body.minScore || 60
        const sendNotifications = body.sendNotifications !== false

        const matches = await matchTalentsForOffer(offre.id, minScore, sendNotifications)

        return NextResponse.json({
          success: true,
          matchesCount: matches.length,
          matches: matches.slice(0, 10), // Retourne les 10 premiers
        })
      }

      case 'get_best_matches': {
        const limit = body.limit || 20
        const matches = await getBestMatchesForOffer(offre.id, limit)

        return NextResponse.json({
          success: true,
          matches,
        })
      }

      case 'duplicate': {
        // Génère un nouveau slug
        const baseSlug = `${offre.slug}-copie`
        let slug = baseSlug
        let counter = 1
        while (await prisma.offre.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }

        const newOffre = await prisma.offre.create({
          data: {
            slug,
            clientId: offre.clientId,
            createdByAdmin: true,
            typeOffre: offre.typeOffre,
            titre: `${offre.titre} (copie)`,
            description: offre.description,
            responsabilites: offre.responsabilites,
            profilRecherche: offre.profilRecherche,
            competencesRequises: offre.competencesRequises,
            competencesSouhaitees: offre.competencesSouhaitees,
            tjmClient: offre.tjmClient,
            tjmAffiche: offre.tjmAffiche,
            tjmMin: offre.tjmMin,
            tjmMax: offre.tjmMax,
            tjmADefinir: offre.tjmADefinir,
            dureeJours: offre.dureeJours,
            renouvelable: offre.renouvelable,
            nombrePostes: offre.nombrePostes,
            lieu: offre.lieu,
            codePostal: offre.codePostal,
            mobilite: offre.mobilite,
            deplacementEtranger: offre.deplacementEtranger,
            experienceMin: offre.experienceMin,
            habilitationRequise: offre.habilitationRequise,
            typeHabilitation: offre.typeHabilitation,
            visiblePublic: false,
            statut: 'BROUILLON',
          },
        })

        return NextResponse.json({
          success: true,
          offre: {
            uid: newOffre.uid,
            slug: newOffre.slug,
            titre: newOffre.titre,
          },
        })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur POST offre admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
