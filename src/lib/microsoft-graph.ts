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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
  // APP_URL for server-side (without NEXT_PUBLIC_ prefix) takes priority
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'
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

/**
 * Email de bienvenue suite à une candidature (import en masse)
 * Explique au freelance qu'il a postulé à une offre TRINEXTA
 */
export async function sendCandidatureWelcomeEmail(
  email: string,
  prenom: string,
  offreTitre: string,
  offreSlug: string,
  activationToken: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'
  const activationUrl = `${appUrl}/activation?token=${activationToken}`
  const offreUrl = `${appUrl}/offres/${offreSlug}`

  return sendEmailViaGraph({
    to: email,
    subject: `Votre candidature TRINEXTA - ${offreTitre}`,
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
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 32px 24px; color: #1e293b; line-height: 1.6; }
            .offer-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .offer-box h3 { margin: 0 0 8px; color: #1e40af; font-size: 16px; }
            .offer-box p { margin: 0; color: #64748b; font-size: 14px; }
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
            .steps { margin: 24px 0; }
            .step { display: flex; align-items: flex-start; margin: 16px 0; }
            .step-number { background: #2563eb; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px; flex-shrink: 0; }
            .step-content { flex: 1; }
            .step-content strong { display: block; margin-bottom: 4px; }
            .step-content p { margin: 0; color: #64748b; font-size: 14px; }
            .button { display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { padding: 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
            .footer img { height: 40px; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Bienvenue chez TRINEXTA !</h1>
                <p>Votre candidature a été enregistrée</p>
              </div>
              <div class="content">
                <p>Bonjour ${prenom},</p>

                <p>Suite à votre candidature, nous avons le plaisir de vous informer que votre profil a été <strong>sélectionné</strong> pour rejoindre notre vivier de talents IT.</p>

                <div class="offer-box">
                  <h3>Mission concernée</h3>
                  <p>${offreTitre}</p>
                </div>

                <p><strong>TRINEXTA</strong> est une ESN spécialisée dans le placement de consultants IT indépendants. Nous avons analysé votre CV et créé votre espace personnel sur notre plateforme <strong>Talentero</strong>.</p>

                <div class="info-box">
                  <strong>Votre compte est prêt !</strong><br>
                  Il vous suffit de l'activer pour accéder à toutes nos opportunités.
                </div>

                <div class="steps">
                  <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                      <strong>Activez votre compte</strong>
                      <p>Créez votre mot de passe en cliquant sur le bouton ci-dessous</p>
                    </div>
                  </div>
                  <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                      <strong>Complétez votre profil</strong>
                      <p>Renseignez vos informations administratives (SIRET, adresse...)</p>
                    </div>
                  </div>
                  <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                      <strong>Découvrez nos missions</strong>
                      <p>Accédez à toutes les opportunités correspondant à votre profil</p>
                    </div>
                  </div>
                </div>

                <p style="text-align: center;">
                  <a href="${activationUrl}" class="button">Activer mon compte</a>
                </p>

                <p style="font-size: 13px; color: #64748b; text-align: center;">
                  Ce lien est valable 7 jours.<br>
                  <a href="${offreUrl}" style="color: #2563eb;">Voir le détail de la mission</a>
                </p>
              </div>
              <div class="footer">
                <p><strong>TRINEXTA</strong> by TrusTech IT Support</p>
                <p>Plateforme Talentero - Where IT talent meets opportunity</p>
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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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
 * Email de bienvenue pour un talent (registration)
 */
export async function sendWelcomeTalentEmail(
  email: string,
  prenom: string
): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

  return sendEmailViaGraph({
    to: email,
    subject: 'Bienvenue sur Talentero !',
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
            .steps { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .step { display: flex; align-items: flex-start; margin: 12px 0; }
            .step-number { background: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; margin-right: 12px; flex-shrink: 0; }
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
                <p>Votre compte Talentero a été créé avec succès. Vous faites maintenant partie de notre communauté de freelances IT.</p>
                <div class="steps">
                  <p style="font-weight: 600; margin-top: 0;">Prochaines étapes :</p>
                  <div class="step">
                    <span class="step-number">1</span>
                    <span>Complétez votre profil pour augmenter votre visibilité</span>
                  </div>
                  <div class="step">
                    <span class="step-number">2</span>
                    <span>Parcourez les offres disponibles</span>
                  </div>
                  <div class="step">
                    <span class="step-number">3</span>
                    <span>Postulez et découvrez votre score de matching instantané</span>
                  </div>
                </div>
                <p style="text-align: center;">
                  <a href="${appUrl}/t/dashboard" class="button">Accéder à mon espace</a>
                </p>
                <p>L'équipe TRINEXTA est là pour vous accompagner dans votre recherche de missions.</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
                <p>Cet email a été envoyé à ${email}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Email de bienvenue pour un client (registration - en attente validation)
 */
export async function sendWelcomeClientEmail(
  email: string,
  contactPrenom: string,
  raisonSociale: string
): Promise<boolean> {
  return sendEmailViaGraph({
    to: email,
    subject: 'Bienvenue sur Talentero - Votre compte est en attente de validation',
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
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .features { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .feature { display: flex; align-items: flex-start; margin: 12px 0; }
            .feature-icon { color: #2563eb; margin-right: 12px; font-size: 18px; }
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
                <p>Bonjour ${contactPrenom},</p>
                <p>Merci d'avoir créé un compte entreprise pour <strong>${raisonSociale}</strong> sur Talentero.</p>
                <div class="info-box">
                  <strong>⏳ Validation en cours</strong>
                  <p style="margin-bottom: 0;">Votre compte est actuellement en attente de validation par notre équipe TRINEXTA. Nous vérifions chaque entreprise pour garantir la qualité de notre plateforme.</p>
                  <p style="margin-bottom: 0;"><strong>Délai habituel : 24-48h ouvrées</strong></p>
                </div>
                <div class="features">
                  <p style="font-weight: 600; margin-top: 0;">Une fois validé, vous pourrez :</p>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Publier des offres de missions</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Recevoir des candidatures de freelances qualifiés</span>
                  </div>
                  <div class="feature">
                    <span class="feature-icon">✓</span>
                    <span>Bénéficier de notre matching intelligent</span>
                  </div>
                </div>
                <p>Nous vous contacterons dès que votre compte sera activé.</p>
              </div>
              <div class="footer">
                <p><strong>Talentero</strong> - Opéré par TRINEXTA</p>
                <p>Cet email a été envoyé à ${email}</p>
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
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

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

/**
 * Email d'activation professionnel avec toutes les informations du candidat
 * Version améliorée pour l'import en masse
 */
export async function sendProfessionalActivationEmail(
  email: string,
  prenom: string,
  nom: string,
  activationToken: string,
  profileInfo: {
    titrePoste: string | null
    competences: string[]
    anneesExperience: number | null
    langues: string[]
    certifications: string[]
    experiences: { poste: string; entreprise: string; periode: string }[]
    formations: { diplome: string; etablissement: string | null; annee: number | null }[]
    experiencesCount: number
    formationsCount: number
  },
  offre?: {
    titre: string
    slug: string
  }
): Promise<boolean> {
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'
  const activationUrl = `${appUrl}/activation?token=${activationToken}`
  const offreUrl = offre ? `${appUrl}/offres/${offre.slug}` : null

  // Génère les sections HTML pour les compétences, expériences, etc.
  const competencesHtml = profileInfo.competences.length > 0
    ? profileInfo.competences.map(c => `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 50px; font-size: 13px; margin: 3px;">${c}</span>`).join('')
    : '<span style="color: #94a3b8;">Non renseigné</span>'

  const experiencesHtml = profileInfo.experiences.length > 0
    ? profileInfo.experiences.map(exp => `
      <div style="margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #e2e8f0;">
        <strong style="color: #1e293b;">${exp.poste}</strong>
        <div style="color: #64748b; font-size: 13px;">${exp.entreprise} &bull; ${exp.periode}</div>
      </div>
    `).join('')
    : '<p style="color: #94a3b8; font-style: italic;">Aucune expérience renseignée</p>'

  const formationsHtml = profileInfo.formations.length > 0
    ? profileInfo.formations.map(form => `
      <div style="margin-bottom: 8px;">
        <strong style="color: #1e293b;">${form.diplome}</strong>
        ${form.etablissement ? `<div style="color: #64748b; font-size: 13px;">${form.etablissement}${form.annee ? ` (${form.annee})` : ''}</div>` : ''}
      </div>
    `).join('')
    : '<p style="color: #94a3b8; font-style: italic;">Aucune formation renseignée</p>'

  const languesHtml = profileInfo.langues.length > 0
    ? profileInfo.langues.map(l => `<span style="display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 50px; font-size: 12px; margin: 2px;">${l}</span>`).join('')
    : '<span style="color: #94a3b8;">Non renseigné</span>'

  const certificationsHtml = profileInfo.certifications.length > 0
    ? profileInfo.certifications.map(c => `<span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 50px; font-size: 12px; margin: 2px;">${c}</span>`).join('')
    : ''

  return sendEmailViaGraph({
    to: email,
    subject: `${prenom}, votre espace TRINEXTA est prêt - Activez votre compte`,
    bodyHtml: `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f1f5f9; line-height: 1.6;">
          <div style="max-width: 640px; margin: 0 auto; padding: 24px;">
            <!-- Header TRINEXTA -->
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 16px 16px 0 0; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Bienvenue chez TRINEXTA</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Votre partenaire pour les missions IT</p>
            </div>

            <!-- Corps principal -->
            <div style="background: #ffffff; padding: 32px 24px;">
              <p style="font-size: 17px; color: #1e293b; margin: 0 0 20px;">
                Bonjour <strong>${prenom}</strong>,
              </p>

              <p style="color: #475569; margin-bottom: 24px;">
                Suite à l'analyse de votre CV, nous avons le plaisir de vous confirmer que votre profil a été <strong style="color: #059669;">sélectionné</strong> pour rejoindre notre vivier de consultants IT indépendants.
              </p>

              ${offre ? `
                <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #2563eb;">
                  <p style="margin: 0 0 8px; color: #1e40af; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Mission proposée</p>
                  <p style="margin: 0; color: #1e3a8a; font-size: 18px; font-weight: 600;">${offre.titre}</p>
                  <a href="${offreUrl}" style="display: inline-block; margin-top: 12px; color: #2563eb; font-size: 14px; text-decoration: none;">Voir les détails de la mission &rarr;</a>
                </div>
              ` : ''}

              <!-- Récapitulatif du profil -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
                  Récapitulatif de votre profil
                </h2>

                <!-- Identité -->
                <div style="margin-bottom: 20px;">
                  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                    <tr>
                      <td style="vertical-align: top; width: 40px; padding-right: 12px;">
                        <span style="font-size: 24px;">👤</span>
                      </td>
                      <td>
                        <strong style="color: #1e293b; font-size: 20px;">${prenom} ${nom}</strong>
                        ${profileInfo.titrePoste ? `<div style="color: #6366f1; font-size: 14px; font-weight: 500;">${profileInfo.titrePoste}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                  ${profileInfo.anneesExperience ? `<p style="margin: 8px 0 0; color: #64748b; font-size: 14px;"><strong>${profileInfo.anneesExperience}</strong> ans d'expérience</p>` : ''}
                </div>

                <!-- Compétences -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 10px; color: #475569; font-weight: 600; font-size: 14px;">
                    💼 Compétences techniques
                  </p>
                  <div>
                    ${competencesHtml}
                  </div>
                </div>

                <!-- Expériences -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 12px; color: #475569; font-weight: 600; font-size: 14px;">
                    📋 Expériences récentes${profileInfo.experiencesCount > 3 ? ` <span style="color: #94a3b8; font-weight: normal;">(${profileInfo.experiencesCount} au total)</span>` : ''}
                  </p>
                  ${experiencesHtml}
                </div>

                <!-- Formations -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 12px; color: #475569; font-weight: 600; font-size: 14px;">
                    🎓 Formation${profileInfo.formationsCount > 2 ? ` <span style="color: #94a3b8; font-weight: normal;">(${profileInfo.formationsCount} au total)</span>` : ''}
                  </p>
                  ${formationsHtml}
                </div>

                <!-- Langues -->
                <div style="margin-bottom: ${profileInfo.certifications.length > 0 ? '20px' : '0'};">
                  <p style="margin: 0 0 10px; color: #475569; font-weight: 600; font-size: 14px;">
                    🌍 Langues
                  </p>
                  <div>
                    ${languesHtml}
                  </div>
                </div>

                ${profileInfo.certifications.length > 0 ? `
                  <!-- Certifications -->
                  <div>
                    <p style="margin: 0 0 10px; color: #475569; font-weight: 600; font-size: 14px;">
                      🏆 Certifications
                    </p>
                    <div>
                      ${certificationsHtml}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Call to action -->
              <div style="text-align: center; margin: 32px 0;">
                <p style="color: #475569; margin-bottom: 20px;">
                  Pour accéder à votre espace et découvrir toutes nos opportunités :
                </p>
                <a href="${activationUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
                  Activer mon compte
                </a>
                <p style="margin-top: 16px; color: #94a3b8; font-size: 13px;">
                  Ce lien est valable 30 jours
                </p>
              </div>

              <!-- Étapes -->
              <div style="background: #fefce8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 16px; color: #854d0e; font-weight: 600; font-size: 14px;">Prochaines étapes :</p>
                <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
                  <tr>
                    <td style="vertical-align: top; width: 36px; padding-bottom: 12px;">
                      <span style="background: #facc15; color: #854d0e; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: 600; font-size: 13px;">1</span>
                    </td>
                    <td style="color: #713f12; padding-bottom: 12px;">Créez votre mot de passe sécurisé</td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; width: 36px; padding-bottom: 12px;">
                      <span style="background: #facc15; color: #854d0e; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: 600; font-size: 13px;">2</span>
                    </td>
                    <td style="color: #713f12; padding-bottom: 12px;">Complétez vos informations (TJM, disponibilité, SIRET...)</td>
                  </tr>
                  <tr>
                    <td style="vertical-align: top; width: 36px;">
                      <span style="background: #facc15; color: #854d0e; width: 24px; height: 24px; border-radius: 50%; display: inline-block; text-align: center; line-height: 24px; font-weight: 600; font-size: 13px;">3</span>
                    </td>
                    <td style="color: #713f12;">Postulez aux missions qui correspondent à votre profil</td>
                  </tr>
                </table>
              </div>

              <!-- Info TRINEXTA -->
              <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">
                <strong>TRINEXTA</strong> est une ESN spécialisée dans le placement de consultants IT indépendants.
                Nous travaillons avec les plus grands comptes et PME innovantes pour proposer des missions de qualité.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #1e293b; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-weight: 600;">TRINEXTA</p>
              <p style="margin: 0 0 4px; color: #94a3b8; font-size: 13px;">by TrusTech IT Support</p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes<br>
                09 78 25 07 46 | contact@trinexta.fr
              </p>
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #334155;">
                <p style="margin: 0; color: #64748b; font-size: 11px;">
                  Cet email a été envoyé à ${email}<br>
                  Plateforme Talentero - Where IT talent meets opportunity
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
