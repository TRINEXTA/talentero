/**
 * API Admin - Renvoyer email d'activation talent
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { sendAccountActivationEmail } from '@/lib/microsoft-graph'
import crypto from 'crypto'

// POST - Renvoyer l'email d'activation
export async function POST(
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
      return NextResponse.json({ error: 'Talent non trouve' }, { status: 404 })
    }

    // Genere un nouveau token d'activation
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

    // Envoie l'email d'activation
    await sendAccountActivationEmail(
      talent.user.email,
      talent.prenom,
      newToken
    )

    // Log l'action
    await prisma.auditLog.create({
      data: {
        action: 'RESEND_ACTIVATION_EMAIL',
        entite: 'Talent',
        entiteId: talent.id,
        details: { email: talent.user.email },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Email d\'activation envoye'
    })
  } catch (error) {
    console.error('Erreur envoi activation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
