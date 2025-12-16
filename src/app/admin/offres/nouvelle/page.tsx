'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Shield, ArrowLeft, Save, Briefcase, Building2, MapPin, Euro, Clock,
  Plus, X, Loader2
} from 'lucide-react'

interface Client {
  uid: string
  codeUnique: string
  raisonSociale: string
}

const TYPE_OFFRE_OPTIONS = [
  { value: 'CLIENT_DIRECT', label: 'Client Direct' },
  { value: 'SOUSTRAITANCE', label: 'Sous-traitance' },
  { value: 'TRINEXTA', label: 'TRINEXTA (sans client)' },
]

const MOBILITE_OPTIONS = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'DEPLACEMENT_MULTI_SITE', label: 'Multi-sites' },
]

const DUREE_UNITE_OPTIONS = [
  { value: 'MOIS', label: 'Mois' },
  { value: 'JOURS', label: 'Jours' },
]

export default function AdminNouvelleOffrePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    clientUid: '',
    typeOffre: 'CLIENT_DIRECT',
    titre: '',
    description: '',
    responsabilites: '',
    profilRecherche: '',
    competencesRequises: [] as string[],
    competencesSouhaitees: [] as string[],
    tjmClientReel: '',
    tjmMin: '',
    tjmMax: '',
    tjmADefinir: false,
    lieu: '',
    ville: '',
    codePostal: '',
    secteur: '',
    mobilite: 'FLEXIBLE',
    deplacementMultiSite: false,
    deplacementEtranger: false,
    dureeNombre: '',
    dureeUnite: 'MOIS',
    renouvelable: false,
    dateDebut: '',
    nombrePostes: '1',
    experienceMin: '',
    habilitationRequise: false,
    typeHabilitation: '',
    visiblePublic: true,
  })

  const [newCompetenceRequise, setNewCompetenceRequise] = useState('')
  const [newCompetenceSouhaitee, setNewCompetenceSouhaitee] = useState('')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients?statut=ACTIF')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setClients(data.clients || [])
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  // Parse et ajoute plusieurs compétences (séparées par virgule)
  const addCompetenceRequise = () => {
    const input = newCompetenceRequise.trim()
    if (!input) return

    // Sépare par virgule et nettoie chaque compétence
    const newComps = input
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0 && !formData.competencesRequises.includes(c))

    if (newComps.length > 0) {
      setFormData({
        ...formData,
        competencesRequises: [...formData.competencesRequises, ...newComps]
      })
    }
    setNewCompetenceRequise('')
  }

  const removeCompetenceRequise = (comp: string) => {
    setFormData({
      ...formData,
      competencesRequises: formData.competencesRequises.filter(c => c !== comp)
    })
  }

  // Parse et ajoute plusieurs compétences (séparées par virgule)
  const addCompetenceSouhaitee = () => {
    const input = newCompetenceSouhaitee.trim()
    if (!input) return

    // Sépare par virgule et nettoie chaque compétence
    const newComps = input
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0 && !formData.competencesSouhaitees.includes(c))

    if (newComps.length > 0) {
      setFormData({
        ...formData,
        competencesSouhaitees: [...formData.competencesSouhaitees, ...newComps]
      })
    }
    setNewCompetenceSouhaitee('')
  }

  const removeCompetenceSouhaitee = (comp: string) => {
    setFormData({
      ...formData,
      competencesSouhaitees: formData.competencesSouhaitees.filter(c => c !== comp)
    })
  }

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault()

    if (!formData.titre.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est requis",
        variant: "destructive",
      })
      return
    }

    if (!formData.description.trim()) {
      toast({
        title: "Erreur",
        description: "La description est requise",
        variant: "destructive",
      })
      return
    }

    if (formData.competencesRequises.length === 0) {
      toast({
        title: "Erreur",
        description: "Au moins une competence requise est necessaire",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/admin/offres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          clientUid: formData.clientUid === 'none' ? null : formData.clientUid || null,
          tjmClientReel: formData.tjmClientReel ? parseInt(formData.tjmClientReel) : null,
          tjmMin: formData.tjmMin ? parseInt(formData.tjmMin) : null,
          tjmMax: formData.tjmMax ? parseInt(formData.tjmMax) : null,
          dureeNombre: formData.dureeNombre ? parseInt(formData.dureeNombre) : null,
          nombrePostes: parseInt(formData.nombrePostes) || 1,
          experienceMin: formData.experienceMin ? parseInt(formData.experienceMin) : null,
          dateDebut: formData.dateDebut || null,
          publierMaintenant: publish,
          createdByAdmin: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }

      const data = await res.json()

      toast({
        title: "Succes",
        description: publish ? "Offre creee et publiee" : "Offre creee en brouillon",
      })

      router.push(`/admin/offres/${data.offre.uid}`)
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la creation",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-white">Nouvelle offre</h1>
                <Badge className="bg-red-600">
                  <Shield className="w-3 h-3 mr-1" />
                  ADMIN
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={(e) => handleSubmit(e, false)}
                disabled={saving}
                className="border-gray-600 text-gray-300"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Brouillon
              </Button>
              <Button
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Creer et Publier
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Type et Client */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Type d'offre et Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Type d'offre *</Label>
                  <Select
                    value={formData.typeOffre}
                    onValueChange={(value) => setFormData({ ...formData, typeOffre: value })}
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
                <div>
                  <Label className="text-gray-300">Client</Label>
                  <Select
                    value={formData.clientUid}
                    onValueChange={(value) => setFormData({ ...formData, clientUid: value })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Selectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun client (TRINEXTA)</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.uid} value={client.uid}>
                          {client.raisonSociale} ({client.codeUnique})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations generales */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Informations generales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Titre de la mission *</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Ex: Developpeur Full Stack Java/Angular"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la mission, contexte, environnement technique..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[150px]"
                />
              </div>
              <div>
                <Label className="text-gray-300">Responsabilites</Label>
                <Textarea
                  value={formData.responsabilites}
                  onChange={(e) => setFormData({ ...formData, responsabilites: e.target.value })}
                  placeholder="- Developper de nouvelles fonctionnalites&#10;- Participer aux code reviews..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Profil recherche</Label>
                <Textarea
                  value={formData.profilRecherche}
                  onChange={(e) => setFormData({ ...formData, profilRecherche: e.target.value })}
                  placeholder="Profil senior avec experience en..."
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
                <Label className="text-gray-300">Competences requises *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.competencesRequises.map((comp, i) => (
                    <Badge key={i} className="bg-primary px-3 py-1">
                      {comp}
                      <button
                        type="button"
                        onClick={() => removeCompetenceRequise(comp)}
                        className="ml-2 hover:text-red-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCompetenceRequise}
                    onChange={(e) => setNewCompetenceRequise(e.target.value)}
                    placeholder="Ex: Windows, Office 365, réseaux, WIFI (séparés par virgule)"
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetenceRequise())}
                  />
                  <Button type="button" onClick={addCompetenceRequise} variant="outline" className="border-gray-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Astuce: séparez plusieurs compétences par des virgules</p>
              </div>
              <div>
                <Label className="text-gray-300">Competences souhaitees</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.competencesSouhaitees.map((comp, i) => (
                    <Badge key={i} variant="outline" className="border-gray-600 text-gray-300 px-3 py-1">
                      {comp}
                      <button
                        type="button"
                        onClick={() => removeCompetenceSouhaitee(comp)}
                        className="ml-2 hover:text-red-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newCompetenceSouhaitee}
                    onChange={(e) => setNewCompetenceSouhaitee(e.target.value)}
                    placeholder="Ex: AWS, Kubernetes, Docker (séparés par virgule)"
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetenceSouhaitee())}
                  />
                  <Button type="button" onClick={addCompetenceSouhaitee} variant="outline" className="border-gray-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TJM */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Tarif Journalier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="tjmADefinir"
                  checked={formData.tjmADefinir}
                  onChange={(e) => setFormData({ ...formData, tjmADefinir: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="tjmADefinir" className="text-gray-300">TJM a definir</Label>
              </div>
              {!formData.tjmADefinir && (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">TJM Client Reel (confidentiel)</Label>
                    <Input
                      type="number"
                      value={formData.tjmClientReel}
                      onChange={(e) => setFormData({ ...formData, tjmClientReel: e.target.value })}
                      placeholder="600"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                    <p className="text-xs text-gray-500 mt-1">Jamais affiche</p>
                  </div>
                  <div>
                    <Label className="text-gray-300">TJM Min (affiche)</Label>
                    <Input
                      type="number"
                      value={formData.tjmMin}
                      onChange={(e) => setFormData({ ...formData, tjmMin: e.target.value })}
                      placeholder="400"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">TJM Max (affiche)</Label>
                    <Input
                      type="number"
                      value={formData.tjmMax}
                      onChange={(e) => setFormData({ ...formData, tjmMax: e.target.value })}
                      placeholder="550"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              )}
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
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Lieu / Adresse</Label>
                  <Input
                    value={formData.lieu}
                    onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                    placeholder="La Defense, Tour Areva"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Ville</Label>
                  <Input
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    placeholder="Paris"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Secteur</Label>
                  <Input
                    value={formData.secteur}
                    onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                    placeholder="92, Paris, Ile-de-France"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Mobilite</Label>
                  <Select
                    value={formData.mobilite}
                    onValueChange={(value) => setFormData({ ...formData, mobilite: value })}
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
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deplacementMultiSite"
                    checked={formData.deplacementMultiSite}
                    onChange={(e) => setFormData({ ...formData, deplacementMultiSite: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="deplacementMultiSite" className="text-gray-300">Deplacement multi-sites</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="deplacementEtranger"
                    checked={formData.deplacementEtranger}
                    onChange={(e) => setFormData({ ...formData, deplacementEtranger: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="deplacementEtranger" className="text-gray-300">Deplacement a l'etranger</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duree et dates */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Duree et Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-gray-300">Duree</Label>
                  <Input
                    type="number"
                    value={formData.dureeNombre}
                    onChange={(e) => setFormData({ ...formData, dureeNombre: e.target.value })}
                    placeholder="6"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Unite</Label>
                  <Select
                    value={formData.dureeUnite}
                    onValueChange={(value) => setFormData({ ...formData, dureeUnite: value })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DUREE_UNITE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Date de debut</Label>
                  <Input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Nombre de postes</Label>
                  <Input
                    type="number"
                    value={formData.nombrePostes}
                    onChange={(e) => setFormData({ ...formData, nombrePostes: e.target.value })}
                    min="1"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="renouvelable"
                  checked={formData.renouvelable}
                  onChange={(e) => setFormData({ ...formData, renouvelable: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="renouvelable" className="text-gray-300">Mission renouvelable</Label>
              </div>
            </CardContent>
          </Card>

          {/* Criteres */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Criteres supplementaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Experience minimum (annees)</Label>
                  <Input
                    type="number"
                    value={formData.experienceMin}
                    onChange={(e) => setFormData({ ...formData, experienceMin: e.target.value })}
                    placeholder="5"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="habilitationRequise"
                      checked={formData.habilitationRequise}
                      onChange={(e) => setFormData({ ...formData, habilitationRequise: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="habilitationRequise" className="text-gray-300">Habilitation requise</Label>
                  </div>
                  {formData.habilitationRequise && (
                    <Input
                      value={formData.typeHabilitation}
                      onChange={(e) => setFormData({ ...formData, typeHabilitation: e.target.value })}
                      placeholder="Secret Defense, Confidentiel Defense..."
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/admin/offres">
              <Button variant="outline" className="border-gray-600 text-gray-300">
                Annuler
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={(e) => handleSubmit(e, false)}
              disabled={saving}
              className="border-gray-600 text-gray-300"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer en brouillon
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
            >
              <Plus className="w-4 h-4 mr-2" />
              Creer et Publier
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
