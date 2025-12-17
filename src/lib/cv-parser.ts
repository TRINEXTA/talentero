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
  const systemPrompt = `Tu es un expert en analyse de CV IT avec plus de 20 ans d'expérience. Tu dois extraire TOUTES les informations du CV fourni et les retourner en JSON structuré.

RÈGLES CRITIQUES - À SUIVRE ABSOLUMENT:
1. Extrais CHAQUE expérience professionnelle mentionnée dans le CV, même les plus anciennes
2. Ne résume pas et ne fusionne pas les expériences - chaque poste doit être une entrée séparée
3. Si quelqu'un a 25 ans d'expérience, tu dois extraire toutes les expériences sur ces 25 ans
4. Lis le CV en ENTIER du début à la fin avant d'extraire les données
5. Si une information n'est pas trouvée, utilise null ou un tableau vide
6. Pour les compétences, normalise les noms (ex: "JS" → "JavaScript", "React.js" → "React")
7. Calcule les années d'expérience en additionnant les durées de TOUTES les expériences
8. Les dates doivent être au format ISO (YYYY-MM-DD) ou approximées au premier du mois/année
9. Pour les langues, indique le niveau si mentionné (ex: "Anglais:Courant")
10. Extrais aussi les missions freelance/consulting comme des expériences séparées

IMPORTANT: Ne tronque JAMAIS les expériences. Si le CV contient 15 expériences, retourne les 15.

COMPÉTENCES IT À DÉTECTER:
- Langages: Java, Python, JavaScript, TypeScript, C#, C++, Go, Rust, PHP, Ruby, Scala, Kotlin, Swift, etc.
- Frontend: React, Angular, Vue.js, Next.js, HTML, CSS, Tailwind, Bootstrap, jQuery, etc.
- Backend: Spring, Node.js, Express, NestJS, Django, FastAPI, .NET, Laravel, Symfony, etc.
- Base de données: PostgreSQL, MySQL, MongoDB, Redis, Oracle, SQL Server, Cassandra, etc.
- DevOps: Docker, Kubernetes, AWS, Azure, GCP, CI/CD, Jenkins, GitLab CI, Terraform, Ansible, etc.
- Autres: Git, Agile, Scrum, REST API, GraphQL, Microservices, SOAP, etc.
- Outils: Jira, Confluence, Slack, VS Code, IntelliJ, Eclipse, etc.`

  const userPrompt = `Analyse ce CV COMPLÈTEMENT et retourne TOUTES les informations en JSON.
IMPORTANT: Extrais CHAQUE expérience professionnelle, même les plus anciennes. Ne résume pas.

CONTENU DU CV:
---
${cvText}
---

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:
{
  "prenom": "string",
  "nom": "string",
  "email": "string | null",
  "telephone": "string | null",
  "titrePoste": "string | null (poste actuel ou dernier poste)",
  "bio": "string | null (résumé du profil si présent)",
  "competences": ["string (liste de TOUTES les compétences techniques)"],
  "anneesExperience": number (calculé à partir de la première expérience jusqu'à aujourd'hui),
  "experiences": [
    {
      "poste": "string",
      "entreprise": "string",
      "lieu": "string | null",
      "dateDebut": "YYYY-MM-DD",
      "dateFin": "YYYY-MM-DD | null (null si en cours)",
      "description": "string | null",
      "competences": ["string"]
    }
  ],
  "formations": [
    {
      "diplome": "string",
      "etablissement": "string | null",
      "annee": number | null
    }
  ],
  "langues": ["string"],
  "certifications": ["string"],
  "softSkills": ["string"],
  "linkedinUrl": "string | null",
  "githubUrl": "string | null"
}

RAPPEL: Extrais TOUTES les expériences du CV, pas seulement les plus récentes.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192, // Augmenté pour permettre plus d'expériences
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
