"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  User, ArrowLeft, Save, Plus, X, MapPin, Euro, Clock, Globe, Github, Linkedin, Briefcase
} from 'lucide-react'

interface TalentProfile {
  prenom: string
  nom: string
  telephone: string | null
  titrePoste: string | null
  bio: string | null
  competences: string[]
  anneesExperience: number
  tjm: number | null
  tjmMin: number | null
  tjmMax: number | null
  mobilite: string
  zonesGeographiques: string[]
  disponibilite: string
  softSkills: string[]
  langues: string[]
  certifications: string[]
  linkedinUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
}

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
]

const DISPONIBILITE_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immédiate' },
  { value: 'SOUS_15_JOURS', label: 'Sous 15 jours' },
  { value: 'SOUS_1_MOIS', label: 'Sous 1 mois' },
  { value: 'SOUS_2_MOIS', label: 'Sous 2 mois' },
  { value: 'SOUS_3_MOIS', label: 'Sous 3 mois' },
  { value: 'NON_DISPONIBLE', label: 'Non disponible' },
]

export default function TalentProfilPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<TalentProfile | null>(null)
  const [newCompetence, setNewCompetence] = useState('')
  const [newLangue, setNewLangue] = useState('')
  const [newZone, setNewZone] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/talent/profile')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/t/connexion')
          return
        }
        throw new Error('Erreur chargement profil')
      }
      const data = await response.json()
      setProfile(data.profile)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger le profil",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)

    try {
      const response = await fetch('/api/talent/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (!response.ok) {
        throw new Error('Erreur sauvegarde')
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées",
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addCompetence = () => {
    if (newCompetence.trim() && profile && !profile.competences.includes(newCompetence.trim())) {
      setProfile({
        ...profile,
        competences: [...profile.competences, newCompetence.trim()]
      })
      setNewCompetence('')
    }
  }

  const removeCompetence = (comp: string) => {
    if (profile) {
      setProfile({
        ...profile,
        competences: profile.competences.filter(c => c !== comp)
      })
    }
  }

  const addLangue = () => {
    if (newLangue.trim() && profile && !profile.langues.includes(newLangue.trim())) {
      setProfile({
        ...profile,
        langues: [...profile.langues, newLangue.trim()]
      })
      setNewLangue('')
    }
  }

  const removeLangue = (langue: string) => {
    if (profile) {
      setProfile({
        ...profile,
        langues: profile.langues.filter(l => l !== langue)
      })
    }
  }

  const addZone = () => {
    if (newZone.trim() && profile && !profile.zonesGeographiques.includes(newZone.trim())) {
      setProfile({
        ...profile,
        zonesGeographiques: [...profile.zonesGeographiques, newZone.trim()]
      })
      setNewZone('')
    }
  }

  const removeZone = (zone: string) => {
    if (profile) {
      setProfile({
        ...profile,
        zonesGeographiques: profile.zonesGeographiques.filter(z => z !== zone)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/t/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </Link>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon profil</h1>

        <div className="space-y-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={profile.prenom}
                    onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={profile.nom}
                    onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input
                  value={profile.telephone || ''}
                  onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <Label>Titre / Poste</Label>
                <Input
                  value={profile.titrePoste || ''}
                  onChange={(e) => setProfile({ ...profile, titrePoste: e.target.value })}
                  placeholder="Développeur Full Stack Java/Angular"
                />
              </div>

              <div>
                <Label>Bio / Présentation</Label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Présentez-vous en quelques lignes..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Années d'expérience</Label>
                <Input
                  type="number"
                  min="0"
                  value={profile.anneesExperience}
                  onChange={(e) => setProfile({ ...profile, anneesExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Compétences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Compétences techniques
              </CardTitle>
              <CardDescription>
                Ajoutez vos compétences pour améliorer le matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.competences.map((comp) => (
                  <Badge key={comp} variant="secondary" className="px-3 py-1">
                    {comp}
                    <button
                      onClick={() => removeCompetence(comp)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCompetence}
                  onChange={(e) => setNewCompetence(e.target.value)}
                  placeholder="Ajouter une compétence (ex: React, Java, Docker...)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetence())}
                />
                <Button type="button" onClick={addCompetence} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TJM et disponibilité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Tarif et disponibilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>TJM souhaité (€/jour)</Label>
                  <Input
                    type="number"
                    value={profile.tjm || ''}
                    onChange={(e) => setProfile({ ...profile, tjm: parseInt(e.target.value) || null })}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label>TJM minimum</Label>
                  <Input
                    type="number"
                    value={profile.tjmMin || ''}
                    onChange={(e) => setProfile({ ...profile, tjmMin: parseInt(e.target.value) || null })}
                    placeholder="400"
                  />
                </div>
                <div>
                  <Label>TJM maximum</Label>
                  <Input
                    type="number"
                    value={profile.tjmMax || ''}
                    onChange={(e) => setProfile({ ...profile, tjmMax: parseInt(e.target.value) || null })}
                    placeholder="700"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Disponibilité</Label>
                  <Select
                    value={profile.disponibilite}
                    onValueChange={(value) => setProfile({ ...profile, disponibilite: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPONIBILITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mobilité</Label>
                  <Select
                    value={profile.mobilite}
                    onValueChange={(value) => setProfile({ ...profile, mobilite: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOBILITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Localisation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Adresse</Label>
                  <Input
                    value={profile.adresse || ''}
                    onChange={(e) => setProfile({ ...profile, adresse: e.target.value })}
                    placeholder="123 rue de Paris"
                  />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input
                    value={profile.codePostal || ''}
                    onChange={(e) => setProfile({ ...profile, codePostal: e.target.value })}
                    placeholder="75001"
                  />
                </div>
              </div>
              <div>
                <Label>Ville</Label>
                <Input
                  value={profile.ville || ''}
                  onChange={(e) => setProfile({ ...profile, ville: e.target.value })}
                  placeholder="Paris"
                />
              </div>

              <div>
                <Label>Zones géographiques acceptées</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.zonesGeographiques.map((zone) => (
                    <Badge key={zone} variant="outline" className="px-3 py-1">
                      {zone}
                      <button onClick={() => removeZone(zone)} className="ml-2 hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    placeholder="Paris, Île-de-France, Remote..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addZone())}
                  />
                  <Button type="button" onClick={addZone} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Langues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Langues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.langues.map((langue) => (
                  <Badge key={langue} variant="outline" className="px-3 py-1">
                    {langue}
                    <button onClick={() => removeLangue(langue)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLangue}
                  onChange={(e) => setNewLangue(e.target.value)}
                  placeholder="Français:Natif, Anglais:Courant..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLangue())}
                />
                <Button type="button" onClick={addLangue} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liens */}
          <Card>
            <CardHeader>
              <CardTitle>Liens professionnels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Label>
                <Input
                  value={profile.linkedinUrl || ''}
                  onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/votre-profil"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  GitHub
                </Label>
                <Input
                  value={profile.githubUrl || ''}
                  onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })}
                  placeholder="https://github.com/votre-profil"
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Portfolio / Site web
                </Label>
                <Input
                  value={profile.portfolioUrl || ''}
                  onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })}
                  placeholder="https://votre-site.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg" loading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
