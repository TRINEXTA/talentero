'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Users, Bell, Settings, LogOut, MessageSquare,
  Briefcase, Clock, ChevronRight, Mail, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Conversation {
  uid: string
  sujet: string | null
  offre: {
    uid: string
    codeUnique: string
    titre: string
    client: {
      raisonSociale: string
    } | null
  }
  participants: Array<{
    type: string
    talent: any | null
    client: any | null
    isAdmin: boolean
  }>
  lastMessage: {
    uid: string
    contenu: string
    createdAt: string
    isFromMe: boolean
  } | null
  unreadCount: number
  archivee: boolean
  updatedAt: string
}

export default function TalentMessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/t/connexion')
        return
      }

      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Hier'
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      conv.sujet?.toLowerCase().includes(searchLower) ||
      conv.offre?.titre.toLowerCase().includes(searchLower) ||
      conv.lastMessage?.contenu.toLowerCase().includes(searchLower)
    )
  })

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
                <Link href="/t/messages" className="text-primary font-medium">
                  Messages
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">
            Echangez avec TRINEXTA et les clients
          </p>
        </div>

        {/* Recherche */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher dans les conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Liste des conversations */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search ? 'Aucun resultat' : 'Aucune conversation'}
              </h3>
              <p className="text-gray-500">
                {search
                  ? 'Essayez une autre recherche'
                  : 'Vos echanges avec TRINEXTA apparaitront ici'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <Link key={conv.uid} href={`/t/messages/${conv.uid}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${conv.unreadCount > 0 ? 'bg-blue-50/50 border-blue-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar / Icon */}
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={`font-semibold text-gray-900 truncate ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>
                              {conv.offre?.titre || conv.sujet || 'Conversation'}
                            </h3>
                            {conv.offre?.client && (
                              <p className="text-sm text-gray-500 truncate">
                                {conv.offre.client.raisonSociale}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-primary text-white text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                            </span>
                          </div>
                        </div>

                        {conv.lastMessage && (
                          <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                            {conv.lastMessage.isFromMe && <span className="text-gray-400">Vous: </span>}
                            {conv.lastMessage.contenu}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {conv.offre?.codeUnique}
                          </Badge>
                          {conv.participants.some(p => p.isAdmin) && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              TRINEXTA
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
