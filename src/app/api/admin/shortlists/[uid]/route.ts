/**
 * API Admin - Gestion d'une Shortlist spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendShortlistNotification, sendAOResultNotification } from '@/lib/microsoft-graph'

// GET - Détails d'une shortlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid },
      include: {
        offre: {
          include: {
            client: {
              include: {
                contacts: true,
              },
            },
          },
        },
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
                    competences: true,
                    anneesExperience: true,
                    tjm: true,
                    disponibilite: true,
                    photoUrl: true,
                    cvUrl: true,
                    nationalite: true,
                    user: { select: { email: true } },
                  },
                },
              },
            },
          },
          orderBy: { ordre: 'asc' },
        },
      },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ shortlist })
  } catch (error) {
    console.error('Erreur GET shortlist admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier une shortlist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    const { statut, notes, candidatsOrdre } = body

    const updateData: Record<string, unknown> = {}

    if (statut) {
      updateData.statut = statut
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const updatedShortlist = await prisma.shortlist.update({
      where: { uid },
      data: updateData,
    })

    // Mise à jour de l'ordre des candidats
    if (candidatsOrdre && Array.isArray(candidatsOrdre)) {
      for (let i = 0; i < candidatsOrdre.length; i++) {
        await prisma.shortlistCandidat.updateMany({
          where: {
            shortlistId: shortlist.id,
            candidatureId: candidatsOrdre[i],
          },
          data: { ordre: i + 1 },
        })
      }
    }

    return NextResponse.json({ shortlist: updatedShortlist })
  } catch (error) {
    console.error('Erreur PATCH shortlist admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Actions sur une shortlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()
    const { action } = body

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid },
      include: {
        offre: {
          include: {
            client: {
              include: {
                contacts: { where: { recevoirNotifications: true } },
              },
            },
          },
        },
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

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    switch (action) {
      case 'add_candidat': {
        const { candidatureId } = body

        if (!candidatureId) {
          return NextResponse.json({ error: 'candidatureId requis' }, { status: 400 })
        }

        // Vérifie que la candidature existe et appartient à cette offre
        const candidature = await prisma.candidature.findUnique({
          where: { id: candidatureId },
        })

        if (!candidature || candidature.offreId !== shortlist.offreId) {
          return NextResponse.json({ error: 'Candidature invalide' }, { status: 400 })
        }

        // Ajoute à la shortlist
        const maxOrdre = await prisma.shortlistCandidat.aggregate({
          where: { shortlistId: shortlist.id },
          _max: { ordre: true },
        })

        await prisma.shortlistCandidat.create({
          data: {
            shortlistId: shortlist.id,
            candidatureId,
            ordre: (maxOrdre._max.ordre || 0) + 1,
          },
        })

        // Met à jour le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidatureId },
          data: { statut: 'SHORTLIST' },
        })

        return NextResponse.json({ success: true })
      }

      case 'remove_candidat': {
        const { candidatureId } = body

        await prisma.shortlistCandidat.deleteMany({
          where: {
            shortlistId: shortlist.id,
            candidatureId,
          },
        })

        // Remet le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidatureId },
          data: { statut: 'EN_REVUE' },
        })

        return NextResponse.json({ success: true })
      }

      case 'send_to_client': {
        // Marque comme envoyée
        await prisma.shortlist.update({
          where: { uid },
          data: {
            statut: 'ENVOYEE',
            envoyeeLe: new Date(),
          },
        })

        // Met à jour le statut des candidatures
        for (const candidat of shortlist.candidats) {
          await prisma.candidature.update({
            where: { id: candidat.candidatureId },
            data: { statut: 'PROPOSEE_CLIENT' },
          })
        }

        // Envoie les notifications aux contacts du client
        const client = shortlist.offre.client
        if (client && client.contacts.length > 0) {
          for (const contact of client.contacts) {
            await sendShortlistNotification(
              contact.email,
              contact.prenom,
              shortlist.offre.titre,
              `/c/shortlists/${shortlist.uid}`,
              shortlist.candidats.length
            )
          }
        }

        // Log
        await prisma.auditLog.create({
          data: {
            action: 'SEND_SHORTLIST',
            entite: 'Shortlist',
            entiteId: shortlist.id,
            details: {
              nbCandidats: shortlist.candidats.length,
              contacts: client?.contacts.map(c => c.email),
            },
          },
        })

        return NextResponse.json({ success: true, message: 'Shortlist envoyée au client' })
      }

      case 'set_client_feedback': {
        // Le client a donné son retour sur chaque candidat
        const { feedbacks } = body // Array de { candidatureId, retenu, commentaire }

        if (!feedbacks || !Array.isArray(feedbacks)) {
          return NextResponse.json({ error: 'feedbacks requis' }, { status: 400 })
        }

        for (const fb of feedbacks) {
          await prisma.shortlistCandidat.updateMany({
            where: {
              shortlistId: shortlist.id,
              candidatureId: fb.candidatureId,
            },
            data: {
              retenuParClient: fb.retenu,
              commentaireClient: fb.commentaire,
            },
          })

          // Met à jour le statut de la candidature
          await prisma.candidature.update({
            where: { id: fb.candidatureId },
            data: {
              statut: fb.retenu ? 'ENTRETIEN_DEMANDE' : 'REFUSEE',
              notesClient: fb.commentaire,
            },
          })
        }

        // Met à jour le statut de la shortlist
        await prisma.shortlist.update({
          where: { uid },
          data: { statut: 'FINALISEE' },
        })

        return NextResponse.json({ success: true })
      }

      case 'notify_results': {
        // Notifie les candidats du résultat
        for (const candidat of shortlist.candidats) {
          const talent = candidat.candidature.talent
          const retenu = candidat.retenuParClient

          if (retenu !== null) {
            await sendAOResultNotification(
              talent.user.email,
              talent.prenom,
              shortlist.offre.titre,
              retenu ? 'GAGNEE' : 'PERDUE'
            )
          }
        }

        return NextResponse.json({ success: true, message: 'Notifications envoyées' })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur POST shortlist admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une shortlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const shortlist = await prisma.shortlist.findUnique({
      where: { uid },
      include: { candidats: true },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvée' }, { status: 404 })
    }

    // Remet le statut des candidatures
    for (const candidat of shortlist.candidats) {
      await prisma.candidature.update({
        where: { id: candidat.candidatureId },
        data: { statut: 'EN_REVUE' },
      })
    }

    // Supprime la shortlist
    await prisma.shortlist.delete({
      where: { uid },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE shortlist admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
