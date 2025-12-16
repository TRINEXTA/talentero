'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload, ChevronLeft, FileText, CheckCircle, AlertCircle, X,
  Mail, Briefcase, Code, Loader2, Users, FolderUp, Trash2, Plus
} from 'lucide-react'

interface CVFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  result?: {
    prenom: string
    nom: string
    email: string
    categorie: string
    competences: string[]
  }
}

interface Offre {
  id: number
  uid: string
  codeUnique: string
  titre: string
  statut: string
}

const CATEGORY_LABELS: Record<string, string> = {
  DEVELOPPEUR: 'Développeur',
  CHEF_DE_PROJET: 'Chef de Projet',
  SUPPORT_TECHNICIEN: 'Technicien Support',
  TECHNICIEN_HELPDESK_N1: 'Technicien Helpdesk N1',
  TECHNICIEN_HELPDESK_N2: 'Technicien Helpdesk N2',
  INGENIEUR_SYSTEME_RESEAU: 'Ingénieur Système & Réseau',
  INGENIEUR_CLOUD: 'Ingénieur Cloud',
  DATA_BI: 'Data / BI',
  DEVOPS_SRE: 'DevOps / SRE',
  CYBERSECURITE: 'Cybersécurité',
  CONSULTANT_FONCTIONNEL: 'Consultant Fonctionnel',
  ARCHITECTE: 'Architecte',
  SCRUM_MASTER: 'Scrum Master',
  PRODUCT_OWNER: 'Product Owner',
  AUTRE: 'Autre'
}

