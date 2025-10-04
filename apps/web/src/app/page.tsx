"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Menubar, 
  MenubarContent, 
  MenubarItem, 
  MenubarMenu, 
  MenubarSeparator, 
  MenubarTrigger 
} from "@/components/ui/menubar"
import { 
  AlertTriangle, 
  MapPin, 
  Layers, 
  Globe, 
  Menu, 
  Settings, 
  BarChart3, 
  Calendar,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  Users,
  Map
} from "lucide-react"
import { useMonitoringStations } from "@/hooks/use-monitoring-stations"

// Importar el componente del mapa dinámicamente para evitar problemas de SSR
const CaliforniaMap = dynamic(() => import("@/components/california-map").then(mod => ({ default: mod.CaliforniaMap })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  )
})

// Types
type MapType = "streetmap" | "topographic" | "hybrid" | "physical"

// Constants
const AIR_QUALITY_LEVELS = [
  { color: "bg-green-500", label: "Bueno" },
  { color: "bg-yellow-500", label: "Moderado" },
  { color: "bg-orange-500", label: "Insalubre para grupos sensibles" },
  { color: "bg-red-500", label: "Insalubre" },
  { color: "bg-purple-500", label: "Muy insalubre" },
  { color: "bg-red-800", label: "Peligroso" }
] as const

const EXTERIOR_LAYERS = [
  { id: "air-stations", label: "Estaciones de calidad del aire" },
  { id: "fires", label: "Incendios" },
  { id: "wind", label: "Viento" }
] as const

const INTERIOR_FACILITY_TYPES = [
  { value: "any", label: "Cualquiera" },
  { value: "hospital", label: "Hospital" },
  { value: "school", label: "Escuela" },
  { value: "office", label: "Oficina" }
] as const

