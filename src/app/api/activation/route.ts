/**
 * API - Activation de compte (pour les comptes pré-créés par admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'
import { checkRateLimit, getClientIP, ACTIVATION_RATE_LIMIT } from '@/lib/rate-limit'

// POST - Activer un compte avec un token
export async function POST(request: NextRequest) {
  try {
    // SECURITE: Rate limiting pour prévenir les attaques par énumération
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`activation:${clientIP}`, ACTIVATION_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token et mot de passe requis' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Trouve l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        activationToken: token,
        activationTokenExpiry: { gt: new Date() },
      },
      include: {
        talent: {
          select: {
            compteComplet: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré. Demandez un nouveau lien d\'activation.' },
        { status: 400 }
      )
    }

    // Hash le nouveau mot de passe
    const passwordHash = await hashPassword(password)

    // Met à jour l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: true,
        isActive: true,
        activationToken: null,
        activationTokenExpiry: null,
      },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ACTIVATE_ACCOUNT',
        entite: 'User',
        entiteId: user.id,
      },
    })

    // Crée une session
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for') || undefined
    const sessionToken = await createSession(user.id, userAgent, ip)

    // Détermine l'URL de redirection
    // Si le talent n'a pas complété son profil, on le redirige vers l'onboarding
    let redirectUrl = '/dashboard'
    if (user.talent) {
      redirectUrl = user.talent.compteComplet ? '/t/dashboard' : '/t/onboarding'
    }

    // Réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      message: 'Compte activé avec succès',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
      },
      redirectUrl,
    })

    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erreur activation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET - Vérifier un token d'activation
export async function GET(request: NextRequest) {
  try {
    // SECURITE: Rate limiting pour prévenir les attaques par énumération
    const clientIP = getClientIP(request)
    const rateLimitResult = checkRateLimit(`activation-check:${clientIP}`, ACTIVATION_RATE_LIMIT)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        activationToken: token,
        activationTokenExpiry: { gt: new Date() },
      },
      include: {
        talent: {
          select: {
            prenom: true,
            titrePoste: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { valid: false, error: 'Token invalide ou expiré' },
        { status: 400 }
      )
    }

    // SECURITE: Ne pas exposer l'email complet, seulement une version masquée
    // et le prénom pour personnaliser l'expérience
    const maskedEmail = user.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, start, middle, domain) => start + '*'.repeat(Math.min(middle.length, 5)) + domain
    )

    return NextResponse.json({
      valid: true,
      maskedEmail,
      prenom: user.talent?.prenom || null,
      titrePoste: user.talent?.titrePoste || null,
    })
  } catch (error) {
    console.error('Erreur vérification token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
