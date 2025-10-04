"use client"

import { cn } from "@/lib/utils"
import { useEffect } from "react"
import dynamic from "next/dynamic"

import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MonitoringStationsLayer } from "./monitoring-stations-layer"
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)

// Leaflet Control Configuration - Following Official Documentation
const LEAFLET_CONFIG = {
  positions: {
    TOP_RIGHT: 'topright' as const,
    TOP_LEFT: 'topleft' as const,
    BOTTOM_RIGHT: 'bottomright' as const,
    BOTTOM_LEFT: 'bottomleft' as const
  },
  mapBounds: {
    CALIFORNIA: {
      north: 42.0,
      south: 32.0,
      east: -114.0,
      west: -125.0
    }
  },
  zoom: {
    DEFAULT: 7,
    MIN: 1,
    MAX: 18,
    MAX_BOUNDS: 9
  }
}

// Map Type Definitions - Clean Configuration
interface MapTypeConfig {
  name: string
  url: string
  attribution: string
  subdomains: string[]
}

const MAP_TYPES: Record<string, MapTypeConfig> = {
  streetmap: {
    name: "Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c']
  },
  topographic: {
    name: "Topográfico",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors',
    subdomains: ['a', 'b', 'c']
  },
  hybrid: {
    name: "Híbrido",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    subdomains: []
  },
  physical: {
    name: "Físico",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a> contributors',
    subdomains: ['a', 'b', 'c']
  }
}

// CSS Styles - Centralized and Clean
const CONTROL_STYLES = {
  container: {
    position: 'relative',
    display: 'inline-block'
  },
  button: {
    background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    outline: 'none',
    minWidth: '160px',
    backdropFilter: 'blur(8px)'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '8px',
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
    minWidth: '180px',
    zIndex: '1000',
    display: 'none',
    overflow: 'hidden',
    backdropFilter: 'blur(12px)'
  },
  option: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    color: '#374151',
    cursor: 'pointer',
    fontSize: '13px',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit'
  }
}

// Utility Functions - Clean and Single Purpose
const ControlUtils = {
  /**
   * Creates HTML for the main button using Lucide React icons
   */
  createButtonHTML: (mapTypeName: string): string => {
    return `
      <div style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
          <path d="M21 12a9 9 0 1 1-9 9 9.75 9.75 0 0 1 6.74-2.74L21 16"/>
          <path d="M16 16h5v5"/>
        </svg>
        <span style="font-size: 12px;">${mapTypeName}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6,9 12,15 18,9"/>
        </svg>
      </div>
    `
  },

  /**
   * Creates HTML for dropdown option using Lucide React icons
   */
  createOptionHTML: (mapTypeName: string, isSelected: boolean): string => {
    const indicatorColor = isSelected ? '#3b82f6' : '#9ca3af'
    const checkIcon = isSelected ? `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20,6 9,17 4,12"/>
      </svg>
    ` : ''
    
    return `
      <div style="display: flex; align-items: center; gap: 6px; width: 100%; font-size: 12px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${indicatorColor};"></div>
        <span style="font-size: 12px;">${mapTypeName}</span>
        ${checkIcon}
      </div>
    `
  },

  /**
   * Applies styles to DOM element
   */
  applyStyles: (element: HTMLElement, styles: Record<string, string>): void => {
    Object.assign(element.style, styles)
  },

  /**
   * Sets up button hover effects
   */
  setupButtonHover: (button: HTMLElement): void => {
    const hoverStyles = {
      background: 'linear-gradient(135deg, #f3f4f6 0%, #f3f4f6 100%)',
      color: '#1f2937',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)'
    }

    const normalStyles = {
      background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
      color: '#374151',
      transform: 'translateY(0)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)'
    }

    button.addEventListener('mouseenter', () => ControlUtils.applyStyles(button, hoverStyles))
    button.addEventListener('mouseleave', () => ControlUtils.applyStyles(button, normalStyles))
  },

  /**
   * Sets up option hover effects
   */
  setupOptionHover: (option: HTMLElement): void => {
    const hoverStyles = {
      backgroundColor: '#f3f4f6',
      color: '#1f2937'
    }

    const normalStyles = {
      backgroundColor: 'transparent',
      color: '#374151'
    }

    option.addEventListener('mouseover', () => ControlUtils.applyStyles(option, hoverStyles))
    option.addEventListener('mouseout', () => ControlUtils.applyStyles(option, normalStyles))
  },

  /**
   * Animates dropdown show/hide
   */
  animateDropdown: (container: HTMLElement, show: boolean): void => {
    if (show) {
      container.style.display = 'block'
      container.style.opacity = '0'
      container.style.transform = 'translateY(-10px)'
      
      requestAnimationFrame(() => {
        container.style.opacity = '1'
        container.style.transform = 'translateY(0)'
      })
    } else {
      container.style.opacity = '0'
      container.style.transform = 'translateY(-10px)'
      
      setTimeout(() => {
        container.style.display = 'none'
      }, 150)
    }
  }
}

