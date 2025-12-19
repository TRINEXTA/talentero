'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, Bell, Settings, LogOut, ArrowLeft, Send,
  User, Shield, Loader2, MessageSquare, HelpCircle, Briefcase, AlertCircle
} from 'lucide-react'

interface MessageData {
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
  } | null
}

interface ConversationData {
  uid: string
  sujet: string | null
  type: string
  createdAt: string
  offre: {
    uid: string
    titre: string
    codeUnique?: string
    client?: { raisonSociale: string } | null
  } | null
  participants: Array<{
    talent: { prenom: string; nom: string } | null
    isAdmin: boolean
  }>
  messages: MessageData[]
}

export default function TalentConversationPage() {
  // Utiliser useParams au lieu de use(params)
  const params = useParams()
  const uid = typeof params?.uid === 'string' ? params.uid : ''

  const router = useRouter()
  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  // Fetch conversation
  useEffect(() => {
    if (!uid) {
      setError('ID de conversation manquant')
      setLoading(false)
      return
    }

    const fetchConversation = async () => {
      try {
        setError(null)

        // Check auth
        const authRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (authRes.status === 401) {
          router.push('/t/connexion')
          return
        }

        // Fetch conversation
        const res = await fetch(`/api/talent/conversations/${uid}/messages`, { credentials: 'include' })

        if (res.status === 404) {
          router.push('/t/messages')
          return
        }

        if (!res.ok) {
          setError('Erreur lors du chargement')
          return
        }

        const data = await res.json()

        if (data?.conversation) {
          const conv = data.conversation
          const safeConv: ConversationData = {
            uid: String(conv.uid || uid),
            sujet: conv.sujet || null,
            type: String(conv.type || 'DIRECT'),
            createdAt: String(conv.createdAt || ''),
            offre: conv.offre ? {
              uid: String(conv.offre.uid || ''),
              titre: String(conv.offre.titre || ''),
              codeUnique: conv.offre.codeUnique || undefined,
              client: conv.offre.client || null
            } : null,
            participants: Array.isArray(conv.participants) ? conv.participants.map((p: any) => ({
              talent: p.talent || null,
              isAdmin: Boolean(p.isAdmin)
            })) : [],
            messages: Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
              id: Number(m.id) || 0,
              uid: String(m.uid || ''),
              contenu: String(m.contenu || ''),
              createdAt: String(m.createdAt || ''),
              expediteurAdmin: Boolean(m.expediteurAdmin),
              expediteurTalentId: m.expediteurTalentId || null,
              expediteur: m.expediteur || null
            })) : []
          }
          setConversation(safeConv)
        }
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur de connexion')
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()

    // Polling
    const interval = setInterval(fetchConversation, 10000)
    return () => clearInterval(interval)
  }, [uid, router])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !uid) return

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
        // Refresh
        const refreshRes = await fetch(`/api/talent/conversations/${uid}/messages`, { credentials: 'include' })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          if (data?.conversation) {
            const conv = data.conversation
            setConversation({
              uid: String(conv.uid || uid),
              sujet: conv.sujet || null,
              type: String(conv.type || 'DIRECT'),
              createdAt: String(conv.createdAt || ''),
              offre: conv.offre ? {
                uid: String(conv.offre.uid || ''),
                titre: String(conv.offre.titre || ''),
                codeUnique: conv.offre.codeUnique || undefined,
                client: conv.offre.client || null
              } : null,
              participants: Array.isArray(conv.participants) ? conv.participants.map((p: any) => ({
                talent: p.talent || null,
                isAdmin: Boolean(p.isAdmin)
              })) : [],
              messages: Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
                id: Number(m.id) || 0,
                uid: String(m.uid || ''),
                contenu: String(m.contenu || ''),
                createdAt: String(m.createdAt || ''),
                expediteurAdmin: Boolean(m.expediteurAdmin),
                expediteurTalentId: m.expediteurTalentId || null,
                expediteur: m.expediteur || null
              })) : []
            })
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de l\'envoi du message')
    } finally {
      setSending(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
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
      case 'SUPPORT': return <HelpCircle className="w-4 h-4" />
      case 'OFFRE': return <Briefcase className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/t/messages')}>Retour aux messages</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not found
  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Conversation non trouvée</h2>
            <Button onClick={() => router.push('/t/messages')}>Retour aux messages</Button>
          </CardContent>
        </Card>
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
              <Link href="/"><Logo size="sm" showText /></Link>
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">Dashboard</Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">Offres</Link>
                <Link href="/t/messages" className="text-primary font-medium">Messages</Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">Mon profil</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      {/* Conversation Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/t/messages">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
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
                {conversation.offre.client?.raisonSociale || ''}
                {conversation.offre.codeUnique && ` - ${conversation.offre.codeUnique}`}
              </p>
            )}
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
              const isFromMe = !msg.expediteurAdmin && msg.expediteurTalentId !== null
              const isFromAdmin = msg.expediteurAdmin

              return (
                <div key={msg.id || msg.uid} className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%]`}>
                    {/* Sender info */}
                    <div className={`flex items-center gap-2 mb-1 ${isFromMe ? 'justify-end mr-2' : 'ml-2'}`}>
                      {!isFromMe && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isFromAdmin ? 'bg-primary/10' : 'bg-gray-100'}`}>
                          {isFromAdmin ? <Shield className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-gray-600" />}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {isFromMe ? 'Vous' : isFromAdmin ? 'TRINEXTA' : (
                          msg.expediteur?.prenom
                            ? `${msg.expediteur.prenom} ${msg.expediteur.nom || ''}`
                            : msg.expediteur?.nom || 'Participant'
                        )}
                      </span>
                    </div>

                    {/* Message bubble */}
                    <div className={`rounded-2xl px-4 py-2 ${
                      isFromMe
                        ? 'bg-primary text-white rounded-br-md'
                        : isFromAdmin
                        ? 'bg-primary/5 text-gray-900 border border-primary/20 rounded-bl-md'
                        : 'bg-white text-gray-900 border rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.contenu}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isFromMe ? 'text-right mr-2' : 'ml-2'}`}>
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

      {/* Input */}
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
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Entrée pour envoyer, Shift+Entrée pour saut de ligne</p>
        </form>
      </div>
    </div>
  )
}
