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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header con métricas en tiempo real */}
          <header className="bg-background border-b border-border px-3 py-2 sm:px-4 sm:py-3 relative z-[10000]">
            <div className="flex items-center justify-between">
              {/* Logo y métricas principales */}
              <div className="flex items-center space-x-4 sm:space-x-6">
                {/* Logo */}
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="relative h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <Image
                      src="/atmos.svg"
                      alt="AtmOS Logo"
                      width={32}
                      height={32}
                      className="h-full w-full object-contain"
                      priority
                    />
                  </div>
                  <span className="text-base font-semibold text-foreground sm:text-lg">AtmOS</span>
                </div>

                {/* Métricas en tiempo real */}
                <div className="hidden md:flex items-center space-x-4">
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
                    <div className="flex items-center space-x-2">
                      <Map className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        {stats.active}/{stats.total} estaciones
                      </span>
                    </div>
                  )}

                  {/* AQI promedio */}
                  {stats && stats.avgAQI && (
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-orange-500" />
                      <span className={`text-xs font-medium ${getAQIColor(Math.round(stats.avgAQI))}`}>
                        AQI: {Math.round(stats.avgAQI)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getAQILevel(Math.round(stats.avgAQI))}
                      </Badge>
                    </div>
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
              <div className="md:hidden flex items-center space-x-2">
                {stats && (
                  <Badge variant="outline" className="text-xs">
                    {stats.active} estaciones
                  </Badge>
                )}
                {stats && stats.avgAQI && (
                  <Badge variant="outline" className={`text-xs ${getAQIColor(Math.round(stats.avgAQI))}`}>
                    AQI: {Math.round(stats.avgAQI)}
                  </Badge>
                )}
              </div>

              {/* Menubar con controles organizados */}
              <Menubar className="border-0 bg-transparent shadow-none">
                {/* Menú Vista */}
                <MenubarMenu>
                  <MenubarTrigger className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Vista</span>
                  </MenubarTrigger>
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
                  <MenubarTrigger className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Datos</span>
                  </MenubarTrigger>
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
                  <MenubarTrigger className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden sm:inline">Alertas</span>
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem onClick={() => setOpenDialog("alerts")}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <span>Alertas de Exposición</span>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>

                {/* Menú Configuración */}
                <MenubarMenu>
                  <MenubarTrigger className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Config</span>
                  </MenubarTrigger>
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
              
              {/* Botones de acción rápida */}
              <div className="flex items-center gap-1 sm:gap-2">
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
  )
}
