import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import {
  AlertTriangle,
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
  { color: "bg-green-500", label: "Good" },
  { color: "bg-yellow-500", label: "Moderate" },
  { color: "bg-orange-500", label: "Unhealthy for Sensitive Groups" },
  { color: "bg-red-500", label: "Unhealthy" },
  { color: "bg-purple-500", label: "Very Unhealthy" },
  { color: "bg-red-800", label: "Hazardous" }
] as const

interface DashboardDialogsProps {
  openDialog: string | null
  setOpenDialog: (dialog: string | null) => void
  showMonitoringStations: boolean
  setShowMonitoringStations: (show: boolean) => void
  showActiveFires: boolean
  setShowActiveFires: (show: boolean) => void
  showTempoOverlay: boolean
  setShowTempoOverlay: (show: boolean) => void
  showCityBoundaries: boolean
  setShowCityBoundaries: (show: boolean) => void
  tempoOpacity: number
  setTempoOpacity: (opacity: number) => void
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
  showTempoOverlay,
  setShowTempoOverlay,
  showCityBoundaries,
  setShowCityBoundaries,
  tempoOpacity,
  setTempoOpacity,
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
      {/* Current location */}
      <Dialog open={openDialog === "location"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-sm z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Current Location</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="p-4">
              <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center mb-3">
                <Badge variant="secondary" className="text-sm">California, USA</Badge>
              </div>
              <CardDescription className="text-xs">
                Coordinates: 36.7783° N, 119.4179° W
              </CardDescription>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Layer controls */}
      <Dialog open={openDialog === "layers"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-sm z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Layer Controls</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Outdoor</CardTitle>
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
                    Air quality stations
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
                    🔥 Active fires
                  </label>
                  {fireStats && fireStats.totalFires > 0 && (
                    <Badge variant="destructive" className="ml-auto text-xs">
                      {fireStats.totalFires}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cities"
                    checked={showCityBoundaries}
                    onCheckedChange={(checked) => setShowCityBoundaries(!!checked)}
                  />
                  <label
                    htmlFor="cities"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    🏙️ Cities
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tempo-overlay"
                    checked={showTempoOverlay}
                    onCheckedChange={(checked) => setShowTempoOverlay(!!checked)}
                  />
                  <label
                    htmlFor="tempo-overlay"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    🛰️ TEMPO Overlay
                  </label>
                </div>
                {showTempoOverlay && (
                  <div className="space-y-2 pl-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground">
                        Opacity
                      </label>
                      <span className="text-xs font-medium">
                        {Math.round(tempoOpacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      value={[tempoOpacity]}
                      onValueChange={([value]) => setTempoOpacity(value)}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </DialogContent>
      </Dialog>

      {/* Air quality legend */}
      <Dialog open={openDialog === "legend"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-sm z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Air Quality Index</DialogTitle>
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

      {/* Alerts */}
      <Dialog open={openDialog === "alerts"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-md sm:max-w-4xl z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alert System
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* New alert form */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-800 text-sm">Create New Alert</CardTitle>
                <CardDescription className="text-blue-700 text-xs">
                  Report air quality issues or malfunctioning stations
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <AlertForm
                  onSubmit={handleSubmitAlert}
                  isLoading={isSubmittingAlert}
                />
              </CardContent>
            </Card>

            {/* Active alerts */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-orange-800 text-sm">Active Alerts</CardTitle>
                <CardDescription className="text-orange-700 text-xs">
                  {getActiveAlerts().length} pending alert(s)
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

      {/* Historical Data */}
      <Dialog open={openDialog === "historical"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-sm z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Historical Data</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Historical data chart</p>
                <p className="text-xs mt-1">No data available</p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Real-Time Metrics */}
      <Dialog open={openDialog === "metrics"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-md z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Real-Time Metrics
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Connection status */}
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
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? "Connecting to AirNow API..." : error ? "Connection error" : "Connected"}
                  </span>
                  <Badge variant={error ? "destructive" : "default"}>
                    {isLoading ? "Connecting" : error ? "Error" : "Active"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Station statistics */}
            {stats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Map className="h-4 w-4 text-blue-500" />
                    Monitoring Stations
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
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-purple-600">{stats.parameters}</div>
                      <div className="text-xs text-muted-foreground">Parameters</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-orange-600">{stats.agencies}</div>
                      <div className="text-xs text-muted-foreground">Agencies</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Average air quality */}
            {stats && stats.avgAQI && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-orange-500" />
                    Average Air Quality
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
                      Air Quality Index
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Update information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Last Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {new Date().toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Data updated every 5 minutes
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences */}
      <Dialog open={openDialog === "preferences"} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-sm z-[10001] mx-4">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">Preferences</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                <Settings className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">User settings</p>
                <p className="text-xs mt-1">Coming soon</p>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}
