'use client'

import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  darkMode?: boolean
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { width: 140, height: 35, fontSize: 16, iconSize: 12, spacing: 30 },
  md: { width: 180, height: 45, fontSize: 20, iconSize: 16, spacing: 38 },
  lg: { width: 240, height: 55, fontSize: 26, iconSize: 20, spacing: 48 },
  xl: { width: 300, height: 70, fontSize: 32, iconSize: 24, spacing: 58 },
}

export function Logo({
  size = 'md',
  animated = true,
  darkMode = false,
  showText = true,
  className = ''
}: LogoProps) {
  const { width, height, fontSize, iconSize, spacing } = sizes[size]
  const textX = showText ? spacing : 0
  const finalWidth = showText ? width : spacing

  return (
    <Link href="/" className={`inline-block ${className}`}>
      <svg
        width={finalWidth}
        height={height}
        viewBox={`0 0 ${finalWidth} ${height}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id={`logoGrad1-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={darkMode ? "#3b82f6" : "#2563eb"} />
            <stop offset="100%" stopColor={darkMode ? "#a78bfa" : "#7c3aed"} />
          </linearGradient>
          <linearGradient id={`logoGrad2-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={darkMode ? "#60a5fa" : "#3b82f6"} />
            <stop offset="100%" stopColor={darkMode ? "#c4b5fd" : "#8b5cf6"} />
          </linearGradient>
        </defs>

        {/* Icône - deux carrés qui se connectent */}
        <rect
          className={animated ? "animate-connect-1" : ""}
          x={iconSize * 0.2}
          y={height * 0.22}
          width={iconSize}
          height={iconSize}
          rx={iconSize * 0.25}
          fill={`url(#logoGrad1-${size})`}
        />
        <rect
          className={animated ? "animate-connect-2" : ""}
          x={iconSize * 0.9}
          y={height * 0.42}
          width={iconSize}
          height={iconSize}
          rx={iconSize * 0.25}
          fill={`url(#logoGrad2-${size})`}
          opacity="0.8"
        />

        {/* Texte TALENTERO */}
        {showText && (
          <text
            x={textX}
            y={height * 0.68}
            fontFamily="Montserrat, system-ui, sans-serif"
            fontSize={fontSize}
            fontWeight="800"
            fill={`url(#logoGrad1-${size})`}
            letterSpacing="1"
          >
            TALENTERO
          </text>
        )}
      </svg>
    </Link>
  )
}

// Version icône seule pour favicon / mobile
export function LogoIcon({
  size = 32,
  animated = false,
  className = ''
}: {
  size?: number
  animated?: boolean
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="iconGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="iconGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect
        className={animated ? "animate-connect-1" : ""}
        x="4"
        y="6"
        width="18"
        height="18"
        rx="4"
        fill="url(#iconGrad1)"
      />
      <rect
        className={animated ? "animate-connect-2" : ""}
        x="18"
        y="16"
        width="18"
        height="18"
        rx="4"
        fill="url(#iconGrad2)"
        opacity="0.8"
      />
    </svg>
  )
}
