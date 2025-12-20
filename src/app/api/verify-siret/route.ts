/**
 * API - Vérification SIRET/SIREN via l'API INSEE
 * Permet de vérifier et récupérer les informations d'une entreprise
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySiret, isITActivity, isFreelanceSolo } from '@/lib/siret'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { siret, siren } = body

    // On peut fournir soit un SIRET (14 chiffres) soit un SIREN (9 chiffres)
    let siretToCheck = siret

    if (!siretToCheck && siren) {
      // Si on a un SIREN, on ajoute "00000" pour obtenir le siège social
      const cleanSiren = siren.replace(/\D/g, '')
      if (cleanSiren.length !== 9) {
        return NextResponse.json(
          { error: 'Le SIREN doit contenir 9 chiffres' },
          { status: 400 }
        )
      }
      // SIRET du siège = SIREN + NIC (00000 pour le siège, mais on doit chercher)
      // Pour l'instant, on utilise le SIREN + 00001 qui est souvent le siège
      siretToCheck = cleanSiren + '00001'
    }

    if (!siretToCheck) {
      return NextResponse.json(
        { error: 'SIRET ou SIREN requis' },
        { status: 400 }
      )
    }

    // Vérifie les credentials INSEE
    if (!process.env.INSEE_API_KEY || !process.env.INSEE_API_SECRET) {
      console.error('INSEE API credentials not configured')
      return NextResponse.json(
        { error: 'Service de vérification temporairement indisponible' },
        { status: 503 }
      )
    }

    // Appelle l'API INSEE
    const result = await verifySiret(siretToCheck)

    if (!result) {
      // Si SIRET non trouvé avec NIC 00001, essayer avec 00000
      if (siren && !siret) {
        const cleanSiren = siren.replace(/\D/g, '')
        const altSiret = cleanSiren + '00000'
        const altResult = await verifySiret(altSiret)
        if (altResult) {
          return NextResponse.json({
            valid: true,
            actif: altResult.actif,
            entreprise: {
              siret: altResult.siret,
              siren: altResult.siren,
              raisonSociale: altResult.raisonSociale,
              dateCreation: altResult.dateCreation,
              codeAPE: altResult.codeAPE,
              libelleAPE: altResult.libelleAPE,
              formeJuridique: altResult.formeJuridique,
              adresse: altResult.adresse,
              isIT: isITActivity(altResult.codeAPE),
              isFreelance: isFreelanceSolo(altResult.trancheEffectif),
            },
          })
        }
      }
      return NextResponse.json(
        { valid: false, error: 'SIRET/SIREN non trouvé dans la base INSEE' },
        { status: 404 }
      )
    }

    // Vérifie si l'entreprise est active
    if (!result.actif) {
      return NextResponse.json({
        valid: false,
        error: 'Cette entreprise n\'est plus active (radiée ou fermée)',
        entreprise: {
          raisonSociale: result.raisonSociale,
          siret: result.siret,
          siren: result.siren,
        },
      })
    }

    // Retourne les informations
    return NextResponse.json({
      valid: true,
      actif: result.actif,
      entreprise: {
        siret: result.siret,
        siren: result.siren,
        raisonSociale: result.raisonSociale,
        dateCreation: result.dateCreation,
        codeAPE: result.codeAPE,
        libelleAPE: result.libelleAPE,
        formeJuridique: result.formeJuridique,
        adresse: result.adresse,
        isIT: isITActivity(result.codeAPE),
        isFreelance: isFreelanceSolo(result.trancheEffectif),
      },
    })
  } catch (error) {
    console.error('Erreur vérification SIRET:', error)

    if (error instanceof Error) {
      if (error.message.includes('14 chiffres')) {
        return NextResponse.json(
          { error: 'Le SIRET doit contenir 14 chiffres' },
          { status: 400 }
        )
      }
      if (error.message.includes('checksum')) {
        return NextResponse.json(
          { error: 'Le numéro SIRET est invalide' },
          { status: 400 }
        )
      }
      if (error.message.includes('authentification INSEE')) {
        return NextResponse.json(
          { error: 'Service de vérification temporairement indisponible' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}
