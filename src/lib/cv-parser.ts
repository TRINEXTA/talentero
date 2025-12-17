/**
 * Service de parsing de CV avec Claude API
 * Extrait automatiquement les informations du CV
 * Supporte les CVs textuels ET visuels/scannes grace a Claude Vision
 */

import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

interface ParsedCV {
  prenom: string
  nom: string
  email: string | null
  telephone: string | null
  titrePoste: string | null
  bio: string | null
  competences: string[]
  anneesExperience: number
  experiences: Array<{
    poste: string
    entreprise: string
    lieu: string | null
    dateDebut: string
    dateFin: string | null
    description: string | null
    competences: string[]
  }>
  formations: Array<{
    diplome: string
    etablissement: string | null
    annee: number | null
  }>
  langues: string[]
  certifications: string[]
  softSkills: string[]
  linkedinUrl: string | null
  githubUrl: string | null
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Seuil minimum de caracteres pour considerer que l'extraction texte a reussi
const MIN_TEXT_LENGTH = 100

/**
 * Extrait le texte d'un fichier PDF
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer)
    return data.text || ''
  } catch (error) {
    console.error('Erreur extraction PDF:', error)
    return '' // Retourne vide au lieu de throw pour permettre le fallback Vision
  }
}

/**
 * Extrait le texte d'un fichier (PDF ou texte)
 */
export async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const extension = filename.toLowerCase().split('.').pop()

  if (extension === 'pdf') {
    return extractTextFromPDF(buffer)
  }

  // Pour les fichiers texte (.txt, .doc, etc.)
  return buffer.toString('utf-8')
}

/**
 * Prompt systeme commun pour le parsing de CV
 * IMPORTANT: Extraction FIDELE sauf pour la bio qui est amelioree
 */
const CV_SYSTEM_PROMPT = `Tu es un expert en analyse de CV IT. Tu dois extraire les informations du CV et les retourner en JSON structure.

=== REGLES D'EXTRACTION FIDELE ===
Tu dois extraire les informations EXACTEMENT comme elles apparaissent dans le CV:

1. COMPETENCES: Liste TOUTES les competences techniques EXACTEMENT comme ecrites
   - Ne supprime aucune competence
   - Normalise seulement les abreviations evidentes (JS -> JavaScript)
   - Garde les versions specifiques si mentionnees (React 18, Python 3.11, etc.)

2. EXPERIENCES: Copie FIDELEMENT chaque experience
   - Garde le titre du poste EXACTEMENT comme ecrit
   - Garde le nom de l'entreprise EXACTEMENT comme ecrit
   - La description doit reprendre les points cles SANS les reformuler
   - Extrais TOUTES les experiences, meme les plus anciennes
   - Ne fusionne JAMAIS plusieurs postes

3. FORMATIONS: Copie EXACTEMENT les diplomes et etablissements

4. CERTIFICATIONS/LANGUES: Liste EXACTEMENT comme ecrit dans le CV

=== EXCEPTION: LA BIO ===
Pour le champ "bio", tu dois CREER une presentation professionnelle et commerciale:
- Redige 2-3 phrases percutantes qui mettent en valeur le profil
- Mentionne les annees d'experience, les domaines d'expertise principaux
- Utilise un ton professionnel et vendeur (mais pas exagere)
- Exemple: "Developpeur Full Stack senior avec 8 ans d'experience, specialise en React et Node.js. Expert en architectures cloud AWS et methodologies Agile. Reconnu pour sa capacite a delivrer des solutions performantes et scalables."

=== COMPETENCES IT A DETECTER ===
- Langages: Java, Python, JavaScript, TypeScript, C#, C++, Go, Rust, PHP, Ruby, etc.
- Frontend: React, Angular, Vue.js, Next.js, HTML, CSS, Tailwind, etc.
- Backend: Spring, Node.js, Express, NestJS, Django, .NET, Laravel, etc.
- Base de donnees: PostgreSQL, MySQL, MongoDB, Redis, Oracle, etc.
- DevOps: Docker, Kubernetes, AWS, Azure, GCP, CI/CD, Jenkins, Terraform, etc.
- Autres: Git, Agile, Scrum, REST API, GraphQL, Microservices, etc.`

/**
 * Structure JSON attendue pour le parsing
 */
