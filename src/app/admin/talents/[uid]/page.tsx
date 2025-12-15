'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Shield, ArrowLeft, Save, User, Briefcase, MapPin, Euro, Clock,
  Mail, Phone, Globe, Github, Linkedin, FileText, Calendar,
  CheckCircle, XCircle, Loader2, Send, Eye, Building2
} from 'lucide-react'

interface Talent {
  uid: string
  codeUnique: string
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
  disponibleLe: string | null
  ville: string | null
  codePostal: string | null
  adresse: string | null
  siret: string | null
  raisonSociale: string | null
  langues: string[]
  certifications: string[]
  linkedinUrl: string | null
  githubUrl: string | null
  portfolioUrl: string | null
  photoUrl: string | null
  cvUrl: string | null
  statut: string
  visiblePublic: boolean
  visibleVitrine: boolean
  compteComplet: boolean
  compteLimite: boolean
  importeParAdmin: boolean
  createdAt: string
  user: {
    uid: string
    email: string
    emailVerified: boolean
    isActive: boolean
    lastLoginAt: string | null
    activationToken: string | null
  }
  experiences: Array<{
    id: number
    poste: string
    entreprise: string | null
    dateDebut: string
    dateFin: string | null
    enCours: boolean
    description: string | null
  }>
  formations: Array<{
    id: number
    diplome: string
    etablissement: string | null
    annee: number | null
  }>
  _count: {
    candidatures: number
    matchs: number
  }
}

const STATUT_OPTIONS = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'EN_MISSION', label: 'En mission' },
  { value: 'SUSPENDU', label: 'Suspendu' },
]

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'DEPLACEMENT_MULTI_SITE', label: 'Multi-sites' },
]

const DISPONIBILITE_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'SOUS_15_JOURS', label: 'Sous 15 jours' },
  { value: 'SOUS_1_MOIS', label: 'Sous 1 mois' },
  { value: 'SOUS_2_MOIS', label: 'Sous 2 mois' },
  { value: 'SOUS_3_MOIS', label: 'Sous 3 mois' },
  { value: 'DATE_PRECISE', label: 'Date precise' },
  { value: 'NON_DISPONIBLE', label: 'Non disponible' },
]

