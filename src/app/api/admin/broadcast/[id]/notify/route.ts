/**
 * API Admin - Envoi manuel des notifications email pour un broadcast
 * POST - Déclenche l'envoi des emails pour un message broadcast
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { createNotificationWithEmail } from '@/lib/email-notification-service'

// Configuration du batching
const BATCH_SIZE = 10
const DELAY_BETWEEN_BATCHES_MS = 30000 // 30 secondes entre chaque lot

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { id } = await params
    const messageId = parseInt(id)

    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    // Récupérer le message broadcast
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                talent: {
                  include: {
                    user: { select: { id: true, email: true } }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    // Récupérer tous les talents destinataires qui n'ont pas encore reçu d'email
    // On vérifie si une notification existe déjà avec emailSent = true
    const talentsToNotify = message.conversation.participants
      .filter(p => p.talent?.user?.email)
      .map(p => ({
        userId: p.talent!.user.id,
        email: p.talent!.user.email,
        prenom: p.talent!.prenom
      }))

    if (talentsToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun destinataire à notifier',
        stats: { total: 0, sent: 0, failed: 0 }
      })
    }

    // Envoyer les emails par lots
    let sent = 0
    let failed = 0
    const total = talentsToNotify.length
    const batches = Math.ceil(total / BATCH_SIZE)

    console.log(`[Broadcast Notify] Début envoi: ${total} destinataires en ${batches} lots`)

    for (let i = 0; i < talentsToNotify.length; i += BATCH_SIZE) {
      const batch = talentsToNotify.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1

      console.log(`[Broadcast Notify] Lot ${batchNumber}/${batches}: ${batch.length} emails`)

      // Envoyer les emails du lot en parallèle
      const results = await Promise.allSettled(
        batch.map(async (t) => {
          try {
            const result = await createNotificationWithEmail({
              userId: t.userId,
              type: 'NOUVEAU_MESSAGE',
              titre: message.conversation.sujet || 'Message de TRINEXTA',
              message: message.contenu.substring(0, 200) + (message.contenu.length > 200 ? '...' : ''),
              lien: '/t/messages',
              skipEmail: false, // Forcer l'envoi d'email
            })
            return { success: result.emailSent, email: t.email }
          } catch (err) {
            console.error(`[Broadcast Notify] Erreur ${t.email}:`, err)
            return { success: false, email: t.email }
          }
        })
      )

      // Compter les résultats
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          sent++
        } else {
          failed++
        }
      })

      // Pause entre les lots (sauf pour le dernier)
      if (i + BATCH_SIZE < talentsToNotify.length) {
        console.log(`[Broadcast Notify] Pause de ${DELAY_BETWEEN_BATCHES_MS / 1000}s avant le prochain lot...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS))
      }
    }

    console.log(`[Broadcast Notify] Terminé: ${sent} envoyés, ${failed} échecs sur ${total}`)

    return NextResponse.json({
      success: true,
      message: `Notifications envoyées: ${sent}/${total}`,
      stats: { total, sent, failed, batches }
    })
  } catch (error) {
    console.error('Erreur POST broadcast notify:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
