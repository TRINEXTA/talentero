'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import {
  CheckCircle, User, Building2, Briefcase, ArrowRight, ArrowLeft,
  Loader2, MapPin, Phone, Globe, AlertCircle, Calendar
} from 'lucide-react'

interface TalentProfile {
  prenom: string
  nom: string
  telephone: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  siret: string | null
  typeSociete: string | null
  raisonAbsenceSiret: string | null
  dateCreationSocietePrevue: string | null
  societePortage: string | null
  competences: string[]
  tjm: number | null
  tjmMin: number | null
  tjmMax: number | null
  mobilite: string
  disponibilite: string
  compteLimite: boolean
  compteComplet: boolean
}

const STEPS = [
  { id: 1, title: 'Informations personnelles', icon: User },
  { id: 2, title: 'Situation entreprise', icon: Building2 },
  { id: 3, title: 'Profil professionnel', icon: Briefcase },
]

const TYPE_SOCIETE_OPTIONS = [
  { value: 'AUTO_ENTREPRENEUR', label: 'Auto-entrepreneur / Micro-entreprise' },
  { value: 'EURL', label: 'EURL' },
  { value: 'SASU', label: 'SASU' },
  { value: 'SARL', label: 'SARL' },
  { value: 'SAS', label: 'SAS' },
  { value: 'PORTAGE', label: 'Portage salarial' },
  { value: 'AUTRE', label: 'Autre' },
]

const SOCIETES_PORTAGE = [
  { value: 'itg', label: 'ITG (Institut du Temps Géré)' },
  { value: 'admissions', label: "AD'Missions" },
  { value: 'portageo', label: 'Portageo' },
  { value: 'webportage', label: 'Webportage' },
  { value: 'jump', label: 'Jump' },
  { value: 'umalis', label: 'Umalis' },
  { value: 'cadresenmission', label: 'Cadres en Mission' },
  { value: 'freelancecom', label: 'Freelance.com' },
  { value: 'autre', label: 'Autre société de portage' },
]

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride (2-3 jours sur site)' },
  { value: 'SUR_SITE', label: 'Sur site uniquement' },
  { value: 'FLEXIBLE', label: 'Flexible (selon mission)' },
]

