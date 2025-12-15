/**
 * API Client - Gestion d'un entretien spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Détails d'un entretien
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params

    const entretien = await prisma.entretien.findUnique({
      where: { uid },
      include: {
        offre: {
          select: {
            uid: true,
            titre: true,
            clientId: true,
          },
        },
        talent: {
          select: {
            uid: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            photoUrl: true,
            telephone: true,
            user: {
              select: { email: true },
            },
          },
        },
        candidature: {
          select: {
            id: true,
            statut: true,
            tjmPropose: true,
          },
        },
      },
    })

    if (!entretien) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 })
    }

    // Vérifier que l'entretien appartient au client
    if (entretien.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ entretien })
  } catch (error) {
    console.error('Erreur GET /api/client/entretiens/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Modifier un entretien (annuler, reprogrammer)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()

    const entretien = await prisma.entretien.findUnique({
      where: { uid },
      include: {
        offre: { select: { clientId: true, titre: true } },
        talent: { select: { id: true, prenom: true, nom: true } },
        candidature: { select: { id: true } },
      },
    })

    if (!entretien) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 })
    }

    if (entretien.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { action } = body

    switch (action) {
      case 'cancel': {
        // Annuler l'entretien
        await prisma.entretien.update({
          where: { uid },
          data: {
            statut: 'ANNULE',
            notes: body.motif ? `Annulé par le client: ${body.motif}` : 'Annulé par le client',
          },
        })

        // Remettre la candidature en statut précédent
        await prisma.candidature.update({
          where: { id: entretien.candidature.id },
          data: { statut: 'SHORTLIST' },
        })

        // Notifier le talent
        const talentUser = await prisma.user.findFirst({
          where: { talent: { id: entretien.talent.id } },
        })

        if (talentUser) {
          await prisma.notification.create({
            data: {
              userId: talentUser.id,
              type: 'ENTRETIEN',
              titre: 'Entretien annulé',
              message: `L'entretien pour "${entretien.offre.titre}" a été annulé`,
              lien: `/t/candidatures`,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Entretien annulé' })
      }

      case 'reschedule': {
        // Reprogrammer l'entretien
        const { dateProposee, heureDebut, heureFin } = body

        if (!dateProposee || !heureDebut) {
          return NextResponse.json(
            { error: 'Date et heure requises' },
            { status: 400 }
          )
        }

        await prisma.entretien.update({
          where: { uid },
          data: {
            dateProposee: new Date(dateProposee),
            heureDebut,
            heureFin: heureFin || null,
            statut: 'EN_ATTENTE_CONFIRMATION',
            confirmeParTalent: false,
            confirmeParTalentLe: null,
          },
        })

        // Notifier le talent
        const talentUser = await prisma.user.findFirst({
          where: { talent: { id: entretien.talent.id } },
        })

        if (talentUser) {
          await prisma.notification.create({
            data: {
              userId: talentUser.id,
              type: 'ENTRETIEN',
              titre: 'Entretien reprogrammé',
              message: `L'entretien pour "${entretien.offre.titre}" a été reprogrammé`,
              lien: `/t/entretiens/${uid}`,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Entretien reprogrammé' })
      }

      case 'accept_alternative': {
        // Accepter la date alternative proposée par le talent
        if (!entretien.dateAlternative) {
          return NextResponse.json(
            { error: 'Aucune date alternative proposée' },
            { status: 400 }
          )
        }

        await prisma.entretien.update({
          where: { uid },
          data: {
            dateProposee: entretien.dateAlternative,
            heureDebut: entretien.heureAlternative || entretien.heureDebut,
            statut: 'CONFIRME',
            confirmeParTalent: true,
            confirmeParTalentLe: new Date(),
            dateAlternative: null,
            heureAlternative: null,
          },
        })

        // Mettre à jour la candidature
        await prisma.candidature.update({
          where: { id: entretien.candidature.id },
          data: { statut: 'ENTRETIEN_PLANIFIE' },
        })

        return NextResponse.json({ success: true, message: 'Date alternative acceptée' })
      }

      case 'mark_completed': {
        // Marquer l'entretien comme réalisé
        await prisma.entretien.update({
          where: { uid },
          data: {
            statut: 'REALISE',
            notes: body.feedback ? `Feedback client: ${body.feedback}` : entretien.notes,
          },
        })

        // Mettre à jour la candidature
        await prisma.candidature.update({
          where: { id: entretien.candidature.id },
          data: { statut: 'ENTRETIEN_REALISE' },
        })

        return NextResponse.json({ success: true, message: 'Entretien marqué comme réalisé' })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH /api/client/entretiens/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
