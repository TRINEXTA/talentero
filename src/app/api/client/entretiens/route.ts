/**
 * API Client - Gestion des demandes d'entretien
 * Permet au client de demander un entretien avec un candidat shortlisté
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des entretiens pour le client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')

    const entretiens = await prisma.entretien.findMany({
      where: {
        offre: { clientId: user.clientId! },
        ...(statut && { statut: statut as never }),
      },
      include: {
        offre: {
          select: {
            uid: true,
            titre: true,
          },
        },
        talent: {
          select: {
            uid: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            photoUrl: true,
          },
        },
        candidature: {
          select: {
            id: true,
            statut: true,
          },
        },
      },
      orderBy: { dateProposee: 'asc' },
    })

    return NextResponse.json({ entretiens })
  } catch (error) {
    console.error('Erreur GET /api/client/entretiens:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une demande d'entretien
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { candidatureId, dateProposee, heureDebut, heureFin, typeVisio, message } = body

    if (!candidatureId || !dateProposee || !heureDebut) {
      return NextResponse.json(
        { error: 'Informations manquantes (candidatureId, dateProposee, heureDebut)' },
        { status: 400 }
      )
    }

    // Vérifier que la candidature existe et appartient à une offre du client
    const candidature = await prisma.candidature.findUnique({
      where: { id: candidatureId },
      include: {
        offre: { select: { id: true, clientId: true, titre: true } },
        talent: { select: { id: true, prenom: true, nom: true, user: { select: { email: true } } } },
      },
    })

    if (!candidature) {
      return NextResponse.json({ error: 'Candidature non trouvée' }, { status: 404 })
    }

    if (candidature.offre.clientId !== user.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier qu'il n'y a pas déjà un entretien en attente pour cette candidature
    const existingEntretien = await prisma.entretien.findFirst({
      where: {
        candidatureId,
        statut: { in: ['EN_ATTENTE_CONFIRMATION', 'CONFIRME'] },
      },
    })

    if (existingEntretien) {
      return NextResponse.json(
        { error: 'Un entretien est déjà planifié pour ce candidat' },
        { status: 400 }
      )
    }

    // Créer l'entretien
    const entretien = await prisma.entretien.create({
      data: {
        offreId: candidature.offre.id,
        candidatureId: candidature.id,
        talentId: candidature.talent.id,
        dateProposee: new Date(dateProposee),
        heureDebut,
        heureFin: heureFin || null,
        typeVisio: typeVisio || null,
        notes: message || null,
        statut: 'EN_ATTENTE_CONFIRMATION',
      },
    })

    // Mettre à jour le statut de la candidature
    await prisma.candidature.update({
      where: { id: candidatureId },
      data: { statut: 'ENTRETIEN_DEMANDE' },
    })

    // Créer une notification pour le talent
    const talentUser = await prisma.user.findFirst({
      where: { talent: { id: candidature.talent.id } },
    })

    if (talentUser) {
      await prisma.notification.create({
        data: {
          userId: talentUser.id,
          type: 'ENTRETIEN',
          titre: 'Demande d\'entretien',
          message: `Vous avez reçu une demande d'entretien pour l'offre "${candidature.offre.titre}"`,
          lien: `/t/entretiens/${entretien.uid}`,
        },
      })
    }

    // Créer une notification pour les admins TRINEXTA
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEME',
          titre: 'Nouvelle demande d\'entretien',
          message: `Le client a demandé un entretien avec ${candidature.talent.prenom} ${candidature.talent.nom}`,
          lien: `/admin/entretiens/${entretien.uid}`,
        },
      })
    }

    // Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CLIENT_DEMANDE_ENTRETIEN',
        entite: 'Entretien',
        entiteId: entretien.id,
        details: JSON.parse(JSON.stringify({
          offreId: candidature.offre.id,
          talent: `${candidature.talent.prenom} ${candidature.talent.nom}`,
          dateProposee,
          heureDebut,
        })),
      },
    })

    return NextResponse.json({
      success: true,
      entretien: {
        uid: entretien.uid,
        dateProposee: entretien.dateProposee,
        heureDebut: entretien.heureDebut,
        statut: entretien.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST /api/client/entretiens:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