export default function Dashboard() {
  const [mapType, setMapType] = useState<MapType>("streetmap")
  const [openDialog, setOpenDialog] = useState<string | null>(null)
  const [showMonitoringStations, setShowMonitoringStations] = useState(true)

  // Hook para obtener datos de estaciones de monitoreo
  const { stations, airQuality, isLoading, error, stats } = useMonitoringStations({
    centerLat: 36.7783, // Centro de California
    centerLng: -119.4179,
    radiusKm: 200,
    enabled: true
  })

  // Función para obtener el color del AQI
  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return "text-green-600"
    if (aqi <= 100) return "text-yellow-600"
    if (aqi <= 150) return "text-orange-600"
    if (aqi <= 200) return "text-red-600"
    if (aqi <= 300) return "text-purple-600"
    return "text-red-800"
  }

  // Función para obtener el nivel de calidad del aire
  const getAQILevel = (aqi: number) => {
    if (aqi <= 50) return "Bueno"
    if (aqi <= 100) return "Moderado"
    if (aqi <= 150) return "Insalubre para grupos sensibles"
    if (aqi <= 200) return "Insalubre"
    if (aqi <= 300) return "Muy insalubre"
    return "Peligroso"
  }

  // Función para obtener información detallada del AQI
  const getAQIDetails = (aqi: number) => {
    if (aqi <= 50) return {
      emoji: "🟢",
      category: "Bueno",
      description: "Aire de calidad satisfactoria",
      population: "Ninguna población afectada",
      recommendation: "Disfruta de actividades al aire libre"
    }
    if (aqi <= 100) return {
      emoji: "🟡",
      category: "Moderado",
      description: "Calidad aceptable",
      population: "Pocos inusualmente sensibles",
      recommendation: "Personas sensibles pueden experimentar síntomas leves"
    }
    if (aqi <= 150) return {
      emoji: "🟠",
      category: "Insalubre para grupos sensibles",
      description: "Efectos en grupos sensibles",
      population: "Niños, ancianos, asmáticos",
      recommendation: "Grupos sensibles deben evitar actividades prolongadas al aire libre"
    }
    if (aqi <= 200) return {
      emoji: "🔴",
      category: "Insalubre",
      description: "Efectos en población general",
      population: "Todos pueden experimentar efectos",
      recommendation: "Evita actividades al aire libre prolongadas"
    }
    if (aqi <= 300) return {
      emoji: "🟣",
      category: "Muy insalubre",
      description: "Alerta de salud",
      population: "Efectos serios más probables",
      recommendation: "Evita todas las actividades al aire libre"
    }
    return {
      emoji: "🟤",
      category: "Peligroso",
      description: "Emergencia de salud",
      population: "Toda la población afectada",
      recommendation: "Permanece en interiores con aire filtrado"
    }
  }

  // Componente para métricas móviles - Optimizado para reutilización
  const MobileMetrics = () => (
    <div className="lg:hidden flex items-center space-x-1 sm:space-x-2 min-w-0">
      {/* Estado de conexión móvil */}
      <div className="flex items-center space-x-1">
        {isLoading ? (
          <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-blue-500" />
        ) : error ? (
          <WifiOff className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
        ) : (
          <Wifi className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
        )}
      </div>
      
      {/* Badges compactos */}
      <div className="flex items-center space-x-1">
        {stats && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs px-1 py-0 cursor-help">
                {stats.active}/{stats.total}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Map className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-semibold text-sm">Estado de Estaciones</div>
                    <div className="text-xs text-muted-foreground">Monitoreo en tiempo real</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Estaciones activas:</span>
                    <span className="font-medium text-green-600">{stats.active}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total detectadas:</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inactivas:</span>
                    <span className="font-medium text-orange-600">{stats.total - stats.active}</span>
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
        
        {stats && stats.avgAQI && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`text-xs px-1 py-0 cursor-help ${getAQIColor(Math.round(stats.avgAQI))}`}>
                {Math.round(stats.avgAQI)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getAQIDetails(Math.round(stats.avgAQI)).emoji}</span>
                  <div>
                    <div className="font-semibold text-sm">AQI Promedio: {Math.round(stats.avgAQI)}</div>
                    <div className="text-xs text-muted-foreground">Basado en {stats.active} estaciones activas</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div><strong>Categoría:</strong> {getAQIDetails(Math.round(stats.avgAQI)).category}</div>
                  <div><strong>Descripción:</strong> {getAQIDetails(Math.round(stats.avgAQI)).description}</div>
                  <div><strong>Población afectada:</strong> {getAQIDetails(Math.round(stats.avgAQI)).population}</div>
                  <div className="pt-1 border-t border-border">
                    <strong>Recomendación:</strong> {getAQIDetails(Math.round(stats.avgAQI)).recommendation}
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header con métricas en tiempo real - Responsive */}
          <header className="bg-background border-b border-border px-2 py-2 sm:px-4 sm:py-3 relative z-[10000]">
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
                  <span className="text-sm font-semibold text-foreground sm:text-base lg:text-lg whitespace-nowrap">AtmOS</span>
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
                      {isLoading ? "Conectando..." : error ? "Sin conexión" : "Conectado"}
                    </span>
                  </div>

                  {/* Estaciones activas */}
                  {stats && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 cursor-help">
                          <Map className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-muted-foreground">
                            {stats.active}/{stats.total} estaciones
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Map className="h-4 w-4 text-blue-500" />
                            <div>
                              <div className="font-semibold text-sm">
                                Estado de Estaciones
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Monitoreo en tiempo real
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span>Estaciones activas:</span>
                              <span className="font-medium text-green-600">{stats.active}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total detectadas:</span>
                              <span className="font-medium">{stats.total}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Inactivas:</span>
                              <span className="font-medium text-orange-600">{stats.total - stats.active}</span>
                            </div>
                            <div className="pt-1 border-t border-border">
                              <div className="text-xs text-muted-foreground">
                                Las estaciones activas proporcionan datos actualizados de calidad del aire
                              </div>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* AQI promedio */}
                  {stats && stats.avgAQI && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center space-x-2 cursor-help">
                          <Activity className="h-4 w-4 text-orange-500" />
                          <span className={`text-xs font-medium ${getAQIColor(Math.round(stats.avgAQI))}`}>
                            AQI: {Math.round(stats.avgAQI)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getAQILevel(Math.round(stats.avgAQI))}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getAQIDetails(Math.round(stats.avgAQI)).emoji}</span>
                            <div>
                              <div className="font-semibold text-sm">
                                AQI Promedio: {Math.round(stats.avgAQI)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Basado en {stats.active} estaciones activas
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div><strong>Categoría:</strong> {getAQIDetails(Math.round(stats.avgAQI)).category}</div>
                            <div><strong>Descripción:</strong> {getAQIDetails(Math.round(stats.avgAQI)).description}</div>
                            <div><strong>Población afectada:</strong> {getAQIDetails(Math.round(stats.avgAQI)).population}</div>
                            <div className="pt-1 border-t border-border">
                              <strong>Recomendación:</strong> {getAQIDetails(Math.round(stats.avgAQI)).recommendation}
                            </div>
                          </div>
                        </div>
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

              {/* Métricas móviles - Componente optimizado */}
              <MobileMetrics />

              {/* Menubar con controles organizados - Responsive */}
              <div className="ml-auto flex-shrink-0">
                <Menubar className="border-0 bg-transparent shadow-none">
                  {/* Menú Vista */}
                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                          <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline text-xs sm:text-sm">Vista</span>
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Opciones de visualización del mapa</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={() => setOpenDialog("location")}>
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>Ubicación Actual</span>
                      </MenubarItem>
                      <MenubarItem onClick={() => setOpenDialog("layers")}>
                        <Layers className="mr-2 h-4 w-4" />
                        <span>Controles de Capas</span>
                      </MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem onClick={() => setOpenDialog("legend")}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Leyenda de Calidad del Aire</span>
                      </MenubarItem>
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
                        <p>Análisis y métricas de calidad del aire</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={() => setOpenDialog("historical")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Datos Históricos</span>
                      </MenubarItem>
                      <MenubarItem onClick={() => setOpenDialog("metrics")}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        <span>Métricas en Tiempo Real</span>
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>

                  {/* Menú Alertas */}
                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline text-xs sm:text-sm">Alertas</span>
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Alertas y notificaciones de salud</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={() => setOpenDialog("alerts")}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        <span>Alertas de Exposición</span>
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>

                  {/* Menú Configuración */}
                  <MenubarMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MenubarTrigger className="flex items-center gap-1 sm:gap-2 cursor-help px-1 sm:px-2">
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline text-xs sm:text-sm">Config</span>
                        </MenubarTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Configuración y preferencias</p>
                      </TooltipContent>
                    </Tooltip>
                    <MenubarContent>
                      <MenubarItem onClick={() => setOpenDialog("layers")}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Configuración del Mapa</span>
                      </MenubarItem>
                      <MenubarItem onClick={() => setOpenDialog("preferences")}>
                        <Menu className="mr-2 h-4 w-4" />
                        <span>Preferencias</span>
                      </MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                </Menubar>
              </div>
              
              {/* Botones de acción rápida - Responsive */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {/* Ubicación actual */}
                <Dialog open={openDialog === "location"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Ubicación Actual</DialogTitle>
                    </DialogHeader>
                    <Card>
                      <CardContent className="p-4">
                        <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center mb-3">
                          <Badge variant="secondary" className="text-sm">California, USA</Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Coordenadas: 36.7783° N, 119.4179° W
                        </CardDescription>
                      </CardContent>
                    </Card>
                  </DialogContent>
                </Dialog>

                {/* Controles de capas */}
                <Dialog open={openDialog === "layers"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Controles de Capas</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Exterior</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {EXTERIOR_LAYERS.map((layer) => (
                            <div key={layer.id} className="flex items-center space-x-2">
                              <Checkbox id={layer.id} defaultChecked />
                              <label 
                                htmlFor={layer.id} 
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {layer.label}
                              </label>
                            </div>
                          ))}
                          
                          {/* Estaciones de Monitoreo */}
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="monitoring-stations" 
                              checked={showMonitoringStations}
                              onCheckedChange={(checked) => setShowMonitoringStations(checked as boolean)}
                            />
                            <label 
                              htmlFor="monitoring-stations" 
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Estaciones de Monitoreo AirNow
                            </label>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Interior</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="clean-air" defaultChecked />
                            <label htmlFor="clean-air" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              Instalaciones de aire limpio
                            </label>
                          </div>
                          <Select defaultValue="any">
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent className="z-[10002]">
                              {INTERIOR_FACILITY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Leyenda de calidad del aire */}
                <Dialog open={openDialog === "legend"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Índice de Calidad del Aire</DialogTitle>
                    </DialogHeader>
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {AIR_QUALITY_LEVELS.map((level, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <Badge 
                                variant="secondary" 
                                className={`w-4 h-4 ${level.color} hover:${level.color}`}
                              />
                              <span className="text-sm">{level.label}</span>
              </div>
                          ))}
            </div>
                      </CardContent>
                    </Card>
                  </DialogContent>
                </Dialog>

                {/* Alertas */}
                <Dialog open={openDialog === "alerts"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm sm:max-w-2xl z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Alertas de Exposición</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 sm:space-y-4">
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-yellow-800 text-sm">Advertencia de Calidad del Aire</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-yellow-700 text-sm">
                            Nivel moderado detectado en el área norte
                          </CardDescription>
                        </CardContent>
                      </Card>
                      <Card className="border-green-200 bg-green-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-green-800 text-sm">Condiciones Normales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-green-700 text-sm">
                            Todas las áreas dentro de parámetros seguros
                          </CardDescription>
                        </CardContent>
                      </Card>
            </div>
                  </DialogContent>
                </Dialog>

                {/* Datos Históricos */}
                <Dialog open={openDialog === "historical"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Datos Históricos</DialogTitle>
                    </DialogHeader>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center text-muted-foreground">
                          <Calendar className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Gráfico de datos históricos</p>
                          <p className="text-xs mt-1">Sin datos disponibles</p>
          </div>
                      </CardContent>
                    </Card>
                  </DialogContent>
                </Dialog>

                {/* Métricas en Tiempo Real */}
                <Dialog open={openDialog === "metrics"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-md z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Métricas en Tiempo Real
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Estado de conexión */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {isLoading ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                            ) : error ? (
                              <WifiOff className="h-4 w-4 text-red-500" />
                            ) : (
                              <Wifi className="h-4 w-4 text-green-500" />
                            )}
                            Estado de Conexión
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {isLoading ? "Conectando a AirNow API..." : error ? "Error de conexión" : "Conectado"}
                            </span>
                            <Badge variant={error ? "destructive" : "default"}>
                              {isLoading ? "Conectando" : error ? "Error" : "Activo"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Estadísticas de estaciones */}
                      {stats && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Map className="h-4 w-4 text-blue-500" />
                              Estaciones de Monitoreo
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                                <div className="text-xs text-muted-foreground">Activas</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-purple-600">{stats.parameters}</div>
                                <div className="text-xs text-muted-foreground">Parámetros</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-orange-600">{stats.agencies}</div>
                                <div className="text-xs text-muted-foreground">Agencias</div>
            </div>
          </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Calidad del aire promedio */}
                      {stats && stats.avgAQI && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Activity className="h-4 w-4 text-orange-500" />
                              Calidad del Aire Promedio
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center">
                              <div className={`text-3xl font-bold ${getAQIColor(Math.round(stats.avgAQI))}`}>
                                {Math.round(stats.avgAQI)}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {getAQILevel(Math.round(stats.avgAQI))}
                              </div>
                              <Badge variant="outline" className="mt-2">
                                Índice de Calidad del Aire
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Información de actualización */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            Última Actualización
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center">
                            <div className="text-sm font-medium">
                              {new Date().toLocaleString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Datos actualizados cada 5 minutos
                            </div>
                          </div>
                        </CardContent>
                      </Card>
          </div>
                  </DialogContent>
                </Dialog>

                {/* Preferencias */}
                <Dialog open={openDialog === "preferences"} onOpenChange={(open) => !open && setOpenDialog(null)}>
                  <DialogContent className="max-w-sm z-[10001] mx-4">
                    <DialogHeader>
                      <DialogTitle className="text-sm sm:text-base">Preferencias</DialogTitle>
                    </DialogHeader>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center text-muted-foreground">
                          <Settings className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">Configuración de usuario</p>
                          <p className="text-xs mt-1">Próximamente disponible</p>
                        </div>
                      </CardContent>
                    </Card>
                  </DialogContent>
                </Dialog>
          </div>
        </div>
          </header>
          
          {/* Map Content - Solo el mapa limpio */}
          <main className="flex-1 overflow-hidden relative z-[1]">
            <div className="h-full w-full">
              <CaliforniaMap 
                className="h-full w-full" 
                mapType={mapType} 
                onMapTypeChange={(type) => setMapType(type as MapType)}
                showMonitoringStations={showMonitoringStations}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
    </TooltipProvider>
  )
}
