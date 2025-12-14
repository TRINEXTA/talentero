/**
 * API Admin - Gestion d'un Client spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// GET - Détails d'un client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const client = await prisma.client.findUnique({
      where: { uid },
      include: {
        user: {
          select: {
            email: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
        contacts: {
          orderBy: { estContactPrincipal: 'desc' },
        },
        sites: {
          orderBy: { estSiegeSocial: 'desc' },
        },
        offres: {
          select: {
            uid: true,
            titre: true,
            statut: true,
            typeOffre: true,
            createdAt: true,
            _count: { select: { candidatures: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Erreur GET client admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier un client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()

    const client = await prisma.client.findUnique({
      where: { uid },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const allowedFields = [
      'typeClient',
      'raisonSociale',
      'siret',
      'siren',
      'codeAPE',
      'formeJuridique',
      'adresse',
      'codePostal',
      'ville',
      'pays',
      'description',
      'secteurActivite',
      'tailleEntreprise',
      'siteWeb',
      'statut',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const updatedClient = await prisma.client.update({
      where: { uid },
      data: updateData,
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_CLIENT_ADMIN',
        entite: 'Client',
        entiteId: client.id,
        details: JSON.parse(JSON.stringify({ modifications: updateData })),
      },
    })

    return NextResponse.json({ client: updatedClient })
  } catch (error) {
    console.error('Erreur PATCH client admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Actions sur un client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()
    const { action } = body

    const client = await prisma.client.findUnique({
      where: { uid },
      include: { user: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    switch (action) {
      case 'validate': {
        await prisma.client.update({
          where: { uid },
          data: {
            statut: 'ACTIF',
            valideParAdmin: true,
            valideLe: new Date(),
          },
        })

        await prisma.user.update({
          where: { id: client.userId },
          data: { emailVerified: true },
        })

        // Log l'action
        await prisma.auditLog.create({
          data: {
            action: 'VALIDATE_CLIENT_ADMIN',
            entite: 'Client',
            entiteId: client.id,
          },
        })

        return NextResponse.json({ success: true, message: 'Client validé' })
      }

      case 'suspend': {
        await prisma.client.update({
          where: { uid },
          data: { statut: 'SUSPENDU' },
        })

        return NextResponse.json({ success: true, message: 'Client suspendu' })
      }

      case 'reactivate': {
        await prisma.client.update({
          where: { uid },
          data: { statut: 'ACTIF' },
        })

        await prisma.user.update({
          where: { id: client.userId },
          data: { isActive: true },
        })

        return NextResponse.json({ success: true, message: 'Client réactivé' })
      }

      case 'add_contact': {
        const { contact } = body

        if (!contact || !contact.email || !contact.prenom || !contact.nom) {
          return NextResponse.json(
            { error: 'Informations de contact incomplètes' },
            { status: 400 }
          )
        }

        const newContact = await prisma.clientContact.create({
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

        return NextResponse.json({ success: true, contact: newContact })
      }

      case 'remove_contact': {
        const { contactId } = body

        await prisma.clientContact.delete({
          where: { id: contactId },
        })

        return NextResponse.json({ success: true })
      }

      case 'add_site': {
        const { site } = body

        if (!site || !site.nom || !site.adresse) {
          return NextResponse.json(
            { error: 'Informations de site incomplètes' },
            { status: 400 }
          )
        }

        const newSite = await prisma.clientSite.create({
          data: {
            clientId: client.id,
            nom: site.nom,
            adresse: site.adresse,
            codePostal: site.codePostal || '',
            ville: site.ville || '',
            pays: site.pays || 'France',
            telephone: site.telephone,
            estSiegeSocial: site.estSiegeSocial || false,
          },
        })

        return NextResponse.json({ success: true, site: newSite })
      }

      case 'remove_site': {
        const { siteId } = body

        await prisma.clientSite.delete({
          where: { id: siteId },
        })

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur POST client admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Désactiver un client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const client = await prisma.client.findUnique({
      where: { uid },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    // Archive le client
    await prisma.client.update({
      where: { uid },
      data: { statut: 'ARCHIVE' },
    })

    await prisma.user.update({
      where: { id: client.userId },
      data: { isActive: false },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'ARCHIVE_CLIENT_ADMIN',
        entite: 'Client',
        entiteId: client.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE client admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
