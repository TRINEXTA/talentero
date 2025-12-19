'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare, ChevronLeft, ChevronRight, User, Clock,
  HelpCircle, Briefcase, Mail
} from 'lucide-react'

interface Conversation {
  uid: string
  type: 'OFFRE' | 'DIRECT' | 'SUPPORT'
  sujet: string | null
  updatedAt: string
  participants: Array<{
    talent: {
      uid: string
      codeUnique: string
      prenom: string
      nom: string
      photoUrl: string | null
    } | null
    isAdmin: boolean
  }>
  messages: Array<{
    id: number
    contenu: string
    createdAt: string
    expediteurAdmin: boolean
    expediteurTalentId: number | null
  }>
  offre: {
    uid: string
    titre: string
  } | null
  _count: {
    messages: number
  }
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')

  useEffect(() => {
    fetchConversations()
  }, [filter])

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('type', filter)

      const res = await fetch(`/api/admin/conversations?${params.toString()}`)
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUPPORT':
        return <HelpCircle className="w-5 h-5 text-yellow-600" />
      case 'DIRECT':
        return <Mail className="w-5 h-5 text-blue-600" />
      case 'OFFRE':
        return <Briefcase className="w-5 h-5 text-green-600" />
      default:
        return <MessageSquare className="w-5 h-5 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'SUPPORT':
        return <Badge className="bg-yellow-100 text-yellow-800">Support</Badge>
      case 'DIRECT':
        return <Badge className="bg-blue-100 text-blue-800">Direct</Badge>
      case 'OFFRE':
        return <Badge className="bg-green-100 text-green-800">Offre</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const getTalentFromConversation = (conv: Conversation) => {
    const talentParticipant = conv.participants.find(p => p.talent)
    return talentParticipant?.talent
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === '' ? 'default' : 'outline'}
            onClick={() => setFilter('')}
            size="sm"
          >
            Tous
          </Button>
          <Button
            variant={filter === 'SUPPORT' ? 'default' : 'outline'}
            onClick={() => setFilter('SUPPORT')}
            size="sm"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Support
          </Button>
          <Button
            variant={filter === 'DIRECT' ? 'default' : 'outline'}
            onClick={() => setFilter('DIRECT')}
            size="sm"
          >
            <Mail className="w-4 h-4 mr-1" />
            Direct
          </Button>
          <Button
            variant={filter === 'OFFRE' ? 'default' : 'outline'}
            onClick={() => setFilter('OFFRE')}
            size="sm"
          >
            <Briefcase className="w-4 h-4 mr-1" />
            Offres
          </Button>
        </div>

        {/* Liste des conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Conversations ({conversations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune conversation</p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const talent = getTalentFromConversation(conv)
                  const lastMessage = conv.messages[0]
                  const isFromAdmin = lastMessage?.expediteurAdmin

                  return (
                    <Link key={conv.uid} href={`/admin/messages/${conv.uid}`}>
                      <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 transition cursor-pointer">
                        {/* Icon type */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          {getTypeIcon(conv.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {talent ? `${talent.prenom} ${talent.nom}` : 'Utilisateur'}
                            </span>
                            {getTypeBadge(conv.type)}
                            {talent && (
                              <Badge variant="outline" className="text-xs">
                                {talent.codeUnique}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 truncate">
                            {conv.sujet || conv.offre?.titre || 'Sans sujet'}
                          </p>

                          {lastMessage && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {isFromAdmin && <span className="text-primary">Vous: </span>}
                              {lastMessage.contenu.substring(0, 60)}
                              {lastMessage.contenu.length > 60 ? '...' : ''}
                            </p>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-400">
                            {formatDate(conv.updatedAt)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {conv._count.messages} message{conv._count.messages > 1 ? 's' : ''}
                          </span>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
