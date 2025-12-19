'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Bell, Settings, LogOut, ArrowLeft, Send,
  User, Shield, Loader2, MessageSquare, HelpCircle, Briefcase
} from 'lucide-react'

interface Message {
  id: number
  uid: string
  contenu: string
  createdAt: string
  expediteurAdmin: boolean
  expediteurTalentId: number | null
  expediteur: {
    type: string
    nom: string
    prenom?: string
    photoUrl?: string | null
  } | null
}

interface Conversation {
  uid: string
  sujet: string | null
  type: 'OFFRE' | 'DIRECT' | 'SUPPORT'
  createdAt: string
  offre: {
    uid: string
    codeUnique?: string
    titre: string
    statut?: string
    client?: {
      uid: string
      codeUnique: string
      raisonSociale: string
      logoUrl: string | null
    } | null
  } | null
  participants: Array<{
    talent: {
      uid: string
      prenom: string
      nom: string
      photoUrl: string | null
    } | null
    isAdmin: boolean
  }>
  messages: Message[]
}

export default function TalentConversationPage({ params }: { params: Promise<{ uid: string }> }) {
  const resolvedParams = use(params)
  const uid = resolvedParams?.uid || ''
  const router = useRouter()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!uid) return
    fetchConversation()
    const interval = setInterval(fetchConversation, 10000)
    return () => clearInterval(interval)
  }, [uid])

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  const fetchConversation = async () => {
    try {
      setError(null)
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }

      const res = await fetch(`/api/talent/conversations/${uid}/messages`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        if (data.conversation) {
          // Transformation sécurisée des données
          const conv = data.conversation
          const safeConversation: Conversation = {
            uid: conv.uid || uid,
            sujet: conv.sujet || null,
            type: conv.type || 'DIRECT',
            createdAt: conv.createdAt || new Date().toISOString(),
            offre: conv.offre || null,
            participants: Array.isArray(conv.participants) ? conv.participants.map((p: any) => ({
              talent: p.talent || null,
              isAdmin: !!p.isAdmin
            })) : [],
            messages: Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
              id: m.id || 0,
              uid: m.uid || '',
              contenu: m.contenu || '',
              createdAt: m.createdAt || new Date().toISOString(),
              expediteurAdmin: !!m.expediteurAdmin,
              expediteurTalentId: m.expediteurTalentId || null,
              expediteur: m.expediteur || null
            })) : []
          }
          setConversation(safeConversation)
        }
      } else if (res.status === 404) {
        router.push('/t/messages')
      } else {
        setError('Erreur lors du chargement de la conversation')
      }
    } catch (err) {
      console.error('Erreur:', err)
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
    try {
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
        const errorData = await res.json()
        alert(errorData.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de l\'envoi du message')
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUPPORT':
        return <HelpCircle className="w-4 h-4" />
      case 'OFFRE':
        return <Briefcase className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const isMessageFromMe = (msg: Message) => {
    // Si c'est un message du talent (pas de l'admin), c'est le mien
    return !msg.expediteurAdmin && msg.expediteurTalentId !== null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push('/t/messages')}>
            Retour aux messages
          </Button>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Conversation non trouvée</p>
          <Button onClick={() => router.push('/t/messages')}>
            Retour aux messages
          </Button>
        </div>
      </div>
    )
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
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">Dashboard</Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">Offres</Link>
                <Link href="/t/matchs" className="text-gray-600 hover:text-primary">Mes Matchs</Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">Candidatures</Link>
                <Link href="/t/messages" className="text-primary font-medium">Messages</Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">Mon profil</Link>
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
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">
                  {conversation.sujet || conversation.offre?.titre || 'Conversation'}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {getTypeIcon(conversation.type)}
                  <span className="ml-1">{conversation.type}</span>
                </Badge>
              </div>
              {conversation.offre && (
                <p className="text-sm text-gray-500">
                  {conversation.offre.client?.raisonSociale || 'Offre'}
                  {conversation.offre.codeUnique && ` - ${conversation.offre.codeUnique}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun message pour le moment</p>
            </div>
          ) : (
            conversation.messages.map((msg) => {
              const fromMe = isMessageFromMe(msg)
              const isFromAdmin = msg.expediteurAdmin

              return (
                <div
                  key={msg.id || msg.uid}
                  className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${fromMe ? 'order-2' : ''}`}>
                    {/* Info expéditeur */}
                    {!fromMe && (
                      <div className="flex items-center gap-2 mb-1 ml-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isFromAdmin ? 'bg-primary/10' : 'bg-gray-100'
                        }`}>
                          {isFromAdmin ? (
                            <Shield className="w-4 h-4 text-primary" />
                          ) : (
                            <User className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          {isFromAdmin ? 'TRINEXTA' : (
                            msg.expediteur?.prenom
                              ? `${msg.expediteur.prenom} ${msg.expediteur.nom || ''}`
                              : msg.expediteur?.nom || 'Participant'
                          )}
                        </span>
                      </div>
                    )}
                    {fromMe && (
                      <div className="flex items-center gap-2 mb-1 mr-2 justify-end">
                        <span className="text-xs text-gray-500 font-medium">Vous</span>
                      </div>
                    )}

                    {/* Bulle du message */}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        fromMe
                          ? 'bg-primary text-white rounded-br-md'
                          : isFromAdmin
                          ? 'bg-primary/5 text-gray-900 border border-primary/20 rounded-bl-md'
                          : 'bg-white text-gray-900 border rounded-bl-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.contenu}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${fromMe ? 'text-right mr-2' : 'ml-2'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Zone de saisie */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Écrivez votre message..."
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
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Entrée pour envoyer, Shift+Entrée pour un saut de ligne
          </p>
        </form>
      </div>
    </div>
  )
}
