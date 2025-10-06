// User report types
export interface UserReport {
  id: string
  email: string
  latitud: string
  longitud: string
  descripcion: string | null
  gravedad: string
  tipo: string
  fechaReporte: string
  createdAt: string
  updatedAt: string
}

// Form types
export interface ReportFormData {
  email: string
  latitud: number
  longitud: number
  descripcion: string
  gravedad: string
  tipo: string
}

export type EventType = 'fire' | 'smoke' | 'dust'
export type SeverityLevel = 'low' | 'intermediate' | 'critical'

// Event type options
export const EVENT_TYPES = [
  {
    value: 'fire' as EventType,
    label: 'Fire',
    description: 'Wildfires, industrial or urban fires',
    icon: '🔥'
  },
  {
    value: 'smoke' as EventType,
    label: 'Smoke',
    description: 'Industrial or vehicular smoke emissions',
    icon: '💨'
  },
  {
    value: 'dust' as EventType,
    label: 'Dust',
    description: 'Suspended dust, construction, or sandstorms',
    icon: '🌪️'
  }
] as const

// Severity level options
export const SEVERITY_LEVELS = [
  {
    value: 'low' as SeverityLevel,
    label: 'Low',
    description: 'Minimal impact on air quality',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    value: 'intermediate' as SeverityLevel,
    label: 'Intermediate',
    description: 'Moderate impact, caution for sensitive groups',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    value: 'critical' as SeverityLevel,
    label: 'Critical',
    description: 'Severe impact, dangerous for entire population',
    color: 'bg-red-100 text-red-800 border-red-200'
  }
] as const

// Severity configuration for badges - Complete mapping of API values
export const SEVERITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
  // Alternative values that might come from API
  'bajo': { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
  'intermedio': { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'critico': { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' }
} as const

// Type configuration for badges - Complete mapping of API values
export const TYPE_CONFIG = {
  fire: { label: 'Fire', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  smoke: { label: 'Smoke', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  dust: { label: 'Dust', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  // Alternative values that might come from API
  'fuego': { label: 'Fire', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'humo': { label: 'Smoke', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'polvo': { label: 'Dust', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
} as const

// California geographic bounds for validation
export const CALIFORNIA_BOUNDS = {
  north: 42.0,
  south: 32.5,
  east: -114.1,
  west: -124.4
} as const
