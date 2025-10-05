"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { HistoryChart } from "./history-chart"
import { MapPin, Radio, Calendar } from "lucide-react"

// Function to get color based on AQI
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#10b981'
  if (aqi <= 100) return '#f59e0b'
  if (aqi <= 150) return '#f97316'
  if (aqi <= 200) return '#ef4444'
  if (aqi <= 300) return '#8b5cf6'
  return '#7c2d12'
}

// Function to get AQI category
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy for Sensitive'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

interface StationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  station: {
    latitude: number
    longitude: number
    provider: string
    distanceKm: number
    aqi?: number
    pollutant?: string
  } | null
}

export function StationDetailDialog({ open, onOpenChange, station }: StationDetailDialogProps) {
  if (!station) return null

  const aqi = station.aqi ?? 0
  const color = getAQIColor(aqi)
  const category = getAQICategory(aqi)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-orange-500" />
            Monitoring Station
          </DialogTitle>
          <DialogDescription>
            Details and historical air quality data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la estación */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Proveedor */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Radio className="h-4 w-4" />
                    <span>Provider</span>
                  </div>
                  <p className="text-lg font-semibold">{station.provider}</p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Location</span>
                  </div>
                  <p className="text-sm font-mono">
                    {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(station.distanceKm).toFixed(2)} km from your location
                  </p>
                </div>

                {/* Current AQI */}
                {station.aqi !== undefined && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Latest Reading</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-bold" style={{ color }}>
                        {aqi}
                      </span>
                      <Badge style={{ backgroundColor: color }} className="text-white">
                        {category}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Dominant pollutant */}
                {station.pollutant && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Dominant Pollutant</span>
                    </div>
                    <p className="text-lg font-semibold">{station.pollutant}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Station historical data */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Data History
            </h3>
            <HistoryChart
              latitude={station.latitude}
              longitude={station.longitude}
              startDate={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
              endDate={new Date()}
              granularity="daily"
            />
          </div>

          {/* Informative note */}
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">💡 Note:</span> The data shown comes from EPA (Environmental Protection Agency) monitoring stations in a nearby radius. Historical values are aggregates of hourly and daily measurements.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