export default function AdminTalentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [talent, setTalent] = useState<Talent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingActivation, setSendingActivation] = useState(false)
  const [activeTab, setActiveTab] = useState<'profil' | 'experiences' | 'candidatures'>('profil')

  useEffect(() => {
    if (uid) {
      fetchTalent()
    }
  }, [uid])

  const fetchTalent = async () => {
    try {
      const res = await fetch(`/api/admin/talents/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setTalent(data.talent)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger le talent",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!talent) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/talents/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: talent.prenom,
          nom: talent.nom,
          telephone: talent.telephone,
          titrePoste: talent.titrePoste,
          bio: talent.bio,
          competences: talent.competences,
          anneesExperience: talent.anneesExperience,
          tjm: talent.tjm,
          tjmMin: talent.tjmMin,
          tjmMax: talent.tjmMax,
          mobilite: talent.mobilite,
          zonesGeographiques: talent.zonesGeographiques,
          disponibilite: talent.disponibilite,
          disponibleLe: talent.disponibleLe,
          ville: talent.ville,
          codePostal: talent.codePostal,
          adresse: talent.adresse,
          siret: talent.siret,
          raisonSociale: talent.raisonSociale,
          langues: talent.langues,
          certifications: talent.certifications,
          linkedinUrl: talent.linkedinUrl,
          githubUrl: talent.githubUrl,
          portfolioUrl: talent.portfolioUrl,
          statut: talent.statut,
          visiblePublic: talent.visiblePublic,
          visibleVitrine: talent.visibleVitrine,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Talent mis a jour",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const sendActivationEmail = async () => {
    if (!talent) return
    setSendingActivation(true)
    try {
      const res = await fetch(`/api/admin/talents/${uid}/send-activation`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Email envoye",
        description: "L'email d'activation a ete envoye",
      })
      fetchTalent() // Refresh pour avoir le nouveau token
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email",
        variant: "destructive",
      })
    } finally {
      setSendingActivation(false)
    }
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      ACTIF: { label: 'Actif', className: 'bg-green-600' },
      INACTIF: { label: 'Inactif', className: 'bg-gray-600' },
      EN_MISSION: { label: 'En mission', className: 'bg-blue-600' },
      SUSPENDU: { label: 'Suspendu', className: 'bg-red-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Talent non trouve</h2>
          <Link href="/admin/talents">
            <Button>Retour aux talents</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/talents" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {talent.prenom} {talent.nom}
                  {getStatutBadge(talent.statut)}
                </h1>
                <p className="text-sm text-gray-400">{talent.codeUnique} - {talent.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!talent.user.emailVerified && talent.user.activationToken && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendActivationEmail}
                  disabled={sendingActivation}
                  className="border-yellow-600 text-yellow-400"
                >
                  {sendingActivation ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Renvoyer activation
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alertes */}
        {!talent.user.emailVerified && (
          <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg flex items-center gap-3">
            <Mail className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-yellow-400 font-medium">Compte non active</p>
              <p className="text-sm text-yellow-300">
                Ce talent n'a pas encore active son compte.
                {talent.user.activationToken ? ' Un lien d\'activation est disponible.' : ' Aucun token d\'activation.'}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'profil' ? 'default' : 'outline'}
            onClick={() => setActiveTab('profil')}
            className={activeTab !== 'profil' ? 'border-gray-700 text-gray-300' : ''}
          >
            <User className="w-4 h-4 mr-2" />
            Profil
          </Button>
          <Button
            variant={activeTab === 'experiences' ? 'default' : 'outline'}
            onClick={() => setActiveTab('experiences')}
            className={activeTab !== 'experiences' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Experiences ({talent.experiences.length})
          </Button>
          <Button
            variant={activeTab === 'candidatures' ? 'default' : 'outline'}
            onClick={() => setActiveTab('candidatures')}
            className={activeTab !== 'candidatures' ? 'border-gray-700 text-gray-300' : ''}
          >
            <FileText className="w-4 h-4 mr-2" />
            Candidatures ({talent._count.candidatures})
          </Button>
        </div>

        {activeTab === 'profil' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Infos personnelles */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informations personnelles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Prenom</Label>
                      <Input
                        value={talent.prenom}
                        onChange={(e) => setTalent({ ...talent, prenom: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Nom</Label>
                      <Input
                        value={talent.nom}
                        onChange={(e) => setTalent({ ...talent, nom: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Telephone</Label>
                      <Input
                        value={talent.telephone || ''}
                        onChange={(e) => setTalent({ ...talent, telephone: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email</Label>
                      <Input
                        value={talent.user.email}
                        disabled
                        className="bg-gray-700 border-gray-600 text-gray-400"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Titre / Poste</Label>
                    <Input
                      value={talent.titrePoste || ''}
                      onChange={(e) => setTalent({ ...talent, titrePoste: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Bio</Label>
                    <Textarea
                      value={talent.bio || ''}
                      onChange={(e) => setTalent({ ...talent, bio: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Competences */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Competences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {talent.competences.map((comp, i) => (
                      <Badge key={i} className="bg-primary">{comp}</Badge>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Label className="text-gray-300">Annees d'experience</Label>
                    <Input
                      type="number"
                      value={talent.anneesExperience}
                      onChange={(e) => setTalent({ ...talent, anneesExperience: parseInt(e.target.value) || 0 })}
                      className="bg-gray-700 border-gray-600 text-white w-32"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Entreprise / SIRET */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">SIRET</Label>
                      <Input
                        value={talent.siret || ''}
                        onChange={(e) => setTalent({ ...talent, siret: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Raison sociale</Label>
                      <Input
                        value={talent.raisonSociale || ''}
                        onChange={(e) => setTalent({ ...talent, raisonSociale: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Liens */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Liens</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Linkedin className="w-4 h-4" /> LinkedIn
                    </Label>
                    <Input
                      value={talent.linkedinUrl || ''}
                      onChange={(e) => setTalent({ ...talent, linkedinUrl: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Github className="w-4 h-4" /> GitHub
                    </Label>
                    <Input
                      value={talent.githubUrl || ''}
                      onChange={(e) => setTalent({ ...talent, githubUrl: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Portfolio
                    </Label>
                    <Input
                      value={talent.portfolioUrl || ''}
                      onChange={(e) => setTalent({ ...talent, portfolioUrl: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  {talent.cvUrl && (
                    <div>
                      <Label className="text-gray-300">CV</Label>
                      <a
                        href={talent.cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                      >
                        <FileText className="w-4 h-4 inline mr-2" />
                        Voir le CV
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Colonne laterale */}
            <div className="space-y-6">
              {/* Statut */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Statut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Statut du compte</Label>
                    <Select
                      value={talent.statut}
                      onValueChange={(value) => setTalent({ ...talent, statut: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="visiblePublic"
                        checked={talent.visiblePublic}
                        onChange={(e) => setTalent({ ...talent, visiblePublic: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="visiblePublic" className="text-gray-300">Visible publiquement</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="visibleVitrine"
                        checked={talent.visibleVitrine}
                        onChange={(e) => setTalent({ ...talent, visibleVitrine: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="visibleVitrine" className="text-gray-300">Affiche sur la vitrine</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TJM */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    TJM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">TJM souhaite</Label>
                    <Input
                      type="number"
                      value={talent.tjm || ''}
                      onChange={(e) => setTalent({ ...talent, tjm: parseInt(e.target.value) || null })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-300">Min</Label>
                      <Input
                        type="number"
                        value={talent.tjmMin || ''}
                        onChange={(e) => setTalent({ ...talent, tjmMin: parseInt(e.target.value) || null })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Max</Label>
                      <Input
                        type="number"
                        value={talent.tjmMax || ''}
                        onChange={(e) => setTalent({ ...talent, tjmMax: parseInt(e.target.value) || null })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Disponibilite */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Disponibilite
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Disponibilite</Label>
                    <Select
                      value={talent.disponibilite}
                      onValueChange={(value) => setTalent({ ...talent, disponibilite: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
                    <Label className="text-gray-300">Mobilite</Label>
                    <Select
                      value={talent.mobilite}
                      onValueChange={(value) => setTalent({ ...talent, mobilite: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
                </CardContent>
              </Card>

              {/* Localisation */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Localisation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Ville</Label>
                    <Input
                      value={talent.ville || ''}
                      onChange={(e) => setTalent({ ...talent, ville: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Code postal</Label>
                    <Input
                      value={talent.codePostal || ''}
                      onChange={(e) => setTalent({ ...talent, codePostal: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-white">{talent._count.candidatures}</p>
                      <p className="text-xs text-gray-400">Candidatures</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-white">{talent._count.matchs}</p>
                      <p className="text-xs text-gray-400">Matchs</p>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    <p>Inscrit le {new Date(talent.createdAt).toLocaleDateString('fr-FR')}</p>
                    {talent.user.lastLoginAt && (
                      <p>Derniere connexion: {new Date(talent.user.lastLoginAt).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'experiences' && (
          <div className="space-y-4">
            {talent.experiences.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucune experience enregistree</p>
                </CardContent>
              </Card>
            ) : (
              talent.experiences.map((exp) => (
                <Card key={exp.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">{exp.poste}</h3>
                        {exp.entreprise && <p className="text-gray-400">{exp.entreprise}</p>}
                        <p className="text-sm text-gray-500">
                          {new Date(exp.dateDebut).toLocaleDateString('fr-FR')} -
                          {exp.enCours ? ' En cours' : exp.dateFin ? ` ${new Date(exp.dateFin).toLocaleDateString('fr-FR')}` : ''}
                        </p>
                      </div>
                      {exp.enCours && <Badge className="bg-green-600">En cours</Badge>}
                    </div>
                    {exp.description && (
                      <p className="mt-3 text-gray-300 text-sm">{exp.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}

            {talent.formations.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-white mt-8 mb-4">Formations</h3>
                {talent.formations.map((form) => (
                  <Card key={form.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-6">
                      <h4 className="font-semibold text-white">{form.diplome}</h4>
                      {form.etablissement && <p className="text-gray-400">{form.etablissement}</p>}
                      {form.annee && <p className="text-sm text-gray-500">{form.annee}</p>}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {activeTab === 'candidatures' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{talent._count.candidatures} candidature(s)</p>
              <Link href={`/admin/candidatures?talent=${talent.uid}`}>
                <Button className="mt-4">Voir les candidatures</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
