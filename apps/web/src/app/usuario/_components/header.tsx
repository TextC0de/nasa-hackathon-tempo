"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertsBell } from "./alerts-bell"
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger
} from "@/components/ui/menubar"
import {
  MapPin,
  Activity,
  Cloud,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  Clock,
  BarChart3
} from "lucide-react"

interface Alert {
  id: string
  type: 'air_quality' | 'fire' | 'weather'
  severity: 'info' | 'warning' | 'danger' | 'critical'
  title: string
  message: string
  location: {
    name: string
    lat: number
    lng: number
  }
  timestamp: string
  distanceKm?: number
  aqi?: number
  createdBy?: string
}

interface HeaderProps {
  currentLocation: { name: string; lat: number; lng: number }
  isLoading: boolean
  error: any
  prediction: any
  onLocationChange: (location: { name: string; lat: number; lng: number }) => void
  onDialogOpen: (dialog: string) => void
  onRefetch: () => void
  getAQIColor: (aqi: number) => string
  getAQILevel: (aqi: number) => string
  locations: readonly { name: string; lat: number; lng: number }[]
  // Alertas
  alerts?: Alert[]
  unreadAlertsCount?: number
  onMarkAlertAsRead?: (alertId: string) => void
  onMarkAllAlertsAsRead?: () => void
  isAlertRead?: (alertId: string) => boolean
}

export function Header({
  currentLocation,
  isLoading,
  error,
  prediction,
  onLocationChange,
  onDialogOpen,
  onRefetch,
  getAQIColor,
  getAQILevel,
  locations,
  alerts = [],
  unreadAlertsCount = 0,
  onMarkAlertAsRead = () => {},
  onMarkAllAlertsAsRead = () => {},
  isAlertRead = () => false
}: HeaderProps) {
  return (
    <TooltipProvider>
      <header className="bg-background border-b border-border px-2 py-2 sm:px-4 sm:py-3 relative z-50">
        <div className="flex items-center justify-between gap-2">
          {/* Logo y métricas principales */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0 flex-1">
            {/* Logo */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3 flex-shrink-0">
              <div className="relative h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8">
                <Image
                  src="/atmos.svg"
                  alt="AtmOS Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <span className="text-sm font-semibold text-foreground sm:text-base lg:text-lg whitespace-nowrap">
                AtmOS
              </span>
            </div>

            {/* Métricas en tiempo real - Desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Estado de conexión */}
              <div className="flex items-center space-x-2">
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                ) : error ? (
                  <WifiOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Wifi className="h-4 w-4 text-green-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isLoading ? "Cargando..." : error ? "Error" : "Conectado"}
                </span>
              </div>

              {/* Ubicación actual */}
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">
                  {currentLocation.name}
                </span>
              </div>

              {/* AQI General */}
              {prediction?.general && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center space-x-2 cursor-help">
                      <Activity className="h-4 w-4 text-orange-500" />
                      <span className={`text-xs font-medium ${getAQIColor(prediction.general.aqi)}`}>
                        AQI: {prediction.general.aqi}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getAQILevel(prediction.general.aqi)}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Índice de Calidad del Aire en {currentLocation.name}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Última actualización */}
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-muted-foreground">
                  {new Date().toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Métricas móviles */}
          <div className="lg:hidden flex items-center space-x-1 sm:space-x-2 min-w-0">
            <div className="flex items-center space-x-1">
              {isLoading ? (
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500" />
              ) : error ? (
                <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
              ) : (
                <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              )}
            </div>

            {prediction?.general && (
              <Badge variant="outline" className={`text-xs px-1 py-0 ${getAQIColor(prediction.general.aqi)}`}>
                {prediction.general.aqi}
              </Badge>
            )}
          </div>

          {/* Alertas Bell + Menubar */}
          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
            {/* Campanita de alertas */}
            <AlertsBell
              alerts={alerts}
              unreadCount={unreadAlertsCount}
              onMarkAsRead={onMarkAlertAsRead}
              onMarkAllAsRead={onMarkAllAlertsAsRead}
              isRead={isAlertRead}
            />

            <Menubar className="border-0 bg-transparent shadow-none">
              {/* Menú Ubicación */}
              <MenubarMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Ubicación</span>
                    </MenubarTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Cambiar ubicación</p>
                  </TooltipContent>
                </Tooltip>
                <MenubarContent>
                  {locations.map((loc) => (
                    <MenubarItem
                      key={loc.name}
                      onClick={() => onLocationChange(loc)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{loc.name}</span>
                    </MenubarItem>
                  ))}
                </MenubarContent>
              </MenubarMenu>

              {/* Menú Datos */}
              <MenubarMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                      <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Datos</span>
                    </MenubarTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Ver detalles de calidad del aire</p>
                  </TooltipContent>
                </Tooltip>
                <MenubarContent>
                  <MenubarItem onClick={() => onDialogOpen("metrics")}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    <span>Métricas Detalladas</span>
                  </MenubarItem>
                  <MenubarItem onClick={() => onDialogOpen("tempo")}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Datos TEMPO (Satelital)</span>
                  </MenubarItem>
                  <MenubarItem onClick={() => onDialogOpen("weather")}>
                    <Cloud className="mr-2 h-4 w-4" />
                    <span>Condiciones Meteorológicas</span>
                  </MenubarItem>
                  <MenubarItem onClick={() => onDialogOpen("pollutants")}>
                    <Activity className="mr-2 h-4 w-4" />
                    <span>Contaminantes AirNow</span>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>

            </Menubar>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
