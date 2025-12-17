/**
 * API Admin - Gestion d'une Offre spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { matchTalentsForOffer, getBestMatchesForOffer } from '@/lib/matching'
import { sendMissionLostNotification, sendProfileNotSelectedNotification } from '@/lib/microsoft-graph'
import { generateMissionCode } from '@/lib/utils'

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
            codeUnique: true,
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
                codeUnique: true,
                prenom: true,
                nom: true,
                titrePoste: true,
                competences: true,
                tjmMin: true,
                tjmMax: true,
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
                codeUnique: true,
                prenom: true,
                nom: true,
                titrePoste: true,
                competences: true,
                tjmMin: true,
                tjmMax: true,
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
                        codeUnique: true,
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
        entretiens: {
          include: {
            talent: {
              select: {
                uid: true,
                codeUnique: true,
                prenom: true,
                nom: true,
              },
            },
          },
          orderBy: { dateProposee: 'desc' },
        },
        _count: {
          select: {
            candidatures: true,
            matchs: true,
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
      include: {
        candidatures: {
          include: {
            talent: {
              include: { user: { select: { id: true, email: true } } }
            }
          }
        }
      }
    })

    if (!offre) {
      return NextResponse.json({ error: 'Offre non trouvée' }, { status: 404 })
    }

    // Gestion des actions spéciales
    if (body.action) {
      switch (body.action) {
        case 'valider':
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'PUBLIEE', publieLe: new Date() }
          })
          return NextResponse.json({ success: true, message: 'Offre validée et publiée' })

        case 'refuser':
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'ANNULEE' }
          })
          return NextResponse.json({ success: true, message: 'Offre refusée' })

        case 'passer_evaluation':
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'EN_EVALUATION' }
          })
          return NextResponse.json({ success: true, message: 'Offre passée en évaluation des candidats' })

        case 'envoyer_shortlist':
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'SHORTLIST_ENVOYEE' }
          })
          return NextResponse.json({ success: true, message: 'Shortlist envoyée' })

        case 'marquer_pourvue':
          // Notifie les candidats non retenus
          for (const candidature of offre.candidatures) {
            if (candidature.statut !== 'ACCEPTEE') {
              // Notifier le candidat et marquer comme refusé
              await prisma.candidature.update({
                where: { id: candidature.id },
                data: {
                  statut: 'REFUSEE',
                  notificationRefusEnvoyee: true,
                  reponduLe: new Date()
                }
              })
              // Créer notification
              if (candidature.talent.user) {
                await prisma.notification.create({
                  data: {
                    userId: candidature.talent.user.id,
                    type: 'STATUT_CANDIDATURE',
                    titre: 'Poste pourvu',
                    message: `Le poste "${offre.titre}" a été pourvu. Votre candidature n'a pas été retenue.`,
                    lien: '/t/candidatures'
                  }
                })
              }
            }
          }
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'POURVUE' }
          })
          return NextResponse.json({ success: true, message: 'Poste marqué comme pourvu, candidats notifiés' })

        case 'fermer':
          // Notifie tous les candidats que l'offre est fermée
          for (const candidature of offre.candidatures) {
            if (!['ACCEPTEE', 'REFUSEE', 'MISSION_PERDUE'].includes(candidature.statut)) {
              await prisma.candidature.update({
                where: { id: candidature.id },
                data: {
                  statut: 'MISSION_PERDUE',
                  notificationMissionPerdueEnvoyee: true
                }
              })
              if (candidature.talent.user) {
                await prisma.notification.create({
                  data: {
                    userId: candidature.talent.user.id,
                    type: 'MISSION_PERDUE',
                    titre: 'Offre fermée',
                    message: `L'offre "${offre.titre}" a été fermée.`,
                    lien: '/t/candidatures'
                  }
                })
              }
            }
          }
          await prisma.offre.update({
            where: { uid },
            data: { statut: 'FERMEE' }
          })
          return NextResponse.json({ success: true, message: 'Offre fermée, candidats notifiés' })
      }
    }

    // Champs modifiables
    const allowedFields = [
      'titre',
      'description',
      'responsabilites',
      'profilRecherche',
      'competencesRequises',
      'competencesSouhaitees',
      'secteur',
      'tjmClientReel',
      'tjmAffiche',
      'tjmMin',
      'tjmMax',
      'tjmADefinir',
      'dureeNombre',
      'dureeUnite',
      'dateDebut',
      'dateFin',
      'renouvelable',
      'nombrePostes',
      'lieu',
      'ville',
      'region',
      'codePostal',
      'mobilite',
      'deplacementMultiSite',
      'deplacementEtranger',
      'experienceMin',
      'habilitationRequise',
      'typeHabilitation',
      'visiblePublic',
      'statut',
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

    // Si on passe à POURVUE, on notifie les candidats non retenus
    if (body.statut === 'POURVUE' && offre.statut !== 'POURVUE') {
      // Notifie les candidats non sélectionnés de la shortlist
      const shortlist = await prisma.shortlist.findUnique({
        where: { offreId: offre.id },
        include: {
          candidats: {
            where: { retenuParClient: { not: true } },
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
          sendProfileNotSelectedNotification(
            talent.user.email,
            talent.prenom,
            offre.titre
          ).catch(console.error)

          // Met à jour le statut de la candidature
          await prisma.candidature.update({
            where: { id: candidat.candidature.id },
            data: { statut: 'REFUSEE' },
          })
        }
      }
    }

    // Si on passe à FERMEE (mission perdue), notifie tous les candidats
    if (body.statut === 'FERMEE' && body.missionPerdue) {
      const candidatures = await prisma.candidature.findMany({
        where: { offreId: offre.id },
        include: {
          talent: {
            include: { user: { select: { email: true } } },
          },
        },
      })

      for (const candidature of candidatures) {
        sendMissionLostNotification(
          candidature.talent.user.email,
          candidature.talent.prenom,
          offre.titre
        ).catch(console.error)

        // Met à jour le statut
        await prisma.candidature.update({
          where: { id: candidature.id },
          data: { statut: 'MISSION_PERDUE' },
        })
      }
    }

    const updatedOffre = await prisma.offre.update({
      where: { uid },
      data: updateData,
    })

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
        // Génère un nouveau code et slug
        const codeUnique = await generateMissionCode()
        const baseSlug = `${offre.slug}-copie`
        let slug = baseSlug
        let counter = 1
        while (await prisma.offre.findUnique({ where: { slug } })) {
          slug = `${baseSlug}-${counter}`
          counter++
        }

        const newOffre = await prisma.offre.create({
          data: {
            codeUnique,
            slug,
            clientId: offre.clientId,
            createdByAdmin: true,
            offreTrinexta: offre.offreTrinexta,
            typeOffre: offre.typeOffre,
            titre: `${offre.titre} (copie)`,
            description: offre.description,
            responsabilites: offre.responsabilites,
            profilRecherche: offre.profilRecherche,
            competencesRequises: offre.competencesRequises,
            competencesSouhaitees: offre.competencesSouhaitees,
            secteur: offre.secteur,
            tjmClientReel: offre.tjmClientReel,
            tjmAffiche: offre.tjmAffiche,
            tjmMin: offre.tjmMin,
            tjmMax: offre.tjmMax,
            tjmADefinir: offre.tjmADefinir,
            dureeNombre: offre.dureeNombre,
            dureeUnite: offre.dureeUnite,
            renouvelable: offre.renouvelable,
            nombrePostes: offre.nombrePostes,
            lieu: offre.lieu,
            codePostal: offre.codePostal,
            mobilite: offre.mobilite,
            deplacementMultiSite: offre.deplacementMultiSite,
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
            codeUnique: newOffre.codeUnique,
            slug: newOffre.slug,
            titre: newOffre.titre,
          },
        })
      }

      case 'notify_mission_lost': {
        // Notifie tous les candidats que la mission est perdue
        const candidatures = await prisma.candidature.findMany({
          where: { offreId: offre.id },
          include: {
            talent: {
              include: { user: { select: { email: true } } },
            },
          },
        })

        let notified = 0
        for (const candidature of candidatures) {
          await sendMissionLostNotification(
            candidature.talent.user.email,
            candidature.talent.prenom,
            offre.titre
          )

          await prisma.candidature.update({
            where: { id: candidature.id },
            data: { statut: 'MISSION_PERDUE' },
          })
          notified++
        }

        // Met à jour le statut de l'offre
        await prisma.offre.update({
          where: { uid },
          data: { statut: 'FERMEE' },
        })

        return NextResponse.json({
          success: true,
          message: `${notified} candidats notifiés`,
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
