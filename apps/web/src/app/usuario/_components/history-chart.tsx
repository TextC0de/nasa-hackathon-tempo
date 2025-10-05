"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingDown, TrendingUp, Minus, Calendar, Clock } from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, PieChart, Pie, Cell } from "recharts"
import { format, getWeek } from "date-fns"
import { enUS } from "date-fns/locale"

// Function to format date based on granularity
function formatDateByGranularity(timestamp: string, granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()

  switch (granularity) {
    case 'monthly':
      // Month: "Jan 2024", "Feb 2024"
      return format(date, "MMM yyyy", { locale: enUS })

    case 'weekly':
      // Week: "Wk 1 '24", "Wk 2 '24"
      const weekNum = getWeek(date, { locale: enUS })
      return `Wk ${weekNum} '${year.toString().slice(-2)}`

    case 'daily':
      // Day: "Jan 1" or "Jan 1 '24" if year changes
      return format(date, "d MMM", { locale: enUS })

    case 'hourly':
      // Hour: "Jan 1 2:00 PM"
      return format(date, "d MMM HH:mm", { locale: enUS })

    default:
      return format(date, "d MMM", { locale: enUS })
  }
}

// Function to get color based on AQI
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#10b981'        // Green - Good
  if (aqi <= 100) return '#f59e0b'       // Yellow - Moderate
  if (aqi <= 150) return '#f97316'       // Orange - Unhealthy for Sensitive
  if (aqi <= 200) return '#ef4444'       // Red - Unhealthy
  if (aqi <= 300) return '#8b5cf6'       // Purple - Very Unhealthy
  return '#7c2d12'                        // Brown - Hazardous
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

// Custom tooltip for the chart
function CustomTooltip({ active, payload, granularity }: any) {
  if (!active || !payload || !payload[0]) return null

  const data = payload[0].payload
  const aqi = data.aqi_avg
  const color = getAQIColor(aqi)

  // Format date for tooltip with more detail
  const formattedDate = (() => {
    const date = new Date(data.timestamp)
    switch (granularity) {
      case 'monthly':
        return format(date, "MMMM yyyy", { locale: enUS })
      case 'weekly':
        const weekNum = getWeek(date, { locale: enUS })
        return `Week ${weekNum} of ${date.getFullYear()}`
      case 'daily':
        return format(date, "EEEE, MMMM d, yyyy", { locale: enUS })
      case 'hourly':
        return format(date, "EEEE, MMMM d, yyyy - HH:mm", { locale: enUS })
      default:
        return format(date, "EEEE, MMMM d, yyyy", { locale: enUS })
    }
  })()

  return (
    <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3">
      <p className="text-xs text-muted-foreground mb-2">
        {formattedDate}
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
          Range: {data.aqi_min} - {data.aqi_max}
        </p>
      )}
      {data.dominant_pollutant && (
        <p className="text-xs text-muted-foreground mt-1">
          Pollutant: {data.dominant_pollutant}
        </p>
      )}
    </div>
  )
}

interface HistoryChartProps {
  latitude: number
  longitude: number
  startDate: Date
  endDate: Date
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
  radiusKm?: number
  className?: string
}