const CV_JSON_STRUCTURE = `{
  "prenom": "string (EXACTEMENT comme dans le CV)",
  "nom": "string (EXACTEMENT comme dans le CV)",
  "email": "string | null",
  "telephone": "string | null",
  "titrePoste": "string | null (poste actuel ou dernier poste - EXACTEMENT comme ecrit)",
  "bio": "string (GENERE: presentation commerciale professionnelle de 2-3 phrases)",
  "competences": ["string (TOUTES les competences techniques du CV, EXACTEMENT comme ecrites)"],
  "anneesExperience": number (calcule depuis la premiere experience),
  "experiences": [
    {
      "poste": "string (EXACTEMENT comme dans le CV)",
      "entreprise": "string (EXACTEMENT comme dans le CV)",
      "lieu": "string | null",
      "dateDebut": "YYYY-MM-DD",
      "dateFin": "YYYY-MM-DD | null (null si en cours)",
      "description": "string | null (points cles FIDELES au CV, pas de reformulation)",
      "competences": ["string (competences de cette experience)"]
    }
  ],
  "formations": [
    {
      "diplome": "string (EXACTEMENT comme ecrit)",
      "etablissement": "string | null",
      "annee": number | null
    }
  ],
  "langues": ["string (avec niveau si mentionne)"],
  "certifications": ["string (EXACTEMENT comme ecrit)"],
  "softSkills": ["string"],
  "linkedinUrl": "string | null",
  "githubUrl": "string | null"
}`

/**
 * Tente de parser un CV meme avec peu de texte extrait
 * Utilise Claude pour deviner les informations manquantes
 */
async function parsePartialCV(cvText: string, filename: string): Promise<ParsedCV> {
  console.log('Tentative de parsing avec texte partiel...')

  const userPrompt = `Le texte suivant a ete extrait d'un CV (fichier: ${filename}).
Le texte peut etre incomplet ou mal formate car le PDF original est peut-etre graphique/scanne.
Fais de ton mieux pour extraire les informations disponibles.

TEXTE EXTRAIT:
---
${cvText || '(Aucun texte extrait - le PDF est probablement une image)'}
---

Si le texte est vide ou insuffisant, retourne un JSON avec les valeurs par defaut:
- prenom et nom: "A" "Definir"
- competences: tableau vide
- experiences: tableau vide

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
${CV_JSON_STRUCTURE}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: CV_SYSTEM_PROMPT,
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Reponse invalide')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Pas de JSON trouve')
    }

    const parsed: ParsedCV = JSON.parse(jsonMatch[0])
    parsed.competences = normalizeSkills(parsed.competences)

    return parsed
  } catch (error) {
    console.error('Erreur parsing partiel:', error)
    // Retourne un profil minimal
    return {
      prenom: 'A',
      nom: 'Definir',
      email: null,
      telephone: null,
      titrePoste: null,
      bio: null,
      competences: [],
      anneesExperience: 0,
      experiences: [],
      formations: [],
      langues: [],
      certifications: [],
      softSkills: [],
      linkedinUrl: null,
      githubUrl: null,
    }
  }
}

/**
 * Parse le contenu textuel d'un CV et extrait les informations structurees
 * EXTRACTION FIDELE sauf pour la bio qui est generee/amelioree
 */
export async function parseCV(cvText: string): Promise<ParsedCV> {
  const userPrompt = `Analyse ce CV et extrais les informations en JSON.

RAPPELS IMPORTANTS:
- Extrais les informations EXACTEMENT comme ecrites dans le CV (pas de reformulation)
- EXCEPTION: Le champ "bio" doit etre une presentation commerciale GENEREE (2-3 phrases professionnelles)
- Extrais TOUTES les experiences, meme les plus anciennes
- Ne fusionne JAMAIS plusieurs postes en un seul

CONTENU DU CV:
---
${cvText}
---

Retourne UNIQUEMENT un objet JSON valide:
${CV_JSON_STRUCTURE}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: CV_SYSTEM_PROMPT,
    })

    // Extrait le texte de la reponse
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Reponse invalide de Claude')
    }

    // Parse le JSON de la reponse
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Pas de JSON trouve dans la reponse')
    }

    const parsed: ParsedCV = JSON.parse(jsonMatch[0])

    // Normalise les competences
    parsed.competences = normalizeSkills(parsed.competences)

    return parsed
  } catch (error) {
    console.error('Erreur parsing CV:', error)
    throw new Error('Impossible de parser le CV')
  }
}

/**
 * Parse un CV de maniere intelligente:
 * 1. Essaie d'abord l'extraction texte classique
 * 2. Si le texte est insuffisant, tente quand meme le parsing avec indication du probleme
 */
