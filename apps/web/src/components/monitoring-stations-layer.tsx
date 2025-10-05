"use client"

import React, { useEffect, useMemo, useCallback, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useMonitoringStations, type MonitoringStation, type GroupedStation } from '@/hooks/use-monitoring-stations'
export type { GroupedStation }
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Sun,
  Cloud,
  CloudRain
} from 'lucide-react'

// Optimización: Configuración de clustering para mejorar rendimiento
const CLUSTERING_CONFIG = {
  maxClusterRadius: 50,
  disableClusteringAtZoom: 15,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  chunkedLoading: true
}

/**
 * Configuración de colores AQI oficiales basados en estándares EPA
 * AQI	Categoría	Color	Significado	Población afectada
 * 0-50	Bueno	🟢 Verde	Aire de calidad satisfactoria	Ninguna
 * 51-100	Moderado	🟡 Amarillo	Calidad aceptable	Pocos inusualmente sensibles
 * 101-150	Insalubre para grupos sensibles	🟠 Naranja	Efectos en grupos sensibles	Niños, ancianos, asmáticos
 * 151-200	Insalubre	🔴 Rojo	Efectos en población general	Todos pueden experimentar efectos
 * 201-300	Muy insalubre	🟣 Púrpura	Alerta de salud	Efectos serios más probables
 * 301-500	Peligroso	🟤 Marrón	Emergencia de salud	Toda la población afectada
 */
const AQI_COLORS = {
  GOOD: '#10b981',        // Verde - 0-50
  MODERATE: '#f59e0b',    // Amarillo - 51-100
  UNHEALTHY_SENSITIVE: '#f97316', // Naranja - 101-150
  UNHEALTHY: '#ef4444',   // Rojo - 151-200
  VERY_UNHEALTHY: '#8b5cf6', // Púrpura - 201-300
  HAZARDOUS: '#7c2d12',   // Marrón - 301-500
  DEFAULT: '#6b7280'      // Gris - Valor desconocido
} as const

// Nota: PARAMETER_COLORS ya no se usa, mantenemos solo AQI_COLORS para consistencia

/**
 * Configuración de marcadores para estaciones de monitoreo
 */
const MARKER_CONFIG = {
  size: 24,
  borderWidth: 2,
  shadowBlur: 4,
  shadowOpacity: 0.3,
  inactiveOpacity: 0.6,
  labelFontSize: 10,        // Aumentado de 8 a 10
  labelPadding: 3,          // Aumentado de 2 a 3
  labelBackgroundOpacity: 0.9, // Nuevo: opacidad del fondo
  labelBorderRadius: 4      // Nuevo: radio de borde del fondo
} as const

/**
 * Valores de error comunes en APIs de calidad del aire
 */
const ERROR_VALUES = [-999, -9999, -1, 999, 9999] as const

/**
 * Configuración de California para el hook
 */
const CALIFORNIA_CONFIG = {
  centerLat: 36.7783,
  centerLng: -119.4179,
  radiusKm: 200,
  enabled: true
} as const

/**
 * Obtiene el emoji y categoría basado en el valor AQI
 * 
 * @param aqi - Valor del AQI (0-500)
 * @returns Objeto con emoji y categoría
 */
function getAQICategory(aqi: number): { emoji: string; category: string; description: string } {
  if (aqi >= 0 && aqi <= 50) return { emoji: '🟢', category: 'Bueno', description: 'Aire de calidad satisfactoria' }
  if (aqi >= 51 && aqi <= 100) return { emoji: '🟡', category: 'Moderado', description: 'Calidad aceptable' }
  if (aqi >= 101 && aqi <= 150) return { emoji: '🟠', category: 'Insalubre para grupos sensibles', description: 'Efectos en grupos sensibles' }
  if (aqi >= 151 && aqi <= 200) return { emoji: '🔴', category: 'Insalubre', description: 'Efectos en población general' }
  if (aqi >= 201 && aqi <= 300) return { emoji: '🟣', category: 'Muy insalubre', description: 'Alerta de salud' }
  if (aqi >= 301 && aqi <= 500) return { emoji: '🟤', category: 'Peligroso', description: 'Emergencia de salud' }
  return { emoji: '⚪', category: 'Desconocido', description: 'Valor no válido' }
}

