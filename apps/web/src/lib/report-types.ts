// Tipos para reportes de usuario
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

// Tipos para el formulario
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

// Opciones de tipo de evento
export const EVENT_TYPES = [
  { 
    value: 'fire' as EventType, 
    label: 'Fuego', 
    description: 'Incendios forestales, industriales o urbanos', 
    icon: '🔥' 
  },
  { 
    value: 'smoke' as EventType, 
    label: 'Humo', 
    description: 'Emisiones de humo industrial o vehicular', 
    icon: '💨' 
  },
  { 
    value: 'dust' as EventType, 
    label: 'Polvo', 
    description: 'Polvo en suspensión, construcción, o tormentas de arena', 
    icon: '🌪️' 
  }
] as const

// Opciones de gravedad
export const SEVERITY_LEVELS = [
  { 
    value: 'low' as SeverityLevel, 
    label: 'Bajo', 
    description: 'Impacto mínimo en la calidad del aire', 
    color: 'bg-green-100 text-green-800 border-green-200' 
  },
  { 
    value: 'intermediate' as SeverityLevel, 
    label: 'Intermedio', 
    description: 'Impacto moderado, precaución para grupos sensibles', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
  },
  { 
    value: 'critical' as SeverityLevel, 
    label: 'Crítico', 
    description: 'Impacto severo, peligroso para toda la población', 
    color: 'bg-red-100 text-red-800 border-red-200' 
  }
] as const

// Configuración de gravedad para badges - Mapeo completo de valores del API
export const SEVERITY_CONFIG = {
  low: { label: 'Bajo', color: 'bg-green-100 text-green-800 border-green-200' },
  intermediate: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' },
  // Valores alternativos que podrían venir del API
  'bajo': { label: 'Bajo', color: 'bg-green-100 text-green-800 border-green-200' },
  'intermedio': { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'critico': { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' }
} as const

// Configuración de tipos para badges - Mapeo completo de valores del API
export const TYPE_CONFIG = {
  fire: { label: 'Fuego', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  smoke: { label: 'Humo', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  dust: { label: 'Polvo', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  // Valores alternativos que podrían venir del API
  'fuego': { label: 'Fuego', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'humo': { label: 'Humo', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'polvo': { label: 'Polvo', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
} as const

// Límites geográficos de California para validación
export const CALIFORNIA_BOUNDS = {
  north: 42.0,
  south: 32.5,
  east: -114.1,
  west: -124.4
} as const