export async function parseCVSmart(pdfBuffer: Buffer, filename: string): Promise<ParsedCV> {
  const extension = filename.toLowerCase().split('.').pop()

  // Si ce n'est pas un PDF, utilise la methode classique
  if (extension !== 'pdf') {
    const text = pdfBuffer.toString('utf-8')
    return parseCV(text)
  }

  // Pour les PDFs, essaie d'abord l'extraction texte
  console.log('Tentative d\'extraction texte du PDF...')
  const extractedText = await extractTextFromPDF(pdfBuffer)

  // Nettoie le texte extrait (enleve espaces multiples, lignes vides)
  const cleanedText = extractedText
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  console.log(`Texte extrait: ${cleanedText.length} caracteres`)

  // Si le texte est suffisant (>= 100 chars), utilise la methode classique
  if (cleanedText.length >= MIN_TEXT_LENGTH) {
    console.log('Texte suffisant, utilisation du parsing texte classique')
    try {
      return await parseCV(extractedText)
    } catch (parseError) {
      console.log('Echec du parsing texte classique, tentative avec parsing partiel...')
      return await parsePartialCV(extractedText, filename)
    }
  }

  // Si peu de texte extrait (PDF graphique/scanne), tente quand meme
  if (cleanedText.length > 0) {
    console.log('Texte insuffisant mais present, tentative de parsing partiel...')
    return await parsePartialCV(extractedText, filename)
  }

  // Aucun texte extrait - le PDF est probablement une image pure
  console.log('ATTENTION: Aucun texte extrait du PDF. Le fichier est peut-etre scanne/image.')
  console.log('Pour les CVs scannes, veuillez utiliser un PDF avec du texte selectionnable.')

  // Retourne un profil minimal avec indication du probleme
  return {
    prenom: 'CV',
    nom: 'Scanne',
    email: null,
    telephone: null,
    titrePoste: 'A definir manuellement',
    bio: 'Ce CV est au format image/scanne et n\'a pas pu etre analyse automatiquement. Veuillez saisir les informations manuellement ou fournir un PDF avec du texte selectionnable.',
    competences: [],
    anneesExperience: 0,
    experiences: [],
    formations: [],
    langues: [],
    certifications: [],
    softSkills: [],
    linkedinUrl: null,
    githubUrl: null,
  }
}

/**
 * Normalise les noms de competences pour une meilleure coherence
 */
function normalizeSkills(skills: string[]): string[] {
  const skillMapping: Record<string, string> = {
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'react.js': 'React',
    'reactjs': 'React',
    'react js': 'React',
    'vue.js': 'Vue.js',
    'vuejs': 'Vue.js',
    'angular.js': 'Angular',
    'angularjs': 'Angular',
    'node.js': 'Node.js',
    'nodejs': 'Node.js',
    'node js': 'Node.js',
    'next.js': 'Next.js',
    'nextjs': 'Next.js',
    'express.js': 'Express',
    'expressjs': 'Express',
    'postgresql': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB',
    'mongo': 'MongoDB',
    'aws': 'AWS',
    'amazon web services': 'AWS',
    'gcp': 'Google Cloud',
    'google cloud platform': 'Google Cloud',
    'azure': 'Azure',
    'microsoft azure': 'Azure',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'ci/cd': 'CI/CD',
    'cicd': 'CI/CD',
    'html5': 'HTML',
    'css3': 'CSS',
    'tailwindcss': 'Tailwind CSS',
    'tailwind': 'Tailwind CSS',
    'spring boot': 'Spring Boot',
    'springboot': 'Spring Boot',
    // Ajout pour les competences systemes/reseau
    'active directory': 'Active Directory',
    'ad': 'Active Directory',
    'vmware': 'VMware',
    'hyper-v': 'Hyper-V',
    'hyperv': 'Hyper-V',
    'windows server': 'Windows Server',
    'linux': 'Linux',
    'ansible': 'Ansible',
    'terraform': 'Terraform',
    'glpi': 'GLPI',
  }

  return skills.map(skill => {
    const normalized = skill.toLowerCase().trim()
    return skillMapping[normalized] || skill
  }).filter((skill, index, self) =>
    // Supprime les doublons (case insensitive)
    self.findIndex(s => s.toLowerCase() === skill.toLowerCase()) === index
  )
}

/**
 * Calcule le score de matching entre un CV parse et une liste de competences requises
 */
export function calculateMatchScore(
  candidateSkills: string[],
  requiredSkills: string[],
  optionalSkills: string[] = []
): {
  score: number
  matchedRequired: string[]
  matchedOptional: string[]
  missingRequired: string[]
} {
  const normalize = (s: string) => s.toLowerCase().trim()
  const candidateNormalized = candidateSkills.map(normalize)

  const matchedRequired = requiredSkills.filter(skill =>
    candidateNormalized.includes(normalize(skill))
  )

  const matchedOptional = optionalSkills.filter(skill =>
    candidateNormalized.includes(normalize(skill))
  )

  const missingRequired = requiredSkills.filter(skill =>
    !candidateNormalized.includes(normalize(skill))
  )

  // Calcul du score: 80% base sur les competences requises, 20% sur les optionnelles
  const requiredScore = requiredSkills.length > 0
    ? (matchedRequired.length / requiredSkills.length) * 80
    : 80

  const optionalScore = optionalSkills.length > 0
    ? (matchedOptional.length / optionalSkills.length) * 20
    : 20

  return {
    score: Math.round(requiredScore + optionalScore),
    matchedRequired,
    matchedOptional,
    missingRequired,
  }
}
