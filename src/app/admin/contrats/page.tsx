'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Shield, FileText, Plus, Calendar, Euro, User, Building2,
  LogOut, CheckCircle, Clock, XCircle, AlertCircle, PenTool,
  Send, Eye, Trash2, MoreVertical, FileSignature
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Contrat {
  uid: string
  numero: string
  titre: string
  statut: string
  typeContrat: string
  dateDebut: string
  dateFin: string | null
  tjm: number
  signeParTalent: boolean
  signeParClient: boolean
  createdAt: string
  talent: {
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
  }
  client: {
    uid: string
    raisonSociale: string
    logoUrl: string | null
  }
}

interface ContratStats {
  total: number
  brouillons: number
  enAttenteSignature: number
  actifs: number
  termines: number
  resilies: number
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-600', icon: FileText },
  EN_ATTENTE_SIGNATURE: { label: 'En attente', color: 'bg-yellow-600', icon: Clock },
  SIGNE_TALENT: { label: 'Signé talent', color: 'bg-blue-600', icon: PenTool },
  SIGNE_CLIENT: { label: 'Signé client', color: 'bg-blue-600', icon: PenTool },
  ACTIF: { label: 'Actif', color: 'bg-green-600', icon: CheckCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-orange-600', icon: AlertCircle },
  TERMINE: { label: 'Terminé', color: 'bg-gray-500', icon: CheckCircle },
  RESILIE: { label: 'Résilié', color: 'bg-red-600', icon: XCircle },
  ANNULE: { label: 'Annulé', color: 'bg-red-500', icon: XCircle },
}

const typeContratLabels: Record<string, string> = {
  FREELANCE: 'Freelance',
  PORTAGE: 'Portage',
  REGIE: 'Régie',
  FORFAIT: 'Forfait',
  CDI_CHANTIER: 'CDI Chantier',
}

export default function AdminContratsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [stats, setStats] = useState<ContratStats | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Search talents/clients
  const [searchTalent, setSearchTalent] = useState('')
  const [searchClient, setSearchClient] = useState('')
  const [talentResults, setTalentResults] = useState<{ uid: string; prenom: string; nom: string; titrePoste: string | null }[]>([])
  const [clientResults, setClientResults] = useState<{ uid: string; raisonSociale: string }[]>([])
  const [selectedTalent, setSelectedTalent] = useState<{ uid: string; prenom: string; nom: string } | null>(null)
  const [selectedClient, setSelectedClient] = useState<{ uid: string; raisonSociale: string } | null>(null)

  const [form, setForm] = useState({
    titre: '',
    typeContrat: 'FREELANCE',
    description: '',
    lieu: '',
    mobilite: 'FLEXIBLE',
    dateDebut: '',
    dateFin: '',
    dureeNombre: '',
    dureeUnite: 'MOIS',
    tjm: '',
    plafondJours: '',
    preavisJours: '30',
    conditionsParticulieres: '',
    notes: '',
  })

  useEffect(() => {
    fetchContrats()
  }, [])

