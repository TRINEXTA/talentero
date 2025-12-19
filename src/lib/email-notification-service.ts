/**
 * Service d'Envoi d'Emails pour Notifications - Talentero
 *
 * Ce service unifie les notifications in-app avec l'envoi d'emails.
 * Chaque notification importante déclenche automatiquement un email.
 *
 * @author TRINEXTA
 * @version 1.0.0
 */

import { prisma } from '@/lib/db'
import { NotificationType } from '@prisma/client'
import { sendEmailViaGraph } from '@/lib/microsoft-graph'

// ============================================
// CONFIGURATION
// ============================================

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@trinexta.fr'

// Types de notifications qui déclenchent un email
const EMAIL_ENABLED_NOTIFICATIONS: NotificationType[] = [
  'NOUVELLE_OFFRE_MATCH',
  'STATUT_CANDIDATURE',
  'SHORTLIST_ENVOYEE',
  'ENTRETIEN_DEMANDE',
  'ENTRETIEN_CONFIRME',
  'ENTRETIEN_RAPPEL',
  'NOUVEAU_MESSAGE',
  'CANDIDAT_SELECTIONNE',
  'CANDIDAT_REFUSE',
  'VALIDATION_COMPTE',
  'BIENVENUE',
  'NOUVELLE_CANDIDATURE',
  'SHORTLIST_RETOUR',
]

// ============================================
// TYPES
// ============================================

interface EmailNotificationData {
  userId: number
  type: NotificationType
  titre: string
  message: string
  lien?: string
  metadata?: Record<string, unknown>
}

interface EmailTemplate {
  subject: string
  preheader: string
  headerColor: string
  headerIcon: string
  bodyHtml: string
  ctaText?: string
  ctaUrl?: string
}

// ============================================
// TEMPLATES EMAIL PROFESSIONNELS
// ============================================

