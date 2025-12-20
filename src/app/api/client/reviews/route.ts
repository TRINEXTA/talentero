/**
 * API Client - Gestion des reviews
 * Permet aux clients de créer et gérer leurs évaluations de talents
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotificationWithEmail } from '@/lib/email-notification-service'

// GET - Liste des reviews créées par le client
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const reviews = await prisma.review.findMany({
      where: { clientId: user.clientId! },
      include: {
        talent: {
          select: {
            uid: true,
            prenom: true,
            nom: true,
            titrePoste: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Stats
    const stats = {
      total: reviews.length,
      publiees: reviews.filter((r) => r.statut === 'PUBLIEE').length,
      enAttente: reviews.filter((r) => r.statut === 'EN_ATTENTE').length,
      moyenneNote: reviews.length > 0
        ? Math.round(reviews.reduce((sum, r) => sum + r.noteGlobale, 0) / reviews.length * 10) / 10
        : 0,
    }

    return NextResponse.json({ reviews, stats })
  } catch (error) {
    console.error('Erreur GET /api/client/reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer une nouvelle review
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      talentUid,
      missionId,
      candidatureId,
      noteGlobale,
      noteCompetences,
      noteCommunication,
      notePonctualite,
      noteQualite,
      titre,
      commentaire,
      recommande,
    } = body

    // Validation
    if (!talentUid || !noteGlobale || !commentaire) {
      return NextResponse.json(
        { error: 'Talent, note globale et commentaire requis' },
        { status: 400 }
      )
    }

    if (noteGlobale < 1 || noteGlobale > 5) {
      return NextResponse.json(
        { error: 'La note doit être entre 1 et 5' },
        { status: 400 }
      )
    }

    // Trouver le talent
    const talent = await prisma.talent.findUnique({
      where: { uid: talentUid },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Vérifier si une review existe déjà pour ce talent/mission
    const existingReview = await prisma.review.findFirst({
      where: {
        clientId: user.clientId!,
        talentId: talent.id,
        ...(missionId && { missionId }),
        ...(candidatureId && { candidatureId }),
      },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'Vous avez déjà évalué ce talent pour cette mission' },
        { status: 400 }
      )
    }

    // Créer la review
    const review = await prisma.review.create({
      data: {
        talentId: talent.id,
        clientId: user.clientId!,
        missionId: missionId || undefined,
        candidatureId: candidatureId || undefined,
        noteGlobale,
        noteCompetences: noteCompetences || undefined,
        noteCommunication: noteCommunication || undefined,
        notePonctualite: notePonctualite || undefined,
        noteQualite: noteQualite || undefined,
        titre: titre || undefined,
        commentaire,
        recommande: recommande !== false,
        statut: 'EN_ATTENTE', // En attente de validation admin
      },
    })

    // Notifier le talent avec email
    if (talent.userId) {
      const talentUser = await prisma.user.findFirst({
        where: { talent: { id: talent.id } },
      })

      if (talentUser) {
        await createNotificationWithEmail({
          userId: talentUser.id,
          type: 'NOUVEAU_MESSAGE',
          titre: 'Nouvelle évaluation reçue',
          message: 'Un client a laissé une évaluation sur votre profil. Elle sera visible après validation.',
          lien: '/t/profil',
        })
      }
    }

    return NextResponse.json({
      review,
      message: 'Évaluation créée avec succès. Elle sera visible après validation.',
    })
  } catch (error) {
    console.error('Erreur POST /api/client/reviews:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
