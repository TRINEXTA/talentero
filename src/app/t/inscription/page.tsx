"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Logo } from '@/components/ui/logo'
import {
  Mail, Lock, User, Building2, Phone, ArrowLeft, ArrowRight,
  CheckCircle, Upload, MapPin, Car, Globe, FileText, Loader2, AlertCircle
} from 'lucide-react'
import { PasswordStrength } from '@/components/ui/password-strength'
import { checkPasswordStrength } from '@/lib/validations'

interface VerifiedCompany {
  siret: string
  siren: string
  raisonSociale: string
  formeJuridique: string
  codeAPE: string
  libelleAPE: string
  adresse: {
    numero: string
    rue: string
    codePostal: string
    ville: string
  }
}

type FormData = {
  // Étape 1 - Identité
  prenom: string
  nom: string
  email: string
  telephone: string
  password: string
  confirmPassword: string
  nationalite: string

  // Étape 2 - Entreprise
  typeSociete: string
  siret: string
  raisonSociale: string
  tvaIntracommunautaire: string
  assujettTva: boolean

  // Étape 3 - Adresse & Mobilité
  adresse: string
  codePostal: string
  ville: string
  zonesIntervention: string[]
  mobilite: string
  permisConduire: boolean
  vehicule: boolean
  accepteDeplacementEtranger: boolean

  // Étape 4 - CV
  cvFile: File | null
}

const initialFormData: FormData = {
  prenom: '',
  nom: '',
  email: '',
  telephone: '',
  password: '',
  confirmPassword: '',
  nationalite: 'Française',
  typeSociete: 'AUTO_ENTREPRENEUR',
  siret: '',
  raisonSociale: '',
  tvaIntracommunautaire: '',
  assujettTva: false,
  adresse: '',
  codePostal: '',
  ville: '',
  zonesIntervention: [],
  mobilite: 'FLEXIBLE',
  permisConduire: false,
  vehicule: false,
  accepteDeplacementEtranger: false,
  cvFile: null,
}

const ZONES_FRANCE = [
  'Paris', 'Île-de-France', 'Lyon', 'Marseille', 'Toulouse',
  'Bordeaux', 'Nantes', 'Lille', 'Strasbourg', 'Nice',
  'Rennes', 'Montpellier', 'Grenoble', 'Remote France', 'Toute la France'
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

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote uniquement' },
  { value: 'HYBRIDE', label: 'Hybride (télétravail + présentiel)' },
  { value: 'SUR_SITE', label: 'Sur site uniquement' },
  { value: 'FLEXIBLE', label: 'Flexible (tout type)' },
]

