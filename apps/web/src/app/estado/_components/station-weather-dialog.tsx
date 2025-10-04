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
  Eye
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
 * Dialog profesional que muestra información completa de una estación:
 * - Calidad del aire (todos los parámetros)
 * - Clima en tiempo real
 */
export function StationWeatherDialog({
  station,
  open,
  onOpenChange,
  getAQIColor,
  getAQICategory
}: StationWeatherDialogProps) {
  const [activeTab, setActiveTab] = useState<"air" | "weather" | "forecast">("air")

  // Query de clima actual (solo se ejecuta si la estación está seleccionada)
  const { data: climaData, isLoading: climaLoading } = trpc.obtenerClimaActual.useQuery(
    {
      latitud: station?.Latitude ?? 0,
      longitud: station?.Longitude ?? 0
    },
    {
      enabled: !!station && open, // Solo fetch cuando hay estación y dialog está abierto
      staleTime: 5 * 60 * 1000, // Cache 5 minutos
    }
  )

  // Query de pronóstico (48 horas futuras)
  const { data: forecastData, isLoading: forecastLoading } = trpc.obtenerPrediccionMeteorologica.useQuery(
    {
      latitud: station?.Latitude ?? 0,
      longitud: station?.Longitude ?? 0,
      horasPronostico: 48 // T+48h desde ahora
    },
    {
      enabled: !!station && open, // Solo fetch cuando hay estación y dialog está abierto
      staleTime: 15 * 60 * 1000, // Cache 15 minutos (pronóstico cambia menos frecuentemente)
    }
  )

  if (!station) return null

  const worstAqiColor = getAQIColor(station.worstAQI)
  const worstAqiCategory = getAQICategory(station.worstAQI)

  // Formatear timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('es-ES', {
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

  // Obtener descripción del clima según código
  const getWeatherDescription = (code: number | null): string => {
    if (code === null) return 'Desconocido'

    const weatherCodes: Record<number, string> = {
      0: 'Despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla con escarcha',
      51: 'Llovizna ligera',
      53: 'Llovizna moderada',
      55: 'Llovizna densa',
      61: 'Lluvia ligera',
      63: 'Lluvia moderada',
      65: 'Lluvia fuerte',
      71: 'Nieve ligera',
      73: 'Nieve moderada',
      75: 'Nieve fuerte',
      80: 'Chubascos ligeros',
      81: 'Chubascos moderados',
      82: 'Chubascos violentos',
      95: 'Tormenta',
      96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo fuerte'
    }

    return weatherCodes[code] ?? 'Desconocido'
  }

  // Obtener dirección del viento
  const getWindDirection = (degrees: number | null): string => {
    if (degrees === null) return 'N/A'

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(((degrees % 360) / 45)) % 8
    return directions[index]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[10001]">
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

              {/* Worst AQI Badge */}
              <div className="text-center">
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: worstAqiColor }}
                >
                  {station.worstAQI > 0 ? station.worstAQI : 'N/A'}
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
                backgroundColor: `${worstAqiColor}15`,
                borderLeft: `4px solid ${worstAqiColor}`
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Estado General</div>
                  <div className="font-semibold" style={{ color: worstAqiColor }}>
                    {worstAqiCategory.emoji} {worstAqiCategory.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-1">Peor Parámetro</div>
                  <div className="font-semibold text-gray-900">{station.worstParameter}</div>
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
              Calidad del Aire
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Clima Actual
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pronóstico 48h
            </TabsTrigger>
          </TabsList>

          {/* Tab: Calidad del Aire */}
          <TabsContent value="air" className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Parámetros Monitoreados ({station.measurements.length})
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="py-3 px-3 text-left font-semibold text-gray-700">Parámetro</th>
                      <th className="py-3 px-3 text-center font-semibold text-gray-700">AQI</th>
                      <th className="py-3 px-3 text-left font-semibold text-gray-700">Categoría</th>
                      <th className="py-3 px-3 text-right font-semibold text-gray-700">Valor</th>
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
                              {isValid ? category : 'Sin datos'}
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

          {/* Tab: Clima Actual */}
          <TabsContent value="weather" className="space-y-4">
            {climaLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando datos de clima...</p>
                </div>
              </div>
            ) : climaData?.current ? (
              <div className="space-y-4">
                {/* Weather Cards Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Temperatura */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-5 w-5 text-orange-600" />
                      <span className="text-xs font-semibold text-gray-700">Temperatura</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.temperature !== null
                        ? `${climaData.current.temperature.toFixed(1)}°C`
                        : 'N/A'}
                    </div>
                    {climaData.current.apparentTemperature !== null && (
                      <div className="text-xs text-gray-600 mt-1">
                        Sensación: {climaData.current.apparentTemperature.toFixed(1)}°C
                      </div>
                    )}
                  </div>

                  {/* Viento */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="h-5 w-5 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700">Viento</span>
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

                  {/* Humedad */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="h-5 w-5 text-teal-600" />
                      <span className="text-xs font-semibold text-gray-700">Humedad</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.humidity !== null
                        ? `${climaData.current.humidity}%`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Relativa
                    </div>
                  </div>

                  {/* Presión */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="h-5 w-5 text-purple-600" />
                      <span className="text-xs font-semibold text-gray-700">Presión</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {climaData.current.pressure !== null
                        ? `${climaData.current.pressure.toFixed(0)} hPa`
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Superficie
                    </div>
                  </div>
                </div>

                {/* Additional Weather Info */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Clima:
                      </span>
                      <span className="font-medium">
                        {getWeatherDescription(climaData.current.weatherCode)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Cloud className="h-4 w-4" />
                        Nubes:
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
                        Precipitación:
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
                          Ráfagas:
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
                  Datos meteorológicos de {formatTimestamp(climaData.current.timestamp)}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  No hay datos de clima disponibles
                </p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Pronóstico */}
          <TabsContent value="forecast" className="space-y-4">
            {forecastLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando pronóstico...</p>
                </div>
              </div>
            ) : forecastData?.weather_data?.hourly ? (
              <div className="space-y-4">
                {/* Forecast Timeline */}
                <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pronóstico por Hora (próximas {forecastData.forecast_hours}h)
                </div>

                {/* Scrollable hourly forecast */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {forecastData.weather_data.hourly.time?.map((time, idx) => {
                    const hourlyData = forecastData.weather_data.hourly
                    if (!hourlyData) return null

                    const temp = hourlyData.temperature_2m?.[idx]
                    const precipitation = hourlyData.precipitation?.[idx]
                    const windSpeed = hourlyData.windspeed_10m?.[idx]
                    const weatherCode = hourlyData.weather_code?.[idx]
                    const humidity = hourlyData.relative_humidity_2m?.[idx]
                    const cloudCover = hourlyData.cloud_cover?.[idx]

                    // Convertir a número si es necesario
                    const tempNum = typeof temp === 'number' ? temp : (typeof temp === 'string' ? parseFloat(temp) : null)
                    const precipNum = typeof precipitation === 'number' ? precipitation : (typeof precipitation === 'string' ? parseFloat(precipitation) : null)
                    const windNum = typeof windSpeed === 'number' ? windSpeed : (typeof windSpeed === 'string' ? parseFloat(windSpeed) : null)
                    const weatherCodeNum = typeof weatherCode === 'number' ? weatherCode : (typeof weatherCode === 'string' ? parseInt(weatherCode) : null)
                    const humidityNum = typeof humidity === 'number' ? humidity : (typeof humidity === 'string' ? parseFloat(humidity) : null)
                    const cloudNum = typeof cloudCover === 'number' ? cloudCover : (typeof cloudCover === 'string' ? parseFloat(cloudCover) : null)

                    const forecastDate = new Date(time)
                    const isNow = idx === 0

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${isNow ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Time */}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                              {isNow && <Badge variant="default" className="text-xs">Ahora</Badge>}
                              {forecastDate.toLocaleString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              {getWeatherDescription(weatherCodeNum)}
                            </div>
                          </div>

                          {/* Temperature */}
                          <div className="text-center mx-4">
                            <div className="text-2xl font-bold text-gray-900">
                              {tempNum !== null ? `${tempNum.toFixed(1)}°` : 'N/A'}
                            </div>
                            {humidityNum !== null && (
                              <div className="text-xs text-gray-600">
                                {humidityNum.toFixed(0)}% hum.
                              </div>
                            )}
                          </div>

                          {/* Weather details */}
                          <div className="flex flex-col items-end gap-1">
                            {precipNum !== null && precipNum > 0 && (
                              <div className="flex items-center gap-1 text-xs text-blue-600">
                                <Droplets className="h-3 w-3" />
                                {precipNum.toFixed(1)} mm
                              </div>
                            )}
                            {windNum !== null && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Wind className="h-3 w-3" />
                                {windNum.toFixed(1)} m/s
                              </div>
                            )}
                            {cloudNum !== null && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Cloud className="h-3 w-3" />
                                {cloudNum.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary stats */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Resumen del Pronóstico</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Temp. Máxima:</span>
                      <span className="font-semibold ml-2">
                        {forecastData.weather_data.hourly.temperature_2m
                          ? (() => {
                              const temps = forecastData.weather_data.hourly.temperature_2m
                                .map(t => typeof t === 'number' ? t : (typeof t === 'string' ? parseFloat(t) : null))
                                .filter((t): t is number => t !== null && !isNaN(t))
                              return temps.length > 0 ? `${Math.max(...temps).toFixed(1)}°C` : 'N/A'
                            })()
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Temp. Mínima:</span>
                      <span className="font-semibold ml-2">
                        {forecastData.weather_data.hourly.temperature_2m
                          ? (() => {
                              const temps = forecastData.weather_data.hourly.temperature_2m
                                .map(t => typeof t === 'number' ? t : (typeof t === 'string' ? parseFloat(t) : null))
                                .filter((t): t is number => t !== null && !isNaN(t))
                              return temps.length > 0 ? `${Math.min(...temps).toFixed(1)}°C` : 'N/A'
                            })()
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Precipitación Total:</span>
                      <span className="font-semibold ml-2">
                        {forecastData.weather_data.hourly.precipitation
                          ? (() => {
                              const precips = forecastData.weather_data.hourly.precipitation
                                .map(p => typeof p === 'number' ? p : (typeof p === 'string' ? parseFloat(p) : null))
                                .filter((p): p is number => p !== null && !isNaN(p))
                              return precips.length > 0 ? `${precips.reduce((sum, p) => sum + p, 0).toFixed(1)} mm` : 'N/A'
                            })()
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Viento Máx.:</span>
                      <span className="font-semibold ml-2">
                        {forecastData.weather_data.hourly.windspeed_10m
                          ? (() => {
                              const winds = forecastData.weather_data.hourly.windspeed_10m
                                .map(w => typeof w === 'number' ? w : (typeof w === 'string' ? parseFloat(w) : null))
                                .filter((w): w is number => w !== null && !isNaN(w))
                              return winds.length > 0 ? `${Math.max(...winds).toFixed(1)} m/s` : 'N/A'
                            })()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  No hay datos de pronóstico disponibles
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Código AQS: {station.FullAQSCode}</div>
            <div>Mediciones: {station.measurements.length} parámetros</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
