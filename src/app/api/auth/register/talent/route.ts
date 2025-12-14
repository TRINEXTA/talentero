import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, createSession } from '@/lib/auth'
import { registerTalentSchema } from '@/lib/validations'
import { sendWelcomeTalentEmail } from '@/lib/email'
import { generateTalentCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    const validation = registerTalentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { email, password, prenom, nom, siret, telephone } = validation.data

    // Vérifie que l'email n'existe pas déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Vérifie que le SIRET n'existe pas déjà (si fourni)
    if (siret) {
      const existingTalent = await prisma.talent.findUnique({
        where: { siret },
      })

      if (existingTalent) {
        return NextResponse.json(
          { error: 'Ce SIRET est déjà enregistré' },
          { status: 400 }
        )
      }
    }

    // Note: La vérification du SIRET se fait manuellement par l'admin via le KBIS

    // Hash du mot de passe
    const passwordHash = await hashPassword(password)

    // Création de l'utilisateur et du profil talent en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Crée l'utilisateur
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'TALENT',
          emailVerified: false,
        },
      })

      // Génère le code unique talent
      const codeUnique = await generateTalentCode()

      // Crée le profil talent
      const talent = await tx.talent.create({
        data: {
          userId: user.id,
          codeUnique,
          prenom,
          nom,
          telephone,
          siret: siret || null,
          siren: siret ? siret.substring(0, 9) : null,
          raisonSociale: `${prenom} ${nom}`,
          siretVerifie: false, // Sera vérifié par l'admin via KBIS
        },
      })

      // Log l'action
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_TALENT',
          entite: 'Talent',
          entiteId: talent.id,
          details: { codeUnique },
        },
      })

      return { user, talent }
    })

    // Envoie l'email de bienvenue (async, on n'attend pas)
    sendWelcomeTalentEmail(email, prenom).catch(console.error)

    // Crée la session
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for') || undefined
    const token = await createSession(result.user.id, userAgent, ip)

    // Réponse
    const response = NextResponse.json({
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email,
        role: result.user.role,
      },
      talent: {
        uid: result.talent.uid,
        prenom: result.talent.prenom,
        nom: result.talent.nom,
      },
      redirectUrl: '/t/dashboard',
    })

    // Set le cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Erreur inscription talent:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
