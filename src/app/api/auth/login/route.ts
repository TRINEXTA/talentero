import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, createSession } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Recherche l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        talent: { select: { id: true, uid: true, prenom: true, nom: true } },
        client: { select: { id: true, uid: true, raisonSociale: true, statut: true } },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifie que le compte a un mot de passe (pas un compte pré-créé)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Ce compte n\'a pas encore été activé. Vérifiez votre email.' },
        { status: 401 }
      )
    }

    // Vérifie le mot de passe
    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifie que le compte est actif
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Compte désactivé. Contactez le support.' },
        { status: 403 }
      )
    }

    // Pour les clients, vérifie que le compte est validé
    if (user.role === 'CLIENT' && user.client?.statut === 'EN_ATTENTE') {
      return NextResponse.json(
        { error: 'Votre compte est en attente de validation par TRINEXTA.' },
        { status: 403 }
      )
    }

    if (user.role === 'CLIENT' && user.client?.statut === 'SUSPENDU') {
      return NextResponse.json(
        { error: 'Votre compte a été suspendu. Contactez le support.' },
        { status: 403 }
      )
    }

    // Crée la session
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const token = await createSession(user.id, userAgent, ip)

    // Détermine la redirection selon le rôle
    let redirectUrl = '/'
    if (user.role === 'TALENT') {
      redirectUrl = '/t/dashboard'
    } else if (user.role === 'CLIENT') {
      redirectUrl = '/c/dashboard'
    } else if (user.role === 'ADMIN') {
      redirectUrl = '/admin'
    }

    // Crée la réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        talent: user.talent,
        client: user.client,
      },
      redirectUrl,
    })

    // Set le cookie HTTP-only
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erreur login:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
