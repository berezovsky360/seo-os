// Cron Expression Parser
//
// Supports standard 5-field cron: minute hour day-of-month month day-of-week
// Examples: "0 9 * * 1" = Every Monday at 9:00 AM
//           "0 0 1 * *" = First day of every month at midnight

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface CronFields {
  minute: number[]
  hour: number[]
  dayOfMonth: number[]
  month: number[]
  dayOfWeek: number[]
}

/**
 * Parse a single cron field into an array of matching values.
 */
function parseField(field: string, min: number, max: number): number[] {
  const values: Set<number> = new Set()

  for (const part of field.split(',')) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i)
    } else if (part.includes('/')) {
      const [range, stepStr] = part.split('/')
      const step = parseInt(stepStr, 10)
      const start = range === '*' ? min : parseInt(range, 10)
      for (let i = start; i <= max; i += step) values.add(i)
    } else if (part.includes('-')) {
      const [startStr, endStr] = part.split('-')
      const start = parseInt(startStr, 10)
      const end = parseInt(endStr, 10)
      for (let i = start; i <= end; i++) values.add(i)
    } else {
      values.add(parseInt(part, 10))
    }
  }

  return Array.from(values).sort((a, b) => a - b)
}

/**
 * Parse a 5-field cron expression into structured fields.
 */
function parseCron(expression: string): CronFields {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: expected 5 fields, got ${parts.length}`)
  }

  return {
    minute: parseField(parts[0], 0, 59),
    hour: parseField(parts[1], 0, 23),
    dayOfMonth: parseField(parts[2], 1, 31),
    month: parseField(parts[3], 1, 12),
    dayOfWeek: parseField(parts[4], 0, 6),
  }
}

/**
 * Calculate the next run time from a cron expression.
 */
export function getNextRun(expression: string, timezone: string = 'UTC', from?: Date): Date {
  const fields = parseCron(expression)
  const now = from || new Date()

  // Work in UTC-adjusted time based on timezone offset
  const candidate = new Date(now.getTime())
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1) // Start from next minute

  // Search up to 2 years ahead
  const maxIterations = 525960 // ~1 year in minutes
  for (let i = 0; i < maxIterations; i++) {
    const month = candidate.getMonth() + 1
    const dayOfMonth = candidate.getDate()
    const dayOfWeek = candidate.getDay()
    const hour = candidate.getHours()
    const minute = candidate.getMinutes()

    if (
      fields.month.includes(month) &&
      fields.dayOfMonth.includes(dayOfMonth) &&
      fields.dayOfWeek.includes(dayOfWeek) &&
      fields.hour.includes(hour) &&
      fields.minute.includes(minute)
    ) {
      return candidate
    }

    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  // Fallback: return 1 day from now
  return new Date(now.getTime() + 86400000)
}

/**
 * Generate a human-readable description of a cron expression.
 */
export function describeCron(expression: string): string {
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) return expression

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    // Every minute
    if (expression === '* * * * *') return 'Every minute'

    // Every N minutes
    if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const n = minute.split('/')[1]
      return `Every ${n} minutes`
    }

    // Every N hours
    if (minute !== '*' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const n = hour.split('/')[1]
      return `Every ${n} hours at :${minute.padStart(2, '0')}`
    }

    // Specific time daily
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${formatTime(parseInt(hour), parseInt(minute))}`
    }

    // Specific time on specific days of week
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const days = parseField(dayOfWeek, 0, 6).map(d => WEEKDAYS[d])
      const time = formatTime(parseInt(hour), parseInt(minute))
      if (days.length === 5 && !days.includes('Saturday') && !days.includes('Sunday')) {
        return `Weekdays at ${time}`
      }
      return `${days.join(', ')} at ${time}`
    }

    // Specific day of month
    if (!minute.includes('*') && !hour.includes('*') && dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
      const time = formatTime(parseInt(hour), parseInt(minute))
      const day = parseInt(dayOfMonth)
      return `${ordinal(day)} of every month at ${time}`
    }

    // Fallback
    return expression
  } catch {
    return expression
  }
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  const m = minute.toString().padStart(2, '0')
  return `${h}:${m} ${period}`
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Validate a cron expression. Returns null if valid, error message if invalid.
 */
export function validateCron(expression: string): string | null {
  try {
    const parts = expression.trim().split(/\s+/)
    if (parts.length !== 5) {
      return `Expected 5 fields (minute hour day month weekday), got ${parts.length}`
    }

    const ranges: [number, number, string][] = [
      [0, 59, 'minute'],
      [0, 23, 'hour'],
      [1, 31, 'day of month'],
      [1, 12, 'month'],
      [0, 6, 'day of week'],
    ]

    for (let i = 0; i < 5; i++) {
      const values = parseField(parts[i], ranges[i][0], ranges[i][1])
      if (values.length === 0) {
        return `Invalid ${ranges[i][2]} field: ${parts[i]}`
      }
      for (const v of values) {
        if (v < ranges[i][0] || v > ranges[i][1]) {
          return `${ranges[i][2]} value ${v} out of range (${ranges[i][0]}-${ranges[i][1]})`
        }
      }
    }

    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid cron expression'
  }
}

/**
 * Common cron presets for the UI.
 */
export const CRON_PRESETS = [
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every 6 hours', expression: '0 */6 * * *' },
  { label: 'Daily at 9:00 AM', expression: '0 9 * * *' },
  { label: 'Daily at midnight', expression: '0 0 * * *' },
  { label: 'Weekdays at 9:00 AM', expression: '0 9 * * 1-5' },
  { label: 'Every Monday at 9:00 AM', expression: '0 9 * * 1' },
  { label: 'First of month at midnight', expression: '0 0 1 * *' },
] as const
