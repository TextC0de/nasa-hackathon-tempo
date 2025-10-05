"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingDown, TrendingUp, Minus, Calendar, Clock } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts"
import { useState } from "react"

// Función para obtener color basado en AQI
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#10b981'        // Verde - Bueno
  if (aqi <= 100) return '#f59e0b'       // Amarillo - Moderado
  if (aqi <= 150) return '#f97316'       // Naranja - Insalubre para sensibles
  if (aqi <= 200) return '#ef4444'       // Rojo - Insalubre
  if (aqi <= 300) return '#8b5cf6'       // Púrpura - Muy insalubre
  return '#7c2d12'                        // Marrón - Peligroso
}

// Función para obtener categoría AQI
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Bueno'
  if (aqi <= 100) return 'Moderado'
  if (aqi <= 150) return 'Insalubre para Sensibles'
  if (aqi <= 200) return 'Insalubre'
  if (aqi <= 300) return 'Muy Insalubre'
  return 'Peligroso'
}

// Tooltip personalizado para el chart
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload[0]) return null

  const data = payload[0].payload
  const aqi = data.aqi_avg
  const color = getAQIColor(aqi)

  return (
    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(data.timestamp).toLocaleDateString('es-ES', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: data.hour !== undefined ? '2-digit' : undefined,
          minute: data.hour !== undefined ? '2-digit' : undefined
        })}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {aqi}
        </span>
        <Badge style={{ backgroundColor: color }} className="text-white text-xs">
          {getAQICategory(aqi)}
        </Badge>
      </div>
      {data.aqi_min !== undefined && data.aqi_max !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">
          Rango: {data.aqi_min} - {data.aqi_max}
        </p>
      )}
      {data.dominant_pollutant && (
        <p className="text-xs text-muted-foreground mt-1">
          Contaminante: {data.dominant_pollutant}
        </p>
      )}
    </div>
  )
}

interface HistoryChartProps {
  latitude: number
  longitude: number
  className?: string
}

