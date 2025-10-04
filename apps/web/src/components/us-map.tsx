"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"

interface USMapProps {
  className?: string
}

// Datos simulados de calidad del aire por región usando colores del sistema de diseño
const airQualityData = {
  west: { value: 45, level: "Bueno", color: "chart-2" },
  southwest: { value: 78, level: "Moderado", color: "chart-4" },
  central: { value: 95, level: "Insalubre para grupos sensibles", color: "chart-5" },
  southeast: { value: 120, level: "Insalubre", color: "destructive" },
  northeast: { value: 85, level: "Moderado", color: "chart-4" },
  northwest: { value: 35, level: "Bueno", color: "chart-2" },
  alaska: { value: 25, level: "Bueno", color: "chart-2" }
}

const getColorClass = (color: string) => {
  const colors = {
    "chart-1": "fill-chart-1",
    "chart-2": "fill-chart-2", 
    "chart-3": "fill-chart-3",
    "chart-4": "fill-chart-4",
    "chart-5": "fill-chart-5",
    "destructive": "fill-destructive"
  }
  return colors[color as keyof typeof colors] || "fill-muted"
}

export function USMap({ className }: USMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null)

  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-4 lg:p-6 shadow-sm",
      className
    )}>
      <h3 className="text-base lg:text-lg font-semibold text-card-foreground mb-3 lg:mb-4">
        Mapa de Calidad del Aire - EE.UU.
      </h3>
      
      {/* Mapa mejorado de US */}
      <div className="relative w-full h-48 lg:h-64 bg-muted/30 rounded-lg overflow-hidden">
        <svg
          viewBox="0 0 400 300"
          className="absolute inset-0 w-full h-full"
          fill="none"
          stroke="border"
          strokeWidth="0.5"
        >
          {/* Región Oeste */}
          <path
            d="M50 80 L120 70 L130 100 L80 120 L50 100 Z"
            className={`${getColorClass(airQualityData.west.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('west')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Región Suroeste */}
          <path
            d="M120 70 L180 60 L190 90 L140 110 L120 100 Z"
            className={`${getColorClass(airQualityData.southwest.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('southwest')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Región Central */}
          <path
            d="M180 60 L240 50 L250 80 L200 100 L180 90 Z"
            className={`${getColorClass(airQualityData.central.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('central')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Región Sureste */}
          <path
            d="M240 50 L300 40 L310 70 L260 90 L240 80 Z"
            className={`${getColorClass(airQualityData.southeast.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('southeast')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Región Noreste */}
          <path
            d="M300 40 L360 30 L370 60 L320 80 L300 70 Z"
            className={`${getColorClass(airQualityData.northeast.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('northeast')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Región Noroeste */}
          <path
            d="M50 40 L120 30 L130 60 L80 80 L50 60 Z"
            className={`${getColorClass(airQualityData.northwest.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('northwest')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Alaska */}
          <path
            d="M50 150 L80 140 L90 170 L60 180 L50 160 Z"
            className={`${getColorClass(airQualityData.alaska.color)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
            onMouseEnter={() => setHoveredRegion('alaska')}
            onMouseLeave={() => setHoveredRegion(null)}
          />
          
          {/* Hawaii */}
          <path
            d="M200 200 L220 195 L225 210 L205 215 L200 205 Z"
            className="fill-chart-3 opacity-80"
          />
        </svg>
        
        {/* Tooltip de información */}
        {hoveredRegion && (
          <div className="absolute top-4 right-4 bg-popover border border-border rounded-lg p-3 shadow-lg z-10">
            <div className="text-sm font-medium text-popover-foreground mb-1">
              {hoveredRegion === 'west' && 'Región Oeste'}
              {hoveredRegion === 'southwest' && 'Región Suroeste'}
              {hoveredRegion === 'central' && 'Región Central'}
              {hoveredRegion === 'southeast' && 'Región Sureste'}
              {hoveredRegion === 'northeast' && 'Región Noreste'}
              {hoveredRegion === 'northwest' && 'Región Noroeste'}
              {hoveredRegion === 'alaska' && 'Alaska'}
            </div>
            <div className="text-xs text-muted-foreground">
              ICA: {airQualityData[hoveredRegion as keyof typeof airQualityData].value}
            </div>
            <div className="text-xs text-muted-foreground">
              {airQualityData[hoveredRegion as keyof typeof airQualityData].level}
            </div>
          </div>
        )}
        
        {/* Leyenda mejorada */}
        <div className="absolute bottom-2 lg:bottom-4 left-2 lg:left-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 lg:p-3 shadow-sm">
          <div className="text-card-foreground text-xs font-medium mb-1 lg:mb-2">Índice de Calidad del Aire</div>
          <div className="grid grid-cols-2 gap-1 lg:gap-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-chart-2 rounded"></div>
              <span className="hidden sm:inline">Bueno (0-50)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-chart-4 rounded"></div>
              <span className="hidden sm:inline">Moderado (51-100)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-chart-5 rounded"></div>
              <span className="hidden sm:inline">Insalubre (101-150)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 lg:w-3 lg:h-3 bg-destructive rounded"></div>
              <span className="hidden sm:inline">Muy Insalubre (151+)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
