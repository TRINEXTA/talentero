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
  FileText, Upload, Loader2, Trash2, GraduationCap, Building2, Mail, Phone, Eye, RefreshCw,
  Award, Languages, Heart
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

interface Certification {
  id: number
  nom: string
  organisme: string | null
  dateObtention: string | null
  dateExpiration: string | null
  numeroCertification: string | null
  urlVerification: string | null
}

interface Langue {
  id: number
  langue: string
  niveau: string
  scoreCertification: string | null
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

const NIVEAU_LANGUE_OPTIONS = [
  { value: 'A1', label: 'A1 - Débutant' },
  { value: 'A2', label: 'A2 - Élémentaire' },
  { value: 'B1', label: 'B1 - Intermédiaire' },
  { value: 'B2', label: 'B2 - Intermédiaire avancé' },
  { value: 'C1', label: 'C1 - Avancé' },
  { value: 'C2', label: 'C2 - Maîtrise' },
  { value: 'NATIF', label: 'Natif' },
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
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [langues, setLangues] = useState<Langue[]>([])
  const [loisirs, setLoisirs] = useState<string[]>([])

  // New item forms
  const [newCompetence, setNewCompetence] = useState('')
  const [newZone, setNewZone] = useState('')
  const [newLoisir, setNewLoisir] = useState('')

  // Experience form
  const [showExpForm, setShowExpForm] = useState(false)
  const [newExp, setNewExp] = useState({ poste: '', entreprise: '', lieu: '', dateDebut: '', dateFin: '', description: '' })

  // Formation form
  const [showFormationForm, setShowFormationForm] = useState(false)
  const [newFormation, setNewFormation] = useState({ diplome: '', etablissement: '', annee: '', description: '' })

  // Certification form
  const [showCertForm, setShowCertForm] = useState(false)
  const [newCert, setNewCert] = useState({ nom: '', organisme: '', dateObtention: '', dateExpiration: '', numeroCertification: '', urlVerification: '' })

  // Langue form
  const [showLangueForm, setShowLangueForm] = useState(false)
  const [newLangueData, setNewLangueData] = useState({ langue: '', niveau: '', scoreCertification: '' })

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
      setCertifications(data.certificationsDetail || [])
      setLangues(data.languesDetail || [])
      setLoisirs(data.loisirs || [])
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

  // Certification management
  const addCertification = async () => {
    if (!newCert.nom) {
      toast({ title: "Erreur", description: "Nom de la certification requis", variant: "destructive" })
      return
    }

    try {
      const res = await fetch('/api/talent/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCert),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setCertifications([data.certification, ...certifications])
      setNewCert({ nom: '', organisme: '', dateObtention: '', dateExpiration: '', numeroCertification: '', urlVerification: '' })
      setShowCertForm(false)
      toast({ title: "Certification ajoutée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la certification", variant: "destructive" })
    }
  }

  const deleteCertification = async (id: number) => {
    if (!confirm("Supprimer cette certification ?")) return
    try {
      const res = await fetch(`/api/talent/certifications?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      setCertifications(certifications.filter(c => c.id !== id))
      toast({ title: "Certification supprimée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" })
    }
  }

  // Langue management
  const addLangue = async () => {
    if (!newLangueData.langue || !newLangueData.niveau) {
      toast({ title: "Erreur", description: "Langue et niveau requis", variant: "destructive" })
      return
    }

    try {
      const res = await fetch('/api/talent/langues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLangueData),
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      setLangues([data.langue, ...langues])
      setNewLangueData({ langue: '', niveau: '', scoreCertification: '' })
      setShowLangueForm(false)
      toast({ title: "Langue ajoutée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter la langue", variant: "destructive" })
    }
  }

  const deleteLangue = async (id: number) => {
    if (!confirm("Supprimer cette langue ?")) return
    try {
      const res = await fetch(`/api/talent/langues?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur')
      setLangues(langues.filter(l => l.id !== id))
      toast({ title: "Langue supprimée" })
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" })
    }
  }

  // Loisirs management
  const addLoisir = () => {
    if (newLoisir.trim() && !loisirs.includes(newLoisir.trim())) {
      const updatedLoisirs = [...loisirs, newLoisir.trim()]
      setLoisirs(updatedLoisirs)
      setNewLoisir('')
      // Save immediately
      saveLoisirs(updatedLoisirs)
    }
  }

  const removeLoisir = (loisir: string) => {
    const updatedLoisirs = loisirs.filter(l => l !== loisir)
    setLoisirs(updatedLoisirs)
    saveLoisirs(updatedLoisirs)
  }

  const saveLoisirs = async (loisirsToSave: string[]) => {
    try {
      await fetch('/api/talent/loisirs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loisirs: loisirsToSave }),
      })
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les loisirs", variant: "destructive" })
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
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-700">
      {/* Header */}
      <header className="bg-gray-600 border-b border-gray-500 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/t/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-primary">
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
        <h1 className="text-2xl font-bold text-white mb-8">Mon profil</h1>

        <div className="space-y-6">
          {/* Informations personnelles */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Prénom</Label>
                  <Input value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
                <div>
                  <Label className="text-gray-300">Nom</Label>
                  <Input value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-gray-300"><Mail className="w-4 h-4" />Email</Label>
                  <Input value={profile.email} disabled className="bg-gray-500 border-gray-400 text-white" />
                  <p className="text-xs text-gray-300 mt-1">Non modifiable</p>
                </div>
                <div>
                  <Label className="flex items-center gap-2 text-gray-300"><Phone className="w-4 h-4" />Téléphone</Label>
                  <Input
                    value={profile.telephone || ''}
                    onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">Titre / Poste</Label>
                <Input
                  value={profile.titrePoste || ''}
                  onChange={(e) => setProfile({ ...profile, titrePoste: e.target.value })}
                  placeholder="Développeur Full Stack Java/Angular"
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>

              <div>
                <Label className="text-gray-300">Bio / Présentation</Label>
                <Textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Présentez-vous en quelques lignes..."
                  rows={4}
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>

              <div>
                <Label className="text-gray-300">Années d&apos;expérience</Label>
                <Input
                  type="number"
                  min="0"
                  value={profile.anneesExperience}
                  onChange={(e) => setProfile({ ...profile, anneesExperience: parseInt(e.target.value) || 0 })}
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Société / SIRET */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Building2 className="w-5 h-5" />
                Ma société
              </CardTitle>
              <CardDescription className="text-gray-300">Informations de votre structure (auto-entrepreneur, SASU, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">SIRET</Label>
                  <Input
                    value={profile.siret || ''}
                    onChange={(e) => setProfile({ ...profile, siret: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                    placeholder="12345678901234"
                    maxLength={14}
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                  {profile.siretVerifie && (
                    <p className="text-xs text-green-600 mt-1">✓ SIRET vérifié</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-300">Raison sociale</Label>
                  <Input
                    value={profile.raisonSociale || ''}
                    onChange={(e) => setProfile({ ...profile, raisonSociale: e.target.value })}
                    placeholder="Nom de votre société"
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CV */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="w-5 h-5" />
                Mon CV
              </CardTitle>
              <CardDescription className="text-gray-300">PDF ou Word, max 5 Mo. Les données seront extraites automatiquement.</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.cvUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-600 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-500" />
                      <div>
                        <p className="font-medium text-green-300">{profile.cvOriginalName || 'CV uploadé'}</p>
                        <p className="text-sm text-green-400">CV actuel</p>
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
                        className="text-blue-400 border-blue-500 hover:bg-blue-900/20"
                        title="Re-analyser le CV et mettre à jour le profil"
                      >
                        {resyncingCV ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCVDelete} className="text-red-400 border-red-500 hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-300">Remplacer par un nouveau CV</Label>
                    <Input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} disabled={uploadingCV} className="mt-1 bg-gray-500 border-gray-400 text-white" />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center">
                  {uploadingCV ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                      <p className="text-gray-300">Upload et extraction en cours...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-300 mb-4">Glissez votre CV ici ou cliquez pour parcourir</p>
                      <Input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="max-w-xs mx-auto bg-gray-500 border-gray-400 text-white" />
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expériences */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
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
                <div className="p-4 border border-gray-500 rounded-lg bg-gray-700 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Poste *" value={newExp.poste} onChange={(e) => setNewExp({ ...newExp, poste: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Input placeholder="Entreprise" value={newExp.entreprise} onChange={(e) => setNewExp({ ...newExp, entreprise: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input placeholder="Lieu" value={newExp.lieu} onChange={(e) => setNewExp({ ...newExp, lieu: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <div>
                      <Label className="text-xs text-gray-300">Date début *</Label>
                      <Input type="date" value={newExp.dateDebut} onChange={(e) => setNewExp({ ...newExp, dateDebut: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300">Date fin</Label>
                      <Input type="date" value={newExp.dateFin} onChange={(e) => setNewExp({ ...newExp, dateFin: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    </div>
                  </div>
                  <Textarea placeholder="Description" value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} rows={2} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addExperience}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowExpForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {experiences.length === 0 ? (
                <p className="text-gray-300 text-center py-4">Aucune expérience ajoutée</p>
              ) : (
                <div className="space-y-3">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="p-4 border border-gray-500 rounded-lg bg-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{exp.poste}</h4>
                          <p className="text-sm text-gray-300">{exp.entreprise}{exp.lieu && ` • ${exp.lieu}`}</p>
                          <p className="text-xs text-gray-300">
                            {new Date(exp.dateDebut).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                            {' - '}
                            {exp.dateFin ? new Date(exp.dateFin).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : "Aujourd'hui"}
                          </p>
                          {exp.description && <p className="text-sm mt-2 text-gray-300">{exp.description}</p>}
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
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
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
                <div className="p-4 border border-gray-500 rounded-lg bg-gray-700 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Diplôme *" value={newFormation.diplome} onChange={(e) => setNewFormation({ ...newFormation, diplome: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Input placeholder="Établissement" value={newFormation.etablissement} onChange={(e) => setNewFormation({ ...newFormation, etablissement: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input type="number" placeholder="Année" value={newFormation.annee} onChange={(e) => setNewFormation({ ...newFormation, annee: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Input placeholder="Description" value={newFormation.description} onChange={(e) => setNewFormation({ ...newFormation, description: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addFormation}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowFormationForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {formations.length === 0 ? (
                <p className="text-gray-300 text-center py-4">Aucune formation ajoutée</p>
              ) : (
                <div className="space-y-3">
                  {formations.map((f) => (
                    <div key={f.id} className="p-4 border border-gray-500 rounded-lg bg-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{f.diplome}</h4>
                          <p className="text-sm text-gray-300">{f.etablissement}{f.annee && ` • ${f.annee}`}</p>
                          {f.description && <p className="text-sm mt-1 text-gray-300">{f.description}</p>}
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
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Briefcase className="w-5 h-5" />
                Compétences techniques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.competences.map((comp) => (
                  <Badge key={comp} variant="secondary" className="px-3 py-1 bg-gray-700 border-gray-500 text-gray-200">
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
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
                <Button variant="outline" onClick={() => addTag('competences', newCompetence, setNewCompetence)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Award className="w-5 h-5" />
                  Certifications
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowCertForm(!showCertForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCertForm && (
                <div className="p-4 border border-gray-500 rounded-lg bg-gray-700 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Nom de la certification *" value={newCert.nom} onChange={(e) => setNewCert({ ...newCert, nom: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Input placeholder="Organisme (AWS, Microsoft...)" value={newCert.organisme} onChange={(e) => setNewCert({ ...newCert, organisme: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-300">Date d'obtention</Label>
                      <Input type="date" value={newCert.dateObtention} onChange={(e) => setNewCert({ ...newCert, dateObtention: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-300">Date d'expiration (optionnel)</Label>
                      <Input type="date" value={newCert.dateExpiration} onChange={(e) => setNewCert({ ...newCert, dateExpiration: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Numéro de certification" value={newCert.numeroCertification} onChange={(e) => setNewCert({ ...newCert, numeroCertification: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Input placeholder="URL de vérification" value={newCert.urlVerification} onChange={(e) => setNewCert({ ...newCert, urlVerification: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addCertification}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowCertForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {certifications.length === 0 ? (
                <p className="text-gray-300 text-center py-4">Aucune certification ajoutée</p>
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="p-4 border border-gray-500 rounded-lg bg-gray-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{cert.nom}</h4>
                          {cert.organisme && <p className="text-sm text-gray-300">{cert.organisme}</p>}
                          <div className="flex gap-4 mt-1 text-xs text-gray-300">
                            {cert.dateObtention && (
                              <span>Obtenue: {new Date(cert.dateObtention).toLocaleDateString('fr-FR')}</span>
                            )}
                            {cert.dateExpiration && (
                              <span className={new Date(cert.dateExpiration) < new Date() ? 'text-red-500' : 'text-green-600'}>
                                Expire: {new Date(cert.dateExpiration).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                          {cert.numeroCertification && (
                            <p className="text-xs text-gray-300 mt-1">ID: {cert.numeroCertification}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {cert.urlVerification && (
                            <a href={cert.urlVerification} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                              Vérifier
                            </a>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteCertification(cert.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* TJM et disponibilité */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Euro className="w-5 h-5" />
                Tarif et disponibilité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-300">TJM souhaité (€/jour)</Label>
                  <Input type="number" value={profile.tjm || ''} onChange={(e) => setProfile({ ...profile, tjm: parseInt(e.target.value) || null })} placeholder="500" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
                <div>
                  <Label className="text-gray-300">TJM minimum</Label>
                  <Input type="number" value={profile.tjmMin || ''} onChange={(e) => setProfile({ ...profile, tjmMin: parseInt(e.target.value) || null })} placeholder="400" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
                <div>
                  <Label className="text-gray-300">TJM maximum</Label>
                  <Input type="number" value={profile.tjmMax || ''} onChange={(e) => setProfile({ ...profile, tjmMax: parseInt(e.target.value) || null })} placeholder="700" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Disponibilité</Label>
                  <Select value={profile.disponibilite} onValueChange={(value) => setProfile({ ...profile, disponibilite: value })}>
                    <SelectTrigger className="bg-gray-500 border-gray-400 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISPONIBILITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Mobilité</Label>
                  <Select value={profile.mobilite} onValueChange={(value) => setProfile({ ...profile, mobilite: value })}>
                    <SelectTrigger className="bg-gray-500 border-gray-400 text-white"><SelectValue /></SelectTrigger>
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
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5" />
                Localisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-300">Adresse</Label>
                  <Input value={profile.adresse || ''} onChange={(e) => setProfile({ ...profile, adresse: e.target.value })} placeholder="123 rue de Paris" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
                <div>
                  <Label className="text-gray-300">Code postal</Label>
                  <Input value={profile.codePostal || ''} onChange={(e) => setProfile({ ...profile, codePostal: e.target.value })} placeholder="75001" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Ville</Label>
                <Input value={profile.ville || ''} onChange={(e) => setProfile({ ...profile, ville: e.target.value })} placeholder="Paris" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
              </div>

              <div>
                <Label className="text-gray-300">Zones géographiques acceptées</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {profile.zonesGeographiques.map((zone) => (
                    <Badge key={zone} variant="outline" className="px-3 py-1 border-gray-400 text-gray-200">
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
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                  <Button variant="outline" onClick={() => addTag('zonesGeographiques', newZone, setNewZone)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Langues */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Languages className="w-5 h-5" />
                  Langues
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowLangueForm(!showLangueForm)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showLangueForm && (
                <div className="p-4 border border-gray-500 rounded-lg bg-gray-700 space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input placeholder="Langue *" value={newLangueData.langue} onChange={(e) => setNewLangueData({ ...newLangueData, langue: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                    <Select value={newLangueData.niveau} onValueChange={(value) => setNewLangueData({ ...newLangueData, niveau: value })}>
                      <SelectTrigger className="bg-gray-500 border-gray-400 text-white">
                        <SelectValue placeholder="Niveau *" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVEAU_LANGUE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Score certif. (TOEIC 920...)" value={newLangueData.scoreCertification} onChange={(e) => setNewLangueData({ ...newLangueData, scoreCertification: e.target.value })} className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addLangue}>Ajouter</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowLangueForm(false)}>Annuler</Button>
                  </div>
                </div>
              )}

              {langues.length === 0 ? (
                <p className="text-gray-300 text-center py-4">Aucune langue ajoutée</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {langues.map((lang) => (
                    <div key={lang.id} className="p-3 border border-gray-500 rounded-lg bg-gray-700 flex justify-between items-center">
                      <div>
                        <span className="font-medium text-white">{lang.langue}</span>
                        {lang.scoreCertification && (
                          <span className="text-xs text-gray-300 ml-2">({lang.scoreCertification})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          lang.niveau === 'NATIF' ? 'bg-green-600' :
                          lang.niveau === 'C2' || lang.niveau === 'C1' ? 'bg-blue-600' :
                          lang.niveau === 'B2' || lang.niveau === 'B1' ? 'bg-yellow-600' :
                          'bg-gray-600'
                        }>
                          {NIVEAU_LANGUE_OPTIONS.find(n => n.value === lang.niveau)?.label || lang.niveau}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => deleteLangue(lang.id)} className="text-red-600 hover:text-red-700 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loisirs */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Heart className="w-5 h-5" />
                Loisirs & Centres d'intérêt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {loisirs.map((loisir) => (
                  <Badge key={loisir} variant="outline" className="px-3 py-1 border-gray-400 text-gray-200">
                    {loisir}
                    <button onClick={() => removeLoisir(loisir)} className="ml-2 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLoisir}
                  onChange={(e) => setNewLoisir(e.target.value)}
                  placeholder="Lecture, Sport, Musique..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLoisir())}
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
                <Button variant="outline" onClick={addLoisir}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Liens */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="text-white">Liens professionnels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 text-gray-300"><Linkedin className="w-4 h-4" />LinkedIn</Label>
                <Input value={profile.linkedinUrl || ''} onChange={(e) => setProfile({ ...profile, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/votre-profil" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-gray-300"><Github className="w-4 h-4" />GitHub</Label>
                <Input value={profile.githubUrl || ''} onChange={(e) => setProfile({ ...profile, githubUrl: e.target.value })} placeholder="https://github.com/votre-profil" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
              </div>
              <div>
                <Label className="flex items-center gap-2 text-gray-300"><Globe className="w-4 h-4" />Portfolio / Site web</Label>
                <Input value={profile.portfolioUrl || ''} onChange={(e) => setProfile({ ...profile, portfolioUrl: e.target.value })} placeholder="https://votre-site.com" className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300" />
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
