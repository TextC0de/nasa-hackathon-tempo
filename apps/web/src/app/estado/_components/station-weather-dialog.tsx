"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { trpc } from "@/lib/trpc"
import type { GroupedStation } from "@/hooks/use-monitoring-stations"
import {
  Cloud,
  Droplets,
  Gauge,
  Thermometer,
  Wind,
  MapPin,
  Clock,
  Activity,
  TrendingUp,
  Eye,
  Sun,
  CloudRain,
  Snowflake,
  CloudDrizzle,
  CloudSnow,
  Zap
} from "lucide-react"

interface StationWeatherDialogProps {
  station: GroupedStation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  getAQIColor: (aqi: number) => string
  getAQICategory: (aqi: number) => {
    emoji: string
    category: string
    description: string
  }
}

/**
 * Professional dialog that shows complete station information:
 * - Air quality (all parameters)
 * - Real-time weather
 */
export function StationWeatherDialog({
  station,
  open,
  onOpenChange,
  getAQIColor,
  getAQICategory
}: StationWeatherDialogProps) {
  const [activeTab, setActiveTab] = useState<"air" | "weather" | "forecast">("air")

  // Current weather query (only executes if station is selected)
  const { data: climaData, isLoading: climaLoading } = trpc.obtenerClimaActual.useQuery(
    {
      latitud: station?.Latitude ?? 0,
      longitud: station?.Longitude ?? 0
    },
    {
      enabled: !!station && open, // Only fetch when there's a station and dialog is open
      staleTime: 5 * 60 * 1000, // Cache 5 minutes
    }
  )

  // Forecast query (48 hours ahead)
  const { data: forecastData, isLoading: forecastLoading } = trpc.obtenerPrediccionMeteorologica.useQuery(
    {
      latitud: station?.Latitude ?? 0,
      longitud: station?.Longitude ?? 0,
      horasPronostico: 48 // T+48h from now
    },
    {
      enabled: !!station && open, // Only fetch when there's a station and dialog is open
      staleTime: 15 * 60 * 1000, // Cache 15 minutes (forecast changes less frequently)
    }
  )

  if (!station) return null

  const dominantAqiColor = getAQIColor(station.dominantAQI)
  const dominantAqiCategory = getAQICategory(station.dominantAQI)

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timestamp
    }
  }

  // Get weather description by code
  const getWeatherDescription = (code: number | null): string => {
    if (code === null) return 'Unknown'

    const weatherCodes: Record<number, string> = {
      0: 'Clear',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Cloudy',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Light rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Light snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Light showers',
      81: 'Moderate showers',
      82: 'Violent showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with light hail',
      99: 'Thunderstorm with heavy hail'
    }

    return weatherCodes[code] ?? 'Unknown'
  }

  // Get wind direction
  const getWindDirection = (degrees: number | null): string => {
    if (degrees === null) return 'N/A'

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(((degrees % 360) / 45)) % 8
    return directions[index]
  }

  // Get weather icon by code
  const getWeatherIcon = (code: number | null) => {
    if (code === null) return <Cloud className="h-5 w-5 text-gray-400" />

    if (code === 0 || code === 1) return <Sun className="h-5 w-5 text-yellow-500" />
    if (code === 2 || code === 3) return <Cloud className="h-5 w-5 text-gray-500" />
    if (code >= 51 && code <= 55) return <CloudDrizzle className="h-5 w-5 text-blue-400" />
    if (code >= 61 && code <= 65) return <CloudRain className="h-5 w-5 text-blue-600" />
    if (code >= 71 && code <= 75) return <CloudSnow className="h-5 w-5 text-blue-300" />
    if (code >= 80 && code <= 82) return <CloudRain className="h-5 w-5 text-blue-700" />
    if (code >= 95) return <Zap className="h-5 w-5 text-yellow-600" />

    return <Cloud className="h-5 w-5 text-gray-400" />
  }

  // Group forecast by day
  const groupForecastByDay = (hourlyData: any) => {
    const days: { [key: string]: any[] } = {}

    hourlyData.time?.forEach((time: string, idx: number) => {
      const date = new Date(time)
      const dayKey = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })

      if (!days[dayKey]) {
        days[dayKey] = []
      }

      days[dayKey].push({
        time,
        idx,
        hour: date.getHours()
      })
    })

    return days
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[10001]">
        {/* Header */}
        <DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {station.SiteName}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {station.AgencyName}
                </p>
              </div>

              {/* Dominant AQI Badge */}
              <div className="text-center">
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: dominantAqiColor }}
                >
                  {station.dominantAQI > 0 ? station.dominantAQI : 'N/A'}
                </div>
                <Badge variant="outline" className="text-xs">
                  AQI
                </Badge>
              </div>
            </div>

            {/* Location Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{station.Latitude.toFixed(4)}°, {station.Longitude.toFixed(4)}°</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(station.lastUpdate)}</span>
              </div>
            </div>

            {/* Overall Status Banner */}
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: `${dominantAqiColor}15`,
                borderLeft: `4px solid ${dominantAqiColor}`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Overall Status</div>
                  <div className="font-semibold" style={{ color: dominantAqiColor }}>
                    {dominantAqiCategory.emoji} {dominantAqiCategory.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-1">Dominant Parameter</div>
                  <div className="font-semibold text-gray-900">{station.dominantParameter}</div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "air" | "weather" | "forecast")} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="air" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Air Quality
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Current Weather
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              48h Forecast
            </TabsTrigger>
          </TabsList>

          {/* Tab: Air Quality */}
          <TabsContent value="air" className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monitored Parameters ({station.measurements.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-3 text-left font-semibold text-gray-700">Parameter</th>
                      <th className="py-3 px-3 text-center font-semibold text-gray-700">AQI</th>
                      <th className="py-3 px-3 text-left font-semibold text-gray-700">Category</th>
                      <th className="py-3 px-3 text-right font-semibold text-gray-700">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {station.measurements
                      .sort((a, b) => b.AQI - a.AQI)
                      .map((measurement, idx) => {
                        const aqiColor = getAQIColor(measurement.AQI)
                        const { emoji, category } = getAQICategory(measurement.AQI)
                        const isValid = measurement.AQI > 0 && measurement.AQI <= 500

                        return (
                          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-gray-900">
                              {measurement.Parameter}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className="inline-flex items-center gap-1 font-bold"
                                style={{ color: aqiColor }}
                              >
                                {isValid ? emoji : '⚪'} {isValid ? measurement.AQI : 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-xs text-gray-600">
                              {isValid ? category : 'No data'}
                            </td>
                            <td className="py-3 px-3 text-xs text-gray-600 text-right">
                              {measurement.RawConcentration > 0
                                ? `${measurement.RawConcentration.toFixed(2)} ${measurement.Unit}`
                                : 'N/A'}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Current Weather */}
          <TabsContent value="weather" className="space-y-4">
            {climaLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading weather data...</p>
                </div>
              </div>
            ) : climaData?.current ? (
              <div className="space-y-4">
                {/* Weather Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Temperature */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-5 w-5 text-orange-600" />
                      <span className="text-xs font-semibold text-gray-700">Temperature</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.temperature !== null
                        ? `${climaData.current.temperature.toFixed(1)}°C`
                        : 'N/A'}
                    </div>
                    {climaData.current.apparentTemperature !== null && (
                      <div className="text-xs text-gray-600 mt-1">
                        Feels like: {climaData.current.apparentTemperature.toFixed(1)}°C
                      </div>
                    )}
                  </div>

                  {/* Wind */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="h-5 w-5 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700">Wind</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.windSpeed !== null
                        ? `${climaData.current.windSpeed.toFixed(1)} m/s`
                        : 'N/A'}
                    </div>
                    {climaData.current.windDirection !== null && (
                      <div className="text-xs text-gray-600 mt-1">
                        {getWindDirection(climaData.current.windDirection)} ({climaData.current.windDirection.toFixed(0)}°)
                      </div>
                    )}
                  </div>

                  {/* Humidity */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-5 w-5 text-teal-600" />
                      <span className="text-xs font-semibold text-gray-700">Humidity</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.humidity !== null
                        ? `${climaData.current.humidity}%`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Relative
                    </div>
                  </div>

                  {/* Pressure */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-5 w-5 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-700">Pressure</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.pressure !== null
                        ? `${climaData.current.pressure.toFixed(0)} hPa`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Surface
                    </div>
                  </div>
                </div>

                {/* Additional Weather Info */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Weather:
                      </span>
                      <span className="font-medium">
                        {getWeatherDescription(climaData.current.weatherCode)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Clouds:
                      </span>
                      <span className="font-medium">
                        {climaData.current.cloudCover !== null
                          ? `${climaData.current.cloudCover}%`
                          : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Precipitation:
                      </span>
                      <span className="font-medium">
                        {climaData.current.precipitation !== null
                          ? `${climaData.current.precipitation} mm`
                          : 'N/A'}
                      </span>
                    </div>

                    {climaData.current.windGusts !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 flex items-center gap-2">
                          <Wind className="h-4 w-4" />
                          Gusts:
                        </span>
                        <span className="font-medium">
                          {climaData.current.windGusts.toFixed(1)} m/s
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-center text-muted-foreground pt-2 border-t">
                  Weather data from {formatTimestamp(climaData.current.timestamp)}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  No weather data available
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Forecast */}
          <TabsContent value="forecast" className="space-y-4">
            {forecastLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading forecast...</p>
                </div>
              </div>
            ) : forecastData?.weather_data?.hourly ? (
              <div className="space-y-4">
                {/* Summary Cards Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Thermometer className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-semibold text-gray-700">Max Temp</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {forecastData.weather_data.hourly.temperature_2m
                        ? (() => {
                            const temps = forecastData.weather_data.hourly.temperature_2m
                              .map(t => typeof t === 'number' ? t : (typeof t === 'string' ? parseFloat(t) : null))
                              .filter((t): t is number => t !== null && !isNaN(t))
                            return temps.length > 0 ? `${Math.max(...temps).toFixed(1)}°C` : 'N/A'
                          })()
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Thermometer className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700">Min Temp</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {forecastData.weather_data.hourly.temperature_2m
                        ? (() => {
                            const temps = forecastData.weather_data.hourly.temperature_2m
                              .map(t => typeof t === 'number' ? t : (typeof t === 'string' ? parseFloat(t) : null))
                              .filter((t): t is number => t !== null && !isNaN(t))
                            return temps.length > 0 ? `${Math.min(...temps).toFixed(1)}°C` : 'N/A'
                          })()
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-300">
                    <div className="flex items-center gap-2 mb-1">
                      <Droplets className="h-4 w-4 text-blue-700" />
                      <span className="text-xs font-semibold text-gray-700">Precipitation</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {forecastData.weather_data.hourly.precipitation
                        ? (() => {
                            const precips = forecastData.weather_data.hourly.precipitation
                              .map(p => typeof p === 'number' ? p : (typeof p === 'string' ? parseFloat(p) : null))
                              .filter((p): p is number => p !== null && !isNaN(p))
                            return precips.length > 0 ? `${precips.reduce((sum, p) => sum + p, 0).toFixed(1)} mm` : '0 mm'
                          })()
                        : '0 mm'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Wind className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-700">Max Wind</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {forecastData.weather_data.hourly.windspeed_10m
                        ? (() => {
                            const winds = forecastData.weather_data.hourly.windspeed_10m
                              .map(w => typeof w === 'number' ? w : (typeof w === 'string' ? parseFloat(w) : null))
                              .filter((w): w is number => w !== null && !isNaN(w))
                            return winds.length > 0 ? `${Math.max(...winds).toFixed(1)} m/s` : 'N/A'
                          })()
                        : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Forecast by Day */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hourly Forecast (next {forecastData.forecast_hours}h)
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                    {Object.entries(groupForecastByDay(forecastData.weather_data.hourly)).map(([day, hours]: [string, any]) => (
                      <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Day Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 font-semibold text-sm">
                          {day}
                        </div>

                        {/* Hours in this day */}
                        <div className="divide-y divide-gray-100">
                          {hours.map(({ time, idx, hour }: any) => {
                            const hourlyData = forecastData.weather_data.hourly
                            if (!hourlyData) return null

                            const temp = hourlyData.temperature_2m?.[idx]
                            const precipitation = hourlyData.precipitation?.[idx]
                            const windSpeed = hourlyData.windspeed_10m?.[idx]
                            const weatherCode = hourlyData.weather_code?.[idx]
                            const humidity = hourlyData.relative_humidity_2m?.[idx]

                            // Convertir a número
                            const tempNum = typeof temp === 'number' ? temp : (typeof temp === 'string' ? parseFloat(temp) : null)
                            const precipNum = typeof precipitation === 'number' ? precipitation : (typeof precipitation === 'string' ? parseFloat(precipitation) : null)
                            const windNum = typeof windSpeed === 'number' ? windSpeed : (typeof windSpeed === 'string' ? parseFloat(windSpeed) : null)
                            const weatherCodeNum = typeof weatherCode === 'number' ? weatherCode : (typeof weatherCode === 'string' ? parseInt(weatherCode) : null)
                            const humidityNum = typeof humidity === 'number' ? humidity : (typeof humidity === 'string' ? parseFloat(humidity) : null)

                            const isNow = idx === 0

                            return (
                              <div
                                key={idx}
                                className={`px-4 py-3 hover:bg-gray-50 transition-colors ${isNow ? 'bg-blue-50' : 'bg-white'}`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  {/* Hour + Weather Icon */}
                                  <div className="flex items-center gap-3 flex-1 min-w-[140px]">
                                    {isNow && <Badge variant="default" className="text-xs">Now</Badge>}
                                    <span className="font-semibold text-gray-900 w-12">
                                      {hour.toString().padStart(2, '0')}:00
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {getWeatherIcon(weatherCodeNum)}
                                      <span className="text-xs text-gray-600 hidden sm:inline">
                                        {getWeatherDescription(weatherCodeNum)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Temperature */}
                                  <div className="text-center min-w-[60px]">
                                    <div className="text-lg font-bold text-gray-900">
                                      {tempNum !== null ? `${tempNum.toFixed(1)}°` : 'N/A'}
                                    </div>
                                  </div>

                                  {/* Weather Details */}
                                  <div className="flex items-center gap-4 text-xs text-gray-600">
                                    <div className="flex items-center gap-1 min-w-[70px]">
                                      <Droplets className="h-3 w-3 text-blue-500" />
                                      <span>{humidityNum !== null ? `${humidityNum.toFixed(0)}%` : 'N/A'}</span>
                                    </div>

                                    {precipNum !== null && precipNum > 0 && (
                                      <div className="flex items-center gap-1 min-w-[60px] text-blue-600 font-semibold">
                                        <CloudRain className="h-3 w-3" />
                                        <span>{precipNum.toFixed(1)} mm</span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-1 min-w-[60px]">
                                      <Wind className="h-3 w-3 text-gray-500" />
                                      <span>{windNum !== null ? `${windNum.toFixed(1)} m/s` : 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  No forecast data available
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>AQS Code: {station.FullAQSCode}</div>
            <div>Measurements: {station.measurements.length} parameters</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
