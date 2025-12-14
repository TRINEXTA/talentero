'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Upload, ChevronLeft, FileText, CheckCircle, AlertCircle,
  Mail, User, Briefcase, Code, Loader2
} from 'lucide-react'

interface ImportResult {
  success: boolean
  talent?: {
    uid: string
    prenom: string
    nom: string
    email: string
    competences: string[]
    anneesExperience: number
    activationSent: boolean
  }
  error?: string
}

export default function ImportCVPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sendActivation, setSendActivation] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.txt'))) {
      setFile(droppedFile)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !email) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('cv', file)
      formData.append('email', email)
      formData.append('sendActivation', String(sendActivation))

      const res = await fetch('/api/admin/talents', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, talent: data.talent })
        // Reset form
        setEmail('')
        setFile(null)
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (error) {
      setResult({ success: false, error: 'Erreur lors de l\'import' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/admin/talents" className="text-gray-500 hover:text-gray-700 mr-4">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Upload className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-semibold text-gray-900">Import CV</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulaire d'import */}
          <Card>
            <CardHeader>
              <CardTitle>Importer un CV</CardTitle>
              <CardDescription>
                Créez un compte talent pré-rempli à partir d'un CV.
                Les informations seront extraites automatiquement par l'IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email du talent *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="talent@exemple.com"
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Un email d'activation sera envoyé à cette adresse
                  </p>
                </div>

                {/* Upload CV */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier CV *
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-10 h-10 text-primary" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(1)} Ko
                          </p>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">
                          Glissez-déposez un CV ici ou
                        </p>
                        <label className="cursor-pointer">
                          <span className="text-primary hover:text-primary/80 font-medium">
                            parcourez vos fichiers
                          </span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-400 mt-2">
                          Formats acceptés : PDF, DOCX, TXT
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendActivation"
                    checked={sendActivation}
                    onChange={(e) => setSendActivation(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="sendActivation" className="text-sm text-gray-700">
                    Envoyer l'email d'activation immédiatement
                  </label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!file || !email || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse du CV en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer le CV
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Résultat */}
          <div className="space-y-6">
            {result && (
              <Card className={result.success ? 'border-green-200' : 'border-red-200'}>
                <CardContent className="pt-6">
                  {result.success && result.talent ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-green-600">
                        <CheckCircle className="w-8 h-8" />
                        <div>
                          <p className="font-semibold">Import réussi !</p>
                          <p className="text-sm text-gray-600">
                            Le compte a été créé avec succès
                          </p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {result.talent.prenom} {result.talent.nom}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{result.talent.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {result.talent.anneesExperience} ans d'expérience
                          </span>
                        </div>

                        {result.talent.competences.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500">
                                Compétences extraites :
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.talent.competences.slice(0, 10).map((comp, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {comp}
                                </Badge>
                              ))}
                              {result.talent.competences.length > 10 && (
                                <Badge variant="outline" className="text-xs">
                                  +{result.talent.competences.length - 10}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {result.talent.activationSent && (
                          <div className="flex items-center gap-2 text-sm text-green-600 pt-2 border-t">
                            <Mail className="w-4 h-4" />
                            Email d'activation envoyé
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Link href={`/admin/talents/${result.talent.uid}`} className="flex-1">
                          <Button variant="outline" className="w-full">
                            Voir le profil
                          </Button>
                        </Link>
                        <Button
                          onClick={() => setResult(null)}
                          className="flex-1"
                        >
                          Nouvel import
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-red-600">
                      <AlertCircle className="w-8 h-8" />
                      <div>
                        <p className="font-semibold">Erreur lors de l'import</p>
                        <p className="text-sm">{result.error}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comment ça marche ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Uploadez le CV</p>
                    <p className="text-sm text-gray-500">
                      Le fichier est analysé par notre IA (Claude)
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Extraction automatique</p>
                    <p className="text-sm text-gray-500">
                      Nom, compétences, expériences, formations, langues...
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Compte pré-créé</p>
                    <p className="text-sm text-gray-500">
                      Le talent reçoit un email pour activer son compte et compléter ses informations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Compte limité</p>
                    <p className="text-sm text-gray-500">
                      Les comptes importés sont créés en mode "limité" (sans SIRET).
                      Le talent devra compléter ses informations administratives lors de l'activation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
