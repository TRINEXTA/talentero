/**
 * Service de vérification SIRET via API INSEE
 * Documentation : https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=Sirene&version=V3.11&provider=insee
 */

interface SiretInfo {
  siret: string
  siren: string
  raisonSociale: string
  dateCreation: string
  actif: boolean
  codeAPE: string
  libelleAPE: string
  formeJuridique: string
  adresse: {
    numero: string
    rue: string
    codePostal: string
    ville: string
  }
  trancheEffectif: string
}

interface InseeTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface InseeEtablissementResponse {
  etablissement: {
    siret: string
    siren: string
    dateCreationEtablissement: string
    periodesEtablissement: Array<{
      etatAdministratifEtablissement: string
      denominationUniteLegale: string
      activitePrincipaleEtablissement: string
      nomenclatureActivitePrincipaleEtablissement: string
    }>
    adresseEtablissement: {
      numeroVoieEtablissement: string
      typeVoieEtablissement: string
      libelleVoieEtablissement: string
      codePostalEtablissement: string
      libelleCommuneEtablissement: string
    }
    uniteLegale: {
      denominationUniteLegale: string
      categorieJuridiqueUniteLegale: string
      trancheEffectifsUniteLegale: string
      dateCreationUniteLegale: string
    }
  }
}

// Cache du token INSEE (évite de refaire l'auth à chaque requête)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * Récupère un token d'accès à l'API INSEE
 */
async function getInseeToken(): Promise<string> {
  // Vérifie si le token en cache est encore valide
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  const credentials = Buffer.from(
    `${process.env.INSEE_API_KEY}:${process.env.INSEE_API_SECRET}`
  ).toString('base64')

  const response = await fetch('https://api.insee.fr/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error(`Erreur authentification INSEE: ${response.status}`)
  }

  const data: InseeTokenResponse = await response.json()
  
  // Cache le token avec une marge de sécurité de 5 minutes
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }

  return data.access_token
}

/**
 * Vérifie un numéro SIRET et retourne les informations de l'entreprise
 */
export async function verifySiret(siret: string): Promise<SiretInfo | null> {
  // Nettoie le SIRET (enlève espaces et caractères non numériques)
  const cleanSiret = siret.replace(/\D/g, '')

  // Vérifie le format (14 chiffres)
  if (cleanSiret.length !== 14) {
    throw new Error('Le SIRET doit contenir 14 chiffres')
  }

  // Vérifie la validité avec l'algorithme de Luhn
  if (!isValidLuhn(cleanSiret)) {
    throw new Error('Le SIRET est invalide (checksum incorrecte)')
  }

  try {
    const token = await getInseeToken()

    const response = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3.11/siret/${cleanSiret}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    )

    if (response.status === 404) {
      return null // SIRET non trouvé
    }

    if (!response.ok) {
      throw new Error(`Erreur API INSEE: ${response.status}`)
    }

    const data: InseeEtablissementResponse = await response.json()
    const etab = data.etablissement
    const periode = etab.periodesEtablissement[0]
    const adresse = etab.adresseEtablissement
    const uniteLegale = etab.uniteLegale

    return {
      siret: etab.siret,
      siren: etab.siren,
      raisonSociale: uniteLegale.denominationUniteLegale || periode.denominationUniteLegale,
      dateCreation: uniteLegale.dateCreationUniteLegale,
      actif: periode.etatAdministratifEtablissement === 'A',
      codeAPE: periode.activitePrincipaleEtablissement,
      libelleAPE: getLibelleAPE(periode.activitePrincipaleEtablissement),
      formeJuridique: getFormeJuridique(uniteLegale.categorieJuridiqueUniteLegale),
      adresse: {
        numero: adresse.numeroVoieEtablissement || '',
        rue: `${adresse.typeVoieEtablissement || ''} ${adresse.libelleVoieEtablissement || ''}`.trim(),
        codePostal: adresse.codePostalEtablissement,
        ville: adresse.libelleCommuneEtablissement,
      },
      trancheEffectif: uniteLegale.trancheEffectifsUniteLegale,
    }
  } catch (error) {
    console.error('Erreur vérification SIRET:', error)
    throw error
  }
}

/**
 * Vérifie si le SIRET est valide selon l'algorithme de Luhn
 */
function isValidLuhn(siret: string): boolean {
  let sum = 0
  for (let i = 0; i < siret.length; i++) {
    let digit = parseInt(siret[i], 10)
    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/**
 * Retourne le libellé de l'activité principale
 * (version simplifiée - pour une liste complète, utiliser un fichier de référence)
 */
function getLibelleAPE(code: string): string {
  const apeLabels: Record<string, string> = {
    '6201Z': 'Programmation informatique',
    '6202A': 'Conseil en systèmes et logiciels informatiques',
    '6202B': 'Tierce maintenance de systèmes et d\'applications informatiques',
    '6203Z': 'Gestion d\'installations informatiques',
    '6209Z': 'Autres activités informatiques',
    '6311Z': 'Traitement de données, hébergement et activités connexes',
    '6312Z': 'Portails Internet',
    '7022Z': 'Conseil pour les affaires et autres conseils de gestion',
    '7112B': 'Ingénierie, études techniques',
  }
  return apeLabels[code] || `Code APE: ${code}`
}

/**
 * Retourne le libellé de la forme juridique
 */
function getFormeJuridique(code: string): string {
  const formes: Record<string, string> = {
    '1000': 'Entrepreneur individuel',
    '5499': 'SARL unipersonnelle',
    '5498': 'EURL',
    '5710': 'SAS',
    '5720': 'SASU',
    '5599': 'SA',
  }
  return formes[code] || `Forme juridique: ${code}`
}

/**
 * Vérifie si l'entreprise est une activité IT
 */
export function isITActivity(codeAPE: string): boolean {
  // Codes APE liés à l'informatique
  const itCodes = [
    '6201Z', '6202A', '6202B', '6203Z', '6209Z',
    '6311Z', '6312Z', '5829A', '5829B', '5829C',
    '7112B', '7022Z',
  ]
  return itCodes.includes(codeAPE)
}

/**
 * Vérifie si c'est un freelance solo (pas de salariés)
 */
export function isFreelanceSolo(trancheEffectif: string): boolean {
  // 00 = 0 salarié, 01 = 1-2 salariés
  return trancheEffectif === '00' || trancheEffectif === 'NN' || trancheEffectif === ''
}
