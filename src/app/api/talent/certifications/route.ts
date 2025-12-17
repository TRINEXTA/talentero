/**
 * API Talent - Gestion des certifications
 * GET: Liste les certifications du talent connecté
 * POST: Ajoute une nouvelle certification
 * DELETE: Supprime une certification
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste les certifications
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id },
      include: {
        certificationsDetail: {
          orderBy: { dateObtention: 'desc' }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ certifications: talent.certificationsDetail })
  } catch (error) {
    console.error('Erreur GET certifications:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Ajoute une certification
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    const body = await request.json()
    const { nom, organisme, dateObtention, dateExpiration, numeroCertification, urlVerification } = body

    if (!nom) {
      return NextResponse.json({ error: 'Le nom de la certification est requis' }, { status: 400 })
    }

    const certification = await prisma.certification.create({
      data: {
        talentId: talent.id,
        nom,
        organisme: organisme || null,
        dateObtention: dateObtention ? new Date(dateObtention) : null,
        dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
        numeroCertification: numeroCertification || null,
        urlVerification: urlVerification || null,
      }
    })

    return NextResponse.json({ certification }, { status: 201 })
  } catch (error) {
    console.error('Erreur POST certification:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE - Supprime une certification
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'TALENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    }

    const talent = await prisma.talent.findUnique({
      where: { userId: user.id }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent non trouvé' }, { status: 404 })
    }

    // Vérifie que la certification appartient au talent
    const certification = await prisma.certification.findFirst({
      where: { id: parseInt(id), talentId: talent.id }
    })

    if (!certification) {
      return NextResponse.json({ error: 'Certification non trouvée' }, { status: 404 })
    }

    await prisma.certification.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE certification:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
