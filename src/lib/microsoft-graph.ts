/**
 * Service d'intégration Microsoft Graph API
 * Pour l'envoi d'emails via Microsoft 365
 */

import { prisma } from './db'

interface MSGraphConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  userEmail: string // Email du compte qui envoie
}

interface EmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  importance?: 'low' | 'normal' | 'high'
  saveToSentItems?: boolean
}

let accessToken: string | null = null
let tokenExpiry: Date | null = null

/**
 * Récupère la configuration Microsoft Graph depuis les variables d'environnement
 */
function getConfig(): MSGraphConfig {
  const config = {
    tenantId: process.env.MS_TENANT_ID || '',
    clientId: process.env.MS_CLIENT_ID || '',
    clientSecret: process.env.MS_CLIENT_SECRET || '',
    userEmail: process.env.MS_SENDER_EMAIL || '',
  }

  if (!config.tenantId || !config.clientId || !config.clientSecret || !config.userEmail) {
    throw new Error('Configuration Microsoft Graph incomplète. Vérifiez les variables d\'environnement.')
  }

  return config
}

/**
 * Obtient un access token Microsoft Graph
 */
async function getAccessToken(): Promise<string> {
  // Vérifie si le token actuel est encore valide
  if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
    return accessToken
  }

  const config = getConfig()

  const tokenUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erreur authentification Microsoft Graph: ${error}`)
  }

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000) // -60s de marge

  return accessToken!
}

/**
 * Envoie un email via Microsoft Graph API
 */
export async function sendEmailViaGraph(options: EmailOptions): Promise<boolean> {
  const config = getConfig()

  try {
    const token = await getAccessToken()

    // Prépare les destinataires
    const formatRecipients = (emails: string | string[]) => {
      const list = Array.isArray(emails) ? emails : [emails]
      return list.map(email => ({
        emailAddress: { address: email }
      }))
    }

    // Construit le message
    const message = {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.bodyHtml,
      },
      toRecipients: formatRecipients(options.to),
      ccRecipients: options.cc ? formatRecipients(options.cc) : [],
      bccRecipients: options.bcc ? formatRecipients(options.bcc) : [],
      importance: options.importance || 'normal',
    }

    const sendMailUrl = `https://graph.microsoft.com/v1.0/users/${config.userEmail}/sendMail`

    const response = await fetch(sendMailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        saveToSentItems: options.saveToSentItems !== false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erreur envoi email: ${error}`)
    }

    // Log l'envoi en base
    const toArray = Array.isArray(options.to) ? options.to : [options.to]
    for (const dest of toArray) {
      await prisma.emailLog.create({
        data: {
          destinataire: dest,
          sujet: options.subject,
          template: 'MS_GRAPH',
          statut: 'ENVOYE',
          envoyeLe: new Date(),
        },
      })
    }

    return true
  } catch (error) {
    console.error('Erreur Microsoft Graph:', error)

    // Log l'erreur
    const toArray = Array.isArray(options.to) ? options.to : [options.to]
    for (const dest of toArray) {
      await prisma.emailLog.create({
        data: {
          destinataire: dest,
          sujet: options.subject,
          template: 'MS_GRAPH',
          statut: 'ERREUR',
          erreur: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      })
    }

    return false
  }
}

/**
 * Templates emails Talentero avec envoi via MS Graph
 */

export async function sendMatchingNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  offreSlug: string,
  score: number,
  competencesMatchees: string[]
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.io'

  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Nouvelle opportunité ${score}% compatible : ${offreTitre}`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .score-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50px; padding: 8px 20px; margin-top: 16px; font-size: 32px; font-weight: 700; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .offre-title { color: #2563eb; font-size: 20px; font-weight: 600; margin: 16px 0; }
            .skills { background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .skill-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 50px; font-size: 14px; margin: 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Une mission vous correspond !</h1>
                <div class="score-badge">${score}%</div>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Nous avons identifié une mission qui correspond parfaitement à votre profil :</p>
                <div class="offre-title">${offreTitre}</div>
                <div class="skills">
                  <strong>Compétences qui matchent :</strong><br>
                  ${competencesMatchees.map(c => `<span class="skill-tag">${c}</span>`).join('')}
                </div>
                <p style="text-align: center;">
                  <a href="${appUrl}/offres/${offreSlug}" class="button">Voir la mission et postuler</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
                <p>Cet email a été envoyé à ${talentEmail}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    importance: 'high',
  })
}

