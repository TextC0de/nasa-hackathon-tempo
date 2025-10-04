"use client"

import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { type FireDataPoint } from '@/hooks/use-active-fires'

/**
 * Configuración de clustering para incendios
 * Usamos clustering más agresivo porque puede haber muchos puntos de calor
 */
const CLUSTERING_CONFIG = {
  maxClusterRadius: 60,
  disableClusteringAtZoom: 14,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: true,
  zoomToBoundsOnClick: true,
  chunkedLoading: true,
  // Personalización de íconos de cluster para incendios
  iconCreateFunction: function(cluster: any) {
    const count = cluster.getChildCount()
    let size = 'small'
    let className = 'fire-cluster-small'

    if (count >= 10) {
      size = 'medium'
      className = 'fire-cluster-medium'
    }
    if (count >= 50) {
      size = 'large'
      className = 'fire-cluster-large'
    }

    return L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          width: ${size === 'small' ? '40px' : size === 'medium' ? '50px' : '60px'};
          height: ${size === 'small' ? '40px' : size === 'medium' ? '50px' : '60px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(239, 68, 68, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: ${size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px'};
        ">
          🔥 ${count}
        </div>
      `,
      className: className,
      iconSize: L.point(
        size === 'small' ? 40 : size === 'medium' ? 50 : 60,
        size === 'small' ? 40 : size === 'medium' ? 50 : 60
      )
    })
  }
}

/**
 * Colores para intensidad del fuego basados en FRP (Fire Radiative Power)
 * FRP se mide en Megavatios (MW) y representa la energía del fuego
 */
const FIRE_INTENSITY_COLORS = {
  LOW: '#fbbf24',        // Amarillo - Baja intensidad (< 10 MW)
  MODERATE: '#fb923c',   // Naranja - Moderada (10-50 MW)
  HIGH: '#ef4444',       // Rojo - Alta (50-100 MW)
  VERY_HIGH: '#dc2626',  // Rojo oscuro - Muy alta (100-300 MW)
  EXTREME: '#991b1b'     // Rojo muy oscuro - Extrema (> 300 MW)
} as const

/**
 * Configuración de marcadores para incendios
 */
const FIRE_MARKER_CONFIG = {
  size: 28,
  borderWidth: 2,
  shadowBlur: 6,
  pulseAnimation: true,
  glowIntensity: 0.6
} as const

/**
 * Normaliza el nivel de confianza de diferentes sensores a un formato estándar
 */
const normalizeConfidence = (confidence: number | string): {
  level: 'high' | 'nominal' | 'low'
  label: string
  description: string
} => {
  let level: 'high' | 'nominal' | 'low'

  if (typeof confidence === 'number') {
    // MODIS (0-100)
    if (confidence >= 80) level = 'high'
    else if (confidence >= 50) level = 'nominal'
    else level = 'low'
  } else {
    // VIIRS/Landsat (string)
    const conf = String(confidence).toLowerCase()
    if (conf === 'h' || conf === 'high') level = 'high'
    else if (conf === 'n' || conf === 'nominal' || conf === 'medium') level = 'nominal'
    else level = 'low'
  }

  const labels = {
    high: {
      label: 'Alta Confianza',
      description: 'Detección muy confiable, casi certeza de que es un incendio real'
    },
    nominal: {
      label: 'Confianza Media',
      description: 'Detección probable, podría ser incendio o fuente de calor intensa'
    },
    low: {
      label: 'Baja Confianza',
      description: 'Detección posible, requiere verificación adicional'
    }
  }

  return { level, ...labels[level] }
}

/**
 * Obtiene el color basado en la intensidad del fuego (FRP)
 */
const getFireColor = (frp: number): string => {
  if (frp < 10) return FIRE_INTENSITY_COLORS.LOW
  if (frp < 50) return FIRE_INTENSITY_COLORS.MODERATE
  if (frp < 100) return FIRE_INTENSITY_COLORS.HIGH
  if (frp < 300) return FIRE_INTENSITY_COLORS.VERY_HIGH
  return FIRE_INTENSITY_COLORS.EXTREME
}

/**
 * Obtiene la categoría de intensidad basada en FRP
 */
const getFireIntensity = (frp: number): {
  level: string
  emoji: string
  description: string
  explanation: string
} => {
  if (frp < 10) return {
    level: 'Baja',
    emoji: '🟡',
    description: 'Fuego pequeño o punto de calor',
    explanation: 'Podría ser una fogata, quema controlada o incendio en etapa inicial. Menos de 10 MW de potencia.'
  }
  if (frp < 50) return {
    level: 'Moderada',
    emoji: '🟠',
    description: 'Incendio activo de tamaño medio',
    explanation: 'Incendio establecido que está creciendo. Entre 10 y 50 MW de potencia. Requiere atención.'
  }
  if (frp < 100) return {
    level: 'Alta',
    emoji: '🔴',
    description: 'Incendio grande y activo',
    explanation: 'Incendio significativo con rápida propagación. Entre 50 y 100 MW de potencia. Peligroso.'
  }
  if (frp < 300) return {
    level: 'Muy Alta',
    emoji: '🔴🔥',
    description: 'Incendio mayor muy intenso',
    explanation: 'Incendio de gran escala con comportamiento extremo. Entre 100 y 300 MW de potencia. Muy peligroso.'
  }
  return {
    level: 'Extrema',
    emoji: '🔥⚠️',
    description: 'Megaincendio o conflagración',
    explanation: 'Evento de fuego extremo con potencia superior a 300 MW. Situación crítica de emergencia.'
  }
}

/**
 * Crea un ícono personalizado para puntos de fuego
 */
const createFireIcon = (fire: FireDataPoint): L.DivIcon => {
  const color = getFireColor(fire.frp)
  const intensity = getFireIntensity(fire.frp)
  const confidence = normalizeConfidence(fire.confidence)

  // Tamaño basado en FRP
  const baseSize = FIRE_MARKER_CONFIG.size
  const sizeMultiplier = Math.min(2, 1 + (fire.frp / 200))
  const size = baseSize * sizeMultiplier

  // Animación de pulso para incendios activos
  const pulseKeyframes = `
    @keyframes fire-pulse-${fire.latitude}-${fire.longitude} {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 ${color}80;
      }
      50% {
        transform: scale(1.1);
        box-shadow: 0 0 0 10px ${color}00;
      }
    }
  `

  return L.divIcon({
    html: `
      <style>${pulseKeyframes}</style>
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s ease;
      "
      onmouseover="this.style.transform='scale(1.15)'"
      onmouseout="this.style.transform='scale(1)'">
        <div style="
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${FIRE_MARKER_CONFIG.borderWidth}px solid white;
          box-shadow: 0 ${FIRE_MARKER_CONFIG.shadowBlur}px 15px rgba(239, 68, 68, ${FIRE_MARKER_CONFIG.glowIntensity});
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size * 0.5}px;
          animation: fire-pulse-${fire.latitude}-${fire.longitude} 2s ease-in-out infinite;
          position: relative;
        ">
          ${intensity.emoji}
        </div>
        <div style="
          font-size: 9px;
          font-weight: 900;
          color: white;
          background: linear-gradient(135deg, ${color} 0%, ${color}cc 100%);
          padding: 2px 6px;
          border-radius: 8px;
          margin-top: 3px;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          white-space: nowrap;
        ">
          ${fire.frp.toFixed(1)} MW
        </div>
      </div>
    `,
    className: 'custom-fire-marker',
    iconSize: [size + 20, size + 30],
    iconAnchor: [(size + 20) / 2, size + 15],
    popupAnchor: [0, -(size + 15)]
  })
}

/**
 * Formatea la fecha y hora de detección
 */
const formatFireDateTime = (date: string, time: string): string => {
  try {
    // Parsear fecha YYYY-MM-DD y hora HHMM
    const year = date.substring(0, 4)
    const month = date.substring(5, 7)
    const day = date.substring(8, 10)
    const hour = time.substring(0, 2)
    const minute = time.substring(2, 4)

    const dateObj = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`)

    if (isNaN(dateObj.getTime())) {
      return 'Fecha no disponible'
    }

    return dateObj.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    })
  } catch {
    return 'Fecha no disponible'
  }
}

