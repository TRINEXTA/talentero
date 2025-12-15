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
  FileText, Globe, Car, Plane
} from 'lucide-react'

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
  }
  competencesMatchees: string[]
  competencesManquantes: string[]
}

const STATUT_OPTIONS = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE_VALIDATION', label: 'En attente validation' },
  { value: 'PUBLIEE', label: 'Publiee' },
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

export default function AdminOffreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [offre, setOffre] = useState<Offre | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningMatching, setRunningMatching] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'matchs' | 'candidatures'>('details')

  useEffect(() => {
    if (uid) {
      fetchOffre()
      fetchMatches()
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

  const handleSave = async () => {
    if (!offre) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/offres/${uid}`, {
        method: 'PUT',
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

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-600' },
      EN_ATTENTE_VALIDATION: { label: 'En attente', className: 'bg-yellow-600' },
      PUBLIEE: { label: 'Publiee', className: 'bg-green-600' },
      SHORTLIST_ENVOYEE: { label: 'Shortlist envoyee', className: 'bg-blue-600' },
      ENTRETIENS_EN_COURS: { label: 'Entretiens', className: 'bg-purple-600' },
      POURVUE: { label: 'Pourvue', className: 'bg-emerald-600' },
      FERMEE: { label: 'Fermee', className: 'bg-orange-600' },
      ANNULEE: { label: 'Annulee', className: 'bg-red-600' },
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
            Candidatures ({offre._count.candidatures})
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
                      <p className="text-2xl font-bold text-white">{offre._count.candidatures}</p>
                      <p className="text-xs text-gray-400">Candidatures</p>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <Zap className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                      <p className="text-2xl font-bold text-white">{offre._count.matchs}</p>
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
                          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">{match.score}%</span>
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
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {offre._count.candidatures} candidature(s)
              </p>
              <Link href={`/admin/candidatures?offre=${offre.uid}`}>
                <Button className="mt-4">Voir les candidatures</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
