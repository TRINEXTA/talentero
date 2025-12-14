import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerClientSchema } from '@/lib/validations'
import { sendWelcomeClientEmail } from '@/lib/microsoft-graph'
import { generateClientCode } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validation
    const validation = registerClientSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.errors },
        { status: 400 }
      )
    }

    const {
      email,
      password,
      raisonSociale,
      siret,
      contactNom,
      contactPrenom,
      contactEmail,
      contactTelephone,
      contactPoste,
    } = validation.data

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

    // Vérifie que le SIRET n'existe pas déjà
    if (siret) {
      const existingClient = await prisma.client.findUnique({
        where: { siret },
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Ce SIRET est déjà enregistré' },
          { status: 400 }
        )
      }
    }

    // Note: La vérification du SIRET se fait manuellement par l'admin via le KBIS

    // Hash du mot de passe
    const passwordHash = await hashPassword(password)

    // Création en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Crée l'utilisateur
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'CLIENT',
          emailVerified: false,
        },
      })

      // Génère le code unique client
      const codeUnique = await generateClientCode()

      // Crée le profil client (en attente de validation)
      const client = await tx.client.create({
        data: {
          userId: user.id,
          codeUnique,
          raisonSociale,
          siret: siret || null,
          siren: siret ? siret.substring(0, 9) : null,
          statut: 'EN_ATTENTE', // En attente de validation TRINEXTA via KBIS
          valideParAdmin: false,
        },
      })

      // Crée le contact principal
      await tx.clientContact.create({
        data: {
          clientId: client.id,
          prenom: contactPrenom,
          nom: contactNom,
          email: contactEmail || email,
          telephone: contactTelephone,
          poste: contactPoste,
          estContactPrincipal: true,
          recevoirNotifications: true,
        },
      })

      // Log l'action
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_CLIENT',
          entite: 'Client',
          entiteId: client.id,
          details: { codeUnique, raisonSociale },
        },
      })

      return { user, client }
    })

    // Envoie l'email de bienvenue (async)
    sendWelcomeClientEmail(email, contactPrenom, raisonSociale).catch(console.error)

    // Réponse (pas de connexion automatique pour les clients, ils doivent attendre validation)
    return NextResponse.json({
      success: true,
      message: 'Compte créé avec succès. Il sera validé par notre équipe sous 24-48h.',
      client: {
        uid: result.client.uid,
        raisonSociale: result.client.raisonSociale,
        statut: result.client.statut,
      },
    })
  } catch (error) {
    console.error('Erreur inscription client:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
