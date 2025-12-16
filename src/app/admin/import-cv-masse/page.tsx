'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Upload, ChevronLeft, FileText, CheckCircle, AlertCircle, X,
  Mail, Briefcase, Code, Loader2, Users, FolderUp, Trash2, Plus,
  Send, UserCheck, ArrowRight, Eye, Phone, Globe, Award, GraduationCap
} from 'lucide-react'

interface ImportedTalent {
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

interface CVFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  talent?: ImportedTalent
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

type Step = 'upload' | 'review' | 'done'

export default function ImportCVMassePage() {
  const [step, setStep] = useState<Step>('upload')
  const [offres, setOffres] = useState<Offre[]>([])
  const [selectedOffre, setSelectedOffre] = useState<number | null>(null)
  const [cvFiles, setCvFiles] = useState<CVFile[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingOffres, setLoadingOffres] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    total: number
    imported: number
    failed: number
  } | null>(null)

  // Pour l'étape de revue et envoi
  const [selectedTalents, setSelectedTalents] = useState<Set<number>>(new Set())
  const [sendingEmails, setSendingEmails] = useState(false)
  const [emailSendSummary, setEmailSendSummary] = useState<{
    total: number
    sent: number
    failed: number
    alreadySent: number
  } | null>(null)
  const [assignOffre, setAssignOffre] = useState<number | null>(null)

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
    e.target.value = ''
  }

  // Suppression d'un fichier
  const removeFile = (index: number) => {
    setCvFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Import en masse (Étape 1)
  const handleImport = async () => {
    const pendingFiles = cvFiles.filter(cv => cv.status === 'pending')
    if (pendingFiles.length === 0) {
      alert('Veuillez ajouter au moins un CV')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      if (selectedOffre) {
        formData.append('offreId', String(selectedOffre))
      }

      pendingFiles.forEach(cv => {
        formData.append('files', cv.file)
      })

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
        setCvFiles(prev => prev.map((cv, index) => {
          const result = data.results[index]
          if (result) {
            return {
              ...cv,
              status: result.success ? 'success' : 'error',
              error: result.error,
              talent: result.talent
            }
          }
          return cv
        }))

        setImportSummary(data.summary)

        // Passe à l'étape de revue si des profils ont été importés
        if (data.summary.imported > 0) {
          setStep('review')
          // Sélectionne tous les profils importés par défaut
          const importedIds = data.results
            .filter((r: { success: boolean; talent?: ImportedTalent }) => r.success && r.talent)
            .map((r: { talent: ImportedTalent }) => r.talent.id)
          setSelectedTalents(new Set(importedIds))
        }
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

  // Envoi des emails d'activation (Étape 2)
  const handleSendActivation = async () => {
    if (selectedTalents.size === 0) {
      alert('Veuillez sélectionner au moins un talent')
      return
    }

    setSendingEmails(true)

    try {
      const res = await fetch('/api/admin/talents/send-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          talentIds: Array.from(selectedTalents),
          offreId: assignOffre || undefined
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setEmailSendSummary(data.summary)
        setStep('done')
      } else {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (error) {
      console.error('Erreur envoi:', error)
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'envoi')
    } finally {
      setSendingEmails(false)
    }
  }

  // Toggle sélection d'un talent
  const toggleTalentSelection = (talentId: number) => {
    setSelectedTalents(prev => {
      const next = new Set(prev)
      if (next.has(talentId)) {
        next.delete(talentId)
      } else {
        next.add(talentId)
      }
      return next
    })
  }

  // Sélectionner/désélectionner tous
  const toggleSelectAll = () => {
    const importedTalents = cvFiles
      .filter(cv => cv.status === 'success' && cv.talent)
      .map(cv => cv.talent!.id)

    if (selectedTalents.size === importedTalents.length) {
      setSelectedTalents(new Set())
    } else {
      setSelectedTalents(new Set(importedTalents))
    }
  }

  // Reset pour nouvel import
  const handleReset = () => {
    setCvFiles([])
    setSelectedOffre(null)
    setSelectedTalents(new Set())
    setImportSummary(null)
    setEmailSendSummary(null)
    setAssignOffre(null)
    setStep('upload')
  }

  const importedTalents = cvFiles.filter(cv => cv.status === 'success' && cv.talent)
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

      {/* Indicateur d'étapes */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary font-semibold' : step === 'review' || step === 'done' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'upload' ? 'bg-primary text-white' : step === 'review' || step === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-200'}`}>
                {step === 'review' || step === 'done' ? <CheckCircle className="w-5 h-5" /> : '1'}
              </span>
              <span className="hidden sm:inline">Import des CVs</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary font-semibold' : step === 'done' ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'review' ? 'bg-primary text-white' : step === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-200'}`}>
                {step === 'done' ? <CheckCircle className="w-5 h-5" /> : '2'}
              </span>
              <span className="hidden sm:inline">Revue & Activation</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className={`flex items-center gap-2 ${step === 'done' ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'done' ? 'bg-green-100 text-green-600' : 'bg-gray-200'}`}>
                {step === 'done' ? <CheckCircle className="w-5 h-5" /> : '3'}
              </span>
              <span className="hidden sm:inline">Terminé</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ÉTAPE 1: UPLOAD */}
        {step === 'upload' && (
          <>
            {/* Sélection offre (optionnel) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  Offre cible (optionnel)
                </CardTitle>
                <CardDescription>
                  Vous pouvez associer les talents à une offre dès l'import, ou le faire plus tard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOffres ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                    <span className="text-gray-500">Chargement des offres...</span>
                  </div>
                ) : offres.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>Aucune offre publiée disponible</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedOffre(null)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${!selectedOffre
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                      Sans offre
                    </button>
                    {offres.map(offre => (
                      <button
                        key={offre.id}
                        onClick={() => setSelectedOffre(offre.id)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedOffre === offre.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                      >
                        {offre.titre}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload des CVs */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Ajouter les CVs
                </CardTitle>
                <CardDescription>
                  Glissez-déposez plusieurs CVs. L'email sera extrait automatiquement de chaque CV.
                </CardDescription>
              </CardHeader>
              <CardContent>
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

                {cvFiles.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {cvFiles.length} fichier{cvFiles.length > 1 ? 's' : ''} ajouté{cvFiles.length > 1 ? 's' : ''}
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setCvFiles([])}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Tout supprimer
                      </Button>
                    </div>

                    <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                      {cvFiles.map((cv, index) => (
                        <div key={index} className="p-3 flex items-center gap-3">
                          <FileText className="w-6 h-6 text-gray-400 flex-shrink-0" />
                          <span className="flex-1 truncate text-sm">{cv.file.name}</span>
                          <button
                            onClick={() => removeFile(index)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bouton import */}
            <div className="flex justify-end">
              <Button
                onClick={handleImport}
                disabled={pendingFilesCount === 0 || loading}
                size="lg"
                className="min-w-48"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer {pendingFilesCount} CV{pendingFilesCount > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* ÉTAPE 2: REVUE ET ACTIVATION */}
        {step === 'review' && (
          <>
            {/* Résumé import */}
            {importSummary && (
              <div className={`rounded-lg p-4 mb-6 ${importSummary.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center gap-3">
                  {importSummary.failed === 0 ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {importSummary.imported} profil{importSummary.imported > 1 ? 's' : ''} importé{importSummary.imported > 1 ? 's' : ''} avec succès
                    </p>
                    {importSummary.failed > 0 && (
                      <p className="text-sm text-amber-600">
                        {importSummary.failed} échec{importSummary.failed > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Liste des profils importés */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      Profils importés
                    </CardTitle>
                    <CardDescription>
                      Sélectionnez les profils auxquels envoyer l'email d'activation
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedTalents.size === importedTalents.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {importedTalents.map(({ talent }) => {
                    if (!talent) return null
                    const isSelected = selectedTalents.has(talent.id)

                    return (
                      <div
                        key={talent.id}
                        onClick={() => toggleTalentSelection(talent.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                            {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>

                          {/* Infos talent */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {talent.prenom} {talent.nom}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                {CATEGORY_LABELS[talent.categorie] || talent.categorie}
                              </Badge>
                            </div>

                            {talent.titrePoste && (
                              <p className="text-primary font-medium text-sm mb-2">{talent.titrePoste}</p>
                            )}

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {talent.email}
                              </span>
                              {talent.telephone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-4 h-4" />
                                  {talent.telephone}
                                </span>
                              )}
                              {talent.anneesExperience && (
                                <span className="flex items-center gap-1">
                                  <Briefcase className="w-4 h-4" />
                                  {talent.anneesExperience} ans d'exp.
                                </span>
                              )}
                              {talent.experiencesCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Code className="w-4 h-4" />
                                  {talent.experiencesCount} expérience{talent.experiencesCount > 1 ? 's' : ''}
                                </span>
                              )}
                              {talent.formationsCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="w-4 h-4" />
                                  {talent.formationsCount} formation{talent.formationsCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>

                            {/* Compétences */}
                            {talent.competences.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {talent.competences.slice(0, 8).map((comp, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                                {talent.competences.length > 8 && (
                                  <Badge variant="outline" className="text-xs bg-gray-100">
                                    +{talent.competences.length - 8}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Langues et certifications */}
                            <div className="flex flex-wrap gap-2">
                              {talent.langues.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Globe className="w-3 h-3" />
                                  {talent.langues.join(', ')}
                                </div>
                              )}
                              {talent.certifications.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Award className="w-3 h-3" />
                                  {talent.certifications.slice(0, 3).join(', ')}
                                  {talent.certifications.length > 3 && ` +${talent.certifications.length - 3}`}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Bouton voir profil */}
                          <Link
                            href={`/admin/talents/${talent.uid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-primary p-2"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Erreurs d'import */}
                {cvFiles.filter(cv => cv.status === 'error').length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Échecs d'import
                    </h4>
                    <div className="space-y-2">
                      {cvFiles.filter(cv => cv.status === 'error').map((cv, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{cv.file.name}</span>
                          <span className="text-red-500">- {cv.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Options d'envoi */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Options d'envoi
                </CardTitle>
                <CardDescription>
                  Choisissez si vous souhaitez associer les talents à une offre lors de l'activation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setAssignOffre(null)}
                      className={`px-4 py-2 rounded-lg text-sm transition-all ${!assignOffre
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                    >
                      Activer sans offre
                    </button>
                    {offres.map(offre => (
                      <button
                        key={offre.id}
                        onClick={() => setAssignOffre(offre.id)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${assignOffre === offre.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                      >
                        {offre.titre}
                      </button>
                    ))}
                  </div>
                  {assignOffre && (
                    <p className="text-sm text-gray-500">
                      Les talents sélectionnés seront associés à cette offre et recevront un email mentionnant la mission.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="flex gap-3">
                <Link href="/admin/talents">
                  <Button variant="outline">
                    Terminer sans envoyer
                  </Button>
                </Link>
                <Button
                  onClick={handleSendActivation}
                  disabled={selectedTalents.size === 0 || sendingEmails}
                  size="lg"
                  className="min-w-48"
                >
                  {sendingEmails ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer à {selectedTalents.size} talent{selectedTalents.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 3: TERMINÉ */}
        {step === 'done' && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Import terminé avec succès !
              </h2>
              {emailSendSummary && (
                <div className="text-gray-600 mb-6 space-y-1">
                  <p><strong>{emailSendSummary.sent}</strong> email{emailSendSummary.sent > 1 ? 's' : ''} d'activation envoyé{emailSendSummary.sent > 1 ? 's' : ''}</p>
                  {emailSendSummary.failed > 0 && (
                    <p className="text-red-500">{emailSendSummary.failed} échec{emailSendSummary.failed > 1 ? 's' : ''} d'envoi</p>
                  )}
                  {emailSendSummary.alreadySent > 0 && (
                    <p className="text-amber-500">{emailSendSummary.alreadySent} déjà envoyé{emailSendSummary.alreadySent > 1 ? 's' : ''}</p>
                  )}
                </div>
              )}
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel import
                </Button>
                <Link href="/admin/talents">
                  <Button>
                    <Users className="w-4 h-4 mr-2" />
                    Voir les talents
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {step === 'upload' && (
          <Card className="mt-8">
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
                      <p className="font-medium text-gray-900">Création des profils</p>
                      <p className="text-sm text-gray-500">
                        Les comptes sont créés automatiquement (sans envoi d'email)
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
                      <p className="font-medium text-gray-900">Revue des profils</p>
                      <p className="text-sm text-gray-500">
                        Vérifiez les informations extraites avant d'envoyer les emails
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Activation sélective</p>
                      <p className="text-sm text-gray-500">
                        Envoyez l'email d'activation aux profils sélectionnés uniquement
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
