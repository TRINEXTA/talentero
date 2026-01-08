"use client"

import { checkPasswordStrength, PASSWORD_REQUIREMENTS } from '@/lib/validations'
import { Check, X } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
  showOnlyInvalid?: boolean
}

/**
 * Composant pour afficher la force du mot de passe
 * et les exigences de complexité en temps réel
 */
export function PasswordStrength({ password, showOnlyInvalid = false }: PasswordStrengthProps) {
  const { checks, isValid } = checkPasswordStrength(password)

  const requirements = [
    { key: 'minLength', label: `Au moins ${PASSWORD_REQUIREMENTS.minLength} caractères`, met: checks.minLength },
    { key: 'hasUppercase', label: 'Une lettre majuscule', met: checks.hasUppercase },
    { key: 'hasLowercase', label: 'Une lettre minuscule', met: checks.hasLowercase },
    { key: 'hasDigit', label: 'Un chiffre', met: checks.hasDigit },
    { key: 'hasSpecial', label: 'Un caractère spécial (!@#$%...)', met: checks.hasSpecial },
  ]

  // Ne rien afficher si le mot de passe est vide
  if (!password) {
    return null
  }

  // Filtrer les exigences si showOnlyInvalid est activé
  const displayRequirements = showOnlyInvalid
    ? requirements.filter((req) => !req.met)
    : requirements

  if (showOnlyInvalid && displayRequirements.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isValid
                ? 'bg-green-500'
                : Object.values(checks).filter(Boolean).length >= 3
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{
              width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%`,
            }}
          />
        </div>
        <span
          className={`text-xs font-medium ${
            isValid
              ? 'text-green-600'
              : Object.values(checks).filter(Boolean).length >= 3
              ? 'text-yellow-600'
              : 'text-red-600'
          }`}
        >
          {isValid
            ? 'Fort'
            : Object.values(checks).filter(Boolean).length >= 3
            ? 'Moyen'
            : 'Faible'}
        </span>
      </div>
      <ul className="text-xs space-y-0.5">
        {displayRequirements.map((req) => (
          <li
            key={req.key}
            className={`flex items-center gap-1.5 ${
              req.met ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            {req.met ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3 text-red-400" />
            )}
            {req.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
