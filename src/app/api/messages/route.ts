import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { notifyNewMessageWithEmail } from '@/lib/email-notification-service' // <--- Ajouté

/**
 * GET /api/messages/[uid] - Détails d'une conversation avec tous les messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid } = await params

    // Récupérer la conversation
    const conversation = await prisma.conversation.findUnique({
      where: { uid },
      include: {
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
              },
            },
          },
        },
        participants: {
          include: {
            talent: {
              select: {
                id: true,
                uid: true,
                codeUnique: true,
                prenom: true,
                nom: true,
                photoUrl: true,
              },
            },
            client: {
              select: {
                id: true,
                uid: true,
                codeUnique: true,
                raisonSociale: true,
                logoUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            uid: true,
            contenu: true,
            pieceJointe: true,
            pieceJointeNom: true,
            expediteurTalentId: true,
            expediteurClientId: true,
            expediteurAdmin: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est participant
    const isParticipant = conversation.participants.some((p) => {
      if (user.role === 'TALENT' && user.talentId) return p.talentId === user.talentId
      if (user.role === 'CLIENT' && user.clientId) return p.clientId === user.clientId
      if (user.role === 'ADMIN') return p.isAdmin
      return false
    })

    if (!isParticipant) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    // Marquer les messages comme lus
    const lastMessage = conversation.messages[conversation.messages.length - 1]
    if (lastMessage) {
      let updateWhere: any = { conversationId: conversation.id }
      if (user.role === 'TALENT' && user.talentId) {
        updateWhere.talentId = user.talentId
      } else if (user.role === 'CLIENT' && user.clientId) {
        updateWhere.clientId = user.clientId
      } else if (user.role === 'ADMIN') {
        updateWhere.isAdmin = true
      }

      await prisma.conversationParticipant.updateMany({
        where: updateWhere,
        data: { dernierMessageLu: lastMessage.id },
      })
    }

    // Formater les messages
    const messages = conversation.messages.map((msg) => {
      // Identifier l'expéditeur
      let expediteur: any = null
      if (msg.expediteurTalentId) {
        const talent = conversation.participants.find(
          (p) => p.talentId === msg.expediteurTalentId
        )?.talent
        expediteur = {
          type: 'talent',
          uid: talent?.uid,
          codeUnique: talent?.codeUnique,
          nom: talent ? `${talent.prenom} ${talent.nom}` : 'Talent',
          photoUrl: talent?.photoUrl,
        }
      } else if (msg.expediteurClientId) {
        const client = conversation.participants.find(
          (p) => p.clientId === msg.expediteurClientId
        )?.client
        expediteur = {
          type: 'client',
          uid: client?.uid,
          codeUnique: client?.codeUnique,
          nom: client?.raisonSociale || 'Client',
          photoUrl: client?.logoUrl,
        }
      } else if (msg.expediteurAdmin) {
        expediteur = {
          type: 'admin',
          nom: 'TRINEXTA',
          photoUrl: null,
        }
      }

      return {
        uid: msg.uid,
        contenu: msg.contenu,
        pieceJointe: msg.pieceJointe,
        pieceJointeNom: msg.pieceJointeNom,
        expediteur,
        isFromMe: user.role === 'TALENT'
          ? msg.expediteurTalentId === user.talentId
          : user.role === 'CLIENT'
          ? msg.expediteurClientId === user.clientId
          : msg.expediteurAdmin,
        createdAt: msg.createdAt,
      }
    })

    // Formater les participants
    const participants = conversation.participants.map((p) => ({
      type: p.talentId ? 'talent' : p.clientId ? 'client' : 'admin',
      talent: p.talent ? {
        uid: p.talent.uid,
        codeUnique: p.talent.codeUnique,
        nom: `${p.talent.prenom} ${p.talent.nom}`,
        photoUrl: p.talent.photoUrl,
      } : null,
      client: p.client ? {
        uid: p.client.uid,
        codeUnique: p.client.codeUnique,
        nom: p.client.raisonSociale,
        photoUrl: p.client.logoUrl,
      } : null,
      isAdmin: p.isAdmin,
    }))

    return NextResponse.json({
      conversation: {
        uid: conversation.uid,
        sujet: conversation.sujet,
        offre: conversation.offre,
        participants,
        messages,
        archivee: conversation.archivee,
        createdAt: conversation.createdAt,
      },
    })
  } catch (error) {
    console.error('Erreur detail conversation:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/messages/[uid] - Envoyer un message dans une conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { uid } = await params
    const body = await request.json()
    const { message, pieceJointe, pieceJointeNom } = body

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    // Récupérer la conversation
    const conversation = await prisma.conversation.findUnique({
      where: { uid },
      include: {
        offre: {
          select: {
            titre: true,
          },
        },
        participants: {
          include: {
            talent: { include: { user: true } },
            client: { include: { user: true } },
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation non trouvee' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est participant
    const isParticipant = conversation.participants.some((p) => {
      if (user.role === 'TALENT' && user.talentId) return p.talentId === user.talentId
      if (user.role === 'CLIENT' && user.clientId) return p.clientId === user.clientId
      if (user.role === 'ADMIN') return p.isAdmin
      return false
    })

    if (!isParticipant) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    // Déterminer le nom de l'expéditeur pour la notif
    let expediteurNom = 'Utilisateur'
    if (user.role === 'TALENT' && user.talentId) {
      const p = conversation.participants.find(p => p.talentId === user.talentId)
      expediteurNom = p?.talent?.prenom || 'Freelance'
    } else if (user.role === 'CLIENT' && user.clientId) {
      const p = conversation.participants.find(p => p.clientId === user.clientId)
      expediteurNom = p?.client?.raisonSociale || 'Client'
    } else if (user.role === 'ADMIN') {
      expediteurNom = 'TRINEXTA'
    }

    // Créer le message en transaction
    const newMessage = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: conversation.id,
          contenu: message.trim(),
          pieceJointe,
          pieceJointeNom,
          expediteurTalentId: user.role === 'TALENT' ? user.talentId : null,
          expediteurClientId: user.role === 'CLIENT' ? user.clientId : null,
          expediteurAdmin: user.role === 'ADMIN',
        },
      })

      // Mettre à jour la date de la conversation
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      return msg
    })

    // --- ENVOI DES NOTIFICATIONS (AVEC EMAIL) ---
    // On le fait après la transaction pour ne pas bloquer si l'envoi mail prend du temps
    // et utiliser notre service complet
    
    for (const part of conversation.participants) {
      // Ne pas notifier l'expéditeur
      if (user.role === 'TALENT' && part.talentId === user.talentId) continue
      if (user.role === 'CLIENT' && part.clientId === user.clientId) continue
      if (user.role === 'ADMIN' && part.isAdmin) continue

      const targetUserId = part.talent?.user?.id || part.client?.user?.id
      
      if (targetUserId) {
        await notifyNewMessageWithEmail(
          targetUserId,
          {
            expediteur: expediteurNom,
            preview: message,
            conversationUid: conversation.uid
          }
        ).catch(err => console.error('Erreur notification email:', err))
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        uid: newMessage.uid,
        contenu: newMessage.contenu,
        createdAt: newMessage.createdAt,
      },
    })
  } catch (error) {
    console.error('Erreur envoi message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