export default function ImportCVMassePage() {
  const [offres, setOffres] = useState<Offre[]>([])
  const [selectedOffre, setSelectedOffre] = useState<number | null>(null)
  const [cvFiles, setCvFiles] = useState<CVFile[]>([])
  const [sendEmails, setSendEmails] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingOffres, setLoadingOffres] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [importComplete, setImportComplete] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    total: number
    imported: number
    failed: number
  } | null>(null)

  // Charge les offres au démarrage
  useEffect(() => {
    async function loadOffres() {
      try {
        const res = await fetch('/api/admin/offres?statut=PUBLIEE&limit=100')
        const data = await res.json()
        if (data.offres) {
          setOffres(data.offres)
        }
      } catch (error) {
        console.error('Erreur chargement offres:', error)
      } finally {
        setLoadingOffres(false)
      }
    }
    loadOffres()
  }, [])

  // Gestion du drag & drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' ||
        file.name.endsWith('.docx') ||
        file.name.endsWith('.doc')
    )

    if (files.length > 0) {
      const newCvFiles: CVFile[] = files.map(file => ({
        file,
        status: 'pending'
      }))
      setCvFiles(prev => [...prev, ...newCvFiles])
    }
  }, [])

  // Sélection de fichiers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newCvFiles: CVFile[] = Array.from(files).map(file => ({
        file,
        status: 'pending'
      }))
      setCvFiles(prev => [...prev, ...newCvFiles])
    }
    // Reset input
    e.target.value = ''
  }

  // Suppression d'un fichier
  const removeFile = (index: number) => {
    setCvFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Import en masse
  const handleImport = async () => {
    if (!selectedOffre) {
      alert('Veuillez sélectionner une offre')
      return
    }

    const pendingFiles = cvFiles.filter(cv => cv.status === 'pending')
    if (pendingFiles.length === 0) {
      alert('Veuillez ajouter au moins un CV')
      return
    }

    setLoading(true)
    setImportComplete(false)

    try {
      const formData = new FormData()
      formData.append('offreId', String(selectedOffre))
      formData.append('sendEmails', String(sendEmails))

      // Ajoute les fichiers (l'email sera extrait automatiquement du CV)
      pendingFiles.forEach(cv => {
        formData.append('files', cv.file)
      })

      // Met à jour le statut des fichiers en cours d'upload
      setCvFiles(prev => prev.map(cv =>
        pendingFiles.includes(cv)
          ? { ...cv, status: 'uploading' }
          : cv
      ))

      const res = await fetch('/api/admin/talents/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Met à jour les résultats
        setCvFiles(prev => prev.map((cv, index) => {
          const result = data.results[index]
          if (result) {
            return {
              ...cv,
              status: result.success ? 'success' : 'error',
              error: result.error,
              result: result.talent
            }
          }
          return cv
        }))

        setImportSummary(data.summary)
        setImportComplete(true)
      } else {
        throw new Error(data.error || 'Erreur lors de l\'import')
      }
    } catch (error) {
      console.error('Erreur import:', error)
      setCvFiles(prev => prev.map(cv => ({
        ...cv,
        status: cv.status === 'uploading' ? 'error' : cv.status,
        error: error instanceof Error ? error.message : 'Erreur'
      })))
    } finally {
      setLoading(false)
    }
  }

  // Reset pour nouvel import
  const handleReset = () => {
    setCvFiles([])
    setImportComplete(false)
    setImportSummary(null)
  }

  const selectedOffreData = offres.find(o => o.id === selectedOffre)
  const pendingFilesCount = cvFiles.filter(cv => cv.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/admin/talents" className="text-gray-500 hover:text-gray-700 mr-4">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FolderUp className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-gray-900">Import en Masse</h1>
            </div>
            <Badge variant="secondary" className="ml-3">
              {cvFiles.length} CV{cvFiles.length > 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Étape 1: Sélection de l'offre */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">1</span>
              Sélectionnez l'offre cible
            </CardTitle>
            <CardDescription>
              Tous les CVs importés seront associés à cette offre comme candidatures.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingOffres ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-gray-500">Chargement des offres...</span>
              </div>
            ) : offres.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune offre publiée disponible</p>
                <Link href="/admin/offres/nouvelle">
                  <Button variant="outline" className="mt-3">
                    Créer une offre
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {offres.map(offre => (
                  <button
                    key={offre.id}
                    onClick={() => setSelectedOffre(offre.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${selectedOffre === offre.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1">{offre.titre}</p>
                        <p className="text-sm text-gray-500">{offre.codeUnique}</p>
                      </div>
                      {selectedOffre === offre.id && (
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 2: Upload des CVs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">2</span>
              Ajoutez les CVs
            </CardTitle>
            <CardDescription>
              Glissez-déposez plusieurs CVs ou sélectionnez-les. L'email sera extrait automatiquement de chaque CV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Zone de drop */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Glissez-déposez vos CVs ici ou
              </p>
              <label className="cursor-pointer">
                <span className="text-primary hover:text-primary/80 font-medium">
                  parcourez vos fichiers
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                Formats acceptés : PDF, DOCX, DOC
              </p>
            </div>

            {/* Liste des fichiers */}
            {cvFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {cvFiles.length} fichier{cvFiles.length > 1 ? 's' : ''} ajouté{cvFiles.length > 1 ? 's' : ''}
                  </h3>
                  {!importComplete && (
                    <Button variant="ghost" size="sm" onClick={() => setCvFiles([])}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Tout supprimer
                    </Button>
                  )}
                </div>

                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {cvFiles.map((cv, index) => (
                    <div key={index} className="p-4 flex items-center gap-4">
                      {/* Icône statut */}
                      <div className="flex-shrink-0">
                        {cv.status === 'pending' && (
                          <FileText className="w-8 h-8 text-gray-400" />
                        )}
                        {cv.status === 'uploading' && (
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        )}
                        {cv.status === 'success' && (
                          <CheckCircle className="w-8 h-8 text-green-500" />
                        )}
                        {cv.status === 'error' && (
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        )}
                      </div>

                      {/* Info fichier */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{cv.file.name}</p>
                        {cv.status === 'pending' && (
                          <p className="text-xs text-gray-400 mt-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            L'email sera extrait automatiquement
                          </p>
                        )}
                        {cv.status === 'uploading' && (
                          <p className="text-xs text-primary mt-1">
                            Analyse du CV en cours...
                          </p>
                        )}
                        {cv.status === 'success' && cv.result && (
                          <div className="mt-1">
                            <p className="text-sm text-green-600">
                              {cv.result.prenom} {cv.result.nom}
                              <span className="text-gray-500 ml-2">({cv.result.email})</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {CATEGORY_LABELS[cv.result.categorie] || cv.result.categorie}
                              </Badge>
                            </p>
                            {cv.result.competences.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {cv.result.competences.slice(0, 5).map((comp, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                                {cv.result.competences.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{cv.result.competences.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {cv.status === 'error' && (
                          <p className="text-sm text-red-600">{cv.error}</p>
                        )}
                      </div>

                      {/* Bouton supprimer */}
                      {cv.status === 'pending' && (
                        <button
                          onClick={() => removeFile(index)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Étape 3: Options et lancement */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">3</span>
              Lancez l'import
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Options */}
            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmails}
                  onChange={(e) => setSendEmails(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Envoyer les emails de bienvenue immédiatement
                </span>
              </label>
            </div>

            {/* Résumé */}
            {selectedOffreData && cvFiles.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Résumé de l'import</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Offre : <strong>{selectedOffreData.titre}</strong> ({selectedOffreData.codeUnique})
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {pendingFilesCount} CV{pendingFilesCount > 1 ? 's' : ''} prêt{pendingFilesCount > 1 ? 's' : ''} à importer
                  </li>
                  {sendEmails && (
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Emails de bienvenue : activés
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Résultat de l'import */}
            {importComplete && importSummary && (
              <div className={`rounded-lg p-4 mb-6 ${importSummary.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                <div className="flex items-center gap-3">
                  {importSummary.failed === 0 ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Import terminé !
                    </h4>
                    <p className="text-sm text-gray-600">
                      {importSummary.imported} importé{importSummary.imported > 1 ? 's' : ''} sur {importSummary.total}
                      {importSummary.failed > 0 && (
                        <span className="text-amber-600"> ({importSummary.failed} erreur{importSummary.failed > 1 ? 's' : ''})</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-3">
              {importComplete ? (
                <>
                  <Button variant="outline" onClick={handleReset}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvel import
                  </Button>
                  <Link href="/admin/talents">
                    <Button>
                      Voir les talents
                    </Button>
                  </Link>
                </>
              ) : (
                <Button
                  onClick={handleImport}
                  disabled={!selectedOffre || pendingFilesCount === 0 || loading}
                  className="min-w-40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer {pendingFilesCount} CV{pendingFilesCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comment fonctionne l'import en masse ?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Parsing automatique</p>
                    <p className="text-sm text-gray-500">
                      Chaque CV est analysé par l'IA pour extraire nom, compétences, expériences
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Classification automatique</p>
                    <p className="text-sm text-gray-500">
                      Le talent est classé automatiquement (Dev, Tech, Ingénieur, etc.)
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Création du compte</p>
                    <p className="text-sm text-gray-500">
                      Un compte est créé avec candidature liée à l'offre sélectionnée
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Email personnalisé</p>
                    <p className="text-sm text-gray-500">
                      Le talent reçoit un email l'invitant à activer son compte
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