function getEmailTemplate(data: EmailNotificationData, userEmail: string, userName: string): EmailTemplate {
  const { type, titre, message, lien, metadata } = data
  const ctaUrl = lien ? `${APP_URL}${lien.startsWith('/') ? lien : '/' + lien}` : undefined

  switch (type) {
    case 'NOUVELLE_OFFRE_MATCH':
      return {
        subject: titre,
        preheader: 'Une nouvelle mission correspond à votre profil',
        headerColor: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        headerIcon: '🎯',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p>Notre algorithme a détecté une forte compatibilité entre cette mission et votre profil technique.</p>
          <p style="background: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <strong>Conseil :</strong> Les premières candidatures ont plus de chances d'être remarquées.
          </p>
        `,
        ctaText: 'Voir la mission',
        ctaUrl,
      }

    case 'STATUT_CANDIDATURE':
      const isPositive = message.includes('sélectionné') || message.includes('retenu') || message.includes('Bonne nouvelle')
      return {
        subject: titre,
        preheader: 'Mise à jour de votre candidature',
        headerColor: isPositive
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        headerIcon: isPositive ? '✅' : '📋',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          ${isPositive ? `
            <p style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
              <strong>Félicitations !</strong> Votre profil a retenu l'attention de notre équipe.
            </p>
          ` : ''}
        `,
        ctaText: 'Voir mes candidatures',
        ctaUrl,
      }

    case 'ENTRETIEN_DEMANDE':
      return {
        subject: `📅 ${titre}`,
        preheader: 'Un entretien vous est proposé',
        headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        headerIcon: '📅',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <strong>Action requise :</strong> Veuillez confirmer votre disponibilité depuis votre espace.
          </p>
        `,
        ctaText: 'Confirmer l\'entretien',
        ctaUrl,
      }

    case 'ENTRETIEN_CONFIRME':
      return {
        subject: `✅ ${titre}`,
        preheader: 'Entretien confirmé',
        headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: '✅',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p>Un rappel vous sera envoyé 24h avant l'entretien.</p>
        `,
        ctaText: 'Voir les détails',
        ctaUrl,
      }

    case 'ENTRETIEN_RAPPEL':
      return {
        subject: `⏰ RAPPEL : ${titre}`,
        preheader: 'Votre entretien a lieu demain',
        headerColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        headerIcon: '⏰',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p><strong>${message}</strong></p>
          <p style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <strong>Rappel important :</strong> N'oubliez pas de vous connecter quelques minutes avant l'heure prévue.
          </p>
        `,
        ctaText: 'Voir l\'entretien',
        ctaUrl,
      }

    case 'NOUVEAU_MESSAGE':
      return {
        subject: titre,
        preheader: 'Vous avez reçu un nouveau message',
        headerColor: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        headerIcon: '💬',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>Vous avez reçu un nouveau message :</p>
          <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 16px 0;">
            <em>"${message}"</em>
          </div>
        `,
        ctaText: 'Lire le message',
        ctaUrl,
      }

    case 'CANDIDAT_SELECTIONNE':
      return {
        subject: `🎉 ${titre}`,
        preheader: 'Félicitations, vous êtes retenu !',
        headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: '🎉',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p><strong>${message}</strong></p>
          <p style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
            Félicitations ! Notre équipe va vous contacter très prochainement pour la suite du processus.
          </p>
        `,
        ctaText: 'Voir les détails',
        ctaUrl,
      }

    case 'CANDIDAT_REFUSE':
      return {
        subject: titre,
        preheader: 'Mise à jour de votre candidature',
        headerColor: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
        headerIcon: '📋',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p>Nous vous encourageons à consulter nos autres opportunités qui pourraient correspondre à votre profil.</p>
        `,
        ctaText: 'Voir d\'autres offres',
        ctaUrl: `${APP_URL}/t/offres`,
      }

    case 'SHORTLIST_ENVOYEE':
      return {
        subject: titre,
        preheader: 'Votre shortlist est prête',
        headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: '📋',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p>Consultez les profils et donnez-nous votre retour directement depuis la plateforme.</p>
        `,
        ctaText: 'Voir la shortlist',
        ctaUrl,
      }

    case 'NOUVELLE_CANDIDATURE':
      return {
        subject: titre,
        preheader: 'Nouvelle candidature reçue',
        headerColor: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        headerIcon: '📥',
        bodyHtml: `
          <p>Bonjour,</p>
          <p>${message}</p>
          <p>Connectez-vous à l'espace admin pour examiner cette candidature.</p>
        `,
        ctaText: 'Voir la candidature',
        ctaUrl,
      }

    case 'VALIDATION_COMPTE':
      return {
        subject: `✅ ${titre}`,
        preheader: 'Votre compte a été validé',
        headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        headerIcon: '✅',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <p>Vous pouvez maintenant accéder à toutes les fonctionnalités de la plateforme.</p>
        `,
        ctaText: 'Accéder à mon espace',
        ctaUrl,
      }

    case 'BIENVENUE':
      return {
        subject: `👋 ${titre}`,
        preheader: 'Bienvenue sur Talentero',
        headerColor: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
        headerIcon: '👋',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
          <div style="background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <strong>Pour maximiser vos chances :</strong>
            <ul style="margin: 8px 0 0 0; padding-left: 20px;">
              <li>Complétez votre profil à 100%</li>
              <li>Ajoutez vos compétences techniques</li>
              <li>Renseignez votre TJM et disponibilité</li>
            </ul>
          </div>
        `,
        ctaText: 'Compléter mon profil',
        ctaUrl: `${APP_URL}/t/profil`,
      }

    default:
      return {
        subject: titre,
        preheader: message.substring(0, 100),
        headerColor: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        headerIcon: '🔔',
        bodyHtml: `
          <p>Bonjour ${userName},</p>
          <p>${message}</p>
        `,
        ctaText: lien ? 'Voir plus' : undefined,
        ctaUrl,
      }
  }
}

// ============================================
// GÉNÉRATION HTML EMAIL
// ============================================

function generateEmailHtml(template: EmailTemplate, userEmail: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${template.subject}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 14px 28px !important; }
  </style>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 12px !important; }
      .card { border-radius: 0 !important; }
      .content { padding: 20px 16px !important; }
      .header { padding: 24px 16px !important; }
      .button { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${template.preheader}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 24px; font-weight: 700; color: #1e293b;">
                    <span style="color: #2563eb;">Talent</span><span style="color: #1e293b;">ero</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" class="card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td class="header" style="background: ${template.headerColor}; color: #ffffff; padding: 32px 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 12px;">${template.headerIcon}</div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600; line-height: 1.3;">${template.subject}</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td class="content" style="padding: 32px 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                    ${template.bodyHtml}

                    ${template.ctaText && template.ctaUrl ? `
                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${template.ctaUrl}" class="button" style="display: inline-block; background: ${template.headerColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                            ${template.ctaText}
                          </a>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                      <strong>Talentero</strong> - Opéré par TRINEXTA
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      Cet email a été envoyé à ${userEmail}
                    </p>
                    <p style="margin: 12px 0 0; color: #94a3b8; font-size: 11px;">
                      <a href="${APP_URL}/t/profil" style="color: #64748b; text-decoration: underline;">Gérer mes préférences</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom text -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                © ${new Date().getFullYear()} TRINEXTA - TrusTech IT Support
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

// ============================================
// FONCTION PRINCIPALE : ENVOI NOTIFICATION + EMAIL
// ============================================

/**
 * Crée une notification et envoie l'email correspondant
 * C'est la fonction principale à utiliser partout dans l'application
 */
export async function createNotificationWithEmail(params: {
  userId: number
  type: NotificationType
  titre: string
  message: string
  lien?: string
  data?: Record<string, unknown>
  skipEmail?: boolean
}): Promise<{ notification: { id: number }, emailSent: boolean }> {
  const { userId, type, titre, message, lien, data, skipEmail = false } = params

  // 1. Créer la notification in-app
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      titre,
      message,
      lien,
      data: data || undefined,
    },
  })

  // 2. Vérifier si on doit envoyer un email
  if (skipEmail || !EMAIL_ENABLED_NOTIFICATIONS.includes(type)) {
    return { notification: { id: notification.id }, emailSent: false }
  }

  // 3. Récupérer l'utilisateur et ses infos
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      talent: { select: { prenom: true, nom: true } },
      client: { select: { raisonSociale: true } },
    },
  })

  if (!user?.email) {
    console.warn(`[EmailNotification] Utilisateur ${userId} sans email`)
    return { notification: { id: notification.id }, emailSent: false }
  }

  // 4. Déterminer le nom de l'utilisateur
  const userName = user.talent
    ? user.talent.prenom || 'Freelance'
    : user.client
      ? user.client.raisonSociale
      : 'Utilisateur'

  // 5. Générer et envoyer l'email
  try {
    const template = getEmailTemplate(
      { userId, type, titre, message, lien, metadata: data as Record<string, unknown> },
      user.email,
      userName
    )

    const emailHtml = generateEmailHtml(template, user.email)

    const emailSent = await sendEmailViaGraph({
      to: user.email,
      subject: template.subject,
      bodyHtml: emailHtml,
      importance: ['ENTRETIEN_DEMANDE', 'ENTRETIEN_RAPPEL', 'CANDIDAT_SELECTIONNE'].includes(type)
        ? 'high'
        : 'normal',
    })

    // 6. Logger l'envoi
    if (emailSent) {
      console.log(`[EmailNotification] Email envoyé à ${user.email} pour ${type}`)
    }

    return { notification: { id: notification.id }, emailSent }
  } catch (error) {
    console.error(`[EmailNotification] Erreur envoi email:`, error)
    return { notification: { id: notification.id }, emailSent: false }
  }
}

