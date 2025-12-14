/**
 * API - Activation de compte (pour les comptes pré-créés par admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'

// POST - Activer un compte avec un token
export async function POST(request: NextRequest) {
  try {
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
        talent: true,
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

    // Réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      message: 'Compte activé avec succès',
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
      },
      redirectUrl: user.talent ? '/t/profile' : '/dashboard',
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
            nom: true,
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

    return NextResponse.json({
      valid: true,
      email: user.email,
      talent: user.talent,
    })
  } catch (error) {
    console.error('Erreur vérification token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
