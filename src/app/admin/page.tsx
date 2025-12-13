"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield, Users, Briefcase, Building2, FileText, Bell, Settings, LogOut,
  Plus, ChevronRight, TrendingUp, Clock, CheckCircle, AlertCircle, Eye, Activity
} from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTalents: 0,
    totalClients: 0,
    totalOffres: 0,
    totalCandidatures: 0,
    clientsEnAttente: 0,
    offresEnAttente: 0,
    candidaturesNouvelles: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/admin/login')
        return
      }
      const userData = await response.json()

      if (userData.user.role !== 'ADMIN') {
        router.push('/')
        return
      }

      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

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
              <Link href="/admin" className="text-white font-medium">
                Dashboard
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
              <Link href="/admin/candidatures" className="text-gray-400 hover:text-white">
                Candidatures
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Dashboard TRINEXTA
          </h1>
          <p className="text-gray-400 mt-1">
            Gestion de la plateforme Talentero
          </p>
        </div>

        {/* Alerts */}
        {(stats.clientsEnAttente > 0 || stats.offresEnAttente > 0) && (
          <Card className="mb-8 bg-yellow-900/20 border-yellow-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-100">Actions en attente</p>
                  <p className="text-sm text-yellow-200/70">
                    {stats.clientsEnAttente > 0 && `${stats.clientsEnAttente} client(s) à valider`}
                    {stats.clientsEnAttente > 0 && stats.offresEnAttente > 0 && ' • '}
                    {stats.offresEnAttente > 0 && `${stats.offresEnAttente} offre(s) à valider`}
                  </p>
                </div>
                <Link href="/admin/clients?statut=EN_ATTENTE">
                  <Button variant="outline" className="border-yellow-600 text-yellow-100 hover:bg-yellow-900/50">
                    Voir
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Talents</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTalents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Clients</p>
                  <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Offres</p>
                  <p className="text-2xl font-bold text-white">{stats.totalOffres}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Candidatures</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCandidatures}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Actions rapides</CardTitle>
              <CardDescription className="text-gray-400">Gestion de la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/clients?statut=EN_ATTENTE" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white">Valider les clients</span>
                    {stats.clientsEnAttente > 0 && (
                      <Badge className="bg-yellow-600">{stats.clientsEnAttente}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/admin/offres?statut=EN_ATTENTE" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    <span className="text-white">Valider les offres</span>
                    {stats.offresEnAttente > 0 && (
                      <Badge className="bg-yellow-600">{stats.offresEnAttente}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/admin/candidatures" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-400" />
                    <span className="text-white">Gérer les candidatures</span>
                    {stats.candidaturesNouvelles > 0 && (
                      <Badge className="bg-green-600">{stats.candidaturesNouvelles}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/admin/offres/nouvelle" className="block">
                <div className="flex items-center justify-between p-4 bg-primary/20 rounded-lg hover:bg-primary/30 transition border border-primary/40">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="text-primary font-medium">Créer une offre TRINEXTA</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Activité récente</CardTitle>
              <CardDescription className="text-gray-400">Dernières actions sur la plateforme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">L'activité sera affichée ici</p>
                <p className="text-sm text-gray-600 mt-1">
                  Inscriptions, candidatures, validations...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
