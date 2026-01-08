/**
 * API - Demande de réinitialisation de mot de passe
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/validations'
import { checkRateLimit, getClientIP, PASSWORD_RESET_RATE_LIMIT } from '@/lib/rate-limit'
import { sendEmailViaGraph } from '@/lib/microsoft-graph'
import crypto from 'crypto'

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://talentero.fr'

export async function POST(request: NextRequest) {
  try {
    // SECURITE: Rate limiting strict pour prévenir l'énumération d'emails
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`forgot-password:${clientIP}`, PASSWORD_RESET_RATE_LIMIT)

    if (!rateLimitResult.success) {
      // On retourne toujours un message de succès pour ne pas révéler si l'email existe
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
      })
    }

    const body = await request.json()

    // Validation
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Email invalide' },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Cherche l'utilisateur (on ne révèle pas s'il existe ou non)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        talent: { select: { prenom: true } },
        client: { select: { raisonSociale: true } },
      },
    })

    // SECURITE: Toujours retourner le même message pour ne pas révéler si l'email existe
    const successMessage = {
      success: true,
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    }

    if (!user) {
      // On simule un délai pour éviter les timing attacks
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
      return NextResponse.json(successMessage)
    }

    if (!user.isActive) {
      return NextResponse.json(successMessage)
    }

    // Génère un token sécurisé
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1) // Expire dans 1 heure

    // Sauvegarde le token en base
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Détermine le nom de l'utilisateur
    const userName = user.talent?.prenom || user.client?.raisonSociale || 'Utilisateur'

    // Construit l'URL de réinitialisation
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`

    // Envoie l'email
    try {
      await sendEmailViaGraph({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe - Talentero',
        bodyHtml: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 24px; font-weight: 700; color: #1e293b;">
                <span style="color: #2563eb;">Talent</span><span style="color: #1e293b;">ero</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 32px 24px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 12px;">🔐</div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 600;">Réinitialisation du mot de passe</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 24px; color: #1e293b; font-size: 15px; line-height: 1.6;">
                    <p>Bonjour ${userName},</p>
                    <p>Vous avez demandé la réinitialisation de votre mot de passe Talentero.</p>
                    <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>

                    <!-- CTA Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                            Réinitialiser mon mot de passe
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <strong>Important :</strong> Ce lien expire dans <strong>1 heure</strong>.
                      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                    </p>

                    <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                      <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 13px;">
                      <strong>Talentero</strong> - Opéré par TRINEXTA
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        importance: 'high',
      })

      console.log(`[ForgotPassword] Email envoyé à ${user.email}`)
    } catch (emailError) {
      console.error('[ForgotPassword] Erreur envoi email:', emailError)
      // On ne révèle pas l'erreur à l'utilisateur
    }

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_REQUESTED',
        entite: 'User',
        entiteId: user.id,
        details: { ip: clientIP },
      },
    })

    return NextResponse.json(successMessage)
  } catch (error) {
    console.error('Erreur forgot-password:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
