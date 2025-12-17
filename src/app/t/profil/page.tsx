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
  User, ArrowLeft, Save, Plus, X, MapPin, Euro, Clock, Globe, Github, Linkedin, Briefcase,
  FileText, Upload, Loader2, Trash2, GraduationCap, Building2, Mail, Phone, Eye, RefreshCw
} from 'lucide-react'

interface Experience {
  id: number
  poste: string
  entreprise: string
  lieu: string | null
  dateDebut: string
  dateFin: string | null
  description: string | null
  competences: string[]
}

interface Formation {
  id: number
  diplome: string
  etablissement: string | null
  annee: number | null
  description: string | null
}

interface TalentProfile {
  uid: string
  email: string
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
  cvUrl: string | null
  cvOriginalName: string | null
  siret: string | null
  raisonSociale: string | null
  siretVerifie: boolean
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
  const [uploadingCV, setUploadingCV] = useState(false)
  const [resyncingCV, setResyncingCV] = useState(false)
  const [profile, setProfile] = useState<TalentProfile | null>(null)
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [formations, setFormations] = useState<Formation[]>([])

  // New item forms
  const [newCompetence, setNewCompetence] = useState('')
  const [newLangue, setNewLangue] = useState('')
  const [newZone, setNewZone] = useState('')
  const [newCertification, setNewCertification] = useState('')

  // Experience form
  const [showExpForm, setShowExpForm] = useState(false)
  const [newExp, setNewExp] = useState({ poste: '', entreprise: '', lieu: '', dateDebut: '', dateFin: '', description: '' })

