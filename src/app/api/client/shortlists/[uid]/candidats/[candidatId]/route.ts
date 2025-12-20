/**
 * API Client - Actions sur un candidat de shortlist
 * Permet au client de donner son feedback (selectionner, refuser, demander entretien, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotificationWithEmail, createBulkNotificationsWithEmail } from '@/lib/email-notification-service'

// PATCH - Action sur un candidat de shortlist
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string; candidatId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid, candidatId } = await params
    const body = await request.json()
    const { action, commentaire, question } = body

    // Verifier que la shortlist existe et appartient au client
    const shortlist = await prisma.shortlist.findUnique({
      where: { uid },
      include: {
        offre: { select: { id: true, clientId: true, titre: true } },
      },
    })

    if (!shortlist) {
      return NextResponse.json({ error: 'Shortlist non trouvee' }, { status: 404 })
    }

    if (shortlist.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }

    // Verifier que le candidat existe dans cette shortlist
    const candidat = await prisma.shortlistCandidat.findUnique({
      where: { id: parseInt(candidatId) },
      include: {
        candidature: {
          include: {
            talent: {
              select: {
                id: true,
                prenom: true,
                nom: true,
                user: { select: { id: true } },
              },
            },
          },
        },
      },
    })

    if (!candidat || candidat.shortlistId !== shortlist.id) {
      return NextResponse.json({ error: 'Candidat non trouve' }, { status: 404 })
    }

    switch (action) {
      case 'selectionner': {
        // Le client selectionne ce candidat
        await prisma.shortlistCandidat.update({
          where: { id: candidat.id },
          data: {
            retenuParClient: true,
            statutClient: 'SELECTIONNE',
            commentaireClient: commentaire || null,
          },
        })

        // Mettre a jour le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidat.candidatureId },
          data: { statut: 'ACCEPTEE' },
        })

        // Notifier les admins avec email
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        })

        await createBulkNotificationsWithEmail(
          admins.map(a => a.id),
          {
            type: 'CANDIDAT_SELECTIONNE',
            titre: 'Candidat sélectionné',
            message: `${candidat.candidature.talent.prenom} ${candidat.candidature.talent.nom} a été sélectionné pour "${shortlist.offre.titre}"`,
            lien: `/admin/shortlists/${uid}`,
          }
        )

        // Notifier le talent qu'il a été sélectionné
        if (candidat.candidature.talent.user?.id) {
          await createNotificationWithEmail({
            userId: candidat.candidature.talent.user.id,
            type: 'CANDIDAT_SELECTIONNE',
            titre: 'Vous avez été sélectionné !',
            message: `Félicitations ! Vous avez été sélectionné pour "${shortlist.offre.titre}"`,
            lien: '/t/candidatures',
          })
        }

        // Log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'CLIENT_SELECTIONNE_CANDIDAT',
            entite: 'ShortlistCandidat',
            entiteId: candidat.id,
            details: JSON.parse(JSON.stringify({
              shortlistUid: uid,
              talent: `${candidat.candidature.talent.prenom} ${candidat.candidature.talent.nom}`,
            })),
          },
        })

        return NextResponse.json({ success: true, message: 'Candidat selectionne' })
      }

      case 'refuser': {
        // Le client refuse ce candidat
        await prisma.shortlistCandidat.update({
          where: { id: candidat.id },
          data: {
            retenuParClient: false,
            statutClient: 'REFUSE',
            commentaireClient: commentaire || null,
          },
        })

        // Mettre a jour le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidat.candidatureId },
          data: { statut: 'REFUSEE' },
        })

        return NextResponse.json({ success: true, message: 'Candidat refuse' })
      }

      case 'entretien': {
        // Le client demande un entretien
        await prisma.shortlistCandidat.update({
          where: { id: candidat.id },
          data: {
            statutClient: 'DEMANDE_ENTRETIEN',
            commentaireClient: commentaire || null,
          },
        })

        // Mettre a jour le statut de la candidature
        await prisma.candidature.update({
          where: { id: candidat.candidatureId },
          data: { statut: 'ENTRETIEN_DEMANDE' },
        })

        // Notifier le talent avec email
        await createNotificationWithEmail({
          userId: candidat.candidature.talent.user.id,
          type: 'ENTRETIEN_DEMANDE',
          titre: 'Demande d\'entretien',
          message: `Un client souhaite vous rencontrer pour "${shortlist.offre.titre}"`,
          lien: '/t/candidatures',
          data: {
            offreTitre: shortlist.offre.titre,
          },
        })

        // Notifier les admins avec email
        const adminsEntretien = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        })

        await createBulkNotificationsWithEmail(
          adminsEntretien.map(a => a.id),
          {
            type: 'ENTRETIEN_DEMANDE',
            titre: 'Demande d\'entretien client',
            message: `Entretien demandé avec ${candidat.candidature.talent.prenom} ${candidat.candidature.talent.nom}`,
            lien: `/admin/shortlists/${uid}`,
          }
        )

        return NextResponse.json({ success: true, message: 'Demande d\'entretien envoyee' })
      }

      case 'demande_infos': {
        // Le client demande des informations supplementaires
        if (!question) {
          return NextResponse.json({ error: 'Question requise' }, { status: 400 })
        }

        await prisma.shortlistCandidat.update({
          where: { id: candidat.id },
          data: {
            statutClient: 'DEMANDE_INFOS',
            demandeInfos: true,
            questionClient: question,
          },
        })

        // Notifier le talent avec email
        await createNotificationWithEmail({
          userId: candidat.candidature.talent.user.id,
          type: 'NOUVEAU_MESSAGE',
          titre: 'Question d\'un client',
          message: `Un client vous pose une question concernant "${shortlist.offre.titre}"`,
          lien: '/t/candidatures',
        })

        return NextResponse.json({ success: true, message: 'Question envoyee' })
      }

      case 'voir': {
        // Marquer comme vu
        await prisma.shortlistCandidat.update({
          where: { id: candidat.id },
          data: { statutClient: 'VU' },
        })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH /api/client/shortlists/[uid]/candidats/[candidatId]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