// Custom Leaflet Control - Following Official Documentation
class MapTypeControl extends L.Control {
  private mapTypes: Record<string, MapTypeConfig>
  private selectedMapType: string
  private onMapTypeChange: (type: string) => void
  private closeDropdownHandler?: (e: Event) => void

  constructor(options: {
    mapTypes: Record<string, MapTypeConfig>
    selectedMapType: string
    onMapTypeChange: (type: string) => void
  }) {
    super({ position: LEAFLET_CONFIG.positions.TOP_RIGHT })
    this.mapTypes = options.mapTypes
    this.selectedMapType = options.selectedMapType
    this.onMapTypeChange = options.onMapTypeChange
  }

  onAdd(map: L.Map): HTMLElement {
    const container = L.DomUtil.create('div', 'leaflet-control-map-type')
    ControlUtils.applyStyles(container, CONTROL_STYLES.container)

    const button = this.createMainButton()
    const dropdown = this.createDropdown()

    container.appendChild(button)
    container.appendChild(dropdown)

    this.setupEventListeners(container, button, dropdown)

    return container
  }

  onRemove(map: L.Map): void {
    if (this.closeDropdownHandler) {
      document.removeEventListener('click', this.closeDropdownHandler)
    }
  }

  private createMainButton(): HTMLElement {
    const button = L.DomUtil.create('button', '')
    button.innerHTML = ControlUtils.createButtonHTML(this.mapTypes[this.selectedMapType].name)
    ControlUtils.applyStyles(button, CONTROL_STYLES.button)
    ControlUtils.setupButtonHover(button)
    return button
  }

  private createDropdown(): HTMLElement {
    const dropdown = L.DomUtil.create('div', '')
    ControlUtils.applyStyles(dropdown, CONTROL_STYLES.dropdown)

    Object.entries(this.mapTypes).forEach(([key, mapType], index) => {
      const option = this.createOption(key, mapType, index)
      dropdown.appendChild(option)
    })

    return dropdown
  }

  private createOption(key: string, mapType: MapTypeConfig, index: number): HTMLElement {
    const option = L.DomUtil.create('button', '')
    option.innerHTML = ControlUtils.createOptionHTML(mapType.name, this.selectedMapType === key)
    
    const optionStyles = {
      ...CONTROL_STYLES.option,
      borderBottom: index < Object.keys(this.mapTypes).length - 1 ? '1px solid #e5e7eb' : 'none'
    }
    
    ControlUtils.applyStyles(option, optionStyles)
    ControlUtils.setupOptionHover(option)

    option.addEventListener('click', () => {
      this.onMapTypeChange(key)
      ControlUtils.animateDropdown(option.parentElement!, false)
      const button = option.parentElement!.previousElementSibling as HTMLElement
      button.innerHTML = ControlUtils.createButtonHTML(mapType.name)
    })

    return option
  }

  private setupEventListeners(container: HTMLElement, button: HTMLElement, dropdown: HTMLElement): void {
    // Toggle dropdown
    button.addEventListener('click', () => {
      const isVisible = dropdown.style.display === 'block'
      ControlUtils.animateDropdown(dropdown, !isVisible)
    })

    // Close dropdown when clicking outside
    this.closeDropdownHandler = (e: Event) => {
      if (!container.contains(e.target as Node)) {
        ControlUtils.animateDropdown(dropdown, false)
      }
    }
    
    document.addEventListener('click', this.closeDropdownHandler)
  }
}

