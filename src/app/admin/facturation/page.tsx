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
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Receipt, Settings, LogOut, Plus, X, Building2, Euro,
  Clock, CheckCircle, AlertTriangle, RefreshCw, Send,
  CreditCard, FileText, Trash2, Eye, Download, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Facture {
  id: number
  uid: string
  numero: string
  clientNom: string
  description: string
  montantHT: number
  montantTTC: number
  statut: string
  dateEmission: string | null
  dateEcheance: string | null
  datePaiement: string | null
  nbRelances: number
  createdAt: string
  client: {
    uid: string
    raisonSociale: string
    logoUrl: string | null
  }
  lignes: Array<{
    description: string
    quantite: number
    unite: string
    prixUnitaire: number
    montantHT: number
  }>
}

interface Stats {
  total: number
  brouillons: number
  emises: number
  payees: number
  enRetard: number
  montantTotalHT: number
  montantPayeHT: number
  montantEnAttenteHT: number
  montantEnRetardHT: number
}

interface LigneForm {
  description: string
  quantite: number
  unite: string
  prixUnitaire: number
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: <FileText className="w-3 h-3" /> },
  EMISE: { label: 'Émise', color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" /> },
  PAYEE: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
  EN_RETARD: { label: 'En retard', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="w-3 h-3" /> },
  ANNULEE: { label: 'Annulée', color: 'bg-gray-100 text-gray-500', icon: <X className="w-3 h-3" /> },
}

