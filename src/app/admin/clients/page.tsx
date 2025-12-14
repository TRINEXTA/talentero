'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield, Building2, Bell, LogOut, Search, ChevronRight,
  CheckCircle, XCircle, Eye, Mail, Phone, MapPin, Calendar, FileText
} from 'lucide-react'

interface Client {
  uid: string
  codeUnique: string
  raisonSociale: string
  siret: string | null
  typeClient: string
  statut: string
  valideParAdmin: boolean
  ville: string | null
  telephone: string | null
  createdAt: string
  contacts: Array<{
    prenom: string
    nom: string
    email: string
    estContactPrincipal: boolean
  }>
  _count: {
    offres: number
  }
}

export default function AdminClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchClients()
  }, [filter])

  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('statut', filter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/clients?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setClients(data.clients)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleValidate = async (uid: string, valider: boolean) => {
    try {
      const res = await fetch(`/api/admin/clients/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: valider ? 'valider' : 'refuser' }),
      })
      if (res.ok) {
        fetchClients()
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatutBadge = (statut: string, valide: boolean) => {
    if (valide) {
      return <Badge className="bg-green-600">Valide</Badge>
    }
    const configs: Record<string, { label: string; className: string }> = {
      EN_ATTENTE: { label: 'En attente', className: 'bg-yellow-600' },
      ACTIF: { label: 'Actif', className: 'bg-green-600' },
      SUSPENDU: { label: 'Suspendu', className: 'bg-red-600' },
      INACTIF: { label: 'Inactif', className: 'bg-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getTypeClientBadge = (type: string) => {
    const labels: Record<string, string> = {
      CLIENT_DIRECT: 'Client direct',
      SOUSTRAITANCE: 'Sous-traitance',
      PARTENAIRE: 'Partenaire',
    }
    return <Badge variant="outline" className="text-gray-300 border-gray-600">{labels[type] || type}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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
              <Link href="/admin/clients" className="text-white font-medium">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Gestion des clients</h1>
          <p className="text-gray-400 mt-1">
            Validez et gerez les comptes entreprises
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Rechercher par nom, SIRET..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchClients()}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('')}
              className={filter === '' ? '' : 'border-gray-700 text-gray-300'}
            >
              Tous
            </Button>
            <Button
              variant={filter === 'EN_ATTENTE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('EN_ATTENTE')}
              className={filter === 'EN_ATTENTE' ? 'bg-yellow-600' : 'border-gray-700 text-gray-300'}
            >
              En attente
            </Button>
            <Button
              variant={filter === 'ACTIF' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ACTIF')}
              className={filter === 'ACTIF' ? 'bg-green-600' : 'border-gray-700 text-gray-300'}
            >
              Actifs
            </Button>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : clients.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-16 text-center">
              <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Aucun client trouve
              </h3>
              <p className="text-gray-400">
                {filter ? 'Essayez un autre filtre' : 'Aucun client inscrit pour le moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {clients.map((client) => {
              const contactPrincipal = client.contacts.find(c => c.estContactPrincipal)
              return (
                <Card key={client.uid} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{client.raisonSociale}</h3>
                          {getStatutBadge(client.statut, client.valideParAdmin)}
                          {getTypeClientBadge(client.typeClient)}
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {client.codeUnique}
                          </span>
                          {client.siret && (
                            <span>SIRET: {client.siret}</span>
                          )}
                          {client.ville && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {client.ville}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Inscrit le {formatDate(client.createdAt)}
                          </span>
                        </div>

                        {contactPrincipal && (
                          <div className="flex items-center gap-4 text-sm text-gray-300">
                            <span className="font-medium">Contact:</span>
                            <span>{contactPrincipal.prenom} {contactPrincipal.nom}</span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contactPrincipal.email}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                          <span>{client._count.offres} offre(s)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!client.valideParAdmin && client.statut === 'EN_ATTENTE' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleValidate(client.uid, true)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600/20"
                              onClick={() => handleValidate(client.uid, false)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Refuser
                            </Button>
                          </>
                        )}
                        <Link href={`/admin/clients/${client.uid}`}>
                          <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
