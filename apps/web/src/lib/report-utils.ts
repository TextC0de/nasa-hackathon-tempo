import { CALIFORNIA_BOUNDS, SEVERITY_CONFIG, TYPE_CONFIG } from './report-types'

// Funciones de validación
export const isValidLocation = (lat: number, lng: number): boolean => {
  return lat >= CALIFORNIA_BOUNDS.south && 
         lat <= CALIFORNIA_BOUNDS.north &&
         lng >= CALIFORNIA_BOUNDS.west && 
         lng <= CALIFORNIA_BOUNDS.east
}

// Funciones de formateo
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatCoordinates = (lat: string, lng: string): string => {
  return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`
}

// Funciones helper para obtener configuración
export const getSeverityConfig = (gravedad: string) => {
  const config = SEVERITY_CONFIG[gravedad as keyof typeof SEVERITY_CONFIG]
  if (!config) {
    console.warn(`Gravedad no reconocida: ${gravedad}`)
    return { label: gravedad, color: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
  return config
}

export const getTypeConfig = (tipo: string) => {
  const config = TYPE_CONFIG[tipo as keyof typeof TYPE_CONFIG]
  if (!config) {
    console.warn(`Tipo no reconocido: ${tipo}`)
    return { label: tipo, icon: '❓', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  }
  return config
}