export default function AdminFacturationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [factures, setFactures] = useState<Facture[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [clients, setClients] = useState<Array<{ uid: string; raisonSociale: string }>>([])
  const [form, setForm] = useState({
    clientUid: '',
    description: '',
    periodeDebut: '',
    periodeFin: '',
    tauxTVA: 20,
    notes: '',
  })
  const [lignes, setLignes] = useState<LigneForm[]>([
    { description: '', quantite: 1, unite: 'jour', prixUnitaire: 0 },
  ])

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/admin/connexion')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'ADMIN') {
        router.push('/admin/connexion')
        return
      }

      const url = filter === 'all'
        ? '/api/admin/factures'
        : `/api/admin/factures?statut=${filter}`

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setFactures(data.factures)
        setStats(data.stats)
      }

      // Charger les clients
      const clientsRes = await fetch('/api/admin/clients?limit=100')
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData.clients || [])
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

  const addLigne = () => {
    setLignes([...lignes, { description: '', quantite: 1, unite: 'jour', prixUnitaire: 0 }])
  }

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index))
    }
  }

  const updateLigne = (index: number, field: keyof LigneForm, value: string | number) => {
    const updated = [...lignes]
    updated[index] = { ...updated[index], [field]: value }
    setLignes(updated)
  }

  const calculateTotal = () => {
    const ht = lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0)
    const tva = ht * (form.tauxTVA / 100)
    return { ht, tva, ttc: ht + tva }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.clientUid || !form.description || lignes.some((l) => !l.description || !l.prixUnitaire)) {
      return
    }

    setFormLoading(true)
    try {
      const res = await fetch('/api/admin/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lignes: lignes.filter((l) => l.description && l.prixUnitaire),
        }),
      })

      if (res.ok) {
        fetchData()
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
    try {
      await fetch(`/api/admin/factures/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })
      fetchData()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const resetForm = () => {
    setForm({
      clientUid: '',
      description: '',
      periodeDebut: '',
      periodeFin: '',
      tauxTVA: 20,
      notes: '',
    })
    setLignes([{ description: '', quantite: 1, unite: 'jour', prixUnitaire: 0 }])
  }

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin">
                <Logo size="sm" showText />
              </Link>
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                Admin
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/admin" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/admin/talents" className="text-gray-600 hover:text-primary">
                  Talents
                </Link>
                <Link href="/admin/clients" className="text-gray-600 hover:text-primary">
                  Clients
                </Link>
                <Link href="/admin/offres" className="text-gray-600 hover:text-primary">
                  Offres
                </Link>
                <Link href="/admin/facturation" className="text-primary font-medium">
                  Facturation
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-7 h-7" />
              Facturation
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez les factures clients
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-5 gap-4 mb-8">
            <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('all')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{stats.total}</p>
                    <p className="text-xs text-gray-500">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('EMISE')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatMontant(stats.montantEnAttenteHT)}</p>
                    <p className="text-xs text-gray-500">En attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('PAYEE')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatMontant(stats.montantPayeHT)}</p>
                    <p className="text-xs text-gray-500">Payé</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('EN_RETARD')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatMontant(stats.montantEnRetardHT)}</p>
                    <p className="text-xs text-gray-500">En retard ({stats.enRetard})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Euro className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{formatMontant(stats.montantTotalHT)}</p>
                    <p className="text-xs text-gray-500">Total HT</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Formulaire de création */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nouvelle facture</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Client *</Label>
                    <select
                      value={form.clientUid}
                      onChange={(e) => setForm({ ...form, clientUid: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      required
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map((c) => (
                        <option key={c.uid} value={c.uid}>{c.raisonSociale}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Taux TVA (%)</Label>
                    <Input
                      type="number"
                      value={form.tauxTVA}
                      onChange={(e) => setForm({ ...form, tauxTVA: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Description *</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Ex: Prestation développement - Mission XYZ"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Période début</Label>
                    <Input
                      type="date"
                      value={form.periodeDebut}
                      onChange={(e) => setForm({ ...form, periodeDebut: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Période fin</Label>
                    <Input
                      type="date"
                      value={form.periodeFin}
                      onChange={(e) => setForm({ ...form, periodeFin: e.target.value })}
                    />
                  </div>
                </div>

                {/* Lignes de facture */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Lignes de facture</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter une ligne
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {lignes.map((ligne, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          placeholder="Description"
                          value={ligne.description}
                          onChange={(e) => updateLigne(index, 'description', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Qté"
                          value={ligne.quantite}
                          onChange={(e) => updateLigne(index, 'quantite', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <select
                          value={ligne.unite}
                          onChange={(e) => updateLigne(index, 'unite', e.target.value)}
                          className="w-24 h-10 px-2 rounded-md border border-input bg-background"
                        >
                          <option value="jour">Jour</option>
                          <option value="heure">Heure</option>
                          <option value="forfait">Forfait</option>
                        </select>
                        <Input
                          type="number"
                          placeholder="Prix unit."
                          value={ligne.prixUnitaire}
                          onChange={(e) => updateLigne(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                        <div className="w-24 text-right font-medium pt-2">
                          {formatMontant(ligne.quantite * ligne.prixUnitaire)}
                        </div>
                        {lignes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLigne(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totaux */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between">
                        <span>Total HT:</span>
                        <span className="font-medium">{formatMontant(calculateTotal().ht)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>TVA ({form.tauxTVA}%):</span>
                        <span>{formatMontant(calculateTotal().tva)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total TTC:</span>
                        <span>{formatMontant(calculateTotal().ttc)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Notes visibles sur la facture..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={formLoading}>
                    Créer la facture
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filtres */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'BROUILLON' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('BROUILLON')}
          >
            Brouillons
          </Button>
          <Button
            variant={filter === 'EMISE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('EMISE')}
          >
            Émises
          </Button>
          <Button
            variant={filter === 'EN_RETARD' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('EN_RETARD')}
          >
            En retard
          </Button>
          <Button
            variant={filter === 'PAYEE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('PAYEE')}
          >
            Payées
          </Button>
        </div>

        {/* Liste des factures */}
        {factures.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune facture
              </h3>
              <p className="text-gray-500 mb-4">
                Créez votre première facture
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle facture
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {factures.map((facture) => (
              <Card key={facture.uid}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        {facture.client.logoUrl ? (
                          <img
                            src={facture.client.logoUrl}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{facture.numero}</span>
                          <Badge className={`${statutConfig[facture.statut]?.color || 'bg-gray-100'} flex items-center gap-1`}>
                            {statutConfig[facture.statut]?.icon}
                            {statutConfig[facture.statut]?.label || facture.statut}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900">{facture.clientNom}</p>
                        <p className="text-sm text-gray-500">{facture.description}</p>
                        <div className="flex gap-4 text-xs text-gray-400 mt-1">
                          <span>Créée: {format(new Date(facture.createdAt), "dd/MM/yyyy", { locale: fr })}</span>
                          {facture.dateEcheance && (
                            <span>Échéance: {format(new Date(facture.dateEcheance), "dd/MM/yyyy", { locale: fr })}</span>
                          )}
                          {facture.nbRelances > 0 && (
                            <span className="text-orange-500">{facture.nbRelances} relance(s)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatMontant(facture.montantTTC)}</p>
                        <p className="text-sm text-gray-500">{formatMontant(facture.montantHT)} HT</p>
                      </div>
                      <div className="flex gap-1">
                        {facture.statut === 'BROUILLON' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleAction(facture.uid, 'emettre')}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Émettre
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(facture.uid, 'annuler')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(facture.statut === 'EMISE' || facture.statut === 'EN_RETARD') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const mode = prompt('Mode de paiement (VIREMENT, CHEQUE, CB):')
                                if (mode) {
                                  handleAction(facture.uid, 'payer', { modePaiement: mode.toUpperCase() })
                                }
                              }}
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Payée
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(facture.uid, 'relancer')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
