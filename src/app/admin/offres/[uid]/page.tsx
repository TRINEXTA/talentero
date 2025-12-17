'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Shield, ArrowLeft, Save, Briefcase, Building2, MapPin, Euro, Calendar,
  Users, Clock, CheckCircle, XCircle, Play, Eye, Send, Loader2, Zap,
  FileText, Globe, Car, Plane, Star, MessageSquare, Phone, Mail,
  UserCheck, UserX, AlertCircle, ThumbsUp, ThumbsDown, MoreHorizontal,
  ChevronDown, ChevronUp, Filter, Search
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Offre {
  uid: string
  codeUnique: string
  slug: string
  titre: string
  description: string
  responsabilites: string | null
  profilRecherche: string | null
  statut: string
  typeOffre: string
  competencesRequises: string[]
  competencesSouhaitees: string[]
  tjmClientReel: number | null
  tjmAffiche: number | null
  tjmMin: number | null
  tjmMax: number | null
  tjmADefinir: boolean
  secteur: string | null
  lieu: string | null
  codePostal: string | null
  ville: string | null
  region: string | null
  mobilite: string
  deplacementMultiSite: boolean
  deplacementEtranger: boolean
  dureeNombre: number | null
  dureeUnite: string
  renouvelable: boolean
  dateDebut: string | null
  dateFin: string | null
  nombrePostes: number
  experienceMin: number | null
  habilitationRequise: boolean
  typeHabilitation: string | null
  visiblePublic: boolean
  nbVues: number
  nbCandidatures: number
  createdAt: string
  publieLe: string | null
  client: {
    uid: string
    codeUnique: string
    raisonSociale: string
  } | null
  _count: {
    candidatures: number
    matchs: number
  }
}

interface Match {
  id: number
  score: number
  talent: {
    uid: string
    codeUnique: string
    prenom: string
    nom: string
    titrePoste: string | null
    competences: string[]
    tjm: number | null
    disponibilite: string
    ville: string | null
    photoUrl: string | null
    statut: string
    user?: {
      email: string
      isActive: boolean
    }
  }
  competencesMatchees: string[]
  competencesManquantes: string[]
}

interface Candidature {
  id: number
  uid: string
  tjmPropose: number | null
  motivation: string | null
  scoreMatch: number | null
  statut: string
  vueLe: string | null
  reponduLe: string | null
  notesTrinexta: string | null
  createdAt: string
  talent: {
    uid: string
    codeUnique: string
    prenom: string
    nom: string
    titrePoste: string | null
    competences: string[]
    tjm: number | null
    tjmMin: number | null
    tjmMax: number | null
    disponibilite: string
    ville: string | null
    photoUrl: string | null
    statut: string
    user?: {
      email: string
      isActive: boolean
      lastLoginAt: string | null
    }
  }
  entretiens: Array<{
    uid: string
    dateHeure: string
    statut: string
  }>
}

interface CandidatureStats {
  total: number
  nouvelle: number
  enRevue: number
  preSelectionne: number
  entretien: number
  acceptee: number
  refusee: number
  matchsSansCandidature: number
}

const STATUT_OPTIONS = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE_VALIDATION', label: 'En attente validation' },
  { value: 'PUBLIEE', label: 'Publiee' },
  { value: 'EN_EVALUATION', label: 'En evaluation candidats' },
  { value: 'SHORTLIST_ENVOYEE', label: 'Shortlist envoyee' },
  { value: 'ENTRETIENS_EN_COURS', label: 'Entretiens en cours' },
  { value: 'POURVUE', label: 'Pourvue' },
  { value: 'FERMEE', label: 'Fermee' },
  { value: 'ANNULEE', label: 'Annulee' },
]

const TYPE_OFFRE_OPTIONS = [
  { value: 'CLIENT_DIRECT', label: 'Client Direct' },
  { value: 'SOUSTRAITANCE', label: 'Sous-traitance' },
  { value: 'TRINEXTA', label: 'TRINEXTA' },
]

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'DEPLACEMENT_MULTI_SITE', label: 'Multi-sites' },
]

