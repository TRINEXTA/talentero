import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { registerClientSchema } from '@/lib/validations'
import { verifySiret } from '@/lib/siret'
import { sendWelcomeClientEmail } from '@/lib/email'
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

    // Vérifie le SIRET via l'API INSEE
    let siretInfo = null
    if (siret) {
      try {
        siretInfo = await verifySiret(siret)
        if (!siretInfo) {
          return NextResponse.json(
            { error: 'SIRET non trouvé dans la base INSEE' },
            { status: 400 }
          )
        }
        if (!siretInfo.actif) {
          return NextResponse.json(
            { error: 'Cet établissement n\'est plus actif' },
            { status: 400 }
          )
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          console.error('Erreur vérification SIRET:', error)
          return NextResponse.json(
            { error: 'Impossible de vérifier le SIRET. Réessayez plus tard.' },
            { status: 500 }
          )
        }
      }
    }

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
          raisonSociale: siretInfo?.raisonSociale || raisonSociale,
          siret,
          siren: siret ? siret.substring(0, 9) : null,
          codeAPE: siretInfo?.codeAPE,
          formeJuridique: siretInfo?.formeJuridique,
          adresse: siretInfo?.adresse ? `${siretInfo.adresse.numero} ${siretInfo.adresse.rue}`.trim() : null,
          codePostal: siretInfo?.adresse?.codePostal,
          ville: siretInfo?.adresse?.ville,
          statut: 'EN_ATTENTE', // En attente de validation TRINEXTA
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
          details: { siretVerifie: !!siretInfo, raisonSociale },
        },
      })

      // Crée une notification pour les admins
      await tx.notification.create({
        data: {
          type: 'VALIDATION_COMPTE',
          titre: 'Nouveau client à valider',
          message: `L'entreprise ${raisonSociale} a créé un compte et attend validation.`,
          lien: `/admin/clients/${client.uid}`,
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
