"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Cloud,
  Activity,
  Loader2,
  Thermometer,
  Wind,
  Droplets
} from "lucide-react"
import { getAQIBadge } from "./utils"

interface MetricsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentLocation: { name: string }
  prediction: any
}

export function MetricsDialog({ open, onOpenChange, currentLocation, prediction }: MetricsDialogProps) {
  if (!prediction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl  w-full z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métricas Detalladas - {currentLocation.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AQI General */}
          {prediction.general && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calidad del Aire General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold">
                      {prediction.general.aqi}
                    </span>
                    <div>
                      <Badge className={`${getAQIBadge(prediction.general.aqi).color} text-white`}>
                        {getAQIBadge(prediction.general.aqi).label}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Parámetro dominante: {prediction.general.dominantParameter}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estación de Monitoreo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proveedor</p>
                  <p className="font-medium">{prediction.station.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Distancia</p>
                  <p className="font-medium">{prediction.station.distanceKm?.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Latitud</p>
                  <p className="font-medium">{prediction.station.latitude.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Longitud</p>
                  <p className="font-medium">{prediction.station.longitude.toFixed(4)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contaminantes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parámetros por Contaminante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* O3 */}
              {prediction.O3 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Ozono (O3)</h4>
                    <Badge className={getAQIBadge(prediction.O3.currentData.aqi).color}>
                      AQI: {prediction.O3.currentData.aqi}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-medium">{prediction.O3.currentData.value} {prediction.O3.currentData.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoría</p>
                      <p className="font-medium">{prediction.O3.currentData.category}</p>
                    </div>
                    {prediction.O3.tempo?.estimatedUserValue && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Estimación TEMPO</p>
                        <p className="font-medium">{prediction.O3.tempo.estimatedUserValue.toFixed(2)} {prediction.O3.currentData.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NO2 */}
              {prediction.NO2 && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Dióxido de Nitrógeno (NO2)</h4>
                    <Badge className={getAQIBadge(prediction.NO2.currentData.aqi).color}>
                      AQI: {prediction.NO2.currentData.aqi}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-medium">{prediction.NO2.currentData.value} {prediction.NO2.currentData.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoría</p>
                      <p className="font-medium">{prediction.NO2.currentData.category}</p>
                    </div>
                    {prediction.NO2.tempo?.estimatedUserValue && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Estimación TEMPO</p>
                        <p className="font-medium">{prediction.NO2.tempo.estimatedUserValue.toFixed(2)} {prediction.NO2.currentData.unit}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PM2.5 */}
              {prediction.PM25 && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Material Particulado (PM2.5)</h4>
                    <Badge className={getAQIBadge(prediction.PM25.currentData.aqi).color}>
                      AQI: {prediction.PM25.currentData.aqi}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Valor</p>
                      <p className="font-medium">{prediction.PM25.currentData.value} {prediction.PM25.currentData.unit}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Categoría</p>
                      <p className="font-medium">{prediction.PM25.currentData.category}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TEMPODialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tempoData: any
  tempoLoading: boolean
}

export function TEMPODialog({ open, onOpenChange, tempoData, tempoLoading }: TEMPODialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Datos TEMPO - Satélite NASA
          </DialogTitle>
        </DialogHeader>
        {tempoLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {tempoData && (
          <div className="space-y-4">
            {/* Info del satélite */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-sm">{tempoData.satellite} - {tempoData.data_source}</p>
                </div>
                <p className="text-xs text-muted-foreground">{tempoData.notes}</p>
                <div className="mt-2 text-xs">
                  <p className="text-muted-foreground">
                    Timestamp: {new Date(tempoData.timestamp).toLocaleString('es-ES')}
                  </p>
                  <p className="text-muted-foreground italic">{tempoData.timestamp_info}</p>
                </div>
              </CardContent>
            </Card>

            {/* NO2 */}
            {tempoData.data.NO2 && !('error' in tempoData.data.NO2) && 'description' in tempoData.data.NO2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Dióxido de Nitrógeno (NO2)</span>
                    <Badge variant="outline" className="text-xs">
                      {tempoData.data.NO2.nivel}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{tempoData.data.NO2.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                      <p className="font-medium text-sm">{tempoData.data.NO2.value_formatted}</p>
                      <p className="text-xs text-muted-foreground">{tempoData.data.NO2.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clasificación</p>
                      <p className="font-medium">{tempoData.data.NO2.nivel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* O3 */}
            {tempoData.data.O3 && !('error' in tempoData.data.O3) && 'description' in tempoData.data.O3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Ozono (O3)</span>
                    <Badge variant="outline" className="text-xs">
                      {tempoData.data.O3.nivel}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{tempoData.data.O3.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                      <p className="font-medium">{tempoData.data.O3.value?.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{tempoData.data.O3.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Clasificación</p>
                      <p className="font-medium">{tempoData.data.O3.nivel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* HCHO */}
            {tempoData.data.HCHO && !('error' in tempoData.data.HCHO) && 'description' in tempoData.data.HCHO && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Formaldehído (HCHO)</span>
                    <Badge variant="outline" className="text-xs">
                      {tempoData.data.HCHO.nivel}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{tempoData.data.HCHO.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor (columnar)</p>
                      <p className="font-medium text-sm">{tempoData.data.HCHO.value_formatted}</p>
                      <p className="text-xs text-muted-foreground">{tempoData.data.HCHO.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">En DU</p>
                      <p className="font-medium">{tempoData.data.HCHO.value_DU} DU</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Clasificación</p>
                      <p className="font-medium">{tempoData.data.HCHO.nivel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ubicación */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Latitud</p>
                    <p className="font-medium">{tempoData.location.latitude.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Longitud</p>
                    <p className="font-medium">{tempoData.location.longitude.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface WeatherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weatherData: any
  weatherLoading: boolean
  prediction: any
}

export function WeatherDialog({ open, onOpenChange, weatherData, weatherLoading, prediction }: WeatherDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Condiciones Meteorológicas Completas
          </DialogTitle>
        </DialogHeader>
        {weatherLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {weatherData && (
          <div className="space-y-4">
            {/* Condiciones actuales */}
            {prediction?.weather && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Condiciones Actuales</CardTitle>
                  <CardDescription>Datos en tiempo real de la estación más cercana</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Temperatura</p>
                        <p className="font-medium">{prediction.weather.temperature}°C</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Viento</p>
                        <p className="font-medium">{prediction.weather.windSpeed} m/s</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Humedad</p>
                        <p className="font-medium">{prediction.weather.relativeHumidity}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Precipitación</p>
                        <p className="font-medium">{prediction.weather.precipitation} mm</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info del pronóstico */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cloud className="h-4 w-4 text-blue-600" />
                  <p className="font-semibold text-sm">Pronóstico Extendido - OpenMeteo</p>
                </div>
                <div className="text-xs">
                  <p className="text-muted-foreground">
                    Ubicación: {weatherData.location.latitude.toFixed(4)}, {weatherData.location.longitude.toFixed(4)}
                  </p>
                  <p className="text-muted-foreground">
                    Días de pronóstico: {weatherData.forecast_days}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Datos meteorológicos detallados */}
            {weatherData.weather_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parámetros Meteorológicos Avanzados</CardTitle>
                  <CardDescription>Variables críticas para modelado de calidad del aire</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Velocidad del viento (10m)</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.wind_speed_10m?.[0] ?? 'N/A'} km/h
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dirección del viento (10m)</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.wind_direction_10m?.[0] ?? 'N/A'}°
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Altura capa límite</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.boundary_layer_height?.[0] ?? 'N/A'} m
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Crítico para conversión columna-superficie
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Temperatura (2m)</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.temperature_2m?.[0] ?? 'N/A'}°C
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Precipitación</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.precipitation?.[0] ?? 'N/A'} mm
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        Washout de contaminantes
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Humedad relativa (2m)</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.relative_humidity_2m?.[0] ?? 'N/A'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Presión superficial</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.surface_pressure?.[0] ?? 'N/A'} hPa
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cobertura de nubes</p>
                      <p className="font-medium">
                        {weatherData.weather_data.hourly?.cloud_cover?.[0] ?? 'N/A'}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface PollutantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prediction: any
}

export function PollutantsDialog({ open, onOpenChange, prediction }: PollutantsDialogProps) {
  if (!prediction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl z-[10001] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Análisis de Contaminantes AirNow
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* O3 */}
          {prediction.O3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Ozono (O3)</span>
                  <Badge className={getAQIBadge(prediction.O3.currentData.aqi).color}>
                    AQI: {prediction.O3.currentData.aqi}
                  </Badge>
                </CardTitle>
                <CardDescription>{prediction.O3.currentData.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Concentración</p>
                    <p className="font-medium">{prediction.O3.currentData.value} {prediction.O3.currentData.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estación</p>
                    <p className="font-medium text-sm">{prediction.O3.currentData.siteName}</p>
                  </div>
                </div>
                {prediction.O3.tempo && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-semibold mb-2">Datos TEMPO (Satélite)</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">En estación</p>
                        <p className="font-medium">{prediction.O3.tempo.station?.toFixed(2)} DU</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">En tu ubicación</p>
                        <p className="font-medium">{prediction.O3.tempo.user?.toFixed(2)} DU</p>
                      </div>
                      {prediction.O3.tempo.estimatedUserValue && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Estimación para tu ubicación</p>
                          <p className="font-medium text-base">{prediction.O3.tempo.estimatedUserValue.toFixed(2)} {prediction.O3.currentData.unit}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* NO2 */}
          {prediction.NO2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Dióxido de Nitrógeno (NO2)</span>
                  <Badge className={getAQIBadge(prediction.NO2.currentData.aqi).color}>
                    AQI: {prediction.NO2.currentData.aqi}
                  </Badge>
                </CardTitle>
                <CardDescription>{prediction.NO2.currentData.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Concentración</p>
                    <p className="font-medium">{prediction.NO2.currentData.value} {prediction.NO2.currentData.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estación</p>
                    <p className="font-medium text-sm">{prediction.NO2.currentData.siteName}</p>
                  </div>
                </div>
                {prediction.NO2.tempo && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-semibold mb-2">Datos TEMPO (Satélite)</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">En estación</p>
                        <p className="font-medium">{prediction.NO2.tempo.station?.toExponential(2)} molec/cm²</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">En tu ubicación</p>
                        <p className="font-medium">{prediction.NO2.tempo.user?.toExponential(2)} molec/cm²</p>
                      </div>
                      {prediction.NO2.tempo.estimatedUserValue && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Estimación para tu ubicación</p>
                          <p className="font-medium text-base">{prediction.NO2.tempo.estimatedUserValue.toFixed(2)} {prediction.NO2.currentData.unit}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PM2.5 */}
          {prediction.PM25 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Material Particulado (PM2.5)</span>
                  <Badge className={getAQIBadge(prediction.PM25.currentData.aqi).color}>
                    AQI: {prediction.PM25.currentData.aqi}
                  </Badge>
                </CardTitle>
                <CardDescription>{prediction.PM25.currentData.category}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Concentración</p>
                    <p className="font-medium">{prediction.PM25.currentData.value} {prediction.PM25.currentData.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estación</p>
                    <p className="font-medium text-sm">{prediction.PM25.currentData.siteName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
