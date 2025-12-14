/**
 * API Admin - Gestion des Clients
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole, hashPassword } from '@/lib/auth'
import { generateClientCode } from '@/lib/utils'

// GET - Liste des clients avec filtres
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const statut = searchParams.get('statut') || ''
    const typeClient = searchParams.get('typeClient') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { raisonSociale: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { siret: { contains: search } },
      ]
    }

    if (statut) {
      where.statut = statut
    }

    if (typeClient) {
      where.typeClient = typeClient
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              emailVerified: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          contacts: true,
          sites: true,
          _count: {
            select: { offres: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.client.count({ where }),
    ])

    return NextResponse.json({
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET clients admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un client (par admin)
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const body = await request.json()

    const {
      email,
      password,
      typeClient = 'DIRECT',
      raisonSociale,
      siret,
      siren,
      codeAPE,
      formeJuridique,
      adresse,
      codePostal,
      ville,
      pays = 'France',
      description,
      secteurActivite,
      tailleEntreprise,
      siteWeb,
      contacts,
      sites,
      validerMaintenant,
    } = body

    if (!email || !raisonSociale) {
      return NextResponse.json(
        { error: 'Email et raison sociale obligatoires' },
        { status: 400 }
      )
    }

    // Vérifie si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    // Vérifie si le SIRET existe déjà
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

    // Hash du mot de passe si fourni
    const passwordHash = password ? await hashPassword(password) : null

    // Crée le client en transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'CLIENT',
          emailVerified: validerMaintenant || false,
        },
      })

      // Génère le code unique client (CL + 4 chiffres)
      const codeUnique = await generateClientCode()

      const client = await tx.client.create({
        data: {
          userId: user.id,
          codeUnique,
          typeClient,
          raisonSociale,
          siret,
          siren: siren || (siret ? siret.substring(0, 9) : null),
          codeAPE,
          formeJuridique,
          adresse,
          codePostal,
          ville,
          pays,
          description,
          secteurActivite,
          tailleEntreprise,
          siteWeb,
          statut: validerMaintenant ? 'ACTIF' : 'EN_ATTENTE',
          valideParAdmin: validerMaintenant || false,
          valideLe: validerMaintenant ? new Date() : null,
        },
      })

      // Crée les contacts si fournis
      if (contacts && Array.isArray(contacts)) {
        for (const contact of contacts) {
          await tx.clientContact.create({
            data: {
              clientId: client.id,
              prenom: contact.prenom,
              nom: contact.nom,
              email: contact.email,
              telephone: contact.telephone,
              poste: contact.poste,
              estContactPrincipal: contact.estContactPrincipal || false,
              recevoirNotifications: contact.recevoirNotifications !== false,
            },
          })
        }
      }

      // Crée les sites si fournis
      if (sites && Array.isArray(sites)) {
        for (const site of sites) {
          await tx.clientSite.create({
            data: {
              clientId: client.id,
              nom: site.nom,
              adresse: site.adresse,
              codePostal: site.codePostal,
              ville: site.ville,
              pays: site.pays || 'France',
              telephone: site.telephone,
              estSiegeSocial: site.estSiegeSocial || false,
            },
          })
        }
      }

      // Log l'action
      await tx.auditLog.create({
        data: {
          action: 'CREATE_CLIENT_ADMIN',
          entite: 'Client',
          entiteId: client.id,
          details: { raisonSociale, typeClient },
        },
      })

      return { user, client }
    })

    return NextResponse.json({
      success: true,
      client: {
        uid: result.client.uid,
        codeUnique: result.client.codeUnique,
        raisonSociale: result.client.raisonSociale,
        typeClient: result.client.typeClient,
        statut: result.client.statut,
      },
    })
  } catch (error) {
    console.error('Erreur POST client admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