/**
 * Crée des notifications pour plusieurs utilisateurs avec envoi d'emails
 */
export async function createBulkNotificationsWithEmail(
  userIds: number[],
  params: Omit<Parameters<typeof createNotificationWithEmail>[0], 'userId'>
): Promise<{ created: number, emailsSent: number }> {
  let created = 0
  let emailsSent = 0

  // Traitement par lots pour éviter de surcharger le serveur mail
  const batchSize = 10
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(userId => createNotificationWithEmail({ ...params, userId }))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        created++
        if (result.value.emailSent) emailsSent++
      }
    }

    // Pause entre les lots pour éviter le rate limiting
    if (i + batchSize < userIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return { created, emailsSent }
}

// ============================================
// FONCTIONS SPÉCIALISÉES
// ============================================

/**
 * Notifie un talent d'un nouveau match avec email
 */
export async function notifyNewMatchWithEmail(
  talentUserId: number,
  offreData: { titre: string; uid: string; slug: string; score: number }
) {
  return createNotificationWithEmail({
    userId: talentUserId,
    type: 'NOUVELLE_OFFRE_MATCH',
    titre: 'Nouvelle offre compatible !',
    message: `Une offre "${offreData.titre}" correspond à votre profil (${offreData.score}% de compatibilité)`,
    lien: `/t/offres/${offreData.slug}`,
    data: { offreUid: offreData.uid, score: offreData.score },
  })
}

