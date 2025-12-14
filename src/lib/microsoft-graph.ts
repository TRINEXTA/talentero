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