/**
 * Obtiene la etiqueta corta de AQI para mostrar en el marcador
 * 
 * @param aqi - Valor del AQI (0-500)
 * @returns Etiqueta corta de la categoría AQI
 */
function getAQILabel(aqi: number): string {
  // Validar entrada
  if (typeof aqi !== 'number' || isNaN(aqi)) return 'Desconocido'
  
  if (aqi >= 0 && aqi <= 50) return 'Bueno'
  if (aqi >= 51 && aqi <= 100) return 'Moderado'
  if (aqi >= 101 && aqi <= 150) return 'Insalubre'
  if (aqi >= 151 && aqi <= 200) return 'Insalubre'
  if (aqi >= 201 && aqi <= 300) return 'Muy Insalubre'
  if (aqi >= 301 && aqi <= 500) return 'Peligroso'
  return 'Desconocido'
}

/**
 * Obtiene el icono de Lucide React basado en el valor AQI
 * 
 * @param aqi - Valor del AQI (0-500)
 * @returns Nombre del componente de icono de Lucide
 */
function getAQILucideIcon(aqi: number): string {
  if (aqi >= 0 && aqi <= 50) return 'CheckCircle'      // Verde - Bueno
  if (aqi >= 51 && aqi <= 100) return 'Sun'           // Amarillo - Moderado
  if (aqi >= 101 && aqi <= 150) return 'Cloud'        // Naranja - Insalubre para grupos sensibles
  if (aqi >= 151 && aqi <= 200) return 'AlertTriangle' // Rojo - Insalubre
  if (aqi >= 201 && aqi <= 300) return 'CloudRain'    // Púrpura - Muy insalubre
  if (aqi >= 301 && aqi <= 500) return 'XCircle'       // Marrón - Peligroso
  return 'Activity' // Gris - Valor desconocido
}

/**
 * Convierte un icono de Lucide React a SVG HTML para usar en Leaflet
 * 
 * @param iconName - Nombre del icono de Lucide
 * @param color - Color del icono
 * @param size - Tamaño del icono
 * @returns SVG HTML string
 */
/**
 * Convierte un icono de Lucide React a SVG HTML para usar en Leaflet
 * 
 * @param iconName - Nombre del icono de Lucide
 * @param color - Color del icono
 * @param size - Tamaño del icono
 * @returns SVG HTML string
 */