  // Formation form
  const [showFormationForm, setShowFormationForm] = useState(false)
  const [newFormation, setNewFormation] = useState({ diplome: '', etablissement: '', annee: '', description: '' })

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
      setExperiences(data.experiences || [])
      setFormations(data.formations || [])
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
        const data = await response.json()
        throw new Error(data.error || 'Erreur sauvegarde')
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées",
      })
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de sauvegarder",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Tag management functions
  const addTag = (field: 'competences' | 'langues' | 'zonesGeographiques' | 'certifications', value: string, setter: (v: string) => void) => {
    if (value.trim() && profile && !profile[field].includes(value.trim())) {
      setProfile({ ...profile, [field]: [...profile[field], value.trim()] })
      setter('')
    }
  }

  const removeTag = (field: 'competences' | 'langues' | 'zonesGeographiques' | 'certifications', value: string) => {
    if (profile) {
      setProfile({ ...profile, [field]: profile[field].filter((v: string) => v !== value) })
    }
  }

  // Experience management
  const addExperience = async () => {
    if (!newExp.poste || !newExp.dateDebut) {
      toast({ title: "Erreur", description: "Poste et date de début requis", variant: "destructive" })
      return
    }

    try {
      const res = await fetch('/api/talent/experiences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExp),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setExperiences([data.experience, ...experiences])
      setNewExp({ poste: '', entreprise: '', lieu: '', dateDebut: '', dateFin: '', description: '' })
      setShowExpForm(false)
      toast({ title: "Expérience ajoutée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter l'expérience", variant: "destructive" })
    }
  }

  const deleteExperience = async (id: number) => {
    if (!confirm("Supprimer cette expérience ?")) return
    try {
      const res = await fetch(`/api/talent/experiences?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      setExperiences(experiences.filter(e => e.id !== id))
      toast({ title: "Expérience supprimée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" })
    }
  }

  // Formation management
  const addFormation = async () => {
    if (!newFormation.diplome) {
      toast({ title: "Erreur", description: "Diplôme requis", variant: "destructive" })
      return
    }

    try {
      const res = await fetch('/api/talent/formations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFormation),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setFormations([data.formation, ...formations])
      setNewFormation({ diplome: '', etablissement: '', annee: '', description: '' })
      setShowFormationForm(false)
      toast({ title: "Formation ajoutée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la formation", variant: "destructive" })
    }
  }

  const deleteFormation = async (id: number) => {
    if (!confirm("Supprimer cette formation ?")) return
    try {
      const res = await fetch(`/api/talent/formations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      setFormations(formations.filter(f => f.id !== id))
      toast({ title: "Formation supprimée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" })
    }
  }

  // CV management
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format non supporté", description: "PDF ou Word uniquement", variant: "destructive" })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Max 5 Mo", variant: "destructive" })
      return
    }

    setUploadingCV(true)
    try {
      const formData = new FormData()
      formData.append('cv', file)

      const response = await fetch('/api/talent/cv', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Erreur upload')

      const data = await response.json()
      setProfile({ ...profile!, cvUrl: data.cvUrl, cvOriginalName: data.cvOriginalName })

      // Refresh profile to get extracted data
      if (data.extracted) {
        await fetchProfile()
        toast({ title: "CV uploadé", description: "Les données ont été extraites automatiquement" })
      } else {
        toast({ title: "CV uploadé" })
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'uploader le CV", variant: "destructive" })
    } finally {
      setUploadingCV(false)
      e.target.value = ''
    }
  }

  const handleCVDelete = async () => {
    if (!confirm("Supprimer votre CV ?")) return
    try {
      const response = await fetch('/api/talent/cv', { method: 'DELETE' })
      if (!response.ok) throw new Error('Erreur')
      setProfile({ ...profile!, cvUrl: null, cvOriginalName: null })
      toast({ title: "CV supprimé" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" })
    }
  }

  const handleCVResync = async () => {
    if (!confirm("Re-synchroniser votre CV ? Cela va ré-analyser votre CV et mettre à jour vos expériences et compétences.")) return
    setResyncingCV(true)
    try {
      const response = await fetch('/api/talent/cv/resync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replaceExperiences: true,
          replaceFormations: true,
          updateProfile: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur')

      toast({
        title: "CV re-synchronisé",
        description: `${data.stats?.experiencesCreated || 0} expériences et ${data.stats?.formationsCreated || 0} formations extraites`,
      })
      // Refresh profile
      await fetchProfile()
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de re-synchroniser le CV",
        variant: "destructive",
      })
    } finally {
      setResyncingCV(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/t/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <Input value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />Email</Label>
                  <Input value={profile.email} disabled className="bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-1">Non modifiable</p>
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4" />Téléphone</Label>
                  <Input
                    value={profile.telephone || ''}
                    onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                  />
                </div>
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
                <Label>Années d&apos;expérience</Label>
                <Input
                  type="number"
                  min="0"
                  value={profile.anneesExperience}
                  onChange={(e) => setProfile({ ...profile, anneesExperience: parseInt(e.target.value) || 0 })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Société / SIRET */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Ma société
              </CardTitle>
              <CardDescription>Informations de votre structure (auto-entrepreneur, SASU, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>SIRET</Label>
                  <Input
                    value={profile.siret || ''}
                    onChange={(e) => setProfile({ ...profile, siret: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                    placeholder="12345678901234"
                    maxLength={14}
                  />
                  {profile.siretVerifie && (
                    <p className="text-xs text-green-600 mt-1">✓ SIRET vérifié</p>
                  )}
                </div>
                <div>
                  <Label>Raison sociale</Label>
                  <Input
                    value={profile.raisonSociale || ''}
                    onChange={(e) => setProfile({ ...profile, raisonSociale: e.target.value })}
                    placeholder="Nom de votre société"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Mon CV
              </CardTitle>
              <CardDescription>PDF ou Word, max 5 Mo. Les données seront extraites automatiquement.</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.cvUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">{profile.cvOriginalName || 'CV uploadé'}</p>
                        <p className="text-sm text-green-600">CV actuel</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={profile.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCVResync}
                        disabled={resyncingCV}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        title="Re-analyser le CV et mettre à jour le profil"
                      >
                        {resyncingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCVDelete} className="text-red-600 border-red-300 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Remplacer par un nouveau CV</Label>
                    <Input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={uploadingCV} className="mt-1" />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {uploadingCV ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-gray-600">Upload et extraction en cours...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Glissez votre CV ici ou cliquez pour parcourir</p>
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="max-w-xs mx-auto" />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expériences */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Expériences professionnelles
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowExpForm(!showExpForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showExpForm && (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Poste *" value={newExp.poste} onChange={(e) => setNewExp({ ...newExp, poste: e.target.value })} />
                    <Input placeholder="Entreprise" value={newExp.entreprise} onChange={(e) => setNewExp({ ...newExp, entreprise: e.target.value })} />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input placeholder="Lieu" value={newExp.lieu} onChange={(e) => setNewExp({ ...newExp, lieu: e.target.value })} />
                    <div>
                      <Label className="text-xs">Date début *</Label>
                      <Input type="date" value={newExp.dateDebut} onChange={(e) => setNewExp({ ...newExp, dateDebut: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">Date fin</Label>
                      <Input type="date" value={newExp.dateFin} onChange={(e) => setNewExp({ ...newExp, dateFin: e.target.value })} />
                    </div>
                  </div>
                  <Textarea placeholder="Description" value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addExperience}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowExpForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {experiences.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune expérience ajoutée</p>
              ) : (
                <div className="space-y-3">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{exp.poste}</h4>
                          <p className="text-sm text-gray-600">{exp.entreprise}{exp.lieu && ` • ${exp.lieu}`}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(exp.dateDebut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                            {' - '}
                            {exp.dateFin ? new Date(exp.dateFin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : "Aujourd'hui"}
                          </p>
                          {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteExperience(exp.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formations */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Formations
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowFormationForm(!showFormationForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showFormationForm && (
                <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Diplôme *" value={newFormation.diplome} onChange={(e) => setNewFormation({ ...newFormation, diplome: e.target.value })} />
                    <Input placeholder="Établissement" value={newFormation.etablissement} onChange={(e) => setNewFormation({ ...newFormation, etablissement: e.target.value })} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input type="number" placeholder="Année" value={newFormation.annee} onChange={(e) => setNewFormation({ ...newFormation, annee: e.target.value })} />
                    <Input placeholder="Description" value={newFormation.description} onChange={(e) => setNewFormation({ ...newFormation, description: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addFormation}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowFormationForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {formations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune formation ajoutée</p>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <div key={f.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{f.diplome}</h4>
                          <p className="text-sm text-gray-600">{f.etablissement}{f.annee && ` • ${f.annee}`}</p>
                          {f.description && <p className="text-sm mt-1 text-gray-500">{f.description}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteFormation(f.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compétences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Compétences techniques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.competences.map((comp) => (
                  <Badge key={comp} variant="secondary" className="px-3 py-1">
                    {comp}
                    <button onClick={() => removeTag('competences', comp)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCompetence}
                  onChange={(e) => setNewCompetence(e.target.value)}
                  placeholder="React, Java, Docker..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('competences', newCompetence, setNewCompetence))}
                />
                <Button variant="outline" onClick={() => addTag('competences', newCompetence, setNewCompetence)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.certifications.map((cert) => (
                  <Badge key={cert} variant="outline" className="px-3 py-1">
                    {cert}
                    <button onClick={() => removeTag('certifications', cert)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="AWS Certified, Scrum Master..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('certifications', newCertification, setNewCertification))}
                />
                <Button variant="outline" onClick={() => addTag('certifications', newCertification, setNewCertification)}>
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
                  <Input type="number" value={profile.tjm || ''} onChange={(e) => setProfile({ ...profile, tjm: parseInt(e.target.value) || null })} placeholder="500" />
                </div>
                <div>
                  <Label>TJM minimum</Label>
                  <Input type="number" value={profile.tjmMin || ''} onChange={(e) => setProfile({ ...profile, tjmMin: parseInt(e.target.value) || null })} placeholder="400" />
                </div>
                <div>
                  <Label>TJM maximum</Label>
                  <Input type="number" value={profile.tjmMax || ''} onChange={(e) => setProfile({ ...profile, tjmMax: parseInt(e.target.value) || null })} placeholder="700" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Disponibilité</Label>
                  <Select value={profile.disponibilite} onValueChange={(value) => setProfile({ ...profile, disponibilite: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISPONIBILITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mobilité</Label>
                  <Select value={profile.mobilite} onValueChange={(value) => setProfile({ ...profile, mobilite: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOBILITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
                  <Input value={profile.adresse || ''} onChange={(e) => setProfile({ ...profile, adresse: e.target.value })} placeholder="123 rue de Paris" />
                </div>
                <div>
                  <Label>Code postal</Label>
                  <Input value={profile.codePostal || ''} onChange={(e) => setProfile({ ...profile, codePostal: e.target.value })} placeholder="75001" />
                </div>
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={profile.ville || ''} onChange={(e) => setProfile({ ...profile, ville: e.target.value })} placeholder="Paris" />
              </div>

              <div>
                <Label>Zones géographiques acceptées</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.zonesGeographiques.map((zone) => (
                    <Badge key={zone} variant="outline" className="px-3 py-1">
                      {zone}
                      <button onClick={() => removeTag('zonesGeographiques', zone)} className="ml-2 hover:text-red-500">
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
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('zonesGeographiques', newZone, setNewZone))}
                  />
                  <Button variant="outline" onClick={() => addTag('zonesGeographiques', newZone, setNewZone)}>
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
                    <button onClick={() => removeTag('langues', langue)} className="ml-2 hover:text-red-500">
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
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag('langues', newLangue, setNewLangue))}
                />
                <Button variant="outline" onClick={() => addTag('langues', newLangue, setNewLangue)}>
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
                <Label className="flex items-center gap-2"><Linkedin className="w-4 h-4" />LinkedIn</Label>
                <Input value={profile.linkedinUrl || ''} onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/votre-profil" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Github className="w-4 h-4" />GitHub</Label>
                <Input value={profile.githubUrl || ''} onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })} placeholder="https://github.com/votre-profil" />
              </div>
              <div>
                <Label className="flex items-center gap-2"><Globe className="w-4 h-4" />Portfolio / Site web</Label>
                <Input value={profile.portfolioUrl || ''} onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })} placeholder="https://votre-site.com" />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end pb-8">
            <Button onClick={handleSave} size="lg" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
