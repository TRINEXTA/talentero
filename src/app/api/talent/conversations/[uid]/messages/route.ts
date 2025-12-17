/**
 * API Talent - Messages d'une conversation
 * GET - Liste des messages
 * POST - Envoyer une reponse
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des messages d'une conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
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

    const { uid } = await params

    const conversation = await prisma.conversation.findFirst({
      where: {
        uid,
        participants: {
          some: { talentId: talent.id }
        }
      },
      include: {
        participants: {
          include: {
            talent: {
              select: {
                uid: true,
                prenom: true,
                nom: true,
                photoUrl: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        offre: {
          select: {
            uid: true,
            codeUnique: true,
            titre: true,
            statut: true,
            client: {
              select: {
                uid: true,
                codeUnique: true,
                raisonSociale: true,
                logoUrl: true,
              }
            }
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 })
    }

    // Marquer comme lu - mettre a jour dernierMessageLu
    const lastMessage = conversation.messages[conversation.messages.length - 1]
    if (lastMessage) {
      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: conversation.id,
          talentId: talent.id,
        },
        data: {
          dernierMessageLu: lastMessage.id,
        }
      })
    }

    // Enrichir les messages avec les infos de l'expediteur
    const messagesWithSender = conversation.messages.map((msg) => {
      let expediteur
      if (msg.expediteurAdmin) {
        expediteur = { type: 'admin', nom: 'TRINEXTA' }
      } else if (msg.expediteurTalentId === talent.id) {
        expediteur = { type: 'moi', nom: 'Vous' }
      } else {
        expediteur = { type: 'talent', nom: 'Autre participant' }
      }
      return { ...msg, expediteur }
    })

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages: messagesWithSender,
      }
    })
  } catch (error) {
    console.error('Erreur GET messages talent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Envoyer une reponse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
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

    const { uid } = await params
    const body = await request.json()
    const { message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    // Verifier que le talent participe a cette conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        uid,
        participants: {
          some: { talentId: talent.id }
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
        expediteurTalentId: talent.id,
      }
    })

    // Mettre a jour la conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    })

    // Mettre a jour dernierMessageLu pour ce talent
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: conversation.id,
        talentId: talent.id,
      },
      data: {
        dernierMessageLu: newMessage.id,
      }
    })

    return NextResponse.json({
      success: true,
      message: newMessage,
    })
  } catch (error) {
    console.error('Erreur POST message talent:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