function getLucideIconSVG(iconName: string, color: string = '#ffffff', size: number = 16): string {
  const iconPaths: Record<string, string> = {
    CheckCircle: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    Sun: 'M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M17.66 17.66l-1.41 1.41M4.93 19.07l-1.41-1.41M12 6a6 6 0 100 12 6 6 0 000-12z',
    Cloud: 'M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z',
    AlertTriangle: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01',
    CloudRain: 'M16 13v8m0 0l-4-4m4 4l4-4M12 2l-1.09 3.26M12 2l1.09 3.26M12 2v8m0 0l-1.09 3.26M12 10l1.09 3.26',
    XCircle: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    Activity: 'M22 12h-4l-3 9L9 3l-3 9H2'
  } as const

  const path = iconPaths[iconName] || iconPaths.Activity
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="${path}"/>
    </svg>
  `
}

/**
 * Obtiene el color del marcador basado en el valor AQI
 * 
 * @param aqi - Valor del AQI (0-500)
 * @returns Color hexadecimal para el marcador basado en categoría AQI
 */
function getAQIColor(aqi: number): string {
  // Validar entrada
  if (typeof aqi !== 'number' || isNaN(aqi)) return AQI_COLORS.DEFAULT
  
  if (aqi >= 0 && aqi <= 50) return AQI_COLORS.GOOD
  if (aqi >= 51 && aqi <= 100) return AQI_COLORS.MODERATE
  if (aqi >= 101 && aqi <= 150) return AQI_COLORS.UNHEALTHY_SENSITIVE
  if (aqi >= 151 && aqi <= 200) return AQI_COLORS.UNHEALTHY
  if (aqi >= 201 && aqi <= 300) return AQI_COLORS.VERY_UNHEALTHY
  if (aqi >= 301 && aqi <= 500) return AQI_COLORS.HAZARDOUS
  return AQI_COLORS.DEFAULT
}

// Función removida: getMarkerColor ya no se usa, solo usamos getAQIColor

/**
 * Crea un icono personalizado para estaciones de monitoreo usando iconos de Lucide React
 * 
 * @param aqi - Valor del AQI para determinar el color e icono
 * @param isActive - Si la estación está activa
 * @returns Icono de Leaflet para el marcador
 */
function createStationIcon(aqi: number, isActive: boolean = true): L.DivIcon {
  // Validar entrada
  if (typeof aqi !== 'number' || isNaN(aqi)) {
    aqi = 0 // Valor por defecto para evitar errores
  }
  
  const backgroundColor = getAQIColor(aqi)
  const iconName = getAQILucideIcon(aqi)
  const iconSVG = getLucideIconSVG(iconName, '#ffffff', 12)
  const label = getAQILabel(aqi)
  const opacity = isActive ? 1 : MARKER_CONFIG.inactiveOpacity
  
  return L.divIcon({
    html: `
      <div class="station-marker-container" style="
        display: flex;
        flex-direction: column;
        align-items: center;
        opacity: ${opacity};
        cursor: pointer;
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <div class="station-marker" style="
          background-color: ${backgroundColor};
          width: ${MARKER_CONFIG.size}px;
          height: ${MARKER_CONFIG.size}px;
          border-radius: 50%;
          border: ${MARKER_CONFIG.borderWidth}px solid white;
          box-shadow: 0 2px ${MARKER_CONFIG.shadowBlur}px rgba(0,0,0,${MARKER_CONFIG.shadowOpacity});
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          ${iconSVG}
        </div>
        <div class="station-label" style="
          font-size: ${MARKER_CONFIG.labelFontSize}px;
          font-weight: 900;
          color: white;
          text-align: center;
          margin-top: ${MARKER_CONFIG.labelPadding}px;
          padding: 2px 8px;
          background-color: rgba(0, 0, 0, ${MARKER_CONFIG.labelBackgroundOpacity});
          border-radius: ${MARKER_CONFIG.labelBorderRadius}px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          white-space: nowrap;
          max-width: ${MARKER_CONFIG.size + 32}px;
          overflow: hidden;
          text-overflow: ellipsis;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(2px);
        ">
          ${label}
        </div>
      </div>
    `,
    className: 'custom-station-marker',
    iconSize: [MARKER_CONFIG.size + 36, MARKER_CONFIG.size + 36],
    iconAnchor: [(MARKER_CONFIG.size + 36) / 2, MARKER_CONFIG.size / 2],
    popupAnchor: [0, -(MARKER_CONFIG.size + 36) / 2]
  })
}

/**
 * Formatea una fecha UTC a formato local español
 * 
 * @param dateString - Fecha en formato string UTC
 * @returns Fecha formateada o mensaje de error
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Fecha no disponible'
    }
    
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles' // Zona horaria de California
    })
  } catch {
    return 'Fecha no disponible'
  }
}

/**
 * Valida y formatea la concentración
 * 
 * @param concentration - Valor de concentración
 * @param unit - Unidad de medida
 * @returns String formateado o mensaje de error
 */
function formatConcentration(concentration: number, unit: string): string {
  if (ERROR_VALUES.includes(concentration as any) || concentration < 0) {
    return 'Dato no disponible'
  }
  
  // Formatear con decimales apropiados
  const formattedValue = concentration.toFixed(2)
  return `${formattedValue} ${unit}`
}

/**
 * Valida y formatea el estado de la estación
 * 
 * @param status - Estado de la estación
 * @returns Estado formateado o mensaje por defecto
 */
function formatStatus(status: string | undefined): string {
  if (!status || status === 'undefined' || status === 'null') {
    return 'Estado desconocido'
  }
  
  // Normalizar valores comunes
  const statusMap: Record<string, string> = {
    'Active': 'Activa',
    'active': 'Activa',
    'ACTIVE': 'Activa',
    'Inactive': 'Inactiva',
    'inactive': 'Inactiva',
    'INACTIVE': 'Inactiva',
    'Maintenance': 'Mantenimiento',
    'maintenance': 'Mantenimiento',
    'Offline': 'Fuera de línea',
    'offline': 'Fuera de línea',
    'Operational': 'Operativa',
    'operational': 'Operativa'
  }
  
  return statusMap[status] || status
}

/**
 * Valida el AQI
 * 
 * @param aqi - Valor del AQI
 * @param concentration - Concentración para validación cruzada
 * @returns AQI válido o mensaje de error
 */
function validateAQI(aqi: number, concentration: number): string {
  // Validar tipos de entrada
  if (typeof aqi !== 'number' || typeof concentration !== 'number') {
    return 'Dato no disponible'
  }
  
  // Si la concentración es inválida, el AQI probablemente también lo sea
  if (ERROR_VALUES.includes(concentration as any) || concentration < 0) {
    return 'Dato no disponible'
  }
  
  // AQI debe estar entre 0 y 500
  if (aqi < 0 || aqi > 500 || isNaN(aqi)) {
    return 'Dato no disponible'
  }
  
  return aqi.toString()
}

/**
 * Crea el contenido HTML para el popup de una estación agrupada
 *
 * @param station - Estación agrupada con todos sus parámetros
 * @returns HTML string para el popup
 */
function createGroupedPopupContent(station: GroupedStation): string {
  const dominantAqiColor = getAQIColor(station.dominantAQI)
  const dominantAqiCategory = getAQICategory(station.dominantAQI)
  const formattedDate = formatDate(station.lastUpdate)
  const formattedStatus = formatStatus(station.Status)

  // Ordenar mediciones por AQI descendente
  const sortedMeasurements = [...station.measurements].sort((a, b) => b.AQI - a.AQI)

  // Generar filas de la tabla de parámetros
  const measurementRows = sortedMeasurements.map(m => {
    const aqiColor = getAQIColor(m.AQI)
    const { emoji, category } = getAQICategory(m.AQI)
    const concentration = formatConcentration(m.RawConcentration, m.Unit)
    const isValid = m.AQI > 0 && m.AQI <= 500

    return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-2 px-2 font-medium text-gray-900">${m.Parameter}</td>
        <td class="py-2 px-2 text-center">
          <span class="inline-flex items-center gap-1 font-bold" style="color: ${aqiColor}">
            ${isValid ? emoji : '⚪'} ${isValid ? m.AQI : 'N/A'}
          </span>
        </td>
        <td class="py-2 px-2 text-xs text-gray-600">${isValid ? category : 'Sin datos'}</td>
        <td class="py-2 px-2 text-xs text-gray-600 text-right">${concentration}</td>
      </tr>
    `
  }).join('')

  return `
    <div class="station-popup min-w-[380px] max-w-[450px]">
      <div class="bg-white rounded-lg shadow-lg border border-gray-200">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-lg">
          <div class="flex items-center gap-3">
            <div class="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-white" style="background-color: ${dominantAqiColor}"></div>
            <div class="flex-1 min-w-0 text-white">
              <h3 class="font-bold text-base truncate">${station.SiteName}</h3>
              <p class="text-xs opacity-90 truncate">${station.AgencyName}</p>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-white">${station.dominantAQI > 0 ? station.dominantAQI : 'N/A'}</div>
              <div class="text-xs opacity-90">AQI</div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4">
          <!-- Overall Status -->
          <div class="mb-3 p-3 rounded-lg" style="background-color: ${dominantAqiColor}15; border-left: 4px solid ${dominantAqiColor}">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-gray-600 mb-1">Estado General</div>
                <div class="font-semibold" style="color: ${dominantAqiColor}">
                  ${dominantAqiCategory.emoji} ${dominantAqiCategory.category}
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-gray-600 mb-1">Parámetro Predominante</div>
                <div class="font-semibold text-gray-900">${station.dominantParameter || 'N/A'}</div>
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-600 italic">${dominantAqiCategory.description}</div>
          </div>

          <!-- Parameters Table -->
          <div class="mb-3">
            <div class="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Parámetros Monitoreados (${station.measurements.length})
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="bg-gray-50">
                  <tr class="border-b border-gray-200">
                    <th class="py-2 px-2 text-left font-semibold text-gray-700">Parámetro</th>
                    <th class="py-2 px-2 text-center font-semibold text-gray-700">AQI</th>
                    <th class="py-2 px-2 text-left font-semibold text-gray-700">Categoría</th>
                    <th class="py-2 px-2 text-right font-semibold text-gray-700">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${measurementRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Footer Info -->
          <div class="pt-3 border-t border-gray-200 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Estado:</span>
              <span class="font-medium text-green-600">${formattedStatus}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Última actualización:</span>
              <span class="font-medium text-gray-900">${formattedDate}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Coordenadas:</span>
              <span class="font-mono text-gray-900">${station.Latitude.toFixed(4)}°, ${station.Longitude.toFixed(4)}°</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Código AQS:</span>
              <span class="font-mono text-gray-900">${station.FullAQSCode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * Componente para mostrar estaciones de monitoreo AirNow en el mapa
 * 
 * Este componente:
 * - Obtiene datos de estaciones usando el hook useMonitoringStations
 * - Renderiza marcadores personalizados en el mapa
 * - Muestra popups informativos al hacer clic
 * - Ajusta automáticamente la vista para mostrar todas las estaciones
 */
// Optimización: Componente memoizado con clustering
interface MonitoringStationsLayerProps {
  onStationClick?: (station: GroupedStation) => void
}

export const MonitoringStationsLayer = React.memo(function MonitoringStationsLayer({
  onStationClick
}: MonitoringStationsLayerProps) {
  const map = useMap()

  // Hook para obtener datos de estaciones (usar groupedStations)
  const { groupedStations, isLoading, error } = useMonitoringStations(CALIFORNIA_CONFIG)

  // Ref para clustering (usar ref en lugar de state para evitar problemas en cleanup)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)

// Memoizar estaciones válidas (con coordenadas) - Optimizado
  const validStations = useMemo(() => {
    console.log('🔍 [LAYER] === VALIDANDO ESTACIONES AGRUPADAS ===')
    console.log(`📊 [LAYER] Total de estaciones físicas: ${groupedStations.length}`)

    const valid = groupedStations.filter(station =>
      station.Latitude &&
      station.Longitude &&
      !isNaN(station.Latitude) &&
      !isNaN(station.Longitude) &&
      station.Latitude >= -90 && station.Latitude <= 90 &&
      station.Longitude >= -180 && station.Longitude <= 180 &&
      station.measurements.length > 0 // Al menos un parámetro
    )

    const invalid = groupedStations.length - valid.length
    console.log(`✅ [LAYER] Estaciones válidas: ${valid.length}`)
    if (invalid > 0) {
      console.warn(`⚠️  [LAYER] Estaciones inválidas: ${invalid}`)
    }

    if (valid.length > 0) {
      // Estadísticas de parámetros
      const totalMeasurements = valid.reduce((sum, s) => sum + s.measurements.length, 0)
      const avgMeasurements = totalMeasurements / valid.length

      console.log(`📊 [LAYER] Estadísticas:`)
      console.log(`   Total mediciones: ${totalMeasurements}`)
      console.log(`   Promedio por estación: ${avgMeasurements.toFixed(1)} parámetros`)

      // Mostrar rango de coordenadas
      const lats = valid.map(s => s.Latitude)
      const lngs = valid.map(s => s.Longitude)
      console.log('📐 [LAYER] Rango de coordenadas:', {
        lat: { min: Math.min(...lats).toFixed(4), max: Math.max(...lats).toFixed(4) },
        lng: { min: Math.min(...lngs).toFixed(4), max: Math.max(...lngs).toFixed(4) }
      })

      // Distribución de AQI
      const aqiRanges = {
        good: valid.filter(s => s.dominantAQI <= 50).length,
        moderate: valid.filter(s => s.dominantAQI > 50 && s.dominantAQI <= 100).length,
        unhealthy: valid.filter(s => s.dominantAQI > 100).length
      }
      console.log('🎨 [LAYER] Distribución de calidad del aire:', aqiRanges)
    }

    return valid
  }, [groupedStations])

  // Memoizar límites del mapa para optimizar ajuste de vista
  const mapBounds = useMemo(() => {
    if (validStations.length === 0) return null
    
    const bounds = L.latLngBounds(
      validStations.map(station => [station.Latitude!, station.Longitude!])
    )
    return bounds
  }, [validStations])

// Callback optimizado para manejar marcadores - Evita bucle infinito
  const handleMarkers = useCallback(() => {
    if (!map || isLoading || validStations.length === 0) {
      console.log('⏸️  [LAYER] Renderizado detenido:', {
        hasMap: !!map,
        isLoading,
        validStationsCount: validStations.length
      })
      return
    }

    console.log('🎨 [LAYER] === INICIANDO RENDERIZADO DE MARCADORES ===')
    console.log(`📍 [LAYER] Creando ${validStations.length} marcadores...`)

    try {
      // Limpiar cluster group existente
      if (clusterGroupRef.current) {
        console.log('🧹 [LAYER] Limpiando cluster group anterior')
        map.removeLayer(clusterGroupRef.current)
        clusterGroupRef.current = null
      }

      // Crear nuevo grupo de clustering
      const newClusterGroup = new L.MarkerClusterGroup({
        maxClusterRadius: CLUSTERING_CONFIG.maxClusterRadius,
        disableClusteringAtZoom: CLUSTERING_CONFIG.disableClusteringAtZoom,
        spiderfyOnMaxZoom: CLUSTERING_CONFIG.spiderfyOnMaxZoom,
        showCoverageOnHover: CLUSTERING_CONFIG.showCoverageOnHover,
        zoomToBoundsOnClick: CLUSTERING_CONFIG.zoomToBoundsOnClick,
        chunkedLoading: CLUSTERING_CONFIG.chunkedLoading
      })

// Agregar marcadores al cluster group (UNO POR UBICACIÓN FÍSICA)
      let markersCreated = 0
      validStations.forEach((station, idx) => {
        const coords: [number, number] = [station.Latitude!, station.Longitude!]

        if (idx < 3) {
          console.log(`  ✏️  Marcador ${idx + 1}:`, {
            name: station.SiteName,
            coords,
            dominantAQI: station.dominantAQI,
            dominantParameter: station.dominantParameter,
            measurements: station.measurements.length
          })
        }

        // Usar el AQI predominante para el color del marcador
        const marker = L.marker(coords, {
          icon: createStationIcon(station.dominantAQI > 0 ? station.dominantAQI : 0, station.Status === 'Active'),
          zIndexOffset: 1000 // Asegurar que las estaciones estén por encima del overlay TEMPO
        })

        // OPCIÓN 1: Si hay callback, usar onClick para abrir Dialog
        if (onStationClick) {
          marker.on('click', () => {
            console.log('🖱️ [LAYER] Click en estación:', station.SiteName)
            onStationClick(station)
          })
        } else {
          // OPCIÓN 2: Fallback al popup tradicional si no hay callback
          const popupContent = createGroupedPopupContent(station)
          marker.bindPopup(popupContent, {
            maxWidth: 500,
            className: 'station-popup-container',
            closeButton: true,
            autoClose: true,
            keepInView: true
          })
        }

        newClusterGroup.addLayer(marker)
        markersCreated++
      })

      console.log(`✅ [LAYER] ${markersCreated} marcadores creados exitosamente`)

      // Agregar cluster group al mapa
      map.addLayer(newClusterGroup)
      clusterGroupRef.current = newClusterGroup
      console.log('🗺️  [LAYER] Cluster group agregado al mapa')

      // Ajustar vista del mapa para mostrar todas las estaciones
      if (mapBounds) {
        console.log('📏 [LAYER] Ajustando vista del mapa a bounds:', {
          north: mapBounds.getNorth().toFixed(4),
          south: mapBounds.getSouth().toFixed(4),
          east: mapBounds.getEast().toFixed(4),
          west: mapBounds.getWest().toFixed(4)
        })
        map.fitBounds(mapBounds.pad(0.1))
      }

      console.log('🎉 [LAYER] === RENDERIZADO COMPLETADO ===')
    } catch (error) {
      console.error('❌ [LAYER] Error manejando marcadores:', error)
    }
  }, [map, validStations, isLoading, mapBounds])

  // Callback para ajustar vista del mapa
  const adjustMapView = useCallback((markers: L.Marker[]) => {
    if (markers.length > 1) {
      try {
        const group = (L as any).featureGroup(markers)
        const bounds = group.getBounds()
        map.fitBounds(bounds.pad(0.1), {
          maxZoom: 10, // Limitar zoom máximo para mantener contexto
          animate: true,
          duration: 1
        })
      } catch (error) {
        console.warn('Error ajustando vista del mapa:', error)
      }
    }
  }, [map])

  // Efecto principal para manejar marcadores - Optimizado para evitar bucle infinito
  useEffect(() => {
    handleMarkers()

    // Cleanup function
    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current)
        clusterGroupRef.current = null
      }
    }
  }, [handleMarkers, map])

  // Manejo de errores
  useEffect(() => {
    if (error) {
      console.error('Error cargando estaciones de monitoreo:', error)
    }
  }, [error])

  // Este componente no renderiza nada visible, solo agrega marcadores al mapa
  return null
})
