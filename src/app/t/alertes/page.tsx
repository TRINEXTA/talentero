'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Bell, User, Settings, LogOut, Plus, Trash2, Edit, X,
  MapPin, Euro, Briefcase, Clock, CheckCircle, AlertCircle,
  RefreshCw, Eye, Save, ToggleLeft, ToggleRight
} from 'lucide-react'

interface Alerte {
  id: number
  nom: string
  competences: string[]
  tjmMin: number | null
  mobilite: string | null
  lieux: string[]
  frequence: string
  active: boolean
  derniereNotif: string | null
  nbOffresEnvoyees: number
  createdAt: string
}

interface AlerteForm {
  nom: string
  competences: string
  tjmMin: string
  mobilite: string
  lieux: string
  frequence: string
}

const frequenceLabels: Record<string, string> = {
  INSTANTANEE: 'Instantanée',
  QUOTIDIENNE: 'Quotidienne',
  HEBDOMADAIRE: 'Hebdomadaire',
}

const mobiliteLabels: Record<string, string> = {
  FULL_REMOTE: 'Full Remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
}

export default function TalentAlertesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [alertes, setAlertes] = useState<Alerte[]>([])
  const [stats, setStats] = useState({ total: 0, actives: 0, totalOffresEnvoyees: 0 })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [form, setForm] = useState<AlerteForm>({
    nom: '',
    competences: '',
    tjmMin: '',
    mobilite: '',
    lieux: '',
    frequence: 'INSTANTANEE',
  })

  useEffect(() => {
    fetchAlertes()
  }, [])

  const fetchAlertes = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/t/connexion')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'TALENT') {
        router.push('/t/connexion')
        return
      }

      const res = await fetch('/api/talent/alertes')
      if (res.ok) {
        const data = await res.json()
        setAlertes(data.alertes)
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

  const resetForm = () => {
    setForm({
      nom: '',
      competences: '',
      tjmMin: '',
      mobilite: '',
      lieux: '',
      frequence: 'INSTANTANEE',
    })
    setEditingId(null)
    setPreviewCount(null)
  }

  const handleEdit = (alerte: Alerte) => {
    setForm({
      nom: alerte.nom || '',
      competences: alerte.competences.join(', '),
      tjmMin: alerte.tjmMin?.toString() || '',
      mobilite: alerte.mobilite || '',
      lieux: alerte.lieux.join(', '),
      frequence: alerte.frequence,
    })
    setEditingId(alerte.id)
    setShowForm(true)
    setPreviewCount(null)
  }

  const handlePreview = async () => {
    try {
      const res = await fetch('/api/talent/alertes/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competences: form.competences.split(',').map((c) => c.trim()).filter(Boolean),
          tjmMin: form.tjmMin || null,
          mobilite: form.mobilite || null,
          lieux: form.lieux.split(',').map((l) => l.trim()).filter(Boolean),
          frequence: form.frequence,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPreviewCount(data.matchingCount)
      }
    } catch (error) {
      console.error('Erreur preview:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      const payload = {
        nom: form.nom,
        competences: form.competences.split(',').map((c) => c.trim()).filter(Boolean),
        tjmMin: form.tjmMin || null,
        mobilite: form.mobilite || null,
        lieux: form.lieux.split(',').map((l) => l.trim()).filter(Boolean),
        frequence: form.frequence,
      }

      const url = editingId ? `/api/talent/alertes/${editingId}` : '/api/talent/alertes'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        fetchAlertes()
        setShowForm(false)
        resetForm()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggle = async (id: number, active: boolean) => {
    try {
      await fetch(`/api/talent/alertes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      fetchAlertes()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette alerte ?')) return

    try {
      await fetch(`/api/talent/alertes/${id}`, { method: 'DELETE' })
      fetchAlertes()
    } catch (error) {
      console.error('Erreur:', error)
    }
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
              <Link href="/">
                <Logo size="sm" showText />
              </Link>
              <Badge variant="outline" className="text-xs">
                <User className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-gray-600 hover:text-primary">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/entretiens" className="text-gray-600 hover:text-primary">
                  Entretiens
                </Link>
                <Link href="/t/alertes" className="text-primary font-medium">
                  Alertes
                </Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">
                  Mon profil
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
              <Bell className="w-7 h-7" />
              Mes Alertes Emploi
            </h1>
            <p className="text-gray-600 mt-1">
              Recevez des notifications quand de nouvelles offres correspondent à vos critères
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAlertes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={() => { setShowForm(true); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle alerte
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Alertes créées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actives}</p>
                <p className="text-sm text-gray-500">Alertes actives</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOffresEnvoyees}</p>
                <p className="text-sm text-gray-500">Offres notifiées</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Formulaire de création/édition */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingId ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CardDescription>
                Définissez vos critères pour recevoir des notifications sur les offres correspondantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom de l'alerte</Label>
                    <Input
                      id="nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Ex: Missions React Senior"
                    />
                  </div>
                  <div>
                    <Label htmlFor="frequence">Fréquence des notifications</Label>
                    <select
                      id="frequence"
                      value={form.frequence}
                      onChange={(e) => setForm({ ...form, frequence: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="INSTANTANEE">Instantanée</option>
                      <option value="QUOTIDIENNE">Résumé quotidien</option>
                      <option value="HEBDOMADAIRE">Résumé hebdomadaire</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="competences">
                    Compétences recherchées
                    <span className="text-gray-400 font-normal ml-2">(séparées par des virgules)</span>
                  </Label>
                  <Input
                    id="competences"
                    value={form.competences}
                    onChange={(e) => setForm({ ...form, competences: e.target.value })}
                    placeholder="Ex: React, TypeScript, Node.js"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tjmMin">TJM minimum (€)</Label>
                    <Input
                      id="tjmMin"
                      type="number"
                      value={form.tjmMin}
                      onChange={(e) => setForm({ ...form, tjmMin: e.target.value })}
                      placeholder="Ex: 500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobilite">Mode de travail</Label>
                    <select
                      id="mobilite"
                      value={form.mobilite}
                      onChange={(e) => setForm({ ...form, mobilite: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">Tous</option>
                      <option value="FULL_REMOTE">Full Remote</option>
                      <option value="HYBRIDE">Hybride</option>
                      <option value="SUR_SITE">Sur site</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="lieux">
                      Lieux
                      <span className="text-gray-400 font-normal ml-2">(séparés par des virgules)</span>
                    </Label>
                    <Input
                      id="lieux"
                      value={form.lieux}
                      onChange={(e) => setForm({ ...form, lieux: e.target.value })}
                      placeholder="Ex: Paris, Lyon, Remote"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" onClick={handlePreview}>
                      <Eye className="w-4 h-4 mr-2" />
                      Prévisualiser
                    </Button>
                    {previewCount !== null && (
                      <span className="text-sm text-gray-600">
                        {previewCount} offre{previewCount !== 1 ? 's' : ''} correspondante{previewCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                      Annuler
                    </Button>
                    <Button type="submit" disabled={formLoading}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Mettre à jour' : 'Créer l\'alerte'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Liste des alertes */}
        {alertes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune alerte configurée
              </h3>
              <p className="text-gray-500 mb-4">
                Créez votre première alerte pour être notifié des nouvelles offres
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une alerte
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alertes.map((alerte) => (
              <Card key={alerte.id} className={!alerte.active ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{alerte.nom || `Alerte #${alerte.id}`}</h3>
                        <Badge variant={alerte.active ? 'default' : 'secondary'}>
                          {alerte.active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          {frequenceLabels[alerte.frequence]}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        {alerte.competences.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {alerte.competences.slice(0, 3).join(', ')}
                            {alerte.competences.length > 3 && ` +${alerte.competences.length - 3}`}
                          </span>
                        )}
                        {alerte.tjmMin && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            Min {alerte.tjmMin}€/j
                          </span>
                        )}
                        {alerte.mobilite && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {mobiliteLabels[alerte.mobilite]}
                          </span>
                        )}
                        {alerte.lieux.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {alerte.lieux.slice(0, 2).join(', ')}
                            {alerte.lieux.length > 2 && ` +${alerte.lieux.length - 2}`}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400">
                        {alerte.nbOffresEnvoyees} offre{alerte.nbOffresEnvoyees !== 1 ? 's' : ''} notifiée{alerte.nbOffresEnvoyees !== 1 ? 's' : ''}
                        {alerte.derniereNotif && (
                          <> • Dernière notif: {new Date(alerte.derniereNotif).toLocaleDateString('fr-FR')}</>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(alerte.id, alerte.active)}
                        title={alerte.active ? 'Désactiver' : 'Activer'}
                      >
                        {alerte.active ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(alerte)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alerte.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info box */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Comment fonctionnent les alertes ?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li><strong>Instantanée</strong> : Notification dès qu'une offre correspond à vos critères</li>
                  <li><strong>Quotidienne</strong> : Résumé des nouvelles offres chaque jour</li>
                  <li><strong>Hebdomadaire</strong> : Résumé des nouvelles offres chaque semaine</li>
                </ul>
                <p className="mt-2">Vous pouvez créer jusqu'à 10 alertes différentes.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