/**
 * Notifie un changement de statut de candidature avec email
 */
export async function notifyCandidatureStatusWithEmail(
  talentUserId: number,
  data: { offreTitre: string; nouveauStatut: string; offreUid: string }
) {
  const messages: Record<string, string> = {
    PRE_SELECTIONNE: `Bonne nouvelle ! Vous êtes pré-sélectionné pour "${data.offreTitre}"`,
    SHORTLIST: `Vous faites partie de la shortlist pour "${data.offreTitre}"`,
    ENTRETIEN_DEMANDE: `Un entretien est demandé pour "${data.offreTitre}"`,
    ACCEPTEE: `Félicitations ! Vous êtes retenu pour "${data.offreTitre}"`,
    REFUSEE: `Votre candidature pour "${data.offreTitre}" n'a pas été retenue`,
  }

  return createNotificationWithEmail({
    userId: talentUserId,
    type: 'STATUT_CANDIDATURE',
    titre: 'Mise à jour candidature',
    message: messages[data.nouveauStatut] || `Statut mis à jour pour "${data.offreTitre}"`,
    lien: '/t/candidatures',
    data,
  })
}

/**
 * Notifie un nouveau message avec email
 */
export async function notifyNewMessageWithEmail(
  userId: number,
  data: { expediteur: string; preview: string; conversationUid: string }
) {
  return createNotificationWithEmail({
    userId,
    type: 'NOUVEAU_MESSAGE',
    titre: `Message de ${data.expediteur}`,
    message: data.preview.substring(0, 100) + (data.preview.length > 100 ? '...' : ''),
    lien: `/t/messages/${data.conversationUid}`,
    data,
  })
}

/**
 * Notifie une demande d'entretien avec email
 */
export async function notifyEntretienDemandeWithEmail(
  talentUserId: number,
  data: { offreTitre: string; dateProposee: string; entretienUid: string }
) {
  return createNotificationWithEmail({
    userId: talentUserId,
    type: 'ENTRETIEN_DEMANDE',
    titre: 'Demande d\'entretien',
    message: `Un entretien est proposé pour "${data.offreTitre}" le ${data.dateProposee}`,
    lien: '/t/entretiens',
    data,
  })
}

/**
 * Notifie un rappel d'entretien (24h avant) avec email
 */
export async function notifyEntretienRappelWithEmail(
  userId: number,
  data: { offreTitre: string; date: string; heure: string; lienVisio?: string }
) {
  return createNotificationWithEmail({
    userId,
    type: 'ENTRETIEN_RAPPEL',
    titre: 'Rappel: Entretien demain',
    message: `Entretien pour "${data.offreTitre}" demain à ${data.heure}`,
    lien: data.lienVisio || '/t/entretiens',
    data,
  })
}

/**
 * Notifie les admins d'une nouvelle candidature avec email
 */
export async function notifyAdminsNewCandidatureWithEmail(
  candidatureData: { talentNom: string; offreTitre: string; offreUid: string }
) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', isActive: true },
    select: { id: true },
  })

  return createBulkNotificationsWithEmail(
    admins.map(a => a.id),
    {
      type: 'NOUVELLE_CANDIDATURE',
      titre: 'Nouvelle candidature',
      message: `${candidatureData.talentNom} a postulé à "${candidatureData.offreTitre}"`,
      lien: `/admin/offres/${candidatureData.offreUid}`,
      data: candidatureData,
    }
  )
}
