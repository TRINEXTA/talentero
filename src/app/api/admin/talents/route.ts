/**
 * API Admin - Gestion d'un Talent spécifique
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendAccountActivationEmail } from '@/lib/microsoft-graph'
import { createNotificationWithEmail } from '@/lib/email-notification-service' // <--- Ajouté
import crypto from 'crypto'

// GET - Détails d'un talent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: {
        user: {
          select: {
            uid: true,
            email: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
            // SECURITE: Ne pas exposer activationToken - exposer seulement l'expiry
            activationTokenExpiry: true,
            createdByAdmin: true,
          },
        },
        experiences: { orderBy: { dateDebut: 'desc' } },
        formations: { orderBy: { annee: 'desc' } },
        certificationsDetail: { orderBy: { dateObtention: 'desc' } },
        languesDetail: { orderBy: { niveau: 'desc' } },
        candidatures: {
          include: {
            offre: { select: { uid: true, titre: true, statut: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        matchs: {
          include: {
            offre: { select: { uid: true, titre: true } },
          },
          orderBy: { score: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            candidatures: true,
            matchs: true,
          },
        },
      },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ talent })
  } catch (error) {
    console.error('Erreur GET talent admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier un talent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()

    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: { user: true },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Champs modifiables par l'admin
    const allowedFields = [
      'statut',
      'compteLimite',
      'compteComplet',
      'visibleVitrine',
      'visiblePublic',
      'prenom',
      'nom',
      'telephone',
      'titrePoste',
      'bio',
      'competences',
      'anneesExperience',
      'tjm',
      'tjmMin',
      'tjmMax',
      'mobilite',
      'zonesGeographiques',
      'disponibilite',
      'disponibleLe',
      'ville',
      'codePostal',
      'adresse',
      'siret',
      'raisonSociale',
      'langues',
      'certifications',
      'linkedinUrl',
      'githubUrl',
      'portfolioUrl',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const updatedTalent = await prisma.talent.update({
      where: { uid },
      data: updateData,
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_TALENT_ADMIN',
        entite: 'Talent',
        entiteId: talent.id,
        details: JSON.parse(JSON.stringify({ modifications: updateData })),
      },
    })

    // --- NOTIFICATION VALIDATION ---
    // Si le statut passe à ACTIF, on envoie un mail de validation
    if (updateData.statut === 'ACTIF' && talent.statut !== 'ACTIF') {
      await createNotificationWithEmail({
        userId: talent.userId,
        type: 'VALIDATION_COMPTE',
        titre: 'Votre compte est validé !',
        message: 'Félicitations, votre profil a été validé par notre équipe. Vous êtes maintenant visible pour les clients et pouvez postuler aux offres.',
        lien: '/t/dashboard'
      }).catch(err => console.error('Erreur notif validation:', err))
    }

    return NextResponse.json({ talent: updatedTalent })
  } catch (error) {
    console.error('Erreur PATCH talent admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Désactiver un talent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params

    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: { user: true },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Désactive l'utilisateur (soft delete)
    await prisma.user.update({
      where: { id: talent.userId },
      data: { isActive: false },
    })

    await prisma.talent.update({
      where: { uid },
      data: { statut: 'SUSPENDU' },
    })

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'DISABLE_TALENT_ADMIN',
        entite: 'Talent',
        entiteId: talent.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE talent admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Actions spéciales sur un talent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { uid } = await params
    const body = await request.json()
    const { action } = body

    const talent = await prisma.talent.findUnique({
      where: { uid },
      include: { user: true },
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    switch (action) {
      case 'resend_activation': {
        const newToken = crypto.randomBytes(32).toString('hex')
        const newExpiry = new Date()
        newExpiry.setDate(newExpiry.getDate() + 7)

        await prisma.user.update({
          where: { id: talent.userId },
          data: {
            activationToken: newToken,
            activationTokenExpiry: newExpiry,
          },
        })

        await sendAccountActivationEmail(
          talent.user.email,
          talent.prenom,
          newToken
        )

        return NextResponse.json({ success: true, message: 'Email envoyé' })
      }

      case 'toggle_vitrine': {
        const updated = await prisma.talent.update({
          where: { uid },
          data: { visibleVitrine: !talent.visibleVitrine },
        })
        return NextResponse.json({
          success: true,
          visibleVitrine: updated.visibleVitrine,
        })
      }

      case 'reactivate': {
        await prisma.user.update({
          where: { id: talent.userId },
          data: { isActive: true },
        })
        await prisma.talent.update({
          where: { uid },
          data: { statut: 'ACTIF' },
        })

        // Notification de réactivation
        await createNotificationWithEmail({
          userId: talent.userId,
          type: 'VALIDATION_COMPTE',
          titre: 'Compte réactivé',
          message: 'Votre compte a été réactivé par l\'équipe TRINEXTA.',
          lien: '/t/dashboard'
        }).catch(err => console.error('Erreur notif reactivation:', err))

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur POST talent admin:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