export async function sendShortlistNotification(
  clientEmail: string,
  clientContact: string,
  offreTitre: string,
  shortlistUrl: string,
  nbCandidats: number
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.io'

  return sendEmailViaGraph({
    to: clientEmail,
    subject: `Shortlist prête : ${nbCandidats} talents pour "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .offre-title { color: #059669; font-size: 20px; font-weight: 600; margin: 16px 0; }
            .highlight-box { background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Votre shortlist est prête !</h1>
              </div>
              <div class="content">
                <p>Bonjour ${clientContact},</p>
                <p>Notre équipe TRINEXTA a préparé une sélection de talents pour votre offre :</p>
                <div class="offre-title">${offreTitre}</div>
                <div class="highlight-box">
                  <strong>${nbCandidats} talent${nbCandidats > 1 ? 's' : ''} présélectionné${nbCandidats > 1 ? 's' : ''}</strong><br>
                  Ces profils ont été soigneusement sélectionnés pour correspondre à vos besoins.
                </div>
                <p style="text-align: center;">
                  <a href="${appUrl}${shortlistUrl}" class="button">Consulter la shortlist</a>
                </p>
                <p>Vous pouvez nous donner votre retour directement depuis la plateforme.</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendAccountActivationEmail(
  email: string,
  prenom: string,
  activationToken: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.io'
  const activationUrl = `${appUrl}/activation?token=${activationToken}`

  return sendEmailViaGraph({
    to: email,
    subject: 'Finalisez votre inscription sur Talentero',
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Bienvenue sur Talentero !</h1>
              </div>
              <div class="content">
                <p>Bonjour ${prenom},</p>
                <p>Un compte a été créé pour vous sur Talentero, la plateforme de recrutement freelance IT de TRINEXTA.</p>
                <div class="info-box">
                  <strong>Votre CV a été pré-enregistré</strong><br>
                  Pour finaliser votre inscription, veuillez créer votre mot de passe et compléter votre profil.
                </div>
                <p style="text-align: center;">
                  <a href="${activationUrl}" class="button">Activer mon compte</a>
                </p>
                <p style="font-size: 14px; color: #64748b;">Ce lien expire dans 7 jours.</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    importance: 'high',
  })
}

export async function sendAOResultNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  resultat: 'GAGNEE' | 'PERDUE'
): Promise<boolean> {
  const isWon = resultat === 'GAGNEE'

  return sendEmailViaGraph({
    to: talentEmail,
    subject: isWon
      ? `Bonne nouvelle ! Vous êtes retenu pour "${offreTitre}"`
      : `Retour sur votre candidature "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: ${isWon ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'}; color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>${isWon ? 'Vous êtes retenu !' : 'Retour sur votre candidature'}</h1>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                ${isWon ? `
                  <p>Excellente nouvelle ! Votre profil a été retenu pour la mission :</p>
                  <p style="font-size: 18px; color: #10b981; font-weight: 600;">${offreTitre}</p>
                  <p>Notre équipe TRINEXTA va vous contacter très prochainement pour les prochaines étapes.</p>
                ` : `
                  <p>Nous vous remercions pour votre candidature à la mission :</p>
                  <p style="font-size: 18px; color: #6b7280; font-weight: 600;">${offreTitre}</p>
                  <p>Malheureusement, votre profil n'a pas été retenu pour cette mission. Le client a fait un choix parmi plusieurs excellents candidats.</p>
                  <p>D'autres opportunités correspondant à votre profil vous attendent sur Talentero !</p>
                `}
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification de demande d'entretien au talent
 */
export async function sendEntretienRequestNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  offreCode: string,
  dateProposee: string,
  heureProposee: string,
  confirmationUrl: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Demande d'entretien pour "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .date-box { background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .date-box .date { font-size: 24px; font-weight: 700; color: #d97706; }
            .date-box .time { font-size: 18px; color: #92400e; margin-top: 8px; }
            .button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
            .button-secondary { background: #e5e7eb; color: #374151 !important; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Demande d'entretien</h1>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Le client souhaite vous rencontrer pour la mission <strong>${offreTitre}</strong> (${offreCode}).</p>
                <div class="date-box">
                  <div class="date">${dateProposee}</div>
                  <div class="time">${heureProposee}</div>
                </div>
                <p>Veuillez confirmer votre disponibilité :</p>
                <p style="text-align: center;">
                  <a href="${appUrl}${confirmationUrl}?action=confirm" class="button">Confirmer</a>
                  <a href="${appUrl}${confirmationUrl}?action=propose" class="button button-secondary">Proposer une autre date</a>
                </p>
                <p style="font-size: 14px; color: #64748b; margin-top: 20px;">
                  Merci de répondre dans les 24h pour ne pas retarder le processus.
                </p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    importance: 'high',
  })
}

/**
 * Confirmation d'entretien au client
 */
export async function sendEntretienConfirmedToClient(
  clientEmail: string,
  clientContact: string,
  talentCode: string,
  offreTitre: string,
  dateConfirmee: string,
  heureConfirmee: string,
  lienVisio: string
): Promise<boolean> {
  return sendEmailViaGraph({
    to: clientEmail,
    subject: `Entretien confirmé - ${talentCode} pour "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .date-box { background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .date-box .date { font-size: 24px; font-weight: 700; color: #059669; }
            .date-box .time { font-size: 18px; color: #047857; margin-top: 8px; }
            .visio-box { background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Entretien confirmé !</h1>
              </div>
              <div class="content">
                <p>Bonjour ${clientContact},</p>
                <p>Le candidat <strong>${talentCode}</strong> a confirmé l'entretien pour la mission <strong>${offreTitre}</strong>.</p>
                <div class="date-box">
                  <div class="date">${dateConfirmee}</div>
                  <div class="time">${heureConfirmee}</div>
                </div>
                <div class="visio-box">
                  <strong>Lien de visioconférence :</strong><br>
                  <a href="${lienVisio}" style="color: #2563eb; word-break: break-all;">${lienVisio}</a>
                </div>
                <p style="text-align: center;">
                  <a href="${lienVisio}" class="button">Rejoindre l'entretien</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification de demande d'infos complémentaires au talent
 */
export async function sendInfoRequestNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  offreCode: string,
  question: string,
  responseUrl: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Demande d'informations pour "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .question-box { background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Le client a une question</h1>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Le client intéressé par votre profil pour la mission <strong>${offreTitre}</strong> (${offreCode}) souhaite des informations complémentaires :</p>
                <div class="question-box">
                  <strong>Question du client :</strong><br>
                  ${question}
                </div>
                <p style="text-align: center;">
                  <a href="${appUrl}${responseUrl}" class="button">Répondre au client</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification appel d'offre perdu (message global à tous les candidats)
 */
export async function sendMissionLostNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string
): Promise<boolean> {
  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Retour sur la mission "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .info-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Information sur votre candidature</h1>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Nous vous remercions pour votre candidature à la mission :</p>
                <div class="info-box">
                  <strong>${offreTitre}</strong>
                </div>
                <p>Malheureusement, nous n'avons pas été retenus pour cet appel d'offres. Cette décision ne reflète en rien la qualité de votre profil.</p>
                <p>Nous restons convaincus de vos compétences et ne manquerons pas de vous proposer de nouvelles opportunités correspondant à votre expertise.</p>
                <p>D'autres missions vous attendent sur Talentero !</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification profil non retenu par le client (individuelle)
 */
export async function sendProfileNotSelectedNotification(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string
): Promise<boolean> {
  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Retour sur votre candidature "${offreTitre}"`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Retour sur votre candidature</h1>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Nous vous remercions pour l'intérêt que vous avez porté à la mission <strong>"${offreTitre}"</strong>.</p>
                <p>Après examen des différentes candidatures, le client a fait le choix de poursuivre avec un autre profil qui correspondait davantage à ses critères spécifiques pour cette mission.</p>
                <p>Cette décision ne remet nullement en cause vos compétences. Nous conservons votre profil et ne manquerons pas de vous proposer de nouvelles opportunités.</p>
                <p>Restez connecté sur Talentero pour découvrir les missions qui vous correspondent !</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification de matching avec feedback TJM/expérience
 */
export async function sendMatchingWithFeedback(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  offreSlug: string,
  score: number,
  competencesMatchees: string[],
  feedback: {
    tjmTropHaut?: boolean
    tjmFourchette?: string
    experienceManquante?: string[]
  }
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  let feedbackHtml = ''
  if (feedback.tjmTropHaut && feedback.tjmFourchette) {
    feedbackHtml += `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <strong style="color: #92400e;">TJM :</strong><br>
        <span style="color: #78350f;">Votre TJM est supérieur au budget. Fourchette pour cette mission : ${feedback.tjmFourchette}</span>
      </div>
    `
  }
  if (feedback.experienceManquante && feedback.experienceManquante.length > 0) {
    feedbackHtml += `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
        <strong style="color: #92400e;">Compétences manquantes :</strong><br>
        <span style="color: #78350f;">${feedback.experienceManquante.join(', ')}</span><br>
        <span style="font-size: 13px; color: #92400e;">Si vous avez ces compétences mais qu'elles ne figurent pas sur votre CV, mettez à jour votre profil !</span>
      </div>
    `
  }

  return sendEmailViaGraph({
    to: talentEmail,
    subject: `Mission ${score}% compatible : ${offreTitre}`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .score-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 50px; padding: 8px 20px; margin-top: 16px; font-size: 32px; font-weight: 700; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .offre-title { color: #2563eb; font-size: 20px; font-weight: 600; margin: 16px 0; }
            .skills { background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 16px 0; }
            .skill-tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 50px; font-size: 14px; margin: 4px; }
            .button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button-secondary { display: inline-block; background: #e5e7eb; color: #374151 !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Une mission vous correspond !</h1>
                <div class="score-badge">${score}%</div>
              </div>
              <div class="content">
                <p>Bonjour ${talentPrenom},</p>
                <p>Nous avons identifié une mission qui correspond à votre profil :</p>
                <div class="offre-title">${offreTitre}</div>
                <div class="skills">
                  <strong>Compétences qui matchent :</strong><br>
                  ${competencesMatchees.map(c => `<span class="skill-tag">${c}</span>`).join('')}
                </div>
                ${feedbackHtml}
                <p style="text-align: center;">
                  <a href="${appUrl}/offres/${offreSlug}" class="button">Voir la mission</a>
                </p>
                ${feedbackHtml ? `
                  <p style="text-align: center;">
                    <a href="${appUrl}/t/profil" class="button-secondary">Mettre à jour mon profil</a>
                  </p>
                ` : ''}
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
                <p>74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    importance: 'high',
  })
}

/**
 * Notification bienvenue client (après validation par admin)
 */
export async function sendClientWelcomeEmail(
  clientEmail: string,
  contactName: string,
  raisonSociale: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  return sendEmailViaGraph({
    to: clientEmail,
    subject: `Bienvenue sur Talentero - Votre compte ${raisonSociale} est activé !`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .features { background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .feature { display: flex; align-items: flex-start; margin: 12px 0; }
            .feature-icon { color: #10b981; margin-right: 12px; font-size: 20px; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Bienvenue sur Talentero !</h1>
              </div>
              <div class="content">
                <p>Bonjour ${contactName},</p>
                <p>Votre compte entreprise <strong>${raisonSociale}</strong> a été validé par notre équipe. Vous pouvez maintenant utiliser toutes les fonctionnalités de Talentero.</p>
                <div class="features">
                  <p style="font-weight: 600; margin-top: 0;">Ce que vous pouvez faire :</p>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Publier des offres de missions freelance</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Accéder à notre base de talents IT qualifiés</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Recevoir des shortlists de candidats présélectionnés</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Organiser des entretiens directement sur la plateforme</span>
                  </div>
                </div>
                <p style="text-align: center;">
                  <a href="${appUrl}/c/dashboard" class="button">Accéder à mon espace</a>
                </p>
                <p>Notre équipe TRINEXTA est à votre disposition pour vous accompagner dans vos recrutements.</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
                <p>Contact : 09 78 25 07 46 | contact@trinexta.fr</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Notification nouvelle offre pour validation admin
 */
export async function sendNewOffreToAdmin(
  adminEmail: string,
  offreTitre: string,
  offreCode: string,
  clientName: string,
  adminUrl: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  return sendEmailViaGraph({
    to: adminEmail,
    subject: `[ADMIN] Nouvelle offre à valider : ${offreTitre}`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
            .header { background: #1e293b; color: #ffffff; padding: 20px; }
            .content { padding: 24px; color: #1e293b; }
            .button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <strong>ADMIN TALENTERO</strong>
              </div>
              <div class="content">
                <p>Une nouvelle offre nécessite votre validation :</p>
                <p><strong>Offre :</strong> ${offreTitre} (${offreCode})</p>
                <p><strong>Client :</strong> ${clientName}</p>
                <p style="margin-top: 20px;">
                  <a href="${appUrl}${adminUrl}" class="button">Voir l'offre</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    importance: 'high',
  })
}