const CANDIDATURE_STATUT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  NOUVELLE: { label: 'Nouvelle', color: 'text-blue-400', bgColor: 'bg-blue-600' },
  VUE: { label: 'Vue', color: 'text-gray-400', bgColor: 'bg-gray-600' },
  EN_REVUE: { label: 'En revue', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  PRE_SELECTIONNE: { label: 'Pre-selectionne', color: 'text-purple-400', bgColor: 'bg-purple-600' },
  SHORTLIST: { label: 'Shortlist', color: 'text-indigo-400', bgColor: 'bg-indigo-600' },
  PROPOSEE_CLIENT: { label: 'Propose au client', color: 'text-cyan-400', bgColor: 'bg-cyan-600' },
  ENTRETIEN_DEMANDE: { label: 'Entretien demande', color: 'text-orange-400', bgColor: 'bg-orange-600' },
  ENTRETIEN_PLANIFIE: { label: 'Entretien planifie', color: 'text-orange-300', bgColor: 'bg-orange-500' },
  ENTRETIEN_REALISE: { label: 'Entretien realise', color: 'text-teal-400', bgColor: 'bg-teal-600' },
  ACCEPTEE: { label: 'Acceptee', color: 'text-green-400', bgColor: 'bg-green-600' },
  REFUSEE: { label: 'Refusee', color: 'text-red-400', bgColor: 'bg-red-600' },
  MISSION_PERDUE: { label: 'Mission perdue', color: 'text-gray-500', bgColor: 'bg-gray-700' },
  RETIREE: { label: 'Retiree', color: 'text-gray-500', bgColor: 'bg-gray-700' },
}

