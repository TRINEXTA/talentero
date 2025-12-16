'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Logo } from '@/components/ui/logo'
import {
  Users, Bell, Settings, LogOut, Calendar as CalendarIcon,
  CheckCircle, XCircle, Briefcase, Clock, AlertCircle, GraduationCap
} from 'lucide-react'

interface PlanningEntry {
  id: number
  date: string
  type: string
  notes: string | null
  mission: {
    uid: string
    titre: string
    clientNom: string
  } | null
}

interface Stats {
  joursDisponibles: number
  joursEnMission: number
  joursConge: number
  joursArret: number
  joursIndisponibles: number
  missionsEnCours: number
}

type PlanningType = 'DISPONIBLE' | 'INDISPONIBLE' | 'CONGE' | 'ARRET_MALADIE' | 'FORMATION' | 'INTERCONTRAT'

export default function TalentPlanningPage() {
  const router = useRouter()
  const [planning, setPlanning] = useState<PlanningEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [selectedType, setSelectedType] = useState<PlanningType>('DISPONIBLE')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPlanning()
  }, [])

  const fetchPlanning = async () => {
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }

      // Fetch 6 months of planning
      const start = new Date()
      const end = new Date()
      end.setMonth(end.getMonth() + 6)

      const res = await fetch(`/api/talent/planning?start=${start.toISOString().split('T')[0]}&end=${end.toISOString().split('T')[0]}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setPlanning(data.planning)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeSelect = (dates: Date[]) => {
    setSelectedDates(dates)
  }

  const handleSavePlanning = async () => {
    if (selectedDates.length === 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/talent/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: selectedDates.map(d => d.toISOString().split('T')[0]),
          type: selectedType
        })
      })

      if (res.ok) {
        setSelectedDates([])
        await fetchPlanning()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDates = async () => {
    if (selectedDates.length === 0) return

    setSaving(true)
    try {
      const res = await fetch('/api/talent/planning', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: selectedDates.map(d => d.toISOString().split('T')[0])
        })
      })

      if (res.ok) {
        setSelectedDates([])
        await fetchPlanning()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const typeConfig: Record<PlanningType, { label: string; icon: React.ReactNode; color: string }> = {
    DISPONIBLE: { label: 'Disponible', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 text-green-700 border-green-300' },
    INDISPONIBLE: { label: 'Indisponible', icon: <XCircle className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700 border-gray-300' },
    CONGE: { label: 'Congé', icon: <CalendarIcon className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700 border-amber-300' },
    ARRET_MALADIE: { label: 'Arrêt maladie', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700 border-red-300' },
    FORMATION: { label: 'Formation', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-300' },
    INTERCONTRAT: { label: 'Intercontrat', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-300' }
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
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/planning" className="text-primary font-medium">
                  Planning
                </Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">
                  Mon profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mon planning</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos disponibilités et visualisez vos missions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Calendrier des disponibilités
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  planning={planning.map(p => ({ ...p, notes: p.notes ?? undefined }))}
                  onDateRangeSelect={handleDateRangeSelect}
                  selectedDates={selectedDates}
                />

                {/* Selection actions */}
                {selectedDates.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium mb-3">
                      {selectedDates.length} jour(s) sélectionné(s)
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {(Object.keys(typeConfig) as PlanningType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setSelectedType(type)}
                          className={`
                            flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all
                            ${selectedType === type ? typeConfig[type].color + ' ring-2 ring-offset-1 ring-primary' : 'bg-white border-gray-200 hover:border-gray-300'}
                          `}
                        >
                          {typeConfig[type].icon}
                          {typeConfig[type].label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSavePlanning} disabled={saving}>
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                      <Button variant="outline" onClick={handleDeleteDates} disabled={saving}>
                        Supprimer
                      </Button>
                      <Button variant="ghost" onClick={() => setSelectedDates([])}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-4">
                  Cliquez sur une date pour la sélectionner, ou cliquez sur deux dates pour sélectionner une période.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statistiques (90 jours)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded bg-blue-500"></div>
                      <span>En mission</span>
                    </div>
                    <span className="font-semibold">{stats.joursEnMission} jours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded bg-green-400"></div>
                      <span>Disponible</span>
                    </div>
                    <span className="font-semibold">{stats.joursDisponibles} jours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded bg-amber-400"></div>
                      <span>Congés</span>
                    </div>
                    <span className="font-semibold">{stats.joursConge} jours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded bg-red-400"></div>
                      <span>Arrêt maladie</span>
                    </div>
                    <span className="font-semibold">{stats.joursArret} jours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded bg-gray-400"></div>
                      <span>Indisponible</span>
                    </div>
                    <span className="font-semibold">{stats.joursIndisponibles} jours</span>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Briefcase className="w-4 h-4" />
                      <span className="font-medium">{stats.missionsEnCours} mission(s) en cours</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conseils</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>
                  <strong className="text-gray-900">Tenez votre planning à jour</strong> pour augmenter vos chances d'être proposé sur des missions.
                </p>
                <p>
                  Les jours marqués <strong className="text-blue-600">En mission</strong> sont automatiquement bloqués lors du positionnement sur une nouvelle offre.
                </p>
                <p>
                  Indiquez vos <strong className="text-amber-600">congés</strong> à l'avance pour une meilleure visibilité.
                </p>
              </CardContent>
            </Card>

            {/* Link to offers */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Prêt pour une nouvelle mission ?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Consultez les offres disponibles et trouvez votre prochaine opportunité.
                </p>
                <Link href="/t/offres">
                  <Button className="w-full">
                    Voir les offres
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