// React Component - Clean Integration
const MapTypeControlComponent = dynamic(
  () => import("react-leaflet").then((mod) => {
    const { useMap } = mod
    return function MapTypeControlComponent({ 
      mapTypes, 
      selectedMapType, 
      onMapTypeChange 
    }: {
      mapTypes: Record<string, MapTypeConfig>
      selectedMapType: string
      onMapTypeChange: (type: string) => void
    }) {
      const map = useMap()
      
      useEffect(() => {
        const control = new MapTypeControl({
          mapTypes,
          selectedMapType,
          onMapTypeChange
        })
        
        map.addControl(control)
        
        return () => {
          map.removeControl(control)
        }
      }, [map, mapTypes, selectedMapType, onMapTypeChange])
      
      return null
    }
  }),
  { ssr: false }
)

// Enhanced Markers Component
const EnhancedMarkersComponent = dynamic(
  () => import("react-leaflet").then((mod) => {
    const { useMap } = mod
    
    return function EnhancedMarkersComponent() {
      const map = useMap()
      
      useEffect(() => {
        const markers: L.Marker[] = []
        
        CALIFORNIA_LOCATIONS.forEach(location => {
          const icon = location.type === 'monitoring' 
            ? MARKER_CONFIG.createAirQualityIcon(location.aqi)
            : MARKER_CONFIG.createCustomIcon('#3b82f6', 30)
          
          const marker = L.marker(location.position, { icon })
            .bindPopup(`
              <div style="min-width: 200px; font-family: system-ui;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1f2937;">
                  ${location.name}
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 12px;">Tipo:</span>
                  <span style="margin-left: 4px; font-size: 12px; color: #374151;">
                    ${location.type === 'city' ? '🏙️ Ciudad' : 
                      location.type === 'capital' ? '🏛️ Capital' : 
                      '📡 Estación de Monitoreo'}
                  </span>
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 12px;">Población:</span>
                  <span style="margin-left: 4px; font-size: 12px; color: #374151;">${location.population}</span>
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 12px;">ICA:</span>
                  <span style="margin-left: 4px; font-size: 12px; color: #374151; font-weight: bold;">${location.aqi}</span>
                </div>
                <div style="margin-bottom: 6px;">
                  <span style="color: #6b7280; font-size: 12px;">Coordenadas:</span>
                  <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
                    ${location.position[0].toFixed(4)}°, ${location.position[1].toFixed(4)}°
                  </div>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                  <span style="font-size: 12px; color: #6b7280;">${location.description}</span>
                </div>
              </div>
            `)
          
          marker.addTo(map)
          markers.push(marker)
        })
        
        return () => {
          markers.forEach(marker => map.removeLayer(marker))
        }
      }, [map])
      
      return null
    }
  }),
  { ssr: false }
)

// California Map Configuration - Clean and Centralized
const CALIFORNIA_CONFIG = {
  bounds: LEAFLET_CONFIG.mapBounds.CALIFORNIA,
  center: [
    (LEAFLET_CONFIG.mapBounds.CALIFORNIA.south + LEAFLET_CONFIG.mapBounds.CALIFORNIA.north) / 2,
    (LEAFLET_CONFIG.mapBounds.CALIFORNIA.west + LEAFLET_CONFIG.mapBounds.CALIFORNIA.east) / 2
  ] as [number, number],
  boundsArray: [
    [LEAFLET_CONFIG.mapBounds.CALIFORNIA.south, LEAFLET_CONFIG.mapBounds.CALIFORNIA.west],
    [LEAFLET_CONFIG.mapBounds.CALIFORNIA.north, LEAFLET_CONFIG.mapBounds.CALIFORNIA.east]
  ] as [[number, number], [number, number]]
}

