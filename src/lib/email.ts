/**
 * Service d'envoi d'emails via Brevo (Sendinblue)
 */

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Envoie un email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Talentero" <${process.env.EMAIL_FROM || 'contact@talentero.io'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (error) {
    console.error('Erreur envoi email:', error)
    return false
  }
}

/**
 * Email de bienvenue pour un talent
 */
export async function sendWelcomeTalentEmail(email: string, prenom: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Bienvenue sur Talentero !',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenue sur Talentero !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${prenom},</p>
              <p>Votre compte Talentero a été créé avec succès. Vous faites maintenant partie de notre communauté de freelances IT.</p>
              <p>Prochaines étapes :</p>
              <ul>
                <li>Complétez votre profil pour augmenter votre visibilité</li>
                <li>Parcourez les offres disponibles</li>
                <li>Postulez et découvrez votre score de matching instantané</li>
              </ul>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/t/dashboard" class="button">Accéder à mon espace</a>
              </p>
              <p>L'équipe TRINEXTA est là pour vous accompagner dans votre recherche de missions.</p>
              <p>À très bientôt !</p>
              <p><strong>L'équipe Talentero</strong></p>
            </div>
            <div class="footer">
              <p>Talentero - Opéré par TRINEXTA</p>
              <p>Cet email a été envoyé à ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Email de bienvenue pour un client
 */
export async function sendWelcomeClientEmail(
  email: string,
  contactPrenom: string,
  raisonSociale: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Bienvenue sur Talentero - Votre compte est en attente de validation',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenue sur Talentero !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${contactPrenom},</p>
              <p>Merci d'avoir créé un compte entreprise pour <strong>${raisonSociale}</strong> sur Talentero.</p>
              <div class="info-box">
                <strong>⏳ Validation en cours</strong>
                <p>Votre compte est actuellement en attente de validation par notre équipe TRINEXTA. Nous vérifions chaque entreprise pour garantir la qualité de notre plateforme.</p>
                <p>Délai habituel : 24-48h ouvrées</p>
              </div>
              <p>Une fois validé, vous pourrez :</p>
              <ul>
                <li>Publier des offres de missions</li>
                <li>Recevoir des candidatures de freelances qualifiés</li>
                <li>Bénéficier de notre matching intelligent</li>
              </ul>
              <p>Nous vous contacterons dès que votre compte sera activé.</p>
              <p><strong>L'équipe Talentero</strong></p>
            </div>
            <div class="footer">
              <p>Talentero - Opéré par TRINEXTA</p>
              <p>Cet email a été envoyé à ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Email de notification de nouvelle candidature
 */
export async function sendNewCandidatureEmail(
  clientEmail: string,
  offreTitre: string,
  scoreMatch: number
): Promise<boolean> {
  return sendEmail({
    to: clientEmail,
    subject: `Nouvelle candidature pour "${offreTitre}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .score { font-size: 48px; font-weight: bold; color: #10b981; text-align: center; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nouvelle candidature !</h1>
            </div>
            <div class="content">
              <p>Un talent a postulé à votre offre :</p>
              <h2 style="color: #2563eb;">${offreTitre}</h2>
              <p>Score de matching :</p>
              <div class="score">${scoreMatch}%</div>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/c/candidatures" class="button">Voir la candidature</a>
              </p>
              <p><strong>L'équipe Talentero</strong></p>
            </div>
            <div class="footer">
              <p>Talentero - Opéré par TRINEXTA</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Email de changement de statut de candidature
 */
export async function sendCandidatureStatusEmail(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  nouveauStatut: string
): Promise<boolean> {
  const statutMessages: Record<string, { title: string; message: string; color: string }> = {
    VUE: {
      title: 'Candidature consultée',
      message: 'Votre candidature a été consultée par l\'entreprise.',
      color: '#3b82f6',
    },
    SHORTLIST: {
      title: 'Vous êtes présélectionné !',
      message: 'Félicitations ! Votre profil a été retenu pour la suite du processus.',
      color: '#10b981',
    },
    ENTRETIEN: {
      title: 'Entretien programmé',
      message: 'Un entretien va être organisé. Nous vous contacterons prochainement.',
      color: '#8b5cf6',
    },
    ACCEPTEE: {
      title: 'Candidature acceptée !',
      message: 'Félicitations ! Votre candidature a été acceptée. L\'équipe TRINEXTA va vous contacter.',
      color: '#10b981',
    },
    REFUSEE: {
      title: 'Candidature non retenue',
      message: 'Malheureusement, votre candidature n\'a pas été retenue pour cette mission. D\'autres opportunités vous attendent !',
      color: '#ef4444',
    },
  }

  const statut = statutMessages[nouveauStatut] || {
    title: 'Mise à jour de votre candidature',
    message: `Le statut de votre candidature a été mis à jour : ${nouveauStatut}`,
    color: '#6b7280',
  }

  return sendEmail({
    to: talentEmail,
    subject: `${statut.title} - ${offreTitre}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statut.color}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statut.title}</h1>
            </div>
            <div class="content">
              <p>Bonjour ${talentPrenom},</p>
              <p>${statut.message}</p>
              <p><strong>Offre :</strong> ${offreTitre}</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/t/candidatures" class="button">Voir mes candidatures</a>
              </p>
              <p><strong>L'équipe Talentero</strong></p>
            </div>
            <div class="footer">
              <p>Talentero - Opéré par TRINEXTA</p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}

/**
 * Email d'alerte nouvelle offre
 */
export async function sendNewOffreAlertEmail(
  talentEmail: string,
  talentPrenom: string,
  offreTitre: string,
  offreSlug: string,
  scoreMatch: number
): Promise<boolean> {
  return sendEmail({
    to: talentEmail,
    subject: `Nouvelle offre correspondant à votre profil : ${offreTitre}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .score { font-size: 36px; font-weight: bold; color: #10b981; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nouvelle offre pour vous !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${talentPrenom},</p>
              <p>Une nouvelle offre correspond à vos critères :</p>
              <h2 style="color: #2563eb;">${offreTitre}</h2>
              <p>Score de matching : <span class="score">${scoreMatch}%</span></p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/offres/${offreSlug}" class="button">Voir l'offre et postuler</a>
              </p>
              <p><strong>L'équipe Talentero</strong></p>
            </div>
            <div class="footer">
              <p>Talentero - Opéré par TRINEXTA</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/t/alertes">Gérer mes alertes</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
  })
}
