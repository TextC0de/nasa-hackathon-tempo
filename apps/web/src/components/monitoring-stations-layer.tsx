"use client"

import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { useMonitoringStations, type MonitoringStation } from '@/hooks/use-monitoring-stations'
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
 * Crea el contenido HTML para el popup de una estación
 * 
 * @param station - Datos de la estación de monitoreo
 * @returns HTML string para el popup
 */
function createPopupContent(station: MonitoringStation): string {
  const aqiColor = getAQIColor(station.AQI)
  const aqiCategory = getAQICategory(station.AQI)
  const formattedDate = formatDate(station.UTC)
  const formattedConcentration = formatConcentration(station.RawConcentration, station.Unit)
  const formattedStatus = formatStatus(station.Status)
  const validatedAQI = validateAQI(station.AQI, station.RawConcentration)
  
  // Determinar color del estado basado en datos válidos
  const isDataValid = station.RawConcentration > 0 && !ERROR_VALUES.includes(station.RawConcentration as any)
  const statusColor = isDataValid ? 'text-green-600' : 'text-orange-600'
  
  return `
    <div class="station-popup min-w-[280px] max-w-[320px]">
      <div class="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-5 h-5 rounded-full flex-shrink-0" style="background-color: ${aqiColor}"></div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-sm text-gray-900 truncate">${station.SiteName}</h3>
            <p class="text-xs text-gray-500 truncate">${station.AgencyName}</p>
          </div>
        </div>
        
        <!-- Content -->
        <div class="space-y-2 text-xs">
          <div class="flex justify-between">
            <span class="text-gray-600">Parámetro:</span>
            <span class="font-medium text-gray-900">${station.Parameter}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">AQI:</span>
            <span class="font-bold ${validatedAQI === 'Dato no disponible' ? 'text-gray-500' : 'text-gray-900'}">
              ${validatedAQI === 'Dato no disponible' ? validatedAQI : `${aqiCategory.emoji} ${validatedAQI}`}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Categoría:</span>
            <span class="font-medium ${validatedAQI === 'Dato no disponible' ? 'text-gray-500' : 'text-gray-900'}">
              ${validatedAQI === 'Dato no disponible' ? 'N/A' : aqiCategory.category}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Concentración:</span>
            <span class="font-medium ${formattedConcentration === 'Dato no disponible' ? 'text-gray-500' : 'text-gray-900'}">
              ${formattedConcentration}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Estado:</span>
            <span class="font-medium ${statusColor}">
              ${formattedStatus}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Última actualización:</span>
            <span class="font-medium text-gray-900">${formattedDate}</span>
          </div>
          
          <div class="pt-2 border-t border-gray-200">
            <div class="text-xs text-gray-500">
              <strong>Coordenadas:</strong> ${station.Latitude.toFixed(4)}°, ${station.Longitude.toFixed(4)}°
            </div>
            <div class="text-xs text-gray-500">
              <strong>Código AQS:</strong> ${station.FullAQSCode}
            </div>
            ${!isDataValid ? `
              <div class="text-xs text-orange-600 mt-1">
                <strong>⚠️ Nota:</strong> Datos de concentración no disponibles
              </div>
            ` : ''}
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
export const MonitoringStationsLayer = React.memo(function MonitoringStationsLayer() {
  const map = useMap()
  
  // Hook para obtener datos de estaciones
  const { stations, isLoading, error } = useMonitoringStations(CALIFORNIA_CONFIG)

  // Estado para clustering
  const [clusterGroup, setClusterGroup] = useState<L.MarkerClusterGroup | null>(null)

  // Memoizar estaciones válidas (con coordenadas) - Optimizado
  const validStations = useMemo(() => {
    return stations.filter(station => 
      station.Latitude && 
      station.Longitude && 
      !isNaN(station.Latitude) && 
      !isNaN(station.Longitude) &&
      station.Latitude >= -90 && station.Latitude <= 90 &&
      station.Longitude >= -180 && station.Longitude <= 180
    )
  }, [stations])

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
    if (!map || isLoading || validStations.length === 0) return
    
    try {
      // Limpiar cluster group existente
      if (clusterGroup) {
        map.removeLayer(clusterGroup)
        setClusterGroup(null)
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

      // Agregar marcadores al cluster group
      validStations.forEach((station) => {
        const marker = L.marker(
          [station.Latitude!, station.Longitude!],
          {
            icon: createStationIcon(station.AQI, station.Status === 'Active')
          }
        )
        
        // Crear contenido del popup
        const popupContent = createPopupContent(station)
        marker.bindPopup(popupContent, {
          maxWidth: 350,
          className: 'station-popup-container',
          closeButton: true,
          autoClose: true,
          keepInView: true
        })
        
        newClusterGroup.addLayer(marker)
      })

      // Agregar cluster group al mapa
      map.addLayer(newClusterGroup)
      setClusterGroup(newClusterGroup)
      
      // Ajustar vista del mapa para mostrar todas las estaciones
      if (mapBounds) {
        map.fitBounds(mapBounds.pad(0.1))
      }
    } catch (error) {
      console.error('Error manejando marcadores:', error)
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
      if (clusterGroup) {
        map.removeLayer(clusterGroup)
        setClusterGroup(null)
      }
    }
  }, [handleMarkers])

  // Manejo de errores
  useEffect(() => {
    if (error) {
      console.error('Error cargando estaciones de monitoreo:', error)
    }
  }, [error])

  // Este componente no renderiza nada visible, solo agrega marcadores al mapa
  return null
})
