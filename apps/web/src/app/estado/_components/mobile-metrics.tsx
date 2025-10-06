import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Map, RefreshCw, Wifi, WifiOff } from "lucide-react"

interface MobileMetricsProps {
  isLoading: boolean
  error: any
  stats: {
    active: number
    total: number
    avgAQI?: number
  } | null
  getAQIColor: (aqi: number) => string
  getAQIDetails: (aqi: number) => {
    emoji: string
    category: string
    description: string
    population: string
    recommendation: string
  }
}

export function MobileMetrics({ isLoading, error, stats, getAQIColor, getAQIDetails }: MobileMetricsProps) {
  return (
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
                    <div className="font-semibold text-sm">Station Status</div>
                    <div className="text-xs text-muted-foreground">Real-time monitoring</div>
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
                    <div className="font-semibold text-sm">Average AQI: {Math.round(stats.avgAQI)}</div>
                    <div className="text-xs text-muted-foreground">Based on {stats.active} active stations</div>
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
      </div>
    </div>
  )
}
