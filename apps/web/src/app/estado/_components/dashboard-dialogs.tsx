import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertTriangle,
  MapPin,
  BarChart3,
  Calendar,
  Settings,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  TrendingUp,
  Map
} from "lucide-react"
import { AlertForm } from "@/components/alert-form"
import { ActiveAlerts } from "@/components/active-alerts"

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

interface DashboardDialogsProps {
  openDialog: string | null
  setOpenDialog: (dialog: string | null) => void
  showMonitoringStations: boolean
  setShowMonitoringStations: (show: boolean) => void
  showActiveFires: boolean
  setShowActiveFires: (show: boolean) => void
  isLoading: boolean
  error: any
  stats: {
    active: number
    total: number
    avgAQI?: number
    parameters: number
    agencies: number
  } | null
  fireStats?: {
    totalFires: number
    averageFRP: number
    maxFRP: number
    highConfidenceFires: number
  } | null
  getAQIColor: (aqi: number) => string
  getAQILevel: (aqi: number) => string
  handleSubmitAlert: (alertData: any) => Promise<void>
  isSubmittingAlert: boolean
  getActiveAlerts: () => any[]
  handleResolveAlert: (alertId: string) => void
  handleDismissAlert: (alertId: string) => void
}

export function DashboardDialogs({
  openDialog,
  setOpenDialog,
  showMonitoringStations,
  setShowMonitoringStations,
  showActiveFires,
  setShowActiveFires,
  isLoading,
  error,
  stats,
  fireStats,
  getAQIColor,
  getAQILevel,
  handleSubmitAlert,
  isSubmittingAlert,
  getActiveAlerts,
  handleResolveAlert,
  handleDismissAlert
}: DashboardDialogsProps) {
  return (
    <>
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="air-stations"
                    checked={showMonitoringStations}
                    onCheckedChange={(checked) => setShowMonitoringStations(!!checked)}
                  />
                  <label
                    htmlFor="air-stations"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Estaciones de calidad del aire
                  </label>
                  {stats && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {stats.active}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fires"
                    checked={showActiveFires}
                    onCheckedChange={(checked) => setShowActiveFires(!!checked)}
                  />
                  <label
                    htmlFor="fires"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    🔥 Incendios activos
                  </label>
                  {fireStats && fireStats.totalFires > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {fireStats.totalFires}
                    </Badge>
                  )}
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
        <DialogContent className="max-w-md sm:max-w-lg z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Sistema de Alertas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Formulario de nueva alerta */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-800 text-sm">Crear Nueva Alerta</CardTitle>
                <CardDescription className="text-blue-700 text-xs">
                  Reporta problemas de calidad del aire o estaciones que no funcionan
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <AlertForm
                  onSubmit={handleSubmitAlert}
                  isLoading={isSubmittingAlert}
                />
              </CardContent>
            </Card>

            {/* Alertas activas */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-800 text-sm">Alertas Activas</CardTitle>
                <CardDescription className="text-orange-700 text-xs">
                  {getActiveAlerts().length} alerta(s) pendiente(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ActiveAlerts
                  alerts={getActiveAlerts()}
                  onResolveAlert={handleResolveAlert}
                  onDismissAlert={handleDismissAlert}
                />
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
    </>
  )
}
