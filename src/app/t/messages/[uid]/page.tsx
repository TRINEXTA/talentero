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
  Briefcase, Building2, User, Shield, AlertCircle
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
  const [error, setError] = useState<string | null>(null)
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
        setError(null)
      } else if (res.status === 404) {
        router.push('/t/messages')
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || 'Erreur lors du chargement')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur de connexion')
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
    setError(null)

    try {
      // Utiliser la nouvelle API talent conversations
      const res = await fetch(`/api/talent/conversations/${uid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (res.ok) {
        setNewMessage('')
        await fetchConversation()
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || `Erreur ${res.status}: Impossible d'envoyer le message`)
        console.error('Erreur envoi message:', res.status, errorData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur de connexion lors de l\'envoi')
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
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!conversation) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-700 flex flex-col">
      {/* Header */}
      <header className="bg-gray-600 border-b border-gray-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/">
                <Logo size="sm" showText />
              </Link>
              <Badge variant="outline" className="text-xs border-gray-400 text-gray-200">
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-300 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-300 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-gray-300 hover:text-primary">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-300 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/messages" className="text-primary font-medium">
                  Messages
                </Link>
                <Link href="/t/profil" className="text-gray-300 hover:text-primary">
                  Mon profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conversation Header */}
      <div className="bg-gray-600 border-b border-gray-500 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/t/messages">
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="font-semibold text-white">
                {conversation.type === 'DIRECT' ? (conversation.sujet || 'Message de TRINEXTA') :
                 conversation.type === 'SUPPORT' ? (conversation.sujet || 'Support') :
                 conversation.offre?.titre || conversation.sujet || 'Conversation'}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                {conversation.type === 'DIRECT' && (
                  <Badge variant="outline" className="text-xs bg-red-900/50 text-red-300 border-red-700">
                    Message direct
                  </Badge>
                )}
                {conversation.type === 'SUPPORT' && (
                  <Badge variant="outline" className="text-xs bg-yellow-900/50 text-yellow-300 border-yellow-700">
                    Support
                  </Badge>
                )}
                {conversation.offre?.codeUnique && (
                  <Badge variant="outline" className="text-xs border-gray-400 text-gray-200">
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
                  <Badge key={i} variant="outline" className={`text-xs ${p.isAdmin ? 'bg-red-900/50 text-red-300 border-red-700' : 'border-gray-400 text-gray-200'}`}>
                    {p.isAdmin ? 'TRINEXTA' : p.client?.nom}
                  </Badge>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-red-300">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300">Aucun message pour le moment</p>
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
                        msg.expediteur.type === 'admin' ? 'bg-red-900/50 text-red-300' : 'bg-gray-500 text-gray-200'
                      }`}>
                        {getExpediteurIcon(msg.expediteur.type)}
                      </div>
                      <span className="text-xs text-gray-300 font-medium">
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
                        ? 'bg-red-900/30 text-gray-100 border border-red-700 rounded-bl-md'
                        : 'bg-gray-600 text-gray-100 border border-gray-500 rounded-bl-md'
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
      <div className="bg-gray-600 border-t border-gray-500 px-4 py-4">
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
                className="resize-none min-h-[44px] max-h-[200px] bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
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