const DISPONIBILITE_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immédiate' },
  { value: 'SOUS_15_JOURS', label: 'Sous 15 jours' },
  { value: 'SOUS_1_MOIS', label: 'Sous 1 mois' },
  { value: 'SOUS_2_MOIS', label: 'Sous 2 mois' },
  { value: 'SOUS_3_MOIS', label: 'Sous 3 mois' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<TalentProfile | null>(null)

  // Formulaire étape 1
  const [telephone, setTelephone] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')

  // Formulaire étape 2
  const [hasSiret, setHasSiret] = useState<'yes' | 'no' | 'portage' | null>(null)
  const [siret, setSiret] = useState('')
  const [typeSociete, setTypeSociete] = useState('')
  const [raisonAbsenceSiret, setRaisonAbsenceSiret] = useState('')
  const [dateCreationPrevue, setDateCreationPrevue] = useState('')
  const [societePortage, setSocietePortage] = useState('')

  // Formulaire étape 3
  const [tjm, setTjm] = useState('')
  const [tjmMin, setTjmMin] = useState('')
  const [tjmMax, setTjmMax] = useState('')
  const [mobilite, setMobilite] = useState('')
  const [disponibilite, setDisponibilite] = useState('')

  // Charge le profil au démarrage
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/talent/profile')
        if (!res.ok) {
          router.push('/t/connexion')
          return
        }
        const data = await res.json()
        setProfile(data.talent)

        // Pré-remplit les champs si déjà renseignés
        if (data.talent) {
          setTelephone(data.talent.telephone || '')
          setAdresse(data.talent.adresse || '')
          setCodePostal(data.talent.codePostal || '')
          setVille(data.talent.ville || '')
          setSiret(data.talent.siret || '')
          setTypeSociete(data.talent.typeSociete || '')
          setTjm(data.talent.tjm?.toString() || '')
          setTjmMin(data.talent.tjmMin?.toString() || '')
          setTjmMax(data.talent.tjmMax?.toString() || '')
          setMobilite(data.talent.mobilite || '')
          setDisponibilite(data.talent.disponibilite || '')
          setSocietePortage(data.talent.societePortage || '')

          if (data.talent.siret) {
            setHasSiret('yes')
          } else if (data.talent.raisonAbsenceSiret === 'PORTAGE_SALARIAL') {
            setHasSiret('portage')
          } else if (data.talent.raisonAbsenceSiret) {
            setHasSiret('no')
            setRaisonAbsenceSiret(data.talent.raisonAbsenceSiret)
          }
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [router])

  const handleSaveStep = async () => {
    setError('')
    setSaving(true)

    try {
      const updates: Record<string, unknown> = {}

      if (currentStep === 1) {
        updates.telephone = telephone || null
        updates.adresse = adresse || null
        updates.codePostal = codePostal || null
        updates.ville = ville || null
      }

      if (currentStep === 2) {
        if (hasSiret === 'yes') {
          updates.siret = siret || null
          updates.typeSociete = typeSociete || null
          updates.raisonAbsenceSiret = null
          updates.compteLimite = !siret
        } else if (hasSiret === 'portage') {
          updates.siret = null
          updates.typeSociete = 'PORTAGE'
          updates.raisonAbsenceSiret = 'PORTAGE_SALARIAL'
          updates.societePortage = societePortage || null
          updates.compteLimite = false // Le portage compte comme "complet"
        } else if (hasSiret === 'no') {
          updates.siret = null
          updates.typeSociete = typeSociete || null
          updates.raisonAbsenceSiret = raisonAbsenceSiret || 'EN_COURS_CREATION'
          updates.dateCreationSocietePrevue = dateCreationPrevue ? new Date(dateCreationPrevue).toISOString() : null
          updates.compteLimite = true
        }
      }

      if (currentStep === 3) {
        updates.tjm = tjm ? parseInt(tjm) : null
        updates.tjmMin = tjmMin ? parseInt(tjmMin) : null
        updates.tjmMax = tjmMax ? parseInt(tjmMax) : null
        updates.mobilite = mobilite || 'FLEXIBLE'
        updates.disponibilite = disponibilite || 'IMMEDIATE'
        updates.compteComplet = true
      }

      const res = await fetch('/api/talent/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur de sauvegarde')
      }

      // Passe à l'étape suivante ou termine
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1)
      } else {
        // Onboarding terminé, redirige vers le dashboard
        router.push('/t/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <Logo showText />
            <Link href="/t/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
              Passer cette étape
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep > step.id
                    ? 'bg-green-500 border-green-500 text-white'
                    : currentStep === step.id
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-24 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            {STEPS.map(step => (
              <span key={step.id} className={`${
                currentStep === step.id ? 'text-primary font-medium' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Bienvenue */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              Bienvenue {profile.prenom} !
            </CardTitle>
            <CardDescription>
              Complétez votre profil pour accéder à toutes les fonctionnalités de Talentero.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Étape 1: Informations personnelles */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Ces informations nous permettront de vous contacter et de faciliter vos missions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <Input
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Numéro et rue"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal
                  </label>
                  <Input
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    placeholder="75001"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <Input
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    placeholder="Paris"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Situation entreprise */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Situation entreprise
              </CardTitle>
              <CardDescription>
                Indiquez votre statut administratif pour les missions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Choix principal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Avez-vous déjà une société ?
                </label>
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setHasSiret('yes')}
                    className={`p-4 text-left rounded-lg border-2 transition-all ${
                      hasSiret === 'yes'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Oui, j'ai un SIRET</p>
                    <p className="text-sm text-gray-500">Je suis déjà immatriculé</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasSiret('portage')}
                    className={`p-4 text-left rounded-lg border-2 transition-all ${
                      hasSiret === 'portage'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Je suis en portage salarial</p>
                    <p className="text-sm text-gray-500">Je facture via une société de portage</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasSiret('no')}
                    className={`p-4 text-left rounded-lg border-2 transition-all ${
                      hasSiret === 'no'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">Non, pas encore</p>
                    <p className="text-sm text-gray-500">Je vais créer ma société prochainement</p>
                  </button>
                </div>
              </div>

              {/* Formulaire selon le choix */}
              {hasSiret === 'yes' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro SIRET
                    </label>
                    <Input
                      value={siret}
                      onChange={(e) => setSiret(e.target.value.replace(/\s/g, ''))}
                      placeholder="123 456 789 00012"
                      maxLength={14}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      14 chiffres, sans espaces
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de société
                    </label>
                    <select
                      value={typeSociete}
                      onChange={(e) => setTypeSociete(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Sélectionnez...</option>
                      {TYPE_SOCIETE_OPTIONS.filter(o => o.value !== 'PORTAGE').map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {hasSiret === 'portage' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Société de portage
                    </label>
                    <select
                      value={societePortage}
                      onChange={(e) => setSocietePortage(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Sélectionnez...</option>
                      {SOCIETES_PORTAGE.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Le portage salarial vous permet de facturer sans créer de société.
                    </p>
                  </div>
                </div>
              )}

              {hasSiret === 'no' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type de société envisagé
                    </label>
                    <select
                      value={typeSociete}
                      onChange={(e) => setTypeSociete(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Sélectionnez...</option>
                      {TYPE_SOCIETE_OPTIONS.filter(o => o.value !== 'PORTAGE').map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date de création prévue
                    </label>
                    <Input
                      type="date"
                      value={dateCreationPrevue}
                      onChange={(e) => setDateCreationPrevue(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum 3 mois à compter d'aujourd'hui
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Votre compte sera en mode "limité" jusqu'à l'obtention de votre SIRET.
                      Vous pourrez tout de même postuler aux missions.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Étape 3: Profil professionnel */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Profil professionnel
              </CardTitle>
              <CardDescription>
                Définissez vos conditions de travail pour un meilleur matching avec les missions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Compétences (lecture seule) */}
              {profile.competences.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compétences détectées
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profile.competences.slice(0, 10).map((comp, i) => (
                      <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {comp}
                      </span>
                    ))}
                    {profile.competences.length > 10 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        +{profile.competences.length - 10}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Vous pourrez modifier vos compétences depuis votre profil.
                  </p>
                </div>
              )}

              {/* TJM */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TJM (Taux Journalier Moyen)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Minimum</p>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tjmMin}
                        onChange={(e) => setTjmMin(e.target.value)}
                        placeholder="350"
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Souhaité</p>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tjm}
                        onChange={(e) => setTjm(e.target.value)}
                        placeholder="450"
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Maximum</p>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tjmMax}
                        onChange={(e) => setTjmMax(e.target.value)}
                        placeholder="550"
                        min={0}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobilité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Mobilité
                </label>
                <select
                  value={mobilite}
                  onChange={(e) => setMobilite(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionnez...</option>
                  {MOBILITE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Disponibilité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disponibilité
                </label>
                <select
                  value={disponibilite}
                  onChange={(e) => setDisponibilite(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionnez...</option>
                  {DISPONIBILITE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erreur */}
        {error && (
          <div className="mt-4 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={saving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Précédent
            </Button>
          ) : (
            <div />
          )}

          <Button onClick={handleSaveStep} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : currentStep < 3 ? (
              <>
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Terminer
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
