/**
 * Script de Relance Automatique des Comptes Inactifs
 * Envoie des emails via Microsoft Graph
 */

const { PrismaClient } = require('@prisma/client')
// Tente de charger les variables d'environnement
try { require('dotenv').config() } catch (e) {}

const prisma = new PrismaClient()

// --- CONFIGURATION MICROSOFT GRAPH ---
const CONFIG = {
  tenantId: process.env.MS_TENANT_ID,
  clientId: process.env.MS_CLIENT_ID,
  clientSecret: process.env.MS_CLIENT_SECRET,
  userEmail: process.env.MS_SENDER_EMAIL,
  appUrl: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'
}

let accessToken = null
let tokenExpiry = null

async function getAccessToken() {
  if (accessToken && tokenExpiry && tokenExpiry > new Date()) return accessToken

  if (!CONFIG.tenantId || !CONFIG.clientId || !CONFIG.clientSecret) {
    throw new Error('Variables MS_* manquantes dans le .env')
  }

  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const response = await fetch(`https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!response.ok) throw new Error(await response.text())
  const data = await response.json()
  
  accessToken = data.access_token
  tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000)
  return accessToken
}

async function sendEmail(to, subject, html, importance = 'normal') {
  try {
    const token = await getAccessToken()
    
    const message = {
      subject: subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: [{ emailAddress: { address: to } }],
      importance: importance
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${CONFIG.userEmail}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })

    if (!response.ok) throw new Error(await response.text())
    return true
  } catch (error) {
    console.error(`❌ Erreur envoi ${to}:`, error.message)
    return false
  }
}

// --- TEMPLATE EMAIL (Copie exacte de votre design) ---
function getTemplate(prenom, joursRestants, activationUrl) {
  const urgence = joursRestants <= 2
  const color = urgence ? '#dc2626' : '#f59e0b'
  const title = urgence ? '⚠️ Action urgente requise' : '⏰ Rappel d\'activation'
  
  return `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: ${color}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 20px;">${title}</h1>
            </div>
            <div style="padding: 32px 24px;">
              <p>Bonjour <strong>${prenom}</strong>,</p>
              <p>${urgence 
                ? `Attention ! Votre compte sera <strong>supprimé dans ${joursRestants} jours</strong>.` 
                : `Nous avons remarqué que votre compte n'a pas encore été activé.`}
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${activationUrl}" style="background: ${color}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Activer mon compte maintenant
                </a>
              </div>
              <p style="color: #64748b; font-size: 13px; text-align: center;">TRINEXTA - Talentero</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

// --- MOTEUR PRINCIPAL ---
async function main() {
  console.log('🚀 Démarrage du moteur de relance (MS Graph)...')
  
  // 1. Trouver les comptes inactifs
  // Critères : Compte créé il y a +24h, Inactif, Token valide
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const users = await prisma.user.findMany({
    where: {
      isActive: false,
      role: 'TALENT',
      createdAt: { lt: yesterday },
      activationTokenExpiry: { gt: now }, // Le token doit être encore valide
      // Ne pas spammer : Pas de relance dans les dernières 48h
      lastReminderSentAt: {
        lt: new Date(new Date().setDate(new Date().getDate() - 2)),
      }
    },
    include: { talent: true }
  })

  console.log(`📋 ${users.length} comptes inactifs trouvés à relancer.`)

  let successCount = 0

  for (const user of users) {
    if (!user.email || !user.talent) continue

    // Calcul jours restants avant expiration
    const expiry = new Date(user.activationTokenExpiry)
    const diffTime = Math.abs(expiry - now)
    const joursRestants = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 

    console.log(`📨 Relance pour ${user.email} (${joursRestants} jours restants)`)

    const activationUrl = `${CONFIG.appUrl}/activation?token=${user.activationToken}`
    const html = getTemplate(user.talent.prenom || 'Candidat', joursRestants, activationUrl)
    const subject = joursRestants <= 2 
      ? `⚠️ URGENT: Suppression de compte dans ${joursRestants} jours`
      : `Rappel : Activez votre compte Talentero`

    const sent = await sendEmail(user.email, subject, html, joursRestants <= 2 ? 'high' : 'normal')

    if (sent) {
      // Mettre à jour la date de dernière relance
      await prisma.user.update({
        where: { id: user.id },
        data: { lastReminderSentAt: new Date() }
      })
      
      // Log dans l'historique
      await prisma.emailLog.create({
        data: {
          destinataire: user.email,
          sujet: subject,
          template: 'RELANCE_ACTIVATION',
          statut: 'ENVOYE',
          userId: user.id,
          envoyeLe: new Date()
        }
      })
      successCount++
    }
  }

  console.log(`🎉 TERMINÉ : ${successCount} relances envoyées avec succès via Microsoft Graph.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
