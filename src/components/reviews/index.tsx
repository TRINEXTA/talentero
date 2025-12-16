'use client'

import { Star, ThumbsUp, MessageSquare, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ==========================================
// TYPES
// ==========================================

interface ReviewData {
  id: number
  uid: string
  noteGlobale: number
  noteCompetences: number | null
  noteCommunication: number | null
  notePonctualite: number | null
  noteQualite: number | null
  titre: string | null
  commentaire: string
  recommande: boolean
  reponse: string | null
  reponduLe: string | null
  createdAt: string
  client: {
    nom: string
    logo: string | null
    secteur: string | null
  }
}

interface ReviewStats {
  total: number
  moyenneGlobale: number
  recommandations: number
  pourcentageRecommande: number
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}

// ==========================================
// STAR RATING COMPONENT
// ==========================================

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showValue = false,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => (
        <Star
          key={index}
          className={`${sizeClasses[size]} ${
            index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-gray-600">{rating.toFixed(1)}</span>
      )}
    </div>
  )
}

// ==========================================
// REVIEW STATS SUMMARY
// ==========================================

interface ReviewStatsSummaryProps {
  stats: ReviewStats
}

export function ReviewStatsSummary({ stats }: ReviewStatsSummaryProps) {
  const maxCount = Math.max(...Object.values(stats.distribution))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Évaluations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Note globale */}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-gray-900">{stats.moyenneGlobale}</div>
          <div>
            <StarRating rating={Math.round(stats.moyenneGlobale)} size="lg" />
            <p className="text-sm text-gray-500 mt-1">
              {stats.total} avis
            </p>
          </div>
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[rating as keyof typeof stats.distribution]
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm w-3">{rating}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            )
          })}
        </div>

        {/* Recommandations */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <ThumbsUp className="w-5 h-5 text-green-600" />
          <span className="font-medium">{stats.pourcentageRecommande}%</span>
          <span className="text-gray-500 text-sm">recommandent ce professionnel</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ==========================================
// SINGLE REVIEW CARD
// ==========================================

interface ReviewCardProps {
  review: ReviewData
  showClient?: boolean
}

export function ReviewCard({ review, showClient = true }: ReviewCardProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {showClient && (
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                {review.client.logo ? (
                  <img
                    src={review.client.logo}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-gray-400" />
                )}
              </div>
            )}
            <div>
              {showClient && (
                <p className="font-medium text-gray-900">{review.client.nom}</p>
              )}
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), "d MMMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.noteGlobale} />
            {review.recommande && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <ThumbsUp className="w-3 h-3 mr-1" />
                Recommandé
              </Badge>
            )}
          </div>
        </div>

        {/* Title & Comment */}
        {review.titre && (
          <h4 className="font-medium text-gray-900 mb-2">{review.titre}</h4>
        )}
        <p className="text-gray-700 mb-3">{review.commentaire}</p>

        {/* Detailed ratings */}
        {(review.noteCompetences || review.noteCommunication || review.notePonctualite || review.noteQualite) && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            {review.noteCompetences && (
              <span className="flex items-center gap-1">
                Compétences: <StarRating rating={review.noteCompetences} size="sm" />
              </span>
            )}
            {review.noteCommunication && (
              <span className="flex items-center gap-1">
                Communication: <StarRating rating={review.noteCommunication} size="sm" />
              </span>
            )}
            {review.notePonctualite && (
              <span className="flex items-center gap-1">
                Ponctualité: <StarRating rating={review.notePonctualite} size="sm" />
              </span>
            )}
            {review.noteQualite && (
              <span className="flex items-center gap-1">
                Qualité: <StarRating rating={review.noteQualite} size="sm" />
              </span>
            )}
          </div>
        )}

        {/* Response */}
        {review.reponse && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">Réponse du freelance</span>
              {review.reponduLe && (
                <span className="text-xs text-gray-400">
                  {format(new Date(review.reponduLe), "d MMM yyyy", { locale: fr })}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">{review.reponse}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==========================================
// REVIEWS LIST
// ==========================================

interface ReviewsListProps {
  reviews: ReviewData[]
  showEmpty?: boolean
  emptyMessage?: string
}

export function ReviewsList({
  reviews,
  showEmpty = true,
  emptyMessage = "Aucun avis pour le moment",
}: ReviewsListProps) {
  if (reviews.length === 0 && showEmpty) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.uid} review={review} />
      ))}
    </div>
  )
}

// ==========================================
// COMPACT RATING DISPLAY (for cards/lists)
// ==========================================

interface CompactRatingProps {
  rating: number
  count: number
}

export function CompactRating({ rating, count }: CompactRatingProps) {
  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="text-gray-400 text-sm">({count})</span>
    </div>
  )
}
