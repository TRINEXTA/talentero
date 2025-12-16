/**
 * Service de parsing de CV avec Claude API
 * Extrait automatiquement les informations du CV
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

/**
 * Extrait le texte d'un fichier PDF
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer)
    return data.text || ''
  } catch (error) {
    console.error('Erreur extraction PDF:', error)
    throw new Error('Impossible de lire le fichier PDF')
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
 * Parse le contenu textuel d'un CV et extrait les informations structurées
 */
export async function parseCV(cvText: string): Promise<ParsedCV> {
  const systemPrompt = `Tu es un expert en analyse de CV IT. Tu dois extraire les informations du CV fourni et les retourner en JSON structuré.

RÈGLES IMPORTANTES:
1. Extrais UNIQUEMENT les informations présentes dans le CV
2. Si une information n'est pas trouvée, utilise null ou un tableau vide
3. Pour les compétences, normalise les noms (ex: "JS" → "JavaScript", "React.js" → "React")
4. Calcule les années d'expérience en additionnant les durées des expériences professionnelles
5. Les dates doivent être au format ISO (YYYY-MM-DD) ou approximées au premier du mois
6. Pour les langues, indique le niveau si mentionné (ex: "Anglais:Courant")

COMPÉTENCES IT À DÉTECTER:
- Langages: Java, Python, JavaScript, TypeScript, C#, Go, Rust, PHP, Ruby, etc.
- Frontend: React, Angular, Vue.js, Next.js, HTML, CSS, Tailwind, etc.
- Backend: Spring, Node.js, Express, NestJS, Django, FastAPI, .NET, etc.
- Base de données: PostgreSQL, MySQL, MongoDB, Redis, Oracle, etc.
- DevOps: Docker, Kubernetes, AWS, Azure, GCP, CI/CD, Jenkins, etc.
- Autres: Git, Agile, Scrum, REST API, GraphQL, etc.`

  const userPrompt = `Analyse ce CV et retourne les informations en JSON:

${cvText}

Retourne UNIQUEMENT un objet JSON valide avec cette structure:
{
  "prenom": "string",
  "nom": "string",
  "email": "string | null",
  "telephone": "string | null",
  "titrePoste": "string | null",
  "bio": "string | null",
  "competences": ["string"],
  "anneesExperience": number,
  "experiences": [{
    "poste": "string",
    "entreprise": "string",
    "lieu": "string | null",
    "dateDebut": "YYYY-MM-DD",
    "dateFin": "YYYY-MM-DD | null",
    "description": "string | null",
    "competences": ["string"]
  }],
  "formations": [{
    "diplome": "string",
    "etablissement": "string | null",
    "annee": number | null
  }],
  "langues": ["string"],
  "certifications": ["string"],
  "softSkills": ["string"],
  "linkedinUrl": "string | null",
  "githubUrl": "string | null"
}`

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
      system: systemPrompt,
    })

    // Extrait le texte de la réponse
    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Réponse invalide de Claude')
    }

    // Parse le JSON de la réponse
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Pas de JSON trouvé dans la réponse')
    }

    const parsed: ParsedCV = JSON.parse(jsonMatch[0])
    
    // Normalise les compétences
    parsed.competences = normalizeSkills(parsed.competences)
    
    return parsed
  } catch (error) {
    console.error('Erreur parsing CV:', error)
    throw new Error('Impossible de parser le CV')
  }
}

/**
 * Normalise les noms de compétences pour une meilleure cohérence
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
 * Calcule le score de matching entre un CV parsé et une liste de compétences requises
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
  
  // Calcul du score: 80% basé sur les compétences requises, 20% sur les optionnelles
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
