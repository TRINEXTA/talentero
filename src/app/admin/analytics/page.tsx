'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  TrendChart,
  SimpleBarChart,
  DonutChart,
  ConversionFunnel,
  StatCard,
  COLORS,
} from '@/components/charts'
import {
  Shield, Users, Briefcase, Building2, FileText, LogOut,
  TrendingUp, Activity, Target, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw, BarChart3
} from 'lucide-react'

interface AnalyticsData {
  period: number
  kpis: {
    talents: { total: number; actifs: number; nouveaux: number; variation: number }
    clients: { total: number; actifs: number }
    offres: { total: number; publiees: number; avecCandidatures: number }
    candidatures: { total: number; recentes: number; variation: number }
    matchs: { total: number; scoresMoyen: number; scoresMin: number; scoresMax: number }
    tjm: { moyen: number; min: number; max: number }
  }
  trends: Array<{
    date: string
    dateISO: string
    talents: number
    candidatures: number
    matchs: number
    offres: number
  }>
  categories: Array<{ name: string; value: number }>
  topSkills: Array<{ skill: string; count: number }>
  funnel: Array<{ stage: string; count: number }>
  geographic: Array<{ ville: string; count: number }>
  offresParStatut: Array<{ statut: string; count: number }>
  activiteRecente: {
    candidatures: Array<{
      uid: string
      statut: string
      scoreMatch: number
      createdAt: string
      talent: { prenom: string; nom: string }
      offre: { titre: string; uid: string }
    }>
    matchs: Array<{
      score: number
      createdAt: string
      talent: { prenom: string; nom: string }
      offre: { titre: string }
    }>
  }
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    try {
      // Vérifie l'authentification
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

      // Récupère les analytics
      const res = await fetch(`/api/admin/analytics?period=${period}`)
      if (res.ok) {
        const analytics = await res.json()
        setData(analytics)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!data) return null

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
              <Link href="/admin/analytics" className="text-white font-medium">
                Analytics
              </Link>
              <Link href="/admin/talents" className="text-gray-400 hover:text-white">
                Talents
              </Link>
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                Offres
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
        {/* Titre + Contrôles */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Vue d'ensemble des {data.period} derniers jours
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="365">1 an</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Talents actifs"
            value={data.kpis.talents.actifs}
            subtitle={`${data.kpis.talents.nouveaux} nouveaux`}
            variation={data.kpis.talents.variation}
            trend={data.kpis.talents.variation >= 0 ? 'up' : 'down'}
            icon={<Users className="w-6 h-6 text-indigo-400" />}
          />
          <StatCard
            title="Candidatures"
            value={data.kpis.candidatures.recentes}
            subtitle={`sur ${data.kpis.candidatures.total} total`}
            variation={data.kpis.candidatures.variation}
            trend={data.kpis.candidatures.variation >= 0 ? 'up' : 'down'}
            icon={<FileText className="w-6 h-6 text-purple-400" />}
          />
          <StatCard
            title="Score matching moyen"
            value={`${data.kpis.matchs.scoresMoyen}%`}
            subtitle={`Min: ${data.kpis.matchs.scoresMin}% / Max: ${data.kpis.matchs.scoresMax}%`}
            icon={<Target className="w-6 h-6 text-green-400" />}
          />
          <StatCard
            title="TJM moyen"
            value={`${data.kpis.tjm.moyen}€`}
            subtitle={`${data.kpis.tjm.min}€ - ${data.kpis.tjm.max}€`}
            icon={<DollarSign className="w-6 h-6 text-yellow-400" />}
          />
        </div>

        {/* Graphiques principaux */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Tendances */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tendances d'activité
              </CardTitle>
              <CardDescription className="text-gray-400">
                Évolution sur les {data.period} derniers jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={data.trends}
                lines={[
                  { key: 'candidatures', color: COLORS.primary, name: 'Candidatures' },
                  { key: 'matchs', color: COLORS.success, name: 'Matchs' },
                  { key: 'talents', color: COLORS.info, name: 'Nouveaux talents' },
                ]}
                height={280}
              />
            </CardContent>
          </Card>

          {/* Funnel de conversion */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Funnel de conversion
              </CardTitle>
              <CardDescription className="text-gray-400">
                De la candidature à l'acceptation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConversionFunnel data={data.funnel} height={280} />
            </CardContent>
          </Card>
        </div>

        {/* Répartitions */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Catégories */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Répartition par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={data.categories} height={250} showLegend={false} />
              <div className="mt-4 space-y-2">
                {data.categories.slice(0, 5).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{cat.name}</span>
                    <span className="text-white font-medium">{cat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Compétences */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Top compétences demandées</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data.topSkills.map((s) => ({ name: s.skill, value: s.count }))}
                height={300}
                horizontal
                color={COLORS.secondary}
              />
            </CardContent>
          </Card>

          {/* Répartition géographique */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Répartition géographique</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data.geographic.map((g) => ({ name: g.ville, value: g.count }))}
                height={300}
                horizontal
                color={COLORS.info}
              />
            </CardContent>
          </Card>
        </div>

        {/* Activité récente + Statuts offres */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Dernières candidatures */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Dernières candidatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.activiteRecente.candidatures.map((c) => (
                  <div
                    key={c.uid}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">
                        {c.talent.prenom} {c.talent.nom}
                      </p>
                      <p className="text-gray-400 text-xs">{c.offre.titre}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-indigo-600 text-xs">{c.scoreMatch}%</Badge>
                      <p className="text-gray-500 text-xs mt-1">{formatDate(c.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statuts des offres */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base">Statuts des offres</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={data.offresParStatut.map((o) => ({ name: o.statut, value: o.count }))}
                height={200}
              />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {data.offresParStatut.map((o) => (
                  <div key={o.statut} className="flex items-center justify-between text-sm p-2 bg-gray-900 rounded">
                    <span className="text-gray-400">{o.statut}</span>
                    <span className="text-white font-medium">{o.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Résumé rapide */}
        <Card className="bg-gray-800 border-gray-700 mt-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{data.kpis.talents.total}</p>
                <p className="text-gray-400 text-sm">Talents total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{data.kpis.clients.total}</p>
                <p className="text-gray-400 text-sm">Clients</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{data.kpis.offres.publiees}</p>
                <p className="text-gray-400 text-sm">Offres publiées</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{data.kpis.matchs.total}</p>
                <p className="text-gray-400 text-sm">Matchs générés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
