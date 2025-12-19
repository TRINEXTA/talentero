/**
 * Script de Rattrapage des Notifications Manquées - Talentero
 *
 * Ce script identifie et envoie les notifications email qui n'ont pas été envoyées :
 * - Comptes non activés (rappels d'activation)
 * - Messages envoyés sans notification email
 * - Changements de statut de candidature non notifiés
 * - Nouveaux matchs non notifiés
 *
 * @author TRINEXTA
 * @version 1.0.0
 */

import { prisma } from '@/lib/db'
import { sendEmailViaGraph, sendAccountActivationEmail } from '@/lib/microsoft-graph'

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

// ============================================
// TYPES
// ============================================

interface CatchupResult {
  type: string
  processed: number
  success: number
  failed: number
  details: string[]
}

interface CatchupReport {
  startedAt: Date
  completedAt: Date
  results: CatchupResult[]
  totalProcessed: number
  totalSuccess: number
  totalFailed: number
}

// ============================================
// 1. RAPPELS COMPTES NON ACTIVÉS
// ============================================

/**
 * Envoie des rappels aux comptes non activés créés il y a plus de 48h
 * mais moins de 7 jours (avant expiration du token)
 */
export async function sendActivationReminders(): Promise<CatchupResult> {
  const result: CatchupResult = {
    type: 'activation_reminders',
    processed: 0,
    success: 0,
    failed: 0,
    details: [],
  }

  try {
    // Trouver les comptes non activés créés entre 2 et 6 jours
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const sixDaysAgo = new Date()
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6)

    const inactiveUsers = await prisma.user.findMany({
      where: {
        emailVerified: false,
        activationToken: { not: null },
        activationTokenExpiry: { gt: new Date() }, // Token pas encore expiré
        createdAt: {
          gte: sixDaysAgo,
          lte: twoDaysAgo,
        },
        // Ne pas renvoyer si rappel déjà envoyé récemment
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lt: twoDaysAgo } }, // Plus de 2 jours depuis le dernier rappel
        ],
      },
      include: {
        talent: { select: { prenom: true, nom: true } },
      },
    })

    result.processed = inactiveUsers.length

    for (const user of inactiveUsers) {
      try {
        const prenom = user.talent?.prenom || 'Freelance'
        const daysLeft = Math.ceil(
          (new Date(user.activationTokenExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        const emailSent = await sendEmailViaGraph({
          to: user.email,
          subject: `⏰ Rappel : Finalisez votre inscription Talentero`,
          bodyHtml: generateActivationReminderHtml(prenom, user.email, user.activationToken!, daysLeft),
          importance: 'high',
        })

        if (emailSent) {
          // Marquer le rappel comme envoyé
          await prisma.user.update({
            where: { id: user.id },
            data: { lastReminderSentAt: new Date() },
          })

          result.success++
          result.details.push(`Rappel envoyé à ${user.email}`)
        } else {
          result.failed++
          result.details.push(`Échec envoi à ${user.email}`)
        }
      } catch (error) {
        result.failed++
        result.details.push(`Erreur pour ${user.email}: ${error}`)
      }

      // Pause pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    result.details.push(`Erreur globale: ${error}`)
  }

  return result
}

function generateActivationReminderHtml(prenom: string, email: string, token: string, daysLeft: number): string {
  const activationUrl = `${APP_URL}/activation?token=${token}`

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 32px 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">⏰</div>
        <h1 style="margin: 0; font-size: 22px;">N'oubliez pas d'activer votre compte !</h1>
      </div>
      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p>Bonjour ${prenom},</p>
        <p>Nous avons remarqué que vous n'avez pas encore activé votre compte Talentero.</p>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <strong>Attention :</strong> Votre lien d'activation expire dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.
        </div>

        <p>En activant votre compte, vous pourrez :</p>
        <ul style="padding-left: 20px;">
          <li>Accéder aux missions IT correspondant à votre profil</li>
          <li>Recevoir des alertes personnalisées</li>
          <li>Postuler en un clic</li>
          <li>Suivre vos candidatures en temps réel</li>
        </ul>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${activationUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
            Activer mon compte maintenant
          </a>
        </p>

        <p style="color: #64748b; font-size: 14px;">
          Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.
        </p>
      </div>
      <div style="padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
        <p style="margin: 0;"><strong>Talentero</strong> - Opéré par TRINEXTA</p>
        <p style="margin: 8px 0 0;">Cet email a été envoyé à ${email}</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

// ============================================
// 2. MESSAGES SANS NOTIFICATION EMAIL
// ============================================

/**
 * Identifie les messages envoyés sans notification email
 * et envoie les notifications manquantes
 */
export async function catchupMissedMessageNotifications(): Promise<CatchupResult> {
  const result: CatchupResult = {
    type: 'missed_message_notifications',
    processed: 0,
    success: 0,
    failed: 0,
    details: [],
  }

  try {
    // Trouver les messages des dernières 24h sans notification email associée
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    // Récupérer les messages récents
    const recentMessages = await prisma.message.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
      },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                talent: { include: { user: true } },
                client: { include: { user: true } },
              },
            },
            offre: { select: { titre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Pour chaque message, vérifier si les destinataires ont reçu un email
    for (const msg of recentMessages) {
      const expediteurId = msg.expediteurTalentId || msg.expediteurClientId
      const isFromAdmin = msg.expediteurAdmin

      for (const participant of msg.conversation.participants) {
        // Ne pas notifier l'expéditeur
        if (participant.talentId === msg.expediteurTalentId) continue
        if (participant.clientId === msg.expediteurClientId) continue
        if (participant.isAdmin && isFromAdmin) continue

        const targetUser = participant.talent?.user || participant.client?.user
        if (!targetUser?.email) continue

        // Vérifier si un email a été envoyé pour ce message
        const emailExists = await prisma.emailLog.findFirst({
          where: {
            destinataire: targetUser.email,
            createdAt: {
              gte: new Date(msg.createdAt.getTime() - 60000), // 1 min avant
              lte: new Date(msg.createdAt.getTime() + 300000), // 5 min après
            },
            sujet: { contains: 'Message' },
          },
        })

        if (!emailExists) {
          result.processed++

          try {
            const expediteurNom = isFromAdmin
              ? 'TRINEXTA'
              : participant.talent
                ? `${participant.talent.user?.email}`
                : 'Un utilisateur'

            const emailSent = await sendEmailViaGraph({
              to: targetUser.email,
              subject: `💬 Nouveau message sur Talentero`,
              bodyHtml: generateMissedMessageHtml(
                participant.talent?.prenom || 'Utilisateur',
                expediteurNom,
                msg.contenu.substring(0, 150),
                msg.conversation.uid,
                msg.conversation.offre?.titre
              ),
            })

            if (emailSent) {
              result.success++
              result.details.push(`Email rattrapage envoyé à ${targetUser.email}`)
            } else {
              result.failed++
            }
          } catch (error) {
            result.failed++
            result.details.push(`Erreur: ${error}`)
          }

          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
  } catch (error) {
    result.details.push(`Erreur globale: ${error}`)
  }

  return result
}

function generateMissedMessageHtml(
  prenomDest: string,
  expediteur: string,
  preview: string,
  conversationUid: string,
  offreTitre?: string
): string {
  const messageUrl = `${APP_URL}/t/messages/${conversationUid}`

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; padding: 32px 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">💬</div>
        <h1 style="margin: 0; font-size: 22px;">Nouveau message</h1>
      </div>
      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p>Bonjour ${prenomDest},</p>
        <p>Vous avez reçu un message de <strong>${expediteur}</strong>${offreTitre ? ` concernant "${offreTitre}"` : ''} :</p>

        <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <em>"${preview}${preview.length >= 150 ? '...' : ''}"</em>
        </div>

        <p style="text-align: center; margin: 32px 0;">
          <a href="${messageUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
            Lire et répondre
          </a>
        </p>
      </div>
      <div style="padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
        <p style="margin: 0;"><strong>Talentero</strong> - Opéré par TRINEXTA</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

// ============================================
// 3. CANDIDATURES NON NOTIFIÉES
// ============================================

/**
 * Rattrape les changements de statut de candidature sans notification email
 */
export async function catchupMissedCandidatureUpdates(): Promise<CatchupResult> {
  const result: CatchupResult = {
    type: 'missed_candidature_updates',
    processed: 0,
    success: 0,
    failed: 0,
    details: [],
  }

  try {
    // Candidatures mises à jour dans les dernières 48h
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const updatedCandidatures = await prisma.candidature.findMany({
      where: {
        updatedAt: { gte: twoDaysAgo },
        statut: { in: ['PRE_SELECTIONNE', 'SHORTLIST', 'ACCEPTEE', 'REFUSEE'] },
      },
      include: {
        talent: {
          include: { user: { select: { id: true, email: true } } },
        },
        offre: { select: { titre: true, uid: true } },
      },
    })

    for (const cand of updatedCandidatures) {
      if (!cand.talent?.user?.email) continue

      // Vérifier si une notification existe
      const notifExists = await prisma.notification.findFirst({
        where: {
          userId: cand.talent.user.id,
          type: 'STATUT_CANDIDATURE',
          createdAt: {
            gte: new Date(cand.updatedAt.getTime() - 300000), // 5 min avant
            lte: new Date(cand.updatedAt.getTime() + 300000), // 5 min après
          },
        },
      })

      if (notifExists) continue // Notification déjà envoyée

      // Vérifier si un email a été envoyé
      const emailExists = await prisma.emailLog.findFirst({
        where: {
          destinataire: cand.talent.user.email,
          createdAt: {
            gte: new Date(cand.updatedAt.getTime() - 300000),
            lte: new Date(cand.updatedAt.getTime() + 300000),
          },
          sujet: { contains: 'candidature' },
        },
      })

      if (emailExists) continue

      result.processed++

      try {
        const statusMessages: Record<string, string> = {
          PRE_SELECTIONNE: `Bonne nouvelle ! Vous êtes pré-sélectionné pour "${cand.offre.titre}"`,
          SHORTLIST: `Vous faites partie de la shortlist pour "${cand.offre.titre}"`,
          ACCEPTEE: `Félicitations ! Vous êtes retenu pour "${cand.offre.titre}"`,
          REFUSEE: `Votre candidature pour "${cand.offre.titre}" n'a pas été retenue`,
        }

        const message = statusMessages[cand.statut] || `Mise à jour pour "${cand.offre.titre}"`
        const isPositive = ['PRE_SELECTIONNE', 'SHORTLIST', 'ACCEPTEE'].includes(cand.statut)

        const emailSent = await sendEmailViaGraph({
          to: cand.talent.user.email,
          subject: isPositive ? `✅ ${message}` : `Mise à jour candidature`,
          bodyHtml: generateCandidatureUpdateHtml(
            cand.talent.prenom,
            message,
            cand.offre.titre,
            isPositive
          ),
          importance: isPositive ? 'high' : 'normal',
        })

        if (emailSent) {
          // Créer aussi la notification in-app manquante
          await prisma.notification.create({
            data: {
              userId: cand.talent.user.id,
              type: 'STATUT_CANDIDATURE',
              titre: 'Mise à jour candidature',
              message,
              lien: '/t/candidatures',
            },
          })

          result.success++
          result.details.push(`Rattrapage ${cand.statut} pour ${cand.talent.user.email}`)
        } else {
          result.failed++
        }
      } catch (error) {
        result.failed++
        result.details.push(`Erreur: ${error}`)
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }
  } catch (error) {
    result.details.push(`Erreur globale: ${error}`)
  }

  return result
}

function generateCandidatureUpdateHtml(
  prenom: string,
  message: string,
  offreTitre: string,
  isPositive: boolean
): string {
  const candidaturesUrl = `${APP_URL}/t/candidatures`
  const headerColor = isPositive
    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    : 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
  const icon = isPositive ? '✅' : '📋'

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <div style="background: ${headerColor}; color: #fff; padding: 32px 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
        <h1 style="margin: 0; font-size: 22px;">Mise à jour de votre candidature</h1>
      </div>
      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <p>Bonjour ${prenom},</p>
        <p><strong>${message}</strong></p>

        ${isPositive ? `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          Notre équipe vous contactera prochainement pour la suite du processus.
        </div>
        ` : `
        <p>Nous vous encourageons à consulter nos autres opportunités qui pourraient correspondre à votre profil.</p>
        `}

        <p style="text-align: center; margin: 32px 0;">
          <a href="${candidaturesUrl}" style="display: inline-block; background: ${headerColor}; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
            Voir mes candidatures
          </a>
        </p>
      </div>
      <div style="padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
        <p style="margin: 0;"><strong>Talentero</strong> - Opéré par TRINEXTA</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

// ============================================
// 4. FONCTION PRINCIPALE DE RATTRAPAGE
// ============================================

/**
 * Exécute tous les rattrapages de notifications
 * À appeler via un cron job ou manuellement
 */
export async function runFullNotificationCatchup(): Promise<CatchupReport> {
  const startedAt = new Date()
  const results: CatchupResult[] = []

  console.log('[NotificationCatchup] Démarrage du rattrapage...')

  // 1. Rappels d'activation
  console.log('[NotificationCatchup] Envoi des rappels d\'activation...')
  const activationResult = await sendActivationReminders()
  results.push(activationResult)
  console.log(`[NotificationCatchup] Rappels: ${activationResult.success}/${activationResult.processed}`)

  // 2. Messages manqués
  console.log('[NotificationCatchup] Rattrapage des messages...')
  const messagesResult = await catchupMissedMessageNotifications()
  results.push(messagesResult)
  console.log(`[NotificationCatchup] Messages: ${messagesResult.success}/${messagesResult.processed}`)

  // 3. Candidatures non notifiées
  console.log('[NotificationCatchup] Rattrapage des candidatures...')
  const candidaturesResult = await catchupMissedCandidatureUpdates()
  results.push(candidaturesResult)
  console.log(`[NotificationCatchup] Candidatures: ${candidaturesResult.success}/${candidaturesResult.processed}`)

  const completedAt = new Date()

  const report: CatchupReport = {
    startedAt,
    completedAt,
    results,
    totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
    totalSuccess: results.reduce((sum, r) => sum + r.success, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
  }

  console.log(`[NotificationCatchup] Terminé. Total: ${report.totalSuccess}/${report.totalProcessed} emails envoyés`)

  // Log le rapport dans la base de données
  try {
    await prisma.auditLog.create({
      data: {
        action: 'NOTIFICATION_CATCHUP',
        entite: 'System',
        entiteId: 0,
        details: report as object,
      },
    })
  } catch (e) {
    console.error('[NotificationCatchup] Erreur log audit:', e)
  }

  return report
}

// Export pour utilisation via API
export type { CatchupReport, CatchupResult }
