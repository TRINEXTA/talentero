/**
 * API Admin - CV Anonymisé d'un Talent
 * Génère un CV anonymisé au format HTML (pour impression PDF)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { generateAnonymizedCV } from '@/lib/cv-anonymizer'

// GET - Génère le CV anonymisé
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await requireRole(['ADMIN'])

    const { uid } = await params

    // Trouve le talent par UID
    const talent = await prisma.talent.findUnique({
      where: { uid }
    })

    if (!talent) {
      return NextResponse.json(
        { error: 'Talent non trouvé' },
        { status: 404 }
      )
    }

    // Génère le CV anonymisé
    const result = await generateAnonymizedCV(talent.id)

    if (!result) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du CV' },
        { status: 500 }
      )
    }

    // Détermine le format de réponse
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'html'

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        talent: {
          uid: talent.uid,
          codeUnique: talent.codeUnique
        },
        cv: result.data
      })
    }

    // Retourne le HTML directement (pour affichage/impression)
    return new NextResponse(result.html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="CV_${talent.codeUnique}_anonyme.html"`
      }
    })

  } catch (error) {
    console.error('Erreur CV anonyme:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
