import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import {
  getInactiveAccounts,
  getInactiveAccountsStats,
  processInactiveAccounts,
  deleteInactiveAccount,
} from '@/lib/account-management'

/**
 * GET /api/admin/accounts/inactive
 * Récupère les statistiques et la liste des comptes inactifs
 */
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const searchParams = request.nextUrl.searchParams
    const detailed = searchParams.get('detailed') === 'true'

    if (detailed) {
      // Liste détaillée des comptes
      const accounts = await getInactiveAccounts()
      return NextResponse.json({ accounts })
    } else {
      // Statistiques uniquement
      const stats = await getInactiveAccountsStats()
      return NextResponse.json({ stats })
    }
  } catch (error) {
    console.error('Erreur GET /api/admin/accounts/inactive:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: error instanceof Error && error.message === 'Non authentifié' ? 401 : 500 }
    )
  }
}

/**
 * POST /api/admin/accounts/inactive
 * Lance le traitement des comptes inactifs (rappels + suppressions)
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const body = await request.json()
    const dryRun = body.dryRun === true

    const result = await processInactiveAccounts(dryRun)

    return NextResponse.json({
      success: true,
      dryRun,
      result,
      message: dryRun
        ? 'Simulation terminée. Aucune action effectuée.'
        : `Traitement terminé: ${result.rappelsEnvoyes} rappels envoyés, ${result.comptesSupprimes} comptes supprimés.`,
    })
  } catch (error) {
    console.error('Erreur POST /api/admin/accounts/inactive:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/accounts/inactive
 * Supprime un compte inactif spécifique
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const body = await request.json()
    const { talentUid } = body

    if (!talentUid) {
      return NextResponse.json(
        { error: 'talentUid requis' },
        { status: 400 }
      )
    }

    await deleteInactiveAccount(talentUid)

    return NextResponse.json({
      success: true,
      message: 'Compte supprimé avec succès',
    })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/accounts/inactive:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