export function HistoryChart({ latitude, longitude, className }: HistoryChartProps) {
  const [days, setDays] = useState(7)
  const [radiusKm, setRadiusKm] = useState(50)

  const { data, isLoading, error } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    days,
    radiusKm,
  })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Calidad del Aire
          </CardTitle>
          <CardDescription>Últimos {days} días</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Cargando histórico...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Calidad del Aire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-destructive">Error al cargar histórico</p>
            <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Calidad del Aire
          </CardTitle>
          <CardDescription>Últimos {days} días</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No hay datos históricos disponibles</p>
            <p className="text-xs text-muted-foreground mt-1">
              Intenta aumentar el radio de búsqueda
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Procesar datos para el chart
  const chartData = data.data.map(d => ({
    timestamp: d.timestamp,
    aqi_avg: Math.round(d.aqi_avg),
    aqi_min: d.aqi_min ? Math.round(d.aqi_min) : undefined,
    aqi_max: d.aqi_max ? Math.round(d.aqi_max) : undefined,
    dominant_pollutant: d.dominant_pollutant,
    hour: data.granularity === 'hourly' ? new Date(d.timestamp).getHours() : undefined
  }))

  // Determinar icono de tendencia
  const TrendIcon = data.trend?.direction === 'improving'
    ? TrendingDown
    : data.trend?.direction === 'worsening'
      ? TrendingUp
      : Minus

  const trendColor = data.trend?.direction === 'improving'
    ? 'text-green-600'
    : data.trend?.direction === 'worsening'
      ? 'text-red-600'
      : 'text-yellow-600'

  const trendBgColor = data.trend?.direction === 'improving'
    ? 'bg-green-50 dark:bg-green-950'
    : data.trend?.direction === 'worsening'
      ? 'bg-red-50 dark:bg-red-950'
      : 'bg-yellow-50 dark:bg-yellow-950'

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {data.granularity === 'hourly' ? (
                <Clock className="h-5 w-5" />
              ) : (
                <Calendar className="h-5 w-5" />
              )}
              Histórico de Calidad del Aire
            </CardTitle>
            <CardDescription>
              {data.granularity === 'hourly' ? 'Datos por hora' : 'Datos diarios'} - Últimos {days} días
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={days === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(7)}
            >
              7d
            </Button>
            <Button
              variant={days === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(30)}
            >
              30d
            </Button>
            <Button
              variant={days === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(90)}
            >
              90d
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estadísticas generales */}
        {data.stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Promedio</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.avg) }}>
                {Math.round(data.stats.avg)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mínimo</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.min) }}>
                {Math.round(data.stats.min)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Máximo</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.max) }}>
                {Math.round(data.stats.max)}
              </p>
            </div>
          </div>
        )}

        {/* Indicador de tendencia */}
        {data.trend && (
          <div className={`${trendBgColor} rounded-lg p-3 border`}>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${trendColor}`}>
                  {data.trend.direction === 'improving' && '📉 Mejorando'}
                  {data.trend.direction === 'worsening' && '📈 Empeorando'}
                  {data.trend.direction === 'stable' && '➡️ Estable'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {data.trend.message}
                </p>
              </div>
              <Badge variant="outline" className={trendColor}>
                {data.trend.percentageChange > 0 ? '+' : ''}
                {data.trend.percentageChange.toFixed(1)}%
              </Badge>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={getAQIColor(data.stats?.avg ?? 50)} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={getAQIColor(data.stats?.avg ?? 50)} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => {
                  const date = new Date(value)
                  if (data.granularity === 'hourly') {
                    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                  }
                  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                }}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'AQI', angle: -90, position: 'insideLeft', className: 'text-xs fill-muted-foreground' }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Líneas de referencia para categorías AQI */}
              <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={150} stroke="#f97316" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />

              <Area
                type="monotone"
                dataKey="aqi_avg"
                stroke={getAQIColor(data.stats?.avg ?? 50)}
                strokeWidth={2}
                fill="url(#aqiGradient)"
                dot={false}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda de categorías AQI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span className="text-xs text-muted-foreground">Bueno (0-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-xs text-muted-foreground">Moderado (51-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span className="text-xs text-muted-foreground">Sensibles (101-150)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-xs text-muted-foreground">Insalubre (151-200)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            <span className="text-xs text-muted-foreground">Muy Insalubre (201-300)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7c2d12' }} />
            <span className="text-xs text-muted-foreground">Peligroso (301+)</span>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="text-xs text-muted-foreground italic pt-2 border-t">
          💡 Datos agregados de estaciones EPA en un radio de {radiusKm} km
        </div>
      </CardContent>
    </Card>
  )
}

// Versión compacta para mobile
export function HistoryChartCompact({ latitude, longitude, className }: HistoryChartProps) {
  const [days, setDays] = useState(7)

  const { data, isLoading } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    days,
    radiusKm: 50,
  })

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center h-32`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.data.length === 0 || !data.stats || !data.trend) {
    return null
  }

  const chartData = data.data.map(d => ({
    timestamp: d.timestamp,
    aqi_avg: Math.round(d.aqi_avg),
  }))

  const TrendIcon = data.trend.direction === 'improving'
    ? TrendingDown
    : data.trend.direction === 'worsening'
      ? TrendingUp
      : Minus

  const trendColor = data.trend.direction === 'improving'
    ? 'text-green-600'
    : data.trend.direction === 'worsening'
      ? 'text-red-600'
      : 'text-yellow-600'

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Últimos {days} días</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant={days === 7 ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDays(7)}
          >
            7d
          </Button>
          <Button
            variant={days === 30 ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setDays(30)}
          >
            30d
          </Button>
        </div>
      </div>

      {/* Tendencia */}
      <div className="flex items-center gap-2 mb-3">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-xs font-medium ${trendColor}`}>
          {data.trend.percentageChange > 0 ? '+' : ''}
          {data.trend.percentageChange.toFixed(1)}% en el período
        </span>
      </div>

      {/* Mini chart */}
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
            <Line
              type="monotone"
              dataKey="aqi_avg"
              stroke={getAQIColor(data.stats.avg)}
              strokeWidth={2}
              dot={false}
            />
            <YAxis hide />
            <XAxis hide dataKey="timestamp" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Prom</p>
          <p className="text-sm font-bold" style={{ color: getAQIColor(data.stats.avg) }}>
            {Math.round(data.stats.avg)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-sm font-bold" style={{ color: getAQIColor(data.stats.min) }}>
            {Math.round(data.stats.min)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-sm font-bold" style={{ color: getAQIColor(data.stats.max) }}>
            {Math.round(data.stats.max)}
          </p>
        </div>
      </div>
    </div>
  )
}
