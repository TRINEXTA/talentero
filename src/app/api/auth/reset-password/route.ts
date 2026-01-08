/**
 * API - Réinitialisation du mot de passe avec token
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { newPasswordSchema } from '@/lib/validations'
import { checkRateLimit, getClientIP, PASSWORD_RESET_RATE_LIMIT } from '@/lib/rate-limit'

// GET - Vérifier la validité d'un token
export async function GET(request: NextRequest) {
  try {
    // SECURITE: Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`reset-verify:${clientIP}`, PASSWORD_RESET_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { valid: false, error: 'Trop de tentatives. Veuillez réessayer plus tard.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token requis' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
      include: {
        talent: { select: { prenom: true } },
        client: { select: { raisonSociale: true } },
      },
    })

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Lien invalide ou expiré' },
        { status: 400 }
      )
    }

    // SECURITE: Ne pas exposer l'email complet
    const maskedEmail = user.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, start, middle, domain) => start + '*'.repeat(Math.min(middle.length, 5)) + domain
    )

    return NextResponse.json({
      valid: true,
      maskedEmail,
      prenom: user.talent?.prenom || null,
    })
  } catch (error) {
    console.error('Erreur vérification token reset:', error)
    return NextResponse.json(
      { valid: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Réinitialiser le mot de passe
export async function POST(request: NextRequest) {
  try {
    // SECURITE: Rate limiting
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`reset-password:${clientIP}`, PASSWORD_RESET_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Validation
    const validation = newPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { token, password } = validation.data

    // Validation renforcée du mot de passe
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Trouve l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.' },
        { status: 400 }
      )
    }

    // Hash le nouveau mot de passe
    const passwordHash = await hashPassword(password)

    // Met à jour l'utilisateur et invalide le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    // Invalide toutes les sessions existantes pour forcer la reconnexion
    await prisma.session.deleteMany({
      where: { userId: user.id },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_COMPLETED',
        entite: 'User',
        entiteId: user.id,
        details: { ip: clientIP },
      },
    })

    console.log(`[ResetPassword] Mot de passe réinitialisé pour ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.',
    })
  } catch (error) {
    console.error('Erreur reset-password:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
