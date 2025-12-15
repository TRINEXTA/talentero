/**
 * API Admin - Import en Masse de CVs
 * Upload multiple CVs, parse, create accounts, assign to offer
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'
import { parseCV } from '@/lib/cv-parser'
import { sendCandidatureWelcomeEmail } from '@/lib/microsoft-graph'
import { generateTalentCode } from '@/lib/utils'
import { classifyTalent } from '@/lib/category-classifier'
import crypto from 'crypto'

interface ImportResult {
  filename: string
  success: boolean
  talent?: {
    uid: string
    prenom: string
    nom: string
    email: string
    categorie: string
    competences: string[]
  }
  error?: string
}

// POST - Import en masse de CVs
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])

    const formData = await request.formData()

    // Récupère l'offre cible (obligatoire)
    const offreId = formData.get('offreId')
    if (!offreId) {
      return NextResponse.json(
        { error: 'Veuillez sélectionner une offre' },
        { status: 400 }
      )
    }

    // Vérifie que l'offre existe
    const offre = await prisma.offre.findUnique({
      where: { id: parseInt(offreId as string) },
      include: { client: true }
    })

    if (!offre) {
      return NextResponse.json(
        { error: 'Offre non trouvée' },
        { status: 404 }
      )
    }

    // Récupère les fichiers CV
    const files = formData.getAll('files') as File[]
    const sendEmails = formData.get('sendEmails') !== 'false'

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
        const cvText = cvBuffer.toString('utf-8')
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
          // Si le talent existe déjà, on peut juste créer une candidature
          const existingTalent = await prisma.talent.findUnique({
            where: { userId: existingUser.id }
          })

          if (existingTalent) {
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

              results.push({
                filename: file.name,
                success: true,
                talent: {
                  uid: existingTalent.uid,
                  prenom: existingTalent.prenom,
                  nom: existingTalent.nom,
                  email,
                  categorie: existingTalent.categorieProfessionnelle || 'AUTRE',
                  competences: existingTalent.competences
                }
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

        // Classifie automatiquement la catégorie (parsedData est déjà disponible)
        const categorie = classifyTalent(parsedData.titrePoste, parsedData.competences)

        // Génère le token d'activation
        const activationToken = crypto.randomBytes(32).toString('hex')
        const activationTokenExpiry = new Date()
        activationTokenExpiry.setDate(activationTokenExpiry.getDate() + 7)

        // Crée l'utilisateur et le talent en transaction
        const result = await prisma.$transaction(async (tx) => {
          // Crée l'utilisateur
          const user = await tx.user.create({
            data: {
              email,
              passwordHash: null,
              role: 'TALENT',
              emailVerified: false,
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

          // Crée la candidature pour l'offre
          const candidature = await tx.candidature.create({
            data: {
              offreId: offre.id,
              talentId: talent.id,
              statut: 'NOUVELLE',
              notesTrinexta: `Import en masse - CV: ${file.name}`
            }
          })

          // Incrémente le compteur de candidatures
          await tx.offre.update({
            where: { id: offre.id },
            data: { nbCandidatures: { increment: 1 } }
          })

          // Log l'action
          await tx.auditLog.create({
            data: {
              action: 'BULK_IMPORT_CV',
              entite: 'Talent',
              entiteId: talent.id,
              details: {
                email,
                cvFile: file.name,
                offreId: offre.id,
                offreTitre: offre.titre,
                categorie,
                competencesParsees: parsedData.competences.length,
              }
            }
          })

          return { user, talent, candidature }
        })

        // Envoie l'email de bienvenue personnalisé
        if (sendEmails) {
          try {
            await sendCandidatureWelcomeEmail(
              email,
              parsedData.prenom || 'Futur talent',
              offre.titre,
              offre.slug,
              activationToken
            )
          } catch (emailError) {
            console.error('Erreur envoi email:', emailError)
            // On ne fait pas échouer l'import si l'email échoue
          }
        }

        results.push({
          filename: file.name,
          success: true,
          talent: {
            uid: result.talent.uid,
            prenom: result.talent.prenom,
            nom: result.talent.nom,
            email,
            categorie,
            competences: result.talent.competences
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
      offre: {
        id: offre.id,
        titre: offre.titre,
        codeUnique: offre.codeUnique
      },
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
