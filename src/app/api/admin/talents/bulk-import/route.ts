/**
 * API Admin - Import en Masse de CVs
 * Étape 1: Upload des CVs, parse, création des profils SANS envoi d'email
 * Les emails d'activation sont envoyés séparément via /api/admin/talents/send-activation
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { parseCV, extractTextFromFile } from '@/lib/cv-parser'
import { generateTalentCode } from '@/lib/utils'
import { classifyTalent } from '@/lib/category-classifier'
import crypto from 'crypto'

// Pour Next.js 14 App Router - timeout étendu pour traiter beaucoup de CVs
export const maxDuration = 300 // 5 minutes

interface ImportResult {
  filename: string
  success: boolean
  talent?: {
    id: number
    uid: string
    prenom: string
    nom: string
    email: string
    telephone: string | null
    titrePoste: string | null
    categorie: string
    competences: string[]
    anneesExperience: number | null
    langues: string[]
    certifications: string[]
    experiencesCount: number
    formationsCount: number
  }
  error?: string
}

// POST - Import en masse de CVs (sans envoi d'email)
export async function POST(request: NextRequest) {
  try {
    // Vérifier que l'API Anthropic est configurée
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY non configurée sur le serveur' },
        { status: 500 }
      )
    }

    await requireRole(['ADMIN'])

    const formData = await request.formData()

    // Offre cible (optionnelle maintenant)
    const offreId = formData.get('offreId')
    let offre = null

    if (offreId) {
      offre = await prisma.offre.findUnique({
        where: { id: parseInt(offreId as string) },
        include: { client: true }
      })

      if (!offre) {
        return NextResponse.json(
          { error: 'Offre non trouvée' },
          { status: 404 }
        )
      }
    }

    // Récupère les fichiers CV
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier CV fourni' },
        { status: 400 }
      )
    }

    const results: ImportResult[] = []

    // Traite chaque CV
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Lit et parse le CV en premier pour extraire l'email
        const cvBuffer = Buffer.from(await file.arrayBuffer())

        // Extrait le texte du fichier (supporte PDF et texte)
        const cvText = await extractTextFromFile(cvBuffer, file.name)

        if (!cvText || cvText.trim().length < 50) {
          results.push({
            filename: file.name,
            success: false,
            error: 'Impossible de lire le contenu du fichier. Verifiez que le PDF n\'est pas protege ou corrompu.'
          })
          continue
        }

        const parsedData = await parseCV(cvText)

        // Récupère l'email extrait du CV
        const email = parsedData.email?.toLowerCase()

        // Valide l'email
        if (!email || !email.includes('@')) {
          results.push({
            filename: file.name,
            success: false,
            error: 'Aucun email trouvé dans le CV. Vérifiez que l\'email est présent et lisible.'
          })
          continue
        }

        // Vérifie si l'email existe déjà
        const existingUser = await prisma.user.findUnique({
          where: { email }
        })

        if (existingUser) {
          // Si le talent existe déjà, on peut juste créer une candidature si une offre est sélectionnée
          const existingTalent = await prisma.talent.findUnique({
            where: { userId: existingUser.id },
            include: {
              _count: { select: { experiences: true, formations: true } }
            }
          })

          if (existingTalent) {
            if (offre) {
              // Vérifie si une candidature existe déjà pour cette offre
              const existingCandidature = await prisma.candidature.findUnique({
                where: {
                  offreId_talentId: {
                    offreId: offre.id,
                    talentId: existingTalent.id
                  }
                }
              })

              if (existingCandidature) {
                results.push({
                  filename: file.name,
                  success: false,
                  error: 'Candidature déjà existante pour cette offre'
                })
              } else {
                // Crée juste la candidature pour l'offre
                await prisma.candidature.create({
                  data: {
                    offreId: offre.id,
                    talentId: existingTalent.id,
                    statut: 'NOUVELLE',
                    notesTrinexta: 'Import en masse - talent existant'
                  }
                })

                await prisma.offre.update({
                  where: { id: offre.id },
                  data: { nbCandidatures: { increment: 1 } }
                })

                results.push({
                  filename: file.name,
                  success: true,
                  talent: {
                    id: existingTalent.id,
                    uid: existingTalent.uid,
                    prenom: existingTalent.prenom,
                    nom: existingTalent.nom,
                    email,
                    telephone: existingTalent.telephone,
                    titrePoste: existingTalent.titrePoste,
                    categorie: existingTalent.categorieProfessionnelle || 'AUTRE',
                    competences: existingTalent.competences,
                    anneesExperience: existingTalent.anneesExperience,
                    langues: existingTalent.langues,
                    certifications: existingTalent.certifications,
                    experiencesCount: existingTalent._count.experiences,
                    formationsCount: existingTalent._count.formations,
                  }
                })
              }
            } else {
              // Pas d'offre sélectionnée, talent existe déjà
              results.push({
                filename: file.name,
                success: false,
                error: `Talent déjà existant: ${existingTalent.prenom} ${existingTalent.nom}`
              })
            }
            continue
          }

          results.push({
            filename: file.name,
            success: false,
            error: 'Email déjà utilisé (compte non talent)'
          })
          continue
        }

        // Classifie automatiquement la catégorie
        const categorie = classifyTalent(parsedData.titrePoste, parsedData.competences)

        // Génère le token d'activation
        const activationToken = crypto.randomBytes(32).toString('hex')
        const activationTokenExpiry = new Date()
        activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 30) // 30 jours au lieu de 7

        // Crée l'utilisateur et le talent en transaction
        const result = await prisma.$transaction(async (tx) => {
          // Crée l'utilisateur (compte non activé, email non envoyé)
          const user = await tx.user.create({
            data: {
              email,
              passwordHash: null,
              role: 'TALENT',
              emailVerified: false,
              isActive: false, // Compte inactif jusqu'à activation
              activationToken,
              activationTokenExpiry,
              createdByAdmin: true,
            }
          })

          // Génère le code unique
          const codeUnique = await generateTalentCode()

          // Crée le talent
          const talent = await tx.talent.create({
            data: {
              userId: user.id,
              codeUnique,
              prenom: parsedData.prenom || 'Prénom',
              nom: parsedData.nom || 'Nom',
              telephone: parsedData.telephone,
              titrePoste: parsedData.titrePoste,
              categorieProfessionnelle: categorie,
              bio: parsedData.bio,
              competences: parsedData.competences,
              anneesExperience: parsedData.anneesExperience,
              certifications: parsedData.certifications,
              langues: parsedData.langues,
              softSkills: parsedData.softSkills,
              linkedinUrl: parsedData.linkedinUrl,
              githubUrl: parsedData.githubUrl,
              cvUrl: `/uploads/cv/${user.uid}_${file.name}`,
              cvOriginalName: file.name,
              cvParsedData: parsedData as object,
              importeParAdmin: true,
              compteLimite: true,
              compteComplet: false,
              // Nouveau champ pour indiquer que l'email n'a pas été envoyé
              activationEmailEnvoye: false,
            }
          })

          // Crée les expériences
          for (const exp of parsedData.experiences) {
            await tx.experience.create({
              data: {
                talentId: talent.id,
                poste: exp.poste,
                entreprise: exp.entreprise,
                lieu: exp.lieu,
                dateDebut: new Date(exp.dateDebut),
                dateFin: exp.dateFin ? new Date(exp.dateFin) : null,
                enCours: !exp.dateFin,
                description: exp.description,
                competences: exp.competences,
              }
            })
          }

          // Crée les formations
          for (const form of parsedData.formations) {
            await tx.formation.create({
              data: {
                talentId: talent.id,
                diplome: form.diplome,
                etablissement: form.etablissement,
                annee: form.annee,
              }
            })
          }

          // Si une offre est sélectionnée, crée la candidature
          if (offre) {
            await tx.candidature.create({
              data: {
                offreId: offre.id,
                talentId: talent.id,
                statut: 'NOUVELLE',
                notesTrinexta: `Import en masse - CV: ${file.name}`
              }
            })

            await tx.offre.update({
              where: { id: offre.id },
              data: { nbCandidatures: { increment: 1 } }
            })
          }

          // Log l'action
          await tx.auditLog.create({
            data: {
              action: 'BULK_IMPORT_CV',
              entite: 'Talent',
              entiteId: talent.id,
              details: {
                email,
                cvFile: file.name,
                offreId: offre?.id || null,
                offreTitre: offre?.titre || null,
                categorie,
                competencesParsees: parsedData.competences.length,
                emailEnvoye: false,
              }
            }
          })

          return { user, talent }
        })

        results.push({
          filename: file.name,
          success: true,
          talent: {
            id: result.talent.id,
            uid: result.talent.uid,
            prenom: result.talent.prenom,
            nom: result.talent.nom,
            email,
            telephone: result.talent.telephone,
            titrePoste: result.talent.titrePoste,
            categorie,
            competences: result.talent.competences,
            anneesExperience: result.talent.anneesExperience,
            langues: result.talent.langues,
            certifications: result.talent.certifications,
            experiencesCount: parsedData.experiences.length,
            formationsCount: parsedData.formations.length,
          }
        })

      } catch (error) {
        console.error(`Erreur import ${file.name}:`, error)
        results.push({
          filename: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur de traitement'
        })
      }
    }

    // Résumé
    const imported = results.filter(r => r.success).length
    const errors = results.filter(r => !r.success)

    return NextResponse.json({
      success: true,
      offre: offre ? {
        id: offre.id,
        titre: offre.titre,
        codeUnique: offre.codeUnique
      } : null,
      summary: {
        total: files.length,
        imported,
        failed: errors.length
      },
      results
    })

  } catch (error) {
    console.error('Erreur bulk import:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
