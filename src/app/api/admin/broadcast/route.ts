/**
 * API Admin - Messagerie Broadcast
 * Envoyer des messages à plusieurs talents à la fois
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, getCurrentUser } from '@/lib/auth'
import { createNotificationWithEmail } from '@/lib/email-notification-service'

// GET - Liste des messages broadcast envoyés
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const [messages, total] = await Promise.all([
      prisma.broadcastMessage.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          expediteur: {
            select: {
              email: true,
            }
          },
          _count: {
            select: {
              destinataires: true,
            }
          }
        }
      }),
      prisma.broadcastMessage.count(),
    ])

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET broadcast messages:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Envoyer un message broadcast
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const user = await getCurrentUser()

    const body = await request.json()
    const { sujet, contenu, talentIds, filters } = body

    if (!sujet || !contenu) {
      return NextResponse.json(
        { error: 'Sujet et contenu requis' },
        { status: 400 }
      )
    }

    let targetTalentIds: number[] = []

    // Si des IDs de talents sont fournis directement
    if (talentIds && Array.isArray(talentIds) && talentIds.length > 0) {
      // Récupérer les IDs internes depuis les UIDs
      const talents = await prisma.talent.findMany({
        where: {
          uid: { in: talentIds }
        },
        select: { id: true }
      })
      targetTalentIds = talents.map(t => t.id)
    }
    // Sinon, utiliser les filtres
    else if (filters) {
      const where: Record<string, unknown> = {}

      // Filtre par statut talent
      if (filters.statut) {
        where.statut = filters.statut
      }

      // Filtre par email vérifié
      if (filters.emailVerifie === true) {
        where.user = { emailVerified: true }
      } else if (filters.emailVerifie === false) {
        where.user = { emailVerified: false }
      }

      // Filtre par jamais connecté
      if (filters.jamaisConnecte) {
        where.user = { ...(where.user as object || {}), lastLoginAt: null }
      }

      // Filtre par importé par admin
      if (filters.importeParAdmin) {
        where.importeParAdmin = true
      }

      // Filtre par compétences
      if (filters.competences && filters.competences.length > 0) {
        where.competences = { hasSome: filters.competences }
      }

      const talents = await prisma.talent.findMany({
        where,
        select: { id: true }
      })
      targetTalentIds = talents.map(t => t.id)
    }

    if (targetTalentIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun talent correspondant aux critères' },
        { status: 400 }
      )
    }

    // Créer le message broadcast
    const message = await prisma.broadcastMessage.create({
      data: {
        sujet,
        contenu,
        expediteurId: user?.id,
        totalEnvoye: targetTalentIds.length,
        destinataires: {
          create: targetTalentIds.map(talentId => ({
            talentId,
          }))
        }
      },
      include: {
        _count: {
          select: { destinataires: true }
        }
      }
    })

    // Créer des notifications pour chaque talent et envoyer emails
    const talentUsers = await prisma.talent.findMany({
      where: { id: { in: targetTalentIds } },
      select: {
        userId: true,
        prenom: true,
        user: { select: { email: true } }
      }
    })

    // Envoyer les notifications avec emails de manière synchrone pour s'assurer qu'ils sont envoyés
    // Utiliser Promise.allSettled pour ne pas bloquer si certains emails échouent
    let emailsSent = 0
    let emailsFailed = 0

    const emailResults = await Promise.allSettled(
      talentUsers.map(async (t) => {
        try {
          await createNotificationWithEmail({
            userId: t.userId,
            type: 'NOUVEAU_MESSAGE',
            titre: sujet,
            message: contenu.substring(0, 200) + (contenu.length > 200 ? '...' : ''),
            lien: `/t/messages`,
          })
          return { success: true, email: t.user.email }
        } catch (err) {
          console.error(`Erreur envoi notification/email à ${t.user.email}:`, err)
          return { success: false, email: t.user.email, error: err }
        }
      })
    )

    // Compter les résultats
    emailResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        emailsSent++
      } else {
        emailsFailed++
      }
    })

    console.log(`Broadcast: ${emailsSent} emails envoyés, ${emailsFailed} échecs sur ${talentUsers.length} destinataires`)

    return NextResponse.json({
      success: true,
      message,
      totalEnvoye: targetTalentIds.length,
      emailStats: {
        sent: emailsSent,
        failed: emailsFailed,
        total: talentUsers.length,
      },
    })
  } catch (error) {
    console.error('Erreur POST broadcast message:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