/**
 * Calcula hace cuánto tiempo fue detectado el fuego
 */
const getTimeAgo = (date: string, time: string): string => {
  try {
    const year = date.substring(0, 4)
    const month = date.substring(5, 7)
    const day = date.substring(8, 10)
    const hour = time.substring(0, 2)
    const minute = time.substring(2, 4)

    const fireDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`)
    const now = new Date()
    const diffMs = now.getTime() - fireDate.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  } catch {
    return 'Tiempo desconocido'
  }
}

/**
 * Crea el contenido HTML educativo para el popup de un incendio
 */
const createFirePopupContent = (fire: FireDataPoint): string => {
  const intensity = getFireIntensity(fire.frp)
  const confidence = normalizeConfidence(fire.confidence)
  const color = getFireColor(fire.frp)
  const formattedDate = formatFireDateTime(fire.acq_date, fire.acq_time)
  const timeAgo = getTimeAgo(fire.acq_date, fire.acq_time)
  const isDayDetection = fire.daynight === 'D'

  return `
    <div class="fire-popup min-w-[420px] max-w-[480px]">
      <div class="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
        <!-- Header con gradiente -->
        <div class="bg-gradient-to-r from-orange-500 via-red-500 to-red-600 p-4">
          <div class="flex items-center gap-3">
            <div class="text-4xl">${intensity.emoji}</div>
            <div class="flex-1 text-white">
              <h3 class="font-bold text-lg">Punto de Calor Detectado</h3>
              <p class="text-sm opacity-90">${timeAgo}</p>
            </div>
            <div class="text-right text-white">
              <div class="text-2xl font-bold">${fire.frp.toFixed(1)}</div>
              <div class="text-xs opacity-90">MW</div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="p-4 space-y-3">

          <!-- Sección: ¿Qué significa esto? -->
          <div class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <div class="flex items-start gap-2">
              <div class="text-xl">💡</div>
              <div class="flex-1">
                <h4 class="font-semibold text-blue-900 text-sm mb-1">¿Qué significa esto?</h4>
                <p class="text-xs text-blue-800">
                  Un satélite de la NASA detectó un punto de calor intenso en esta ubicación.
                  Esto generalmente indica un <strong>incendio activo</strong>, pero también podría ser
                  una fuente industrial de calor o una quema controlada.
                </p>
              </div>
            </div>
          </div>

          <!-- Intensidad del Fuego -->
          <div class="p-3 rounded-lg border-2" style="background-color: ${color}15; border-color: ${color}">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">${intensity.emoji}</span>
              <div>
                <div class="text-xs text-gray-600">Intensidad del Fuego</div>
                <div class="font-bold text-base" style="color: ${color}">${intensity.level}</div>
              </div>
            </div>
            <p class="text-xs text-gray-700 mb-2">${intensity.description}</p>
            <div class="bg-white bg-opacity-70 p-2 rounded text-xs text-gray-800">
              <strong>Explicación:</strong> ${intensity.explanation}
            </div>
          </div>

          <!-- Datos Técnicos -->
          <div class="bg-gray-50 p-3 rounded-lg">
            <h4 class="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
              <span>📊</span> Datos del Sensor
            </h4>
            <div class="space-y-2">

              <!-- FRP -->
              <div class="flex justify-between items-start text-xs">
                <div class="text-gray-600">
                  <div class="font-medium">FRP (Potencia Radiativa)</div>
                  <div class="text-[10px] italic">Energía del fuego en Megavatios</div>
                </div>
                <div class="font-bold text-gray-900">${fire.frp.toFixed(2)} MW</div>
              </div>

              <!-- Temperatura de Brillo -->
              <div class="flex justify-between items-start text-xs">
                <div class="text-gray-600">
                  <div class="font-medium">Temperatura de Brillo</div>
                  <div class="text-[10px] italic">Calor detectado por el satélite</div>
                </div>
                <div class="font-bold text-gray-900">${fire.brightness.toFixed(1)} K (${(fire.brightness - 273.15).toFixed(1)}°C)</div>
              </div>

              <!-- Confianza -->
              <div class="flex justify-between items-start text-xs">
                <div class="text-gray-600">
                  <div class="font-medium">Nivel de Confianza</div>
                  <div class="text-[10px] italic">${confidence.description}</div>
                </div>
                <div class="font-bold ${confidence.level === 'high' ? 'text-green-600' : confidence.level === 'nominal' ? 'text-yellow-600' : 'text-orange-600'}">
                  ${confidence.label}
                </div>
              </div>

              <!-- Satélite -->
              <div class="flex justify-between items-center text-xs">
                <div class="text-gray-600">Satélite</div>
                <div class="font-mono text-gray-900 bg-white px-2 py-1 rounded">${fire.satellite}</div>
              </div>

              <!-- Detección día/noche -->
              <div class="flex justify-between items-center text-xs">
                <div class="text-gray-600">Tipo de Detección</div>
                <div class="font-semibold ${isDayDetection ? 'text-yellow-600' : 'text-indigo-600'}">
                  ${isDayDetection ? '☀️ Diurna' : '🌙 Nocturna'}
                </div>
              </div>

            </div>
          </div>

          <!-- Información de Tiempo y Ubicación -->
          <div class="border-t border-gray-200 pt-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Fecha de Detección:</span>
              <span class="font-medium text-gray-900">${formattedDate}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Coordenadas:</span>
              <span class="font-mono text-gray-900">${fire.latitude.toFixed(4)}°, ${fire.longitude.toFixed(4)}°</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Versión del Algoritmo:</span>
              <span class="font-mono text-gray-600">${fire.version}</span>
            </div>
          </div>

          <!-- Nota de Seguridad -->
          <div class="bg-red-50 border border-red-200 p-3 rounded-lg">
            <div class="flex gap-2">
              <span class="text-lg">⚠️</span>
              <div class="flex-1 text-xs">
                <p class="font-semibold text-red-900 mb-1">Nota de Seguridad</p>
                <p class="text-red-800">
                  Si observa humo o fuego en esta área, mantenga distancia y reporte
                  inmediatamente a las autoridades locales de emergencia (911).
                </p>
              </div>
            </div>
          </div>

          <!-- Fuente de datos -->
          <div class="text-center pt-2 border-t border-gray-200">
            <p class="text-[10px] text-gray-500">
              Datos de <strong>NASA FIRMS</strong> (Fire Information for Resource Management System)
              <br/>
              Actualización en tiempo real desde satélites en órbita
            </p>
          </div>

        </div>
      </div>
    </div>
  `
}

/**
 * Props para el componente ActiveFiresLayer
 */
interface ActiveFiresLayerProps {
  fires: FireDataPoint[]
}

/**
 * Componente para mostrar incendios activos en el mapa
 */
export const ActiveFiresLayer = React.memo(function ActiveFiresLayer({
  fires
}: ActiveFiresLayerProps) {
  const map = useMap()
  const [clusterGroup, setClusterGroup] = useState<L.MarkerClusterGroup | null>(null)

  // Validar y filtrar fuegos con coordenadas válidas
  const validFires = useMemo(() => {
    console.log('🔥 [FIRES LAYER] === VALIDANDO INCENDIOS ===')
    console.log(`📊 [FIRES LAYER] Total de puntos de calor: ${fires.length}`)

    const valid = fires.filter(fire =>
      fire.latitude &&
      fire.longitude &&
      !isNaN(fire.latitude) &&
      !isNaN(fire.longitude) &&
      fire.latitude >= -90 && fire.latitude <= 90 &&
      fire.longitude >= -180 && fire.longitude <= 180 &&
      fire.frp >= 0 // FRP no negativo
    )

    const invalid = fires.length - valid.length
    console.log(`✅ [FIRES LAYER] Incendios válidos: ${valid.length}`)
    if (invalid > 0) {
      console.warn(`⚠️  [FIRES LAYER] Incendios inválidos: ${invalid}`)
    }

    if (valid.length > 0) {
      // Estadísticas de intensidad
      const frpValues = valid.map(f => f.frp).filter(f => f > 0)
      if (frpValues.length > 0) {
        const avgFRP = frpValues.reduce((a, b) => a + b, 0) / frpValues.length
        const maxFRP = Math.max(...frpValues)
        const minFRP = Math.min(...frpValues)

        console.log(`🔥 [FIRES LAYER] Estadísticas FRP:`)
        console.log(`   Promedio: ${avgFRP.toFixed(2)} MW`)
        console.log(`   Máximo: ${maxFRP.toFixed(2)} MW`)
        console.log(`   Mínimo: ${minFRP.toFixed(2)} MW`)
      }

      // Distribución por confianza
      const highConf = valid.filter(f => {
        const conf = normalizeConfidence(f.confidence)
        return conf.level === 'high'
      }).length

      console.log(`📊 [FIRES LAYER] Distribución por confianza:`)
      console.log(`   Alta confianza: ${highConf} (${(highConf/valid.length*100).toFixed(1)}%)`)

      // Primeros 3 incendios
      console.log('📋 [FIRES LAYER] Primeros 3 incendios:')
      valid.slice(0, 3).forEach((fire, idx) => {
        console.log(`  ${idx + 1}. [${fire.latitude}, ${fire.longitude}]:`, {
          frp: `${fire.frp} MW`,
          intensity: getFireIntensity(fire.frp).level,
          confidence: fire.confidence,
          time: `${fire.acq_date} ${fire.acq_time}`
        })
      })
    }

    return valid
  }, [fires])

  // Renderizar marcadores
  const handleMarkers = useCallback(() => {
    if (!map || validFires.length === 0) {
      console.log('⏸️  [FIRES LAYER] Renderizado detenido:', {
        hasMap: !!map,
        validFiresCount: validFires.length
      })
      return
    }

    console.log('🎨 [FIRES LAYER] === INICIANDO RENDERIZADO DE MARCADORES ===')
    console.log(`📍 [FIRES LAYER] Creando ${validFires.length} marcadores de fuego...`)

    try {
      // Limpiar cluster group existente
      if (clusterGroup) {
        console.log('🧹 [FIRES LAYER] Limpiando cluster group anterior')
        map.removeLayer(clusterGroup)
        setClusterGroup(null)
      }

      // Crear nuevo grupo de clustering
      const newClusterGroup = new (L as any).MarkerClusterGroup(CLUSTERING_CONFIG)

      // Agregar marcadores
      let markersCreated = 0
      validFires.forEach((fire, idx) => {
        const coords: [number, number] = [fire.latitude, fire.longitude]

        if (idx < 3) {
          console.log(`  ✏️  Marcador ${idx + 1}:`, {
            coords,
            frp: fire.frp,
            confidence: fire.confidence
          })
        }

        const marker = L.marker(coords, {
          icon: createFireIcon(fire)
        })

        const popupContent = createFirePopupContent(fire)
        marker.bindPopup(popupContent, {
          maxWidth: 500,
          className: 'fire-popup-container',
          closeButton: true,
          autoClose: true,
          keepInView: true
        })

        newClusterGroup.addLayer(marker)
        markersCreated++
      })

      console.log(`✅ [FIRES LAYER] ${markersCreated} marcadores de fuego creados`)

      // Agregar al mapa
      map.addLayer(newClusterGroup)
      setClusterGroup(newClusterGroup)
      console.log('🗺️  [FIRES LAYER] Cluster group agregado al mapa')

      console.log('🎉 [FIRES LAYER] === RENDERIZADO COMPLETADO ===')
    } catch (error) {
      console.error('❌ [FIRES LAYER] Error manejando marcadores:', error)
    }
  }, [map, validFires])

  // Efecto principal
  useEffect(() => {
    handleMarkers()

    return () => {
      if (clusterGroup) {
        map.removeLayer(clusterGroup)
        setClusterGroup(null)
      }
    }
  }, [handleMarkers])

  return null
})