  const fetchContrats = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/admin/login')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'ADMIN') {
        router.push('/')
        return
      }

      const res = await fetch('/api/admin/contrats')
      if (res.ok) {
        const data = await res.json()
        setContrats(data.contrats)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const searchTalents = async (query: string) => {
    if (query.length < 2) {
      setTalentResults([])
      return
    }
    try {
      const res = await fetch(`/api/talents/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setTalentResults(data.talents || [])
      }
    } catch (error) {
      console.error('Erreur recherche:', error)
    }
  }

  const searchClients = async (query: string) => {
    if (query.length < 2) {
      setClientResults([])
      return
    }
    try {
      const res = await fetch(`/api/admin/clients?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setClientResults(data.clients?.map((c: { uid: string; raisonSociale: string }) => ({
          uid: c.uid,
          raisonSociale: c.raisonSociale,
        })) || [])
      }
    } catch (error) {
      console.error('Erreur recherche:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTalent || !selectedClient) return

    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/contrats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          talentUid: selectedTalent.uid,
          clientUid: selectedClient.uid,
          dureeNombre: form.dureeNombre ? parseInt(form.dureeNombre) : undefined,
          plafondJours: form.plafondJours ? parseInt(form.plafondJours) : undefined,
          preavisJours: parseInt(form.preavisJours),
        }),
      })

      if (res.ok) {
        fetchContrats()
        setShowForm(false)
        resetForm()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleAction = async (uid: string, action: string, extraData?: object) => {
    setActionLoading(uid)
    try {
      const res = await fetch(`/api/admin/contrats/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      if (res.ok) {
        fetchContrats()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (uid: string) => {
    if (!confirm('Supprimer ce contrat brouillon ?')) return

    try {
      await fetch(`/api/admin/contrats/${uid}`, { method: 'DELETE' })
      fetchContrats()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const resetForm = () => {
    setForm({
      titre: '',
      typeContrat: 'FREELANCE',
      description: '',
      lieu: '',
      mobilite: 'FLEXIBLE',
      dateDebut: '',
      dateFin: '',
      dureeNombre: '',
      dureeUnite: 'MOIS',
      tjm: '',
      plafondJours: '',
      preavisJours: '30',
      conditionsParticulieres: '',
      notes: '',
    })
    setSelectedTalent(null)
    setSelectedClient(null)
    setSearchTalent('')
    setSearchClient('')
  }

  const filteredContrats = contrats.filter(c => {
    if (filter === 'all') return true
    return c.statut === filter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
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
              <Link href="/admin" className="text-2xl font-bold text-white">
                Talentero
              </Link>
              <Badge className="bg-red-600 text-white">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">
                Analytics
              </Link>
              <Link href="/admin/clients" className="text-gray-400 hover:text-white">
                Clients
              </Link>
              <Link href="/admin/talents" className="text-gray-400 hover:text-white">
                Talents
              </Link>
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                Offres
              </Link>
              <Link href="/admin/facturation" className="text-gray-400 hover:text-white">
                Facturation
              </Link>
              <Link href="/admin/contrats" className="text-white font-medium">
                Contrats
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSignature className="w-7 h-7" />
              Gestion des contrats
            </h1>
            <p className="text-gray-400 mt-1">Création et suivi des contrats</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau contrat
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-gray-400">{stats.brouillons}</p>
                <p className="text-sm text-gray-400">Brouillons</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-yellow-400">{stats.enAttenteSignature}</p>
                <p className="text-sm text-gray-400">En attente</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-green-400">{stats.actifs}</p>
                <p className="text-sm text-gray-400">Actifs</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-gray-400">{stats.termines}</p>
                <p className="text-sm text-gray-400">Terminés</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-4">
                <p className="text-2xl font-bold text-red-400">{stats.resilies}</p>
                <p className="text-sm text-gray-400">Résiliés</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'BROUILLON', label: 'Brouillons' },
            { value: 'EN_ATTENTE_SIGNATURE', label: 'En attente' },
            { value: 'ACTIF', label: 'Actifs' },
            { value: 'TERMINE', label: 'Terminés' },
          ].map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
              className={filter !== option.value ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Create Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">Nouveau contrat</CardTitle>
                <CardDescription className="text-gray-400">
                  Créer un contrat de prestation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Talent Search */}
                  <div>
                    <Label className="text-gray-300">Talent *</Label>
                    {selectedTalent ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-700 rounded mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedTalent.prenom} {selectedTalent.nom}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTalent(null)}
                          className="ml-auto text-gray-400"
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          value={searchTalent}
                          onChange={(e) => {
                            setSearchTalent(e.target.value)
                            searchTalents(e.target.value)
                          }}
                          placeholder="Rechercher un talent..."
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        {talentResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto z-10">
                            {talentResults.map((t) => (
                              <button
                                key={t.uid}
                                type="button"
                                onClick={() => {
                                  setSelectedTalent(t)
                                  setTalentResults([])
                                  setSearchTalent('')
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white"
                              >
                                {t.prenom} {t.nom}
                                {t.titrePoste && <span className="text-gray-400 text-sm ml-2">- {t.titrePoste}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Client Search */}
                  <div>
                    <Label className="text-gray-300">Client *</Label>
                    {selectedClient ? (
                      <div className="flex items-center gap-2 p-2 bg-gray-700 rounded mt-1">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-white">{selectedClient.raisonSociale}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(null)}
                          className="ml-auto text-gray-400"
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          value={searchClient}
                          onChange={(e) => {
                            setSearchClient(e.target.value)
                            searchClients(e.target.value)
                          }}
                          placeholder="Rechercher un client..."
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        {clientResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto z-10">
                            {clientResults.map((c) => (
                              <button
                                key={c.uid}
                                type="button"
                                onClick={() => {
                                  setSelectedClient(c)
                                  setClientResults([])
                                  setSearchClient('')
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-gray-600 text-white"
                              >
                                {c.raisonSociale}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Titre de la mission *</Label>
                      <Input
                        value={form.titre}
                        onChange={(e) => setForm({ ...form, titre: e.target.value })}
                        placeholder="Développeur React Senior"
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Type de contrat</Label>
                      <select
                        value={form.typeContrat}
                        onChange={(e) => setForm({ ...form, typeContrat: e.target.value })}
                        className="w-full h-10 px-3 bg-gray-700 border border-gray-600 text-white rounded-md"
                      >
                        <option value="FREELANCE">Freelance</option>
                        <option value="PORTAGE">Portage salarial</option>
                        <option value="REGIE">Régie</option>
                        <option value="FORFAIT">Forfait</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Date de début *</Label>
                      <Input
                        type="date"
                        value={form.dateDebut}
                        onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Date de fin (optionnel)</Label>
                      <Input
                        type="date"
                        value={form.dateFin}
                        onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">TJM (€) *</Label>
                      <Input
                        type="number"
                        value={form.tjm}
                        onChange={(e) => setForm({ ...form, tjm: e.target.value })}
                        placeholder="500"
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Plafond jours</Label>
                      <Input
                        type="number"
                        value={form.plafondJours}
                        onChange={(e) => setForm({ ...form, plafondJours: e.target.value })}
                        placeholder="220"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Préavis (jours)</Label>
                      <Input
                        type="number"
                        value={form.preavisJours}
                        onChange={(e) => setForm({ ...form, preavisJours: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Lieu d'exécution</Label>
                    <Input
                      value={form.lieu}
                      onChange={(e) => setForm({ ...form, lieu: e.target.value })}
                      placeholder="Paris, La Défense"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Description de la mission..."
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Conditions particulières</Label>
                    <Textarea
                      value={form.conditionsParticulieres}
                      onChange={(e) => setForm({ ...form, conditionsParticulieres: e.target.value })}
                      placeholder="Conditions spécifiques..."
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowForm(false); resetForm() }}
                      className="flex-1 border-gray-600 text-gray-300"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={formLoading || !selectedTalent || !selectedClient}
                      className="flex-1"
                    >
                      {formLoading ? 'Création...' : 'Créer le contrat'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContrats.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-12 text-center">
                <FileSignature className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun contrat trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredContrats.map((contrat) => {
              const config = statutConfig[contrat.statut] || statutConfig.BROUILLON
              const StatusIcon = config.icon

              return (
                <Card key={contrat.uid} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg text-white">{contrat.numero}</h3>
                          <Badge className={config.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-gray-400 border-gray-600">
                            {typeContratLabels[contrat.typeContrat] || contrat.typeContrat}
                          </Badge>
                        </div>
                        <p className="text-white mb-2">{contrat.titre}</p>

                        <div className="flex items-center gap-6 text-sm text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {contrat.talent.prenom} {contrat.talent.nom}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {contrat.client.raisonSociale}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(contrat.dateDebut), 'd MMM yyyy', { locale: fr })}
                            {contrat.dateFin && ` - ${format(new Date(contrat.dateFin), 'd MMM yyyy', { locale: fr })}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            {contrat.tjm} €/jour
                          </span>
                          {contrat.signeParTalent && (
                            <Badge variant="outline" className="text-green-400 border-green-600">
                              <PenTool className="w-3 h-3 mr-1" />
                              Signé talent
                            </Badge>
                          )}
                          {contrat.signeParClient && (
                            <Badge variant="outline" className="text-green-400 border-green-600">
                              <PenTool className="w-3 h-3 mr-1" />
                              Signé client
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href={`/admin/contrats/${contrat.uid}`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>

                        {contrat.statut === 'BROUILLON' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(contrat.uid, 'envoyer')}
                              disabled={actionLoading === contrat.uid}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Envoyer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contrat.uid)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {contrat.statut === 'ACTIF' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const motif = prompt('Motif de résiliation :')
                              if (motif) {
                                handleAction(contrat.uid, 'resilier', { motifFin: motif })
                              }
                            }}
                            disabled={actionLoading === contrat.uid}
                            className="text-red-400 hover:text-red-300"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Résilier
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
