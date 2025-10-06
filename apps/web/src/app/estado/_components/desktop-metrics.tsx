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
          {isLoading ? "Connecting..." : error ? "No connection" : "Connected"}
        </span>
      </div>

      {/* Estaciones activas */}
      {stats && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2 cursor-help">
              <Map className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">
                {stats.active}/{stats.total} stations
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Map className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="font-semibold text-sm">
                    Station Status
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Real-time monitoring
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Active stations:</span>
                  <span className="font-medium text-green-600">{stats.active}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total detected:</span>
                  <span className="font-medium">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Inactive:</span>
                  <span className="font-medium text-orange-600">{stats.total - stats.active}</span>
                </div>
                <div className="pt-1 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Active stations provide updated air quality data
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
                    Average AQI: {Math.round(stats.avgAQI)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on {stats.active} active stations
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div><strong>Category:</strong> {getAQIDetails(Math.round(stats.avgAQI)).category}</div>
                <div><strong>Description:</strong> {getAQIDetails(Math.round(stats.avgAQI)).description}</div>
                <div><strong>Affected population:</strong> {getAQIDetails(Math.round(stats.avgAQI)).population}</div>
                <div className="pt-1 border-t border-border">
                  <strong>Recommendation:</strong> {getAQIDetails(Math.round(stats.avgAQI)).recommendation}
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
