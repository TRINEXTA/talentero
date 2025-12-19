/**
 * API Talent - Gestion des conversations
 * GET - Liste des conversations du talent
 * POST - Creer une nouvelle conversation (support/question)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des conversations du talent
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouve' }, { status: 404 })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { talentId: talent.id }
        }
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            talent: {
              select: {
                uid: true,
                prenom: true,
                nom: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            uid: true,
            contenu: true,
            createdAt: true,
            expediteurAdmin: true,
            expediteurTalentId: true,
          }
        },
        offre: {
          select: {
            uid: true,
            titre: true,
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    // Calculer les messages non lus pour chaque conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const participant = conv.participants.find(p => p.talentId === talent.id)
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            id: { gt: participant?.dernierMessageLu || 0 },
            expediteurTalentId: { not: talent.id }, // Messages des autres
          }
        })
        return { ...conv, unreadCount }
      })
    )

    return NextResponse.json({ conversations: conversationsWithUnread })
  } catch (error) {
    console.error('Erreur GET conversations talent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Creer une nouvelle conversation (question/support)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouve' }, { status: 404 })
    }

    const body = await request.json()
    const { sujet, message } = body

    if (!sujet || !message) {
      return NextResponse.json(
        { error: 'Sujet et message sont requis' },
        { status: 400 }
      )
    }

    // Creer la conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: 'SUPPORT',
        sujet,
        participants: {
          create: [
            { talentId: talent.id },
            { isAdmin: true }
          ]
        },
        messages: {
          create: {
            contenu: message,
            expediteurTalentId: talent.id,
          }
        }
      }
    })

    // Notifier les admins (on pourrait avoir une table admin specifique)
    // Pour l'instant, on cree juste la conversation

    return NextResponse.json({
      success: true,
      conversation: {
        uid: conversation.uid,
      }
    })
  } catch (error) {
    console.error('Erreur POST conversation talent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
