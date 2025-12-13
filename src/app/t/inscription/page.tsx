"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Lock, User, Building2, Phone, ArrowLeft, CheckCircle, Upload } from 'lucide-react'

export default function TalentInscriptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    siret: '',
    telephone: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.prenom) newErrors.prenom = 'Prénom requis'
    if (!formData.nom) newErrors.nom = 'Nom requis'
    if (!formData.email) newErrors.email = 'Email requis'
    if (!formData.password) newErrors.password = 'Mot de passe requis'
    if (formData.password.length < 8) newErrors.password = 'Minimum 8 caractères'
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    const siretClean = formData.siret.replace(/\s/g, '')
    if (!siretClean) newErrors.siret = 'SIRET requis'
    else if (!/^\d{14}$/.test(siretClean)) newErrors.siret = 'SIRET invalide (14 chiffres)'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/register/talent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          siret: formData.siret.replace(/\s/g, ''),
        }),
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 text-gray-600 hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        <h1 className="text-center text-3xl font-bold text-primary">Talentero</h1>
        <h2 className="mt-2 text-center text-xl text-gray-600">
          Créer votre compte freelance
        </h2>
      </div>

      {/* Progress Steps */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'Informations personnelles' : 'Vérification SIRET'}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? 'Créez votre compte en quelques secondes'
                : 'Nous vérifions que vous êtes bien indépendant'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit}>
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="prenom">Prénom</Label>
                      <div className="mt-1 relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="prenom"
                          placeholder="Jean"
                          className="pl-10"
                          value={formData.prenom}
                          onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                          error={errors.prenom}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        placeholder="Dupont"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        error={errors.nom}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="mt-1 relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="jean.dupont@email.com"
                        className="pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        error={errors.email}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="telephone">Téléphone (optionnel)</Label>
                    <div className="mt-1 relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="telephone"
                        type="tel"
                        placeholder="06 12 34 56 78"
                        className="pl-10"
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="mt-1 relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Minimum 8 caractères"
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        error={errors.password}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <div className="mt-1 relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        error={errors.confirmPassword}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Continuer
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Pourquoi le SIRET ?</strong><br />
                      Talentero est réservé aux freelances. Nous vérifions votre SIRET pour garantir que vous êtes bien indépendant.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="siret">Numéro SIRET</Label>
                    <div className="mt-1 relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="siret"
                        placeholder="123 456 789 00012"
                        className="pl-10"
                        value={formData.siret}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d\s]/g, '')
                          setFormData({ ...formData, siret: value })
                        }}
                        error={errors.siret}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      14 chiffres, disponible sur votre avis de situation INSEE
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Retour
                    </Button>
                    <Button type="submit" className="flex-1" size="lg" loading={loading}>
                      <Upload className="w-4 h-4 mr-2" />
                      Créer mon compte
                    </Button>
                  </div>
                </div>
              )}
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