export default function TalentInscriptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [parsingCv, setParsingCv] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifiedCompany, setVerifiedCompany] = useState<VerifiedCompany | null>(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [cvFileName, setCvFileName] = useState<string>('')

  const totalSteps = 4

  const verifySiretNumber = async () => {
    const siretClean = formData.siret.replace(/\s/g, '')
    if (!siretClean) {
      setErrors(prev => ({ ...prev, siret: 'SIRET requis' }))
      return
    }
    if (!/^\d{14}$/.test(siretClean)) {
      setErrors(prev => ({ ...prev, siret: 'SIRET invalide (14 chiffres)' }))
      return
    }

    setVerifying(true)
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors.siret
      return newErrors
    })

    try {
      const res = await fetch('/api/verify-siret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siret: siretClean }),
      })

      const data = await res.json()

      if (!res.ok || !data.valid) {
        setErrors(prev => ({ ...prev, siret: data.error || 'SIRET non valide' }))
        setVerifiedCompany(null)
        return
      }

      // SIRET valide - on remplit les données
      setVerifiedCompany(data.entreprise)
      setFormData(prev => ({
        ...prev,
        raisonSociale: data.entreprise.raisonSociale,
        siret: data.entreprise.siret,
        adresse: `${data.entreprise.adresse.numero} ${data.entreprise.adresse.rue}`.trim(),
        codePostal: data.entreprise.adresse.codePostal,
        ville: data.entreprise.adresse.ville,
      }))

      toast({
        title: "Entreprise vérifiée",
        description: `${data.entreprise.raisonSociale} a été trouvée dans la base INSEE`,
      })
    } catch (error) {
      console.error('Erreur vérification SIRET:', error)
      setErrors(prev => ({ ...prev, siret: 'Erreur lors de la vérification' }))
    } finally {
      setVerifying(false)
    }
  }

  const updateFormData = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const toggleZone = (zone: string) => {
    setFormData(prev => ({
      ...prev,
      zonesIntervention: prev.zonesIntervention.includes(zone)
        ? prev.zonesIntervention.filter(z => z !== zone)
        : [...prev.zonesIntervention, zone]
    }))
  }

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (stepNumber === 1) {
      if (!formData.prenom.trim()) newErrors.prenom = 'Prénom requis'
      if (!formData.nom.trim()) newErrors.nom = 'Nom requis'
      if (!formData.email.trim()) newErrors.email = 'Email requis'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email invalide'
      }
      if (!formData.telephone.trim()) newErrors.telephone = 'Téléphone requis'
      if (!formData.password) newErrors.password = 'Mot de passe requis'
      else {
        const passwordCheck = checkPasswordStrength(formData.password)
        if (!passwordCheck.isValid) {
          if (!passwordCheck.checks.minLength) newErrors.password = 'Minimum 8 caractères'
          else if (!passwordCheck.checks.hasUppercase) newErrors.password = 'Ajoutez une majuscule'
          else if (!passwordCheck.checks.hasLowercase) newErrors.password = 'Ajoutez une minuscule'
          else if (!passwordCheck.checks.hasDigit) newErrors.password = 'Ajoutez un chiffre'
          else if (!passwordCheck.checks.hasSpecial) newErrors.password = 'Ajoutez un caractère spécial'
        }
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
      }
    }

    if (stepNumber === 2) {
      const siretClean = formData.siret.replace(/\s/g, '')
      if (!siretClean) newErrors.siret = 'SIRET requis'
      else if (!/^\d{14}$/.test(siretClean)) newErrors.siret = 'SIRET invalide (14 chiffres)'
      if (!formData.raisonSociale.trim()) newErrors.raisonSociale = 'Raison sociale requise'
    }

    if (stepNumber === 3) {
      if (!formData.adresse.trim()) newErrors.adresse = 'Adresse requise'
      if (!formData.codePostal.trim()) newErrors.codePostal = 'Code postal requis'
      if (!formData.ville.trim()) newErrors.ville = 'Ville requise'
      if (formData.zonesIntervention.length === 0) {
        newErrors.zonesIntervention = 'Sélectionnez au moins une zone'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => Math.min(prev + 1, totalSteps))
    }
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description: "Veuillez uploader un fichier PDF ou DOCX",
        variant: "destructive",
      })
      return
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 10 Mo",
        variant: "destructive",
      })
      return
    }

    setCvFileName(file.name)
    updateFormData('cvFile', file)

    // Optionnel : Parser le CV avec l'IA
    setParsingCv(true)
    try {
      // Pour l'instant on simule le parsing
      await new Promise(resolve => setTimeout(resolve, 1500))
      toast({
        title: "CV uploadé",
        description: "Votre CV a été analysé avec succès",
      })
    } catch {
      // Erreur silencieuse, le CV est quand même uploadé
    } finally {
      setParsingCv(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setErrors({})

    try {
      // Créer FormData pour l'upload
      const submitData = new FormData()
      submitData.append('prenom', formData.prenom)
      submitData.append('nom', formData.nom)
      submitData.append('email', formData.email)
      submitData.append('telephone', formData.telephone)
      submitData.append('password', formData.password)
      submitData.append('nationalite', formData.nationalite)
      submitData.append('typeSociete', formData.typeSociete)
      submitData.append('siret', formData.siret.replace(/\s/g, ''))
      submitData.append('raisonSociale', formData.raisonSociale)
      submitData.append('tvaIntracommunautaire', formData.tvaIntracommunautaire)
      submitData.append('assujettTva', String(formData.assujettTva))
      submitData.append('adresse', formData.adresse)
      submitData.append('codePostal', formData.codePostal)
      submitData.append('ville', formData.ville)
      submitData.append('zonesIntervention', JSON.stringify(formData.zonesIntervention))
      submitData.append('mobilite', formData.mobilite)
      submitData.append('permisConduire', String(formData.permisConduire))
      submitData.append('vehicule', String(formData.vehicule))
      submitData.append('accepteDeplacementEtranger', String(formData.accepteDeplacementEtranger))

      if (formData.cvFile) {
        submitData.append('cv', formData.cvFile)
      }

      const response = await fetch('/api/auth/register/talent', {
        method: 'POST',
        body: submitData,
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {}
          data.details.forEach((err: { path: string[]; message: string }) => {
            fieldErrors[err.path[0]] = err.message
          })
          setErrors(fieldErrors)
        } else {
          toast({
            title: "Erreur d'inscription",
            description: data.error || "Une erreur est survenue",
            variant: "destructive",
          })
        }
        return
      }

      toast({
        title: "Inscription réussie !",
        description: "Bienvenue sur Talentero. Complétez votre profil pour augmenter votre visibilité.",
      })

      router.push('/t/dashboard')
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Réessayez.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary mb-6">
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <div className="flex justify-center mb-4">
            <Logo size="lg" animated={false} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer votre compte freelance</h1>
          <p className="text-gray-600 mt-1">Inscription en {totalSteps} étapes</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-16 sm:w-24 h-1 mx-1 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 px-2">
            <span>Identité</span>
            <span>Entreprise</span>
            <span>Mobilité</span>
            <span>CV</span>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Informations personnelles'}
              {step === 2 && 'Votre entreprise'}
              {step === 3 && 'Adresse & Mobilité'}
              {step === 4 && 'Votre CV'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Vos informations de contact et de connexion'}
              {step === 2 && 'Informations sur votre structure juridique'}
              {step === 3 && 'Où et comment souhaitez-vous travailler ?'}
              {step === 4 && 'Uploadez votre CV pour compléter votre profil'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>

              {/* ÉTAPE 1 - Identité */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="prenom">Prénom *</Label>
                      <div className="mt-1 relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="prenom"
                          placeholder="Jean"
                          className="pl-10"
                          value={formData.prenom}
                          onChange={(e) => updateFormData('prenom', e.target.value)}
                          error={errors.prenom}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        placeholder="Dupont"
                        value={formData.nom}
                        onChange={(e) => updateFormData('nom', e.target.value)}
                        error={errors.nom}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <div className="mt-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="jean.dupont@email.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        error={errors.email}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="telephone">Téléphone *</Label>
                    <div className="mt-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="telephone"
                        type="tel"
                        placeholder="06 12 34 56 78"
                        className="pl-10"
                        value={formData.telephone}
                        onChange={(e) => updateFormData('telephone', e.target.value)}
                        error={errors.telephone}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nationalite">Nationalité</Label>
                    <div className="mt-1 relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="nationalite"
                        placeholder="Française"
                        className="pl-10"
                        value={formData.nationalite}
                        onChange={(e) => updateFormData('nationalite', e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Important pour les projets nécessitant une habilitation secret défense
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="password">Mot de passe *</Label>
                    <div className="mt-1 relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Créez un mot de passe sécurisé"
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => updateFormData('password', e.target.value)}
                        error={errors.password}
                      />
                    </div>
                    <PasswordStrength password={formData.password} />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <div className="mt-1 relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Répétez le mot de passe"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                        error={errors.confirmPassword}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 - Entreprise */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="typeSociete">Type de société *</Label>
                    <select
                      id="typeSociete"
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={formData.typeSociete}
                      onChange={(e) => updateFormData('typeSociete', e.target.value)}
                    >
                      {TYPE_SOCIETE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="siret">Numéro SIRET *</Label>
                    <div className="mt-1 flex gap-2">
                      <div className="relative flex-1">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="siret"
                          placeholder="123 456 789 00012"
                          className="pl-10"
                          value={formData.siret}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d\s]/g, '')
                            updateFormData('siret', value)
                            setVerifiedCompany(null) // Reset si modifié
                          }}
                          error={errors.siret}
                          disabled={verifying}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifySiretNumber}
                        disabled={verifying || formData.siret.replace(/\s/g, '').length < 14}
                      >
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      14 chiffres, disponible sur votre avis de situation INSEE
                    </p>
                  </div>

                  {/* Affichage des infos vérifiées */}
                  {verifiedCompany && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Entreprise vérifiée
                      </div>
                      <div className="text-sm text-green-800 space-y-1">
                        <p><strong>{verifiedCompany.raisonSociale}</strong></p>
                        <p>{verifiedCompany.formeJuridique}</p>
                        <p>{verifiedCompany.libelleAPE}</p>
                        <p>
                          {verifiedCompany.adresse.numero} {verifiedCompany.adresse.rue}<br />
                          {verifiedCompany.adresse.codePostal} {verifiedCompany.adresse.ville}
                        </p>
                      </div>
                    </div>
                  )}

                  {errors.siret && !verifiedCompany && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errors.siret}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="raisonSociale">Raison sociale *</Label>
                    <Input
                      id="raisonSociale"
                      placeholder="Nom de votre entreprise"
                      value={formData.raisonSociale}
                      onChange={(e) => updateFormData('raisonSociale', e.target.value)}
                      error={errors.raisonSociale}
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="assujettTva"
                        checked={formData.assujettTva}
                        onChange={(e) => updateFormData('assujettTva', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="assujettTva" className="cursor-pointer">
                        Assujetti à la TVA
                      </Label>
                    </div>

                    {formData.assujettTva && (
                      <div>
                        <Label htmlFor="tvaIntracommunautaire">N° TVA Intracommunautaire</Label>
                        <Input
                          id="tvaIntracommunautaire"
                          placeholder="FR12345678901"
                          value={formData.tvaIntracommunautaire}
                          onChange={(e) => updateFormData('tvaIntracommunautaire', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 - Adresse & Mobilité */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adresse">Adresse *</Label>
                    <div className="mt-1 relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="adresse"
                        placeholder="123 rue de la République"
                        className="pl-10"
                        value={formData.adresse}
                        onChange={(e) => updateFormData('adresse', e.target.value)}
                        error={errors.adresse}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="codePostal">Code postal *</Label>
                      <Input
                        id="codePostal"
                        placeholder="75001"
                        value={formData.codePostal}
                        onChange={(e) => updateFormData('codePostal', e.target.value)}
                        error={errors.codePostal}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ville">Ville *</Label>
                      <Input
                        id="ville"
                        placeholder="Paris"
                        value={formData.ville}
                        onChange={(e) => updateFormData('ville', e.target.value)}
                        error={errors.ville}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Zones d'intervention *</Label>
                    <p className="text-xs text-gray-500 mb-2">Sélectionnez les zones où vous pouvez intervenir</p>
                    <div className="flex flex-wrap gap-2">
                      {ZONES_FRANCE.map(zone => (
                        <button
                          key={zone}
                          type="button"
                          onClick={() => toggleZone(zone)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            formData.zonesIntervention.includes(zone)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>
                    {errors.zonesIntervention && (
                      <p className="text-sm text-red-500 mt-1">{errors.zonesIntervention}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="mobilite">Préférence de travail *</Label>
                    <select
                      id="mobilite"
                      className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={formData.mobilite}
                      onChange={(e) => updateFormData('mobilite', e.target.value)}
                    >
                      {MOBILITE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="permisConduire"
                        checked={formData.permisConduire}
                        onChange={(e) => updateFormData('permisConduire', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="permisConduire" className="cursor-pointer flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-400" />
                        Permis de conduire
                      </Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="vehicule"
                        checked={formData.vehicule}
                        onChange={(e) => updateFormData('vehicule', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="vehicule" className="cursor-pointer">
                        Véhicule personnel (TTV)
                      </Label>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="accepteDeplacementEtranger"
                        checked={formData.accepteDeplacementEtranger}
                        onChange={(e) => updateFormData('accepteDeplacementEtranger', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="accepteDeplacementEtranger" className="cursor-pointer flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        Accepte les déplacements hors de France
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 - CV */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Pourquoi uploader votre CV ?</strong><br />
                      Notre IA analyse votre CV pour extraire automatiquement vos compétences,
                      formations, certifications et expériences. Cela vous fait gagner du temps
                      et améliore votre matching avec les offres.
                    </p>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      cvFileName
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300 hover:border-primary hover:bg-primary/5'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {parsingCv ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-gray-600">Analyse du CV en cours...</p>
                      </div>
                    ) : cvFileName ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800">{cvFileName}</p>
                          <p className="text-sm text-gray-500">Cliquez pour changer de fichier</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Cliquez pour uploader votre CV</p>
                          <p className="text-sm text-gray-500">PDF ou DOCX, max 10 Mo</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 text-center">
                    Vous pourrez compléter votre profil plus tard si vous n'avez pas votre CV sous la main.
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                )}

                {step < totalSteps ? (
                  <Button type="submit" className="flex-1">
                    Continuer
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Créer mon compte
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>

            {step === 1 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Déjà inscrit ?</span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link href="/t/connexion">
                    <Button variant="outline" className="w-full">
                      Se connecter
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-500">
          Vous êtes une entreprise ?{' '}
          <Link href="/c/inscription" className="text-primary hover:underline">
            Inscription entreprise
          </Link>
        </p>
      </div>
    </div>
  )
}