export default function AdminOffreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [offre, setOffre] = useState<Offre | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [matchsSansCandidature, setMatchsSansCandidature] = useState<Match[]>([])
  const [candidatureStats, setCandidatureStats] = useState<CandidatureStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningMatching, setRunningMatching] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'matchs' | 'candidatures'>('details')
  const [candidatureFilter, setCandidatureFilter] = useState<string | null>(null)
  const [updatingCandidature, setUpdatingCandidature] = useState<string | null>(null)
  const [expandedCandidature, setExpandedCandidature] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState<string>('')

  useEffect(() => {
    if (uid) {
      fetchOffre()
      fetchMatches()
      fetchCandidatures()
    }
  }, [uid])

  const fetchOffre = async () => {
    try {
      const res = await fetch(`/api/admin/offres/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setOffre(data.offre)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'offre",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const res = await fetch(`/api/admin/offres/${uid}/matches`)
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches || [])
      }
    } catch (error) {
      console.error('Erreur matches:', error)
    }
  }

  const fetchCandidatures = async () => {
    try {
      const res = await fetch(`/api/admin/offres/${uid}/candidatures`)
      if (res.ok) {
        const data = await res.json()
        setCandidatures(data.candidatures || [])
        setMatchsSansCandidature(data.matchsSansCandidature || [])
        setCandidatureStats(data.stats || null)
      }
    } catch (error) {
      console.error('Erreur candidatures:', error)
    }
  }

  const handleSave = async () => {
    if (!offre) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/offres/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offre),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Offre mise a jour",
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

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/admin/offres/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      toast({
        title: "Succes",
        description: `Action "${action}" effectuee`,
      })
      fetchOffre()
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur",
        variant: "destructive",
      })
    }
  }

  const runMatching = async () => {
    setRunningMatching(true)
    try {
      const res = await fetch(`/api/admin/offres/${uid}/matching`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Erreur')
      const data = await res.json()
      toast({
        title: "Matching termine",
        description: `${data.matchCount} talents matches`,
      })
      fetchMatches()
      fetchCandidatures()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du matching",
        variant: "destructive",
      })
    } finally {
      setRunningMatching(false)
    }
  }

  const handleCandidatureAction = async (candidatureUid: string, action: string, notes?: string) => {
    setUpdatingCandidature(candidatureUid)
    try {
      const res = await fetch(`/api/admin/offres/${uid}/candidatures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidatureUid, action, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      toast({
        title: "Succes",
        description: "Candidature mise a jour",
      })
      fetchCandidatures()
      setNoteInput('')
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur",
        variant: "destructive",
      })
    } finally {
      setUpdatingCandidature(null)
    }
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-600' },
      EN_ATTENTE_VALIDATION: { label: 'En attente', className: 'bg-yellow-600' },
      PUBLIEE: { label: 'Publiee', className: 'bg-green-600' },
      EN_EVALUATION: { label: 'En evaluation', className: 'bg-blue-600' },
      SHORTLIST_ENVOYEE: { label: 'Shortlist envoyee', className: 'bg-indigo-600' },
      ENTRETIENS_EN_COURS: { label: 'Entretiens', className: 'bg-purple-600' },
      POURVUE: { label: 'Pourvue', className: 'bg-emerald-600' },
      FERMEE: { label: 'Fermee', className: 'bg-orange-600' },
      ANNULEE: { label: 'Annulee', className: 'bg-red-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getCandidatureStatutBadge = (statut: string) => {
    const config = CANDIDATURE_STATUT_CONFIG[statut] || { label: statut, bgColor: 'bg-gray-600' }
    return <Badge className={config.bgColor}>{config.label}</Badge>
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredCandidatures = candidatureFilter
    ? candidatures.filter(c => {
        if (candidatureFilter === 'nouvelle') return c.statut === 'NOUVELLE'
        if (candidatureFilter === 'en_revue') return c.statut === 'EN_REVUE'
        if (candidatureFilter === 'pre_selectionne') return ['PRE_SELECTIONNE', 'SHORTLIST'].includes(c.statut)
        if (candidatureFilter === 'entretien') return ['ENTRETIEN_DEMANDE', 'ENTRETIEN_PLANIFIE', 'ENTRETIEN_REALISE'].includes(c.statut)
        if (candidatureFilter === 'acceptee') return c.statut === 'ACCEPTEE'
        if (candidatureFilter === 'refusee') return c.statut === 'REFUSEE'
        return true
      })
    : candidatures

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!offre) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Offre non trouvee</h2>
          <Link href="/admin/offres">
            <Button>Retour aux offres</Button>
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
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {offre.titre}
                  {getStatutBadge(offre.statut)}
                </h1>
                <p className="text-sm text-gray-400">{offre.codeUnique}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {offre.statut === 'EN_ATTENTE_VALIDATION' && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('valider')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-600 text-red-400"
                    onClick={() => handleAction('refuser')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Refuser
                  </Button>
                </>
              )}
              {offre.statut === 'PUBLIEE' && (
                <>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={runMatching}
                    disabled={runningMatching}
                  >
                    {runningMatching ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-1" />
                    )}
                    Lancer Matching
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleAction('passer_evaluation')}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Passer en evaluation
                  </Button>
                </>
              )}
              {offre.statut === 'EN_EVALUATION' && (
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => handleAction('envoyer_shortlist')}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Envoyer shortlist
                </Button>
              )}
              {['SHORTLIST_ENVOYEE', 'ENTRETIENS_EN_COURS'].includes(offre.statut) && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction('marquer_pourvue')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Poste pourvu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-600 text-orange-400"
                    onClick={() => handleAction('fermer')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Fermer offre
                  </Button>
                </>
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
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'details' ? 'default' : 'outline'}
            onClick={() => setActiveTab('details')}
            className={activeTab !== 'details' ? 'border-gray-700 text-gray-300' : ''}
          >
            <FileText className="w-4 h-4 mr-2" />
            Details
          </Button>
          <Button
            variant={activeTab === 'matchs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('matchs')}
            className={activeTab !== 'matchs' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Zap className="w-4 h-4 mr-2" />
            Matchs ({matches.length})
          </Button>
          <Button
            variant={activeTab === 'candidatures' ? 'default' : 'outline'}
            onClick={() => setActiveTab('candidatures')}
            className={activeTab !== 'candidatures' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Users className="w-4 h-4 mr-2" />
            Candidatures ({candidatures.length})
          </Button>
        </div>

        {activeTab === 'details' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Infos generales */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Informations generales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Titre</Label>
                    <Input
                      value={offre.titre}
                      onChange={(e) => setOffre({ ...offre, titre: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Statut</Label>
                      <Select
                        value={offre.statut}
                        onValueChange={(value) => setOffre({ ...offre, statut: value })}
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
                    <div>
                      <Label className="text-gray-300">Type d'offre</Label>
                      <Select
                        value={offre.typeOffre}
                        onValueChange={(value) => setOffre({ ...offre, typeOffre: value })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OFFRE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={offre.description}
                      onChange={(e) => setOffre({ ...offre, description: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white min-h-[150px]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Responsabilites</Label>
                    <Textarea
                      value={offre.responsabilites || ''}
                      onChange={(e) => setOffre({ ...offre, responsabilites: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Profil recherche</Label>
                    <Textarea
                      value={offre.profilRecherche || ''}
                      onChange={(e) => setOffre({ ...offre, profilRecherche: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Competences */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Competences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Competences requises</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {offre.competencesRequises.map((comp, i) => (
                        <Badge key={i} className="bg-primary">{comp}</Badge>
                      ))}
                    </div>
                    <Input
                      placeholder="Ajouter (separez par virgule)"
                      className="mt-2 bg-gray-700 border-gray-600 text-white"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const value = (e.target as HTMLInputElement).value
                          if (value) {
                            const newComps = value.split(',').map(c => c.trim()).filter(c => c)
                            setOffre({
                              ...offre,
                              competencesRequises: [...offre.competencesRequises, ...newComps]
                            });
                            (e.target as HTMLInputElement).value = ''
                          }
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Competences souhaitees</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {offre.competencesSouhaitees.map((comp, i) => (
                        <Badge key={i} variant="outline" className="border-gray-600 text-gray-300">{comp}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonne laterale */}
            <div className="space-y-6">
              {/* Client */}
              {offre.client && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/admin/clients/${offre.client.uid}`}>
                      <div className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                        <p className="font-medium text-white">{offre.client.raisonSociale}</p>
                        <p className="text-sm text-gray-400">{offre.client.codeUnique}</p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

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
                    <Label className="text-gray-300">TJM Client Reel (confidentiel)</Label>
                    <Input
                      type="number"
                      value={offre.tjmClientReel || ''}
                      onChange={(e) => setOffre({ ...offre, tjmClientReel: parseInt(e.target.value) || null })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Ex: 600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-300">TJM Min affiche</Label>
                      <Input
                        type="number"
                        value={offre.tjmMin || ''}
                        onChange={(e) => setOffre({ ...offre, tjmMin: parseInt(e.target.value) || null })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">TJM Max affiche</Label>
                      <Input
                        type="number"
                        value={offre.tjmMax || ''}
                        onChange={(e) => setOffre({ ...offre, tjmMax: parseInt(e.target.value) || null })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
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
                    <Label className="text-gray-300">Lieu</Label>
                    <Input
                      value={offre.lieu || ''}
                      onChange={(e) => setOffre({ ...offre, lieu: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Ville</Label>
                    <Input
                      value={offre.ville || ''}
                      onChange={(e) => setOffre({ ...offre, ville: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Mobilite</Label>
                    <Select
                      value={offre.mobilite}
                      onValueChange={(value) => setOffre({ ...offre, mobilite: value })}
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

              {/* Duree */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Duree
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-gray-300">Duree</Label>
                      <Input
                        type="number"
                        value={offre.dureeNombre || ''}
                        onChange={(e) => setOffre({ ...offre, dureeNombre: parseInt(e.target.value) || null })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Unite</Label>
                      <Select
                        value={offre.dureeUnite}
                        onValueChange={(value) => setOffre({ ...offre, dureeUnite: value })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MOIS">Mois</SelectItem>
                          <SelectItem value="JOURS">Jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Date de debut</Label>
                    <Input
                      type="date"
                      value={offre.dateDebut?.split('T')[0] || ''}
                      onChange={(e) => setOffre({ ...offre, dateDebut: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Experience minimum (annees)</Label>
                    <Input
                      type="number"
                      value={offre.experienceMin || ''}
                      onChange={(e) => setOffre({ ...offre, experienceMin: parseInt(e.target.value) || null })}
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
                      <Eye className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-2xl font-bold text-white">{offre.nbVues}</p>
                      <p className="text-xs text-gray-400">Vues</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                      <p className="text-2xl font-bold text-white">{candidatures.length}</p>
                      <p className="text-xs text-gray-400">Candidatures</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                      <p className="text-2xl font-bold text-white">{matches.length}</p>
                      <p className="text-xs text-gray-400">Matchs</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-sm font-medium text-white">
                        {new Date(offre.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-gray-400">Creee</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'matchs' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Talents matches</h2>
              <Button
                onClick={runMatching}
                disabled={runningMatching}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {runningMatching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Relancer le matching
              </Button>
            </div>

            {matches.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucun match pour le moment</p>
                  <Button className="mt-4" onClick={runMatching} disabled={runningMatching}>
                    Lancer le matching
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Card key={match.id} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            match.score >= 80 ? 'bg-green-600/20' : match.score >= 60 ? 'bg-yellow-600/20' : 'bg-red-600/20'
                          }`}>
                            <span className={`text-lg font-bold ${getScoreColor(match.score)}`}>{match.score}%</span>
                          </div>
                          <div>
                            <Link href={`/admin/talents/${match.talent.uid}`}>
                              <h3 className="font-medium text-white hover:text-primary">
                                {match.talent.prenom} {match.talent.nom}
                              </h3>
                            </Link>
                            <p className="text-sm text-gray-400">
                              {match.talent.codeUnique} - {match.talent.titrePoste || 'Freelance'}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {match.competencesMatchees.slice(0, 5).map((c, i) => (
                                <Badge key={i} className="bg-green-600/20 text-green-400 text-xs">
                                  {c}
                                </Badge>
                              ))}
                              {match.competencesManquantes.slice(0, 3).map((c, i) => (
                                <Badge key={i} className="bg-red-600/20 text-red-400 text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">
                            {match.talent.tjm ? `${match.talent.tjm}EUR/j` : 'TJM N/A'}
                          </p>
                          <p className="text-sm text-gray-400">{match.talent.disponibilite}</p>
                          <Link href={`/admin/talents/${match.talent.uid}`}>
                            <Button size="sm" variant="outline" className="mt-2 border-gray-600">
                              Voir profil
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'candidatures' && (
          <div className="space-y-6">
            {/* Stats candidatures */}
            {candidatureStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-primary transition ${!candidatureFilter ? 'border-primary' : ''}`}
                  onClick={() => setCandidatureFilter(null)}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-white">{candidatureStats.total}</p>
                    <p className="text-xs text-gray-400">Total</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-blue-500 transition ${candidatureFilter === 'nouvelle' ? 'border-blue-500' : ''}`}
                  onClick={() => setCandidatureFilter('nouvelle')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{candidatureStats.nouvelle}</p>
                    <p className="text-xs text-gray-400">Nouvelles</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-yellow-500 transition ${candidatureFilter === 'en_revue' ? 'border-yellow-500' : ''}`}
                  onClick={() => setCandidatureFilter('en_revue')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{candidatureStats.enRevue}</p>
                    <p className="text-xs text-gray-400">En revue</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-purple-500 transition ${candidatureFilter === 'pre_selectionne' ? 'border-purple-500' : ''}`}
                  onClick={() => setCandidatureFilter('pre_selectionne')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">{candidatureStats.preSelectionne}</p>
                    <p className="text-xs text-gray-400">Preselectionnes</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-orange-500 transition ${candidatureFilter === 'entretien' ? 'border-orange-500' : ''}`}
                  onClick={() => setCandidatureFilter('entretien')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-orange-400">{candidatureStats.entretien}</p>
                    <p className="text-xs text-gray-400">Entretiens</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-green-500 transition ${candidatureFilter === 'acceptee' ? 'border-green-500' : ''}`}
                  onClick={() => setCandidatureFilter('acceptee')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{candidatureStats.acceptee}</p>
                    <p className="text-xs text-gray-400">Acceptees</p>
                  </CardContent>
                </Card>
                <Card
                  className={`bg-gray-800 border-gray-700 cursor-pointer hover:border-red-500 transition ${candidatureFilter === 'refusee' ? 'border-red-500' : ''}`}
                  onClick={() => setCandidatureFilter('refusee')}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">{candidatureStats.refusee}</p>
                    <p className="text-xs text-gray-400">Refusees</p>
                  </CardContent>
                </Card>
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-cyan-400">{candidatureStats.matchsSansCandidature}</p>
                    <p className="text-xs text-gray-400">Matchs en attente</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Liste des candidatures */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Candidatures ({filteredCandidatures.length})
              </h3>

              {filteredCandidatures.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-12 text-center">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Aucune candidature</p>
                  </CardContent>
                </Card>
              ) : (
                filteredCandidatures.map((candidature) => (
                  <Card key={candidature.uid} className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Score */}
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                            (candidature.scoreMatch || 0) >= 80 ? 'bg-green-600/20' :
                            (candidature.scoreMatch || 0) >= 60 ? 'bg-yellow-600/20' : 'bg-red-600/20'
                          }`}>
                            <span className={`text-lg font-bold ${getScoreColor(candidature.scoreMatch)}`}>
                              {candidature.scoreMatch || 0}%
                            </span>
                          </div>

                          {/* Info candidat */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/admin/talents/${candidature.talent.uid}`}>
                                <h4 className="font-medium text-white hover:text-primary">
                                  {candidature.talent.prenom} {candidature.talent.nom}
                                </h4>
                              </Link>
                              {getCandidatureStatutBadge(candidature.statut)}
                              {candidature.talent.user?.isActive === false && (
                                <Badge className="bg-orange-600">Compte inactif</Badge>
                              )}
                              {!candidature.vueLe && candidature.statut === 'NOUVELLE' && (
                                <Badge className="bg-blue-600 animate-pulse">Nouveau</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400">
                              {candidature.talent.codeUnique} - {candidature.talent.titrePoste || 'Freelance'}
                              {candidature.talent.ville && ` - ${candidature.talent.ville}`}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {candidature.tjmPropose ? `${candidature.tjmPropose}EUR/j propose` :
                                 candidature.talent.tjm ? `${candidature.talent.tjm}EUR/j` : 'TJM N/A'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {candidature.talent.disponibilite}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(candidature.createdAt)}
                              </span>
                            </div>

                            {/* Competences */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {candidature.talent.competences.slice(0, 6).map((c, i) => (
                                <Badge key={i} className="bg-gray-700 text-gray-300 text-xs">
                                  {c}
                                </Badge>
                              ))}
                              {candidature.talent.competences.length > 6 && (
                                <Badge className="bg-gray-700 text-gray-400 text-xs">
                                  +{candidature.talent.competences.length - 6}
                                </Badge>
                              )}
                            </div>

                            {/* Motivation (si expandue) */}
                            {expandedCandidature === candidature.uid && candidature.motivation && (
                              <div className="mt-3 p-3 bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-300">{candidature.motivation}</p>
                              </div>
                            )}

                            {/* Notes TRINEXTA */}
                            {candidature.notesTrinexta && (
                              <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
                                <p className="text-xs text-yellow-400">
                                  <strong>Note interne:</strong> {candidature.notesTrinexta}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedCandidature(
                              expandedCandidature === candidature.uid ? null : candidature.uid
                            )}
                          >
                            {expandedCandidature === candidature.uid ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>

                          <Link href={`/admin/talents/${candidature.talent.uid}`}>
                            <Button size="sm" variant="outline" className="border-gray-600">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-600"
                                disabled={updatingCandidature === candidature.uid}
                              >
                                {updatingCandidature === candidature.uid ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {candidature.statut === 'NOUVELLE' && (
                                <DropdownMenuItem
                                  onClick={() => handleCandidatureAction(candidature.uid, 'marquer_vue')}
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Marquer comme vue
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'mettre_en_revue')}
                              >
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Mettre en revue
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'pre_selectionner')}
                                className="text-purple-400"
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Pre-selectionner
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'ajouter_shortlist')}
                                className="text-indigo-400"
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Ajouter a la shortlist
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'proposer_client')}
                                className="text-cyan-400"
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Proposer au client
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'demander_entretien')}
                                className="text-orange-400"
                              >
                                <Phone className="w-4 h-4 mr-2" />
                                Demander entretien
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'attente_client')}
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Attente retour client
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'accepter')}
                                className="text-green-400"
                              >
                                <ThumbsUp className="w-4 h-4 mr-2" />
                                Accepter / Valider
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCandidatureAction(candidature.uid, 'refuser')}
                                className="text-red-400"
                              >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Refuser
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Matchs sans candidature */}
            {matchsSansCandidature.length > 0 && (
              <div className="space-y-3 mt-8">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Talents matches (sans candidature) ({matchsSansCandidature.length})
                </h3>
                <p className="text-sm text-gray-400">
                  Ces talents correspondent au profil recherche mais n'ont pas encore postule.
                </p>

                <div className="grid md:grid-cols-2 gap-3">
                  {matchsSansCandidature.slice(0, 10).map((match) => (
                    <Card key={match.id} className="bg-gray-800 border-gray-700 border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            match.score >= 80 ? 'bg-green-600/20' : match.score >= 60 ? 'bg-yellow-600/20' : 'bg-red-600/20'
                          }`}>
                            <span className={`text-sm font-bold ${getScoreColor(match.score)}`}>{match.score}%</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link href={`/admin/talents/${match.talent.uid}`}>
                              <p className="font-medium text-white hover:text-primary truncate">
                                {match.talent.prenom} {match.talent.nom}
                              </p>
                            </Link>
                            <p className="text-xs text-gray-400 truncate">
                              {match.talent.titrePoste || 'Freelance'} - {match.talent.tjm ? `${match.talent.tjm}EUR/j` : 'TJM N/A'}
                            </p>
                          </div>
                          <Link href={`/admin/talents/${match.talent.uid}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {matchsSansCandidature.length > 10 && (
                  <p className="text-sm text-gray-400 text-center">
                    Et {matchsSansCandidature.length - 10} autres matchs...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
