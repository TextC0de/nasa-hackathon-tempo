import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Activity, Clock, Map, RefreshCw, Wifi, WifiOff } from "lucide-react"

interface DesktopMetricsProps {
  isLoading: boolean
  error: any
  stats: {
    active: number
    total: number
    avgAQI?: number
  } | null
  getAQIColor: (aqi: number) => string
  getAQILevel: (aqi: number) => string
  getAQIDetails: (aqi: number) => {
    emoji: string
    category: string
    description: string
    population: string
    recommendation: string
  }
}

export function DesktopMetrics({ isLoading, error, stats, getAQIColor, getAQILevel, getAQIDetails }: DesktopMetricsProps) {
  return (
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
  )
}
