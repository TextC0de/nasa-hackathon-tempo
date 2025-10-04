"use client"

import { useEffect, useMemo, useCallback } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { useMonitoringStations, type MonitoringStation } from '@/hooks/use-monitoring-stations'

/**
 * Configuración de colores para diferentes parámetros de calidad del aire
 * Basado en estándares EPA y convenciones internacionales
 */
const PARAMETER_COLORS = {
  'PM2.5': '#ef4444', // Red - Partículas finas
  'PM25': '#ef4444', // Red - Alias para PM2.5
  'PM10': '#f97316', // Orange - Partículas gruesas
  'O3': '#f59e0b', // Amber - Ozono
  'NO2': '#3b82f6', // Blue - Dióxido de nitrógeno
  'CO': '#6b7280', // Gray - Monóxido de carbono
  'SO2': '#8b5cf6', // Purple - Dióxido de azufre
  'PB': '#7c2d12', // Maroon - Plomo
  'DEFAULT': '#10b981' // Green - Parámetro desconocido
} as const

/**
 * Configuración de marcadores para estaciones de monitoreo
 */
const MARKER_CONFIG = {
  size: 20,
  borderWidth: 2,
  shadowBlur: 4,
  shadowOpacity: 0.3,
  inactiveOpacity: 0.6
} as const

/**
 * Obtiene el color del marcador basado en el parámetro de calidad del aire
 * 
 * @param parameter - Parámetro de calidad del aire (PM2.5, O3, NO2, etc.)
 * @returns Color hexadecimal para el marcador
 */
function getMarkerColor(parameter: string): string {
  const normalizedParam = parameter.toUpperCase()
  return PARAMETER_COLORS[normalizedParam as keyof typeof PARAMETER_COLORS] || PARAMETER_COLORS.DEFAULT
}

/**
 * Crea un icono personalizado para estaciones de monitoreo
 * 
 * @param parameter - Parámetro de calidad del aire
 * @param isActive - Si la estación está activa
 * @returns Icono de Leaflet para el marcador
 */
function createStationIcon(parameter: string, isActive: boolean = true): L.DivIcon {
  const color = getMarkerColor(parameter)
  const opacity = isActive ? 1 : MARKER_CONFIG.inactiveOpacity
  
  return L.divIcon({
    html: `
      <div class="station-marker" style="
        background-color: ${color};
        width: ${MARKER_CONFIG.size}px;
        height: ${MARKER_CONFIG.size}px;
        border-radius: 50%;
        border: ${MARKER_CONFIG.borderWidth}px solid white;
        box-shadow: 0 2px ${MARKER_CONFIG.shadowBlur}px rgba(0,0,0,${MARKER_CONFIG.shadowOpacity});
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: ${opacity};
        position: relative;
        cursor: pointer;
        transition: transform 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-station-marker',
    iconSize: [MARKER_CONFIG.size, MARKER_CONFIG.size],
    iconAnchor: [MARKER_CONFIG.size / 2, MARKER_CONFIG.size / 2],
    popupAnchor: [0, -MARKER_CONFIG.size / 2]
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
 * Crea el contenido HTML para el popup de una estación
 * 
 * @param station - Datos de la estación de monitoreo
 * @returns HTML string para el popup
 */
function createPopupContent(station: MonitoringStation): string {
  const color = getMarkerColor(station.Parameter)
  const formattedDate = formatDate(station.UTC)
  
  return `
    <div class="station-popup min-w-[280px] max-w-[320px]">
      <div class="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-3">
          <div class="w-5 h-5 rounded-full flex-shrink-0" style="background-color: ${color}"></div>
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
            <span class="font-bold text-gray-900">${station.AQI}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Concentración:</span>
            <span class="font-medium text-gray-900">${station.RawConcentration} ${station.Unit}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">Estado:</span>
            <span class="font-medium ${station.Status === 'Active' ? 'text-green-600' : 'text-red-600'}">
              ${station.Status}
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
export function MonitoringStationsLayer() {
  const map = useMap()
  
  // Hook para obtener datos de estaciones
  const { stations, isLoading, error } = useMonitoringStations({
    centerLat: 36.7783, // Centro geográfico de California
    centerLng: -119.4179,
    radiusKm: 200, // Radio amplio para cubrir todo el estado
    enabled: true
  })

  // Debug: Log de información de estaciones
  useEffect(() => {
    if (stations.length > 0) {
      console.log('=== DEBUG MONITORING STATIONS ===')
      console.log('Total estaciones recibidas:', stations.length)
      console.log('Primeras 3 estaciones:', stations.slice(0, 3).map(s => ({
        SiteName: s.SiteName,
        Status: s.Status,
        Parameter: s.Parameter,
        AQI: s.AQI,
        Latitude: s.Latitude,
        Longitude: s.Longitude
      })))
      
      const statusCounts = stations.reduce((acc, station) => {
        acc[station.Status] = (acc[station.Status] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      console.log('Conteo por Status:', statusCounts)
      console.log('================================')
    }
  }, [stations])

  // Memoizar estaciones válidas (con coordenadas)
  const validStations = useMemo(() => {
    return stations.filter(station => 
      station.Latitude && 
      station.Longitude && 
      !isNaN(station.Latitude) && 
      !isNaN(station.Longitude)
    )
  }, [stations])

  // Callback para limpiar marcadores existentes
  const clearExistingMarkers = useCallback(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && (layer as any).options?.className === 'custom-station-marker') {
        map.removeLayer(layer)
      }
    })
  }, [map])

  // Callback para agregar marcadores al mapa
  const addMarkersToMap = useCallback(() => {
    const markers: L.Marker[] = []
    
    validStations.forEach((station) => {
      const marker = L.marker(
        [station.Latitude, station.Longitude],
        {
          icon: createStationIcon(station.Parameter, station.Status === 'Active')
        }
      )

      // Crear popup con información detallada
      marker.bindPopup(createPopupContent(station), {
        maxWidth: 350,
        className: 'station-popup-container',
        closeButton: true,
        autoClose: true,
        keepInView: true
      })

      marker.addTo(map)
      markers.push(marker)
    })

    return markers
  }, [map, validStations])

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

  // Efecto principal para manejar marcadores
  useEffect(() => {
    if (!map || isLoading) return

    // Limpiar marcadores existentes
    clearExistingMarkers()

    // Agregar nuevos marcadores
    const markers = addMarkersToMap()

    // Ajustar vista si hay estaciones
    if (markers.length > 0) {
      adjustMapView(markers)
    }

    // Cleanup function
    return () => {
      clearExistingMarkers()
    }
  }, [map, validStations, isLoading, clearExistingMarkers, addMarkersToMap, adjustMapView])

  // Manejo de errores
  useEffect(() => {
    if (error) {
      console.error('Error cargando estaciones de monitoreo:', error)
    }
  }, [error])

  // Este componente no renderiza nada visible, solo agrega marcadores al mapa
  return null
}
