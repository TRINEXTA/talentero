'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Bell, Settings, LogOut, ArrowLeft, Send,
  Briefcase, Building2, User, Shield
} from 'lucide-react'

interface Message {
  uid: string
  contenu: string
  pieceJointe: string | null
  pieceJointeNom: string | null
  expediteur: {
    type: string
    uid?: string
    codeUnique?: string
    nom: string
    photoUrl: string | null
  }
  isFromMe: boolean
  createdAt: string
}

interface Conversation {
  uid: string
  sujet: string | null
  type: 'OFFRE' | 'DIRECT' | 'SUPPORT'
  offre: {
    uid: string
    codeUnique: string
    titre: string
    statut: string
    client: {
      uid: string
      codeUnique: string
      raisonSociale: string
      logoUrl: string | null
    } | null
  } | null
  participants: Array<{
    type: string
    talent: any | null
    client: any | null
    isAdmin: boolean
  }>
  messages: Message[]
  archivee: boolean
  createdAt: string
}

export default function TalentConversationPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params)
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversation()
    // Polling toutes les 10 secondes pour les nouveaux messages
    const interval = setInterval(fetchConversation, 10000)
    return () => clearInterval(interval)
  }, [uid])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const fetchConversation = async () => {
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }

      // Utiliser la nouvelle API talent conversations
      const res = await fetch(`/api/talent/conversations/${uid}/messages`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        // Transformer les messages
        const conv = data.conversation
        const transformedConv = {
          ...conv,
          participants: conv.participants?.map((p: any) => ({
            type: p.isAdmin ? 'admin' : p.talentId ? 'talent' : 'client',
            talent: p.talent,
            client: null,
            isAdmin: p.isAdmin,
          })) || [],
          messages: conv.messages?.map((m: any) => ({
            uid: m.uid,
            contenu: m.contenu,
            pieceJointe: m.pieceJointe,
            pieceJointeNom: m.pieceJointeNom,
            expediteur: m.expediteur,
            isFromMe: m.expediteur?.type === 'moi',
            createdAt: m.createdAt,
          })) || [],
        }
        setConversation(transformedConv)
      } else if (res.status === 404) {
        router.push('/t/messages')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      // Utiliser la nouvelle API talent conversations
      const res = await fetch(`/api/talent/conversations/${uid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (res.ok) {
        setNewMessage('')
        await fetchConversation()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getExpediteurIcon = (type: string) => {
    switch (type) {
      case 'talent':
        return <User className="w-4 h-4" />
      case 'client':
        return <Building2 className="w-4 h-4" />
      case 'admin':
        return <Shield className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
                <Link href="/t/matchs" className="text-gray-600 hover:text-primary">
                  Mes Matchs
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

      {/* Conversation Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/t/messages">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="font-semibold text-gray-900">
                {conversation.type === 'DIRECT' ? (conversation.sujet || 'Message de TRINEXTA') :
                 conversation.type === 'SUPPORT' ? (conversation.sujet || 'Support') :
                 conversation.offre?.titre || conversation.sujet || 'Conversation'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {conversation.type === 'DIRECT' && (
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    Message direct
                  </Badge>
                )}
                {conversation.type === 'SUPPORT' && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    Support
                  </Badge>
                )}
                {conversation.offre?.codeUnique && (
                  <Badge variant="outline" className="text-xs">
                    {conversation.offre.codeUnique}
                  </Badge>
                )}
                {conversation.offre?.client && (
                  <span>{conversation.offre.client.raisonSociale}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {conversation.participants.map((p, i) => {
                if (p.type === 'talent') return null
                return (
                  <Badge key={i} variant="outline" className={`text-xs ${p.isAdmin ? 'bg-red-50 text-red-700 border-red-200' : ''}`}>
                    {p.isAdmin ? 'TRINEXTA' : p.client?.nom}
                  </Badge>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun message pour le moment</p>
            </div>
          ) : (
            conversation.messages.map((msg) => (
              <div
                key={msg.uid}
                className={`flex ${msg.isFromMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${msg.isFromMe ? 'order-2' : ''}`}>
                  {/* Expediteur info */}
                  {!msg.isFromMe && (
                    <div className="flex items-center gap-2 mb-1 ml-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        msg.expediteur.type === 'admin' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getExpediteurIcon(msg.expediteur.type)}
                      </div>
                      <span className="text-xs text-gray-500 font-medium">
                        {msg.expediteur.type === 'admin' ? 'TRINEXTA' : msg.expediteur.nom}
                      </span>
                    </div>
                  )}
                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.isFromMe
                        ? 'bg-primary text-white rounded-br-md'
                        : msg.expediteur.type === 'admin'
                        ? 'bg-red-50 text-gray-900 border border-red-200 rounded-bl-md'
                        : 'bg-white text-gray-900 border rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.contenu}</p>
                  </div>
                  <p className={`text-xs text-gray-400 mt-1 ${msg.isFromMe ? 'text-right mr-2' : 'ml-2'}`}>
                    {formatDate(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Ecrivez votre message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
                className="resize-none min-h-[44px] max-h-[200px]"
                rows={1}
              />
            </div>
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Appuyez sur Entree pour envoyer, Shift+Entree pour un saut de ligne
          </p>
        </form>
      </div>
    </div>
  )
}
