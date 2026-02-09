'use client'

interface SEOScoreIndicatorProps {
  score: number // 0-100
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showPercentage?: boolean
  subtitle?: string
}

export default function SEOScoreIndicator({
  score,
  label,
  size = 'md',
  showPercentage = true,
  subtitle,
}: SEOScoreIndicatorProps) {
  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 80) return 'emerald' // Excellent
    if (score >= 60) return 'amber' // Good
    if (score >= 40) return 'orange' // Fair
    return 'rose' // Poor
  }

  const color = getColor(score)

  // Size configurations
  const sizes = {
    sm: {
      container: 'w-16 h-16',
      circle: 'w-14 h-14',
      text: 'text-lg',
      labelText: 'text-xs',
    },
    md: {
      container: 'w-24 h-24',
      circle: 'w-20 h-20',
      text: 'text-2xl',
      labelText: 'text-sm',
    },
    lg: {
      container: 'w-32 h-32',
      circle: 'w-28 h-28',
      text: 'text-4xl',
      labelText: 'text-base',
    },
  }

  const sizeConfig = sizes[size]

  // Calculate circle stroke
  const radius = size === 'sm' ? 24 : size === 'md' ? 36 : 48
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Circular progress indicator */}
      <div className={`relative ${sizeConfig.container}`}>
        {/* Background circle */}
        <svg className="absolute inset-0" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={`currentColor`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className={`
              transition-all duration-1000 ease-out
              ${color === 'emerald' ? 'text-emerald-500' : ''}
              ${color === 'amber' ? 'text-amber-500' : ''}
              ${color === 'orange' ? 'text-orange-500' : ''}
              ${color === 'rose' ? 'text-rose-500' : ''}
            `}
          />
        </svg>

        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${sizeConfig.text} text-gray-900`}>
            {score}
            {showPercentage && <span className="text-sm text-gray-500">%</span>}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={`font-medium text-gray-700 ${sizeConfig.labelText}`}>
          {label}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
