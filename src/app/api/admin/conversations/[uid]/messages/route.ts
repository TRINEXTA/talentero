/**
 * API Admin - Messages d'une conversation
 * GET - Liste des messages
 * POST - Envoyer un message
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotificationWithEmail } from '@/lib/email-notification-service'

// GET - Liste des messages d'une conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid } = await params

    const conversation = await prisma.conversation.findUnique({
      where: { uid },
      include: {
        participants: {
          include: {
            talent: {
              select: {
                uid: true,
                codeUnique: true,
                prenom: true,
                nom: true,
                photoUrl: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            // Pour afficher le nom de l'expediteur talent
          }
        },
        offre: {
          select: {
            uid: true,
            titre: true,
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 })
    }

    // Enrichir les messages avec les infos de l'expediteur
    const messagesWithSender = await Promise.all(
      conversation.messages.map(async (msg) => {
        let expediteur = null
        if (msg.expediteurAdmin) {
          expediteur = { type: 'admin', nom: 'TRINEXTA' }
        } else if (msg.expediteurTalentId) {
          const talent = await prisma.talent.findUnique({
            where: { id: msg.expediteurTalentId },
            select: { prenom: true, nom: true, photoUrl: true }
          })
          expediteur = { type: 'talent', ...talent }
        }
        return { ...msg, expediteur }
      })
    )

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages: messagesWithSender,
      }
    })
  } catch (error) {
    console.error('Erreur GET messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Envoyer un message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({
      where: { uid },
      include: {
        participants: {
          include: {
            talent: {
              include: { user: { select: { id: true } } }
            }
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 })
    }

    // Creer le message
    const newMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        contenu: message,
        expediteurAdmin: true,
      }
    })

    // Mettre a jour la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })

    // Notifier les talents participants avec email
    for (const participant of conversation.participants) {
      if (participant.talent?.user) {
        try {
          await createNotificationWithEmail({
            userId: participant.talent.user.id,
            type: 'NOUVEAU_MESSAGE',
            titre: 'Nouveau message de TRINEXTA',
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            lien: '/t/messages',
          })
        } catch (emailError) {
          console.error('Erreur envoi notification/email:', emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('Erreur POST message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
