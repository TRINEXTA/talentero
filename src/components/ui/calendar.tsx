'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  type?: string
  notes?: string
}

interface CalendarProps {
  planning?: {
    date: string
    type: string
    notes?: string
  }[]
  onDateSelect?: (date: Date) => void
  onDateRangeSelect?: (dates: Date[]) => void
  selectedDates?: Date[]
  renderDay?: (day: CalendarDay) => React.ReactNode
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

export function Calendar({
  planning = [],
  onDateSelect,
  onDateRangeSelect,
  selectedDates = [],
  renderDay
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    let startDay = firstDay.getDay()
    // Convert to Monday-based week
    startDay = startDay === 0 ? 6 : startDay - 1

    const days: CalendarDay[] = []

    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false
      })
    }

    // Add days of current month
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDate = new Date(year, month, day)
      const dateStr = currentDate.toISOString().split('T')[0]
      const planningEntry = planning.find(p => p.date === dateStr)

      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: currentDate.getTime() === today.getTime(),
        type: planningEntry?.type,
        notes: planningEntry?.notes || undefined
      })
    }

    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        isToday: false
      })
    }

    return days
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return

    if (onDateRangeSelect) {
      if (!selectionStart) {
        setSelectionStart(day.date)
      } else {
        // Create range
        const start = selectionStart < day.date ? selectionStart : day.date
        const end = selectionStart < day.date ? day.date : selectionStart
        const dates: Date[] = []

        const current = new Date(start)
        while (current <= end) {
          dates.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }

        onDateRangeSelect(dates)
        setSelectionStart(null)
      }
    } else if (onDateSelect) {
      onDateSelect(day.date)
    }
  }

  const isSelected = (date: Date) => {
    return selectedDates.some(d =>
      d.toISOString().split('T')[0] === date.toISOString().split('T')[0]
    )
  }

  const isInSelectionRange = (date: Date) => {
    if (!selectionStart) return false
    return date.toISOString().split('T')[0] === selectionStart.toISOString().split('T')[0]
  }

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'EN_MISSION':
        return 'bg-blue-500 text-white'
      case 'CONGE':
        return 'bg-amber-400 text-amber-900'
      case 'ARRET_MALADIE':
        return 'bg-red-400 text-red-900'
      case 'INDISPONIBLE':
        return 'bg-gray-400 text-gray-900'
      case 'FORMATION':
        return 'bg-purple-400 text-purple-900'
      case 'INTERCONTRAT':
        return 'bg-green-400 text-green-900'
      case 'DISPONIBLE':
        return 'bg-green-100 text-green-700'
      default:
        return ''
    }
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button variant="outline" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (renderDay) {
            return <div key={index}>{renderDay(day)}</div>
          }

          return (
            <button
              key={index}
              onClick={() => handleDateClick(day)}
              disabled={!day.isCurrentMonth}
              className={`
                aspect-square p-1 text-sm rounded-lg transition-colors relative
                ${!day.isCurrentMonth ? 'text-gray-300 cursor-default' : 'hover:bg-gray-100 cursor-pointer'}
                ${day.isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${isSelected(day.date) ? 'bg-primary text-white hover:bg-primary' : ''}
                ${isInSelectionRange(day.date) ? 'bg-primary/30' : ''}
                ${day.type && day.isCurrentMonth ? getTypeColor(day.type) : ''}
              `}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                {day.date.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span>En mission</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-400"></div>
          <span>Congé</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-400"></div>
          <span>Arrêt maladie</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400"></div>
          <span>Indisponible</span>
        </div>
      </div>
    </div>
  )
}