export function HistoryChart({
  latitude,
  longitude,
  startDate,
  endDate,
  granularity,
  radiusKm = 50,
  className
}: HistoryChartProps) {
  const { data, isLoading, error } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    granularity,
    radiusKm,
  })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Air Quality History
          </CardTitle>
          <CardDescription>
            {format(startDate, 'PP', { locale: enUS })} - {format(endDate, 'PP', { locale: enUS })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
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
            Air Quality History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-destructive">Error loading history</p>
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
            Air Quality History
          </CardTitle>
          <CardDescription>
            {format(startDate, 'PP', { locale: enUS })} - {format(endDate, 'PP', { locale: enUS })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No historical data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try increasing the search radius or changing the date range
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
    o3_avg: d.o3_avg,
    no2_avg: d.no2_avg,
    pm25_avg: d.pm25_avg,
    dominant_pollutant: d.dominant_pollutant,
    hour: data.granularity === 'hourly' ? new Date(d.timestamp).getHours() : undefined
  }))

  // Calcular porcentaje de contribución por contaminante
  const pollutantStats = chartData.reduce((acc, point) => {
    if (point.o3_avg) acc.o3_total += point.o3_avg
    if (point.no2_avg) acc.no2_total += point.no2_avg
    if (point.pm25_avg) acc.pm25_total += point.pm25_avg
    return acc
  }, { o3_total: 0, no2_total: 0, pm25_total: 0 })

  const totalPollution = pollutantStats.o3_total + pollutantStats.no2_total + pollutantStats.pm25_total
  const pollutantPercentages = totalPollution > 0 ? {
    o3: (pollutantStats.o3_total / totalPollution) * 100,
    no2: (pollutantStats.no2_total / totalPollution) * 100,
    pm25: (pollutantStats.pm25_total / totalPollution) * 100,
  } : { o3: 0, no2: 0, pm25: 0 }

  // Determine trend icon
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

  const granularityLabels = {
    hourly: 'Hourly data',
    daily: 'Daily data',
    weekly: 'Weekly data',
    monthly: 'Monthly data'
  }

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
              Air Quality History
            </CardTitle>
            <CardDescription>
              {granularityLabels[data.granularity]} • {format(startDate, 'd MMM yyyy', { locale: enUS })} - {format(endDate, 'd MMM yyyy', { locale: enUS })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* General statistics */}
        {data.stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.avg) }}>
                {Math.round(data.stats.avg)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Minimum</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.min) }}>
                {Math.round(data.stats.min)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Maximum</p>
              <p className="text-2xl font-bold" style={{ color: getAQIColor(data.stats.max) }}>
                {Math.round(data.stats.max)}
              </p>
            </div>
          </div>
        )}

        {/* Trend indicator */}
        {data.trend && (
          <div className={`${trendBgColor} rounded-lg p-3 border`}>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${trendColor}`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${trendColor}`}>
                  {data.trend.direction === 'improving' && '📉 Improving'}
                  {data.trend.direction === 'worsening' && '📈 Worsening'}
                  {data.trend.direction === 'stable' && '➡️ Stable'}
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart Principal - AQI */}
          <div className="lg:col-span-2 h-64 sm:h-80">
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
                  tickFormatter={(value) => formatDateByGranularity(value, data.granularity)}
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  className="text-xs"
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'AQI', angle: -90, position: 'insideLeft', className: 'text-xs fill-muted-foreground' }}
                />
                <Tooltip content={<CustomTooltip granularity={data.granularity} />} />

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

          {/* Pie Chart - Pollutant Contribution */}
          <div className="h-64 sm:h-80 flex flex-col">
            <h4 className="text-sm font-semibold mb-2">Pollutant Contribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'O₃ (Ozono)', value: pollutantPercentages.o3, color: '#3b82f6' },
                    { name: 'NO₂ (Dióxido de Nitrógeno)', value: pollutantPercentages.no2, color: '#ef4444' },
                    { name: 'PM2.5 (Partículas)', value: pollutantPercentages.pm25, color: '#8b5cf6' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name?.split(' ')[0] || ''} ${((percent as number) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Individual Pollutants Chart */}
        <div className="h-64 sm:h-80 mt-4">
          <h4 className="text-sm font-semibold mb-2">Trends by Pollutant (ppb / μg/m³)</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatDateByGranularity(value, data.granularity)}
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                label={{ value: 'Concentration', angle: -90, position: 'insideLeft', className: 'text-xs fill-muted-foreground' }}
              />
              <Tooltip content={<CustomTooltip granularity={data.granularity} />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="o3_avg"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="O₃ (Ozono)"
              />
              <Line
                type="monotone"
                dataKey="no2_avg"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="NO₂"
              />
              <Line
                type="monotone"
                dataKey="pm25_avg"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="PM2.5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* AQI categories legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span className="text-xs text-muted-foreground">Good (0-50)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
            <span className="text-xs text-muted-foreground">Moderate (51-100)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f97316' }} />
            <span className="text-xs text-muted-foreground">Sensitive (101-150)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-xs text-muted-foreground">Unhealthy (151-200)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            <span className="text-xs text-muted-foreground">Very Unhealthy (201-300)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7c2d12' }} />
            <span className="text-xs text-muted-foreground">Hazardous (301+)</span>
          </div>
        </div>

        {/* Informative note */}
        <div className="text-xs text-muted-foreground italic pt-2 border-t">
          💡 Aggregated data from EPA stations within a {radiusKm} km radius
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for mobile
export function HistoryChartCompact({ latitude, longitude, className }: HistoryChartProps) {
  const [days, setDays] = useState(7)

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    }
  }, [days])

  const { data, isLoading } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    startDate,
    endDate,
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
          <span className="text-sm font-medium">Last {days} days</span>
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

      {/* Trend */}
      <div className="flex items-center gap-2 mb-3">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-xs font-medium ${trendColor}`}>
          {data.trend.percentageChange > 0 ? '+' : ''}
          {data.trend.percentageChange.toFixed(1)}% in the period
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
          <p className="text-xs text-muted-foreground">Avg</p>
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
