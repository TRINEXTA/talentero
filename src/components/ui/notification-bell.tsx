'use client'

import * as React from 'react'
import { Bell, Check, CheckCheck, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface Notification {
  id: number
  type: string
  titre: string
  message: string
  lien: string | null
  lu: boolean
  timeAgo: string
  createdAt: string
}

interface NotificationsData {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [data, setData] = React.useState<NotificationsData | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Polling pour le nombre de notifications non lues
  React.useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/notifications/count')
        if (res.ok) {
          const json = await res.json()
          setUnreadCount(json.count)
        }
      } catch {
        // Silently fail
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000) // Polling toutes les 30 secondes

    return () => clearInterval(interval)
  }, [])

  // Fermer le dropdown quand on clique ailleurs
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Charger les notifications quand on ouvre le dropdown
  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setUnreadCount(json.unreadCount)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (newState) {
      fetchNotifications()
    }
  }

  // Marquer comme lu
  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, lu: true } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }
      })
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // Silently fail
    }
  }

  // Marquer toutes comme lues
  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      })
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, lu: true })),
          unreadCount: 0,
        }
      })
      setUnreadCount(0)
    } catch {
      // Silently fail
    }
  }

  // Supprimer une notification
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      setData((prev) => {
        if (!prev) return prev
        const notification = prev.notifications.find((n) => n.id === id)
        return {
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== id),
          total: prev.total - 1,
          unreadCount: notification && !notification.lu ? prev.unreadCount - 1 : prev.unreadCount,
        }
      })
      if (data?.notifications.find((n) => n.id === id && !n.lu)) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // Silently fail
    }
  }

  // Cliquer sur une notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.lu) {
      handleMarkAsRead(notification.id)
    }
    if (notification.lien) {
      window.location.href = notification.lien
    }
    setIsOpen(false)
  }

  // Obtenir l'icône selon le type
  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      NOUVELLE_OFFRE_MATCH: '🎯',
      OFFRE_PUBLIEE: '📢',
      NOUVELLE_CANDIDATURE: '📥',
      CANDIDATURE_RECUE: '📥',
      STATUT_CANDIDATURE: '📋',
      SHORTLIST_ENVOYEE: '📋',
      ENTRETIEN_DEMANDE: '📅',
      ENTRETIEN_CONFIRME: '✅',
      ENTRETIEN_RAPPEL: '⏰',
      NOUVEAU_MESSAGE: '💬',
      CANDIDAT_SELECTIONNE: '🎉',
      CANDIDAT_REFUSE: '😔',
      VALIDATION_COMPTE: '✅',
      BIENVENUE: '👋',
    }
    return icons[type] || '🔔'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bouton cloche */}
      <button
        onClick={handleToggle}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isOpen && 'bg-gray-100'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary-700 flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste des notifications */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : data?.notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="h-10 w-10 mb-2 text-gray-300" />
                <p className="text-sm">Aucune notification</p>
              </div>
            ) : (
              data?.notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors',
                    !notification.lu && 'bg-blue-50/50'
                  )}
                >
                  {/* Icône */}
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {getIcon(notification.type)}
                  </span>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm line-clamp-1',
                        !notification.lu ? 'font-semibold text-gray-900' : 'text-gray-700'
                      )}>
                        {notification.titre}
                      </p>
                      <button
                        onClick={(e) => handleDelete(notification.id, e)}
                        className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {notification.timeAgo}
                      </span>
                      {notification.lien && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                      {!notification.lu && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          className="text-[10px] text-primary hover:text-primary-700 flex items-center gap-0.5"
                        >
                          <Check className="h-3 w-3" />
                          Marquer lu
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Indicateur non lu */}
                  {!notification.lu && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {data && data.total > 10 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  window.location.href = '/notifications'
                  setIsOpen(false)
                }}
              >
                Voir toutes les notifications ({data.total})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