// Marker Configuration - Enhanced with Custom Icons
const MARKER_CONFIG = {
  // Custom Icon Creation Function
  createCustomIcon: (color: string, size: number = 25) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${size * 0.4}px;
          color: white;
          font-weight: bold;
        ">
          📍
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size]
    })
  },
  
  // Air Quality Icon
  createAirQualityIcon: (aqi: number) => {
    let color = '#10b981' // Green - Good
    let emoji = '🟢'
    
    if (aqi > 100) {
      color = '#f59e0b' // Yellow - Moderate
      emoji = '🟡'
    }
    if (aqi > 150) {
      color = '#f97316' // Orange - Unhealthy for sensitive
      emoji = '🟠'
    }
    if (aqi > 200) {
      color = '#ef4444' // Red - Unhealthy
      emoji = '🔴'
    }
    if (aqi > 300) {
      color = '#8b5cf6' // Purple - Very unhealthy
      emoji = '🟣'
    }
    if (aqi > 400) {
      color = '#7c2d12' // Maroon - Hazardous
      emoji = '🟤'
    }
    
    return L.divIcon({
      className: 'air-quality-marker',
      html: `
        <div style="
          width: 30px;
          height: 30px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: white;
          font-weight: bold;
          position: relative;
        ">
          ${emoji}
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: ${color};
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
          ">
            ${aqi}
          </div>
        </div>
      `,
      iconSize: [30, 40],
      iconAnchor: [15, 40],
      popupAnchor: [0, -40]
    })
  }
}

// California Locations Data - Enhanced with Real Data
const CALIFORNIA_LOCATIONS = [
  {
    id: 'los-angeles',
    name: 'Los Ángeles',
    position: [34.0522, -118.2437] as [number, number],
    type: 'city',
    aqi: 85,
    population: '3.9M',
    description: 'Ciudad principal de California'
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    position: [37.7749, -122.4194] as [number, number],
    type: 'city',
    aqi: 65,
    population: '873K',
    description: 'Centro tecnológico y cultural'
  },
  {
    id: 'san-diego',
    name: 'San Diego',
    position: [32.7157, -117.1611] as [number, number],
    type: 'city',
    aqi: 72,
    population: '1.4M',
    description: 'Ciudad costera del sur'
  },
  {
    id: 'sacramento',
    name: 'Sacramento',
    position: [38.5816, -121.4944] as [number, number],
    type: 'capital',
    aqi: 78,
    population: '525K',
    description: 'Capital del estado'
  },
  {
    id: 'fresno',
    name: 'Fresno',
    position: [36.7378, -119.7871] as [number, number],
    type: 'city',
    aqi: 95,
    population: '542K',
    description: 'Centro agrícola del valle'
  },
  {
    id: 'monitoring-station-1',
    name: 'Estación de Monitoreo Norte',
    position: [39.7392, -121.8403] as [number, number],
    type: 'monitoring',
    aqi: 45,
    population: 'N/A',
    description: 'Estación de calidad del aire'
  },
  {
    id: 'monitoring-station-2',
    name: 'Estación de Monitoreo Sur',
    position: [33.6846, -117.8265] as [number, number],
    type: 'monitoring',
    aqi: 88,
    population: 'N/A',
    description: 'Estación de calidad del aire'
  }
]

interface CaliforniaMapProps {
  className?: string
  mapType?: keyof typeof MAP_TYPES
  onMapTypeChange?: (mapType: keyof typeof MAP_TYPES) => void
  showMonitoringStations?: boolean
}

export function CaliforniaMap({ className, mapType = "streetmap", onMapTypeChange, showMonitoringStations = true }: CaliforniaMapProps) {
  const currentMapType = MAP_TYPES[mapType]

  return (
    <div className={cn("relative w-full h-full overflow-hidden z-[1]", className)}>
      <MapContainer
        center={CALIFORNIA_CONFIG.center}
        zoom={LEAFLET_CONFIG.zoom.DEFAULT}
        style={{ height: "100%", width: "100%", zIndex: 1 }}
        bounds={CALIFORNIA_CONFIG.boundsArray}
        boundsOptions={{ 
          padding: [30, 30],
          maxZoom: LEAFLET_CONFIG.zoom.MAX_BOUNDS
        }}
      >
        <TileLayer
          key={mapType}
          attribution={currentMapType.attribution}
          url={currentMapType.url}
          subdomains={currentMapType.subdomains}
          maxZoom={LEAFLET_CONFIG.zoom.MAX}
          minZoom={LEAFLET_CONFIG.zoom.MIN}
        />
        
        {/* Enhanced Markers */}
        <EnhancedMarkersComponent />
        
        {/* Monitoring Stations Layer */}
        {showMonitoringStations && <MonitoringStationsLayer />}
        
        <MapTypeControlComponent 
          mapTypes={MAP_TYPES}
          selectedMapType={mapType}
          onMapTypeChange={(type) => onMapTypeChange?.(type as keyof typeof MAP_TYPES)}
        />
      </MapContainer>
    </div>
  )
}
