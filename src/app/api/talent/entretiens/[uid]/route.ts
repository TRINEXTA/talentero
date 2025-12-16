/**
 * API Talent - Gestion d'un entretien spécifique
 * Permet au talent de confirmer, refuser ou proposer une autre date
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

    if (!user || user.role !== 'TALENT') {
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
            lieu: true,
            description: true,
            client: {
              select: {
                raisonSociale: true,
                logoUrl: true,
                ville: true,
              },
            },
          },
        },
        candidature: {
          select: {
            uid: true,
            statut: true,
            scoreMatch: true,
            tjmPropose: true,
          },
        },
      },
    })

    if (!entretien) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 })
    }

    // Vérifier que l'entretien appartient au talent
    if (entretien.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    return NextResponse.json({ entretien })
  } catch (error) {
    console.error('Erreur GET /api/talent/entretiens/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH - Répondre à une demande d'entretien
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()

    const entretien = await prisma.entretien.findUnique({
      where: { uid },
      include: {
        offre: {
          select: {
            titre: true,
            clientId: true,
            client: { select: { userId: true } },
          },
        },
        candidature: { select: { id: true } },
        talent: { select: { prenom: true, nom: true } },
      },
    })

    if (!entretien) {
      return NextResponse.json({ error: 'Entretien non trouvé' }, { status: 404 })
    }

    if (entretien.talentId !== user.talentId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { action } = body

    switch (action) {
      case 'confirm': {
        // Confirmer l'entretien
        await prisma.entretien.update({
          where: { uid },
          data: {
            statut: 'CONFIRME',
            confirmeParTalent: true,
            confirmeParTalentLe: new Date(),
          },
        })

        // Mettre à jour la candidature
        await prisma.candidature.update({
          where: { id: entretien.candidature.id },
          data: { statut: 'ENTRETIEN_PLANIFIE' },
        })

        // Notifier le client
        if (entretien.offre.client?.userId) {
          await prisma.notification.create({
            data: {
              userId: entretien.offre.client.userId,
              type: 'ENTRETIEN_CONFIRME',
              titre: 'Entretien confirmé',
              message: `${entretien.talent.prenom} ${entretien.talent.nom} a confirmé l'entretien pour "${entretien.offre.titre}"`,
              lien: `/c/entretiens/${uid}`,
            },
          })
        }

        // Notifier les admins
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        })

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'ENTRETIEN_CONFIRME',
              titre: 'Entretien confirmé',
              message: `${entretien.talent.prenom} ${entretien.talent.nom} a confirmé l'entretien`,
              lien: `/admin/entretiens`,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Entretien confirmé' })
      }

      case 'decline': {
        // Refuser l'entretien
        const { motif } = body

        await prisma.entretien.update({
          where: { uid },
          data: {
            statut: 'ANNULE',
            notesEntretien: motif ? `Refusé par le talent: ${motif}` : 'Refusé par le talent',
          },
        })

        // Remettre la candidature en shortlist
        await prisma.candidature.update({
          where: { id: entretien.candidature.id },
          data: { statut: 'SHORTLIST' },
        })

        // Notifier le client
        if (entretien.offre.client?.userId) {
          await prisma.notification.create({
            data: {
              userId: entretien.offre.client.userId,
              type: 'ENTRETIEN_ANNULE',
              titre: 'Entretien refusé',
              message: `${entretien.talent.prenom} ${entretien.talent.nom} a refusé l'entretien pour "${entretien.offre.titre}"`,
              lien: `/c/entretiens`,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Entretien refusé' })
      }

      case 'propose_alternative': {
        // Proposer une date alternative
        const { dateAlternative, heureAlternative, message } = body

        if (!dateAlternative || !heureAlternative) {
          return NextResponse.json(
            { error: 'Date et heure alternatives requises' },
            { status: 400 }
          )
        }

        await prisma.entretien.update({
          where: { uid },
          data: {
            statut: 'DATE_ALTERNATIVE_PROPOSEE',
            dateAlternative: new Date(dateAlternative),
            heureAlternative,
            notesEntretien: message || null,
          },
        })

        // Notifier le client
        if (entretien.offre.client?.userId) {
          await prisma.notification.create({
            data: {
              userId: entretien.offre.client.userId,
              type: 'ENTRETIEN_DEMANDE',
              titre: 'Date alternative proposée',
              message: `${entretien.talent.prenom} ${entretien.talent.nom} propose une autre date pour l'entretien`,
              lien: `/c/entretiens/${uid}`,
            },
          })
        }

        return NextResponse.json({ success: true, message: 'Date alternative proposée' })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH /api/talent/entretiens/[uid]:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
