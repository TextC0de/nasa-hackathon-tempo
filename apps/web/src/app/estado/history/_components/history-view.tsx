"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Calendar as CalendarIcon, TrendingDown, TrendingUp, Minus, BarChart3, Clock, CalendarDays, CalendarRange, Circle, Menu, X, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format, differenceInDays, subDays, subYears } from "date-fns"
import { es } from "date-fns/locale"
import { HistoryChart } from "@/app/usuario/_components/history-chart"
import { FloatingAIChat } from "./floating-ai-chat"
import { HistoryLocationMap } from "./history-location-map"
import { trpc } from "@/lib/trpc"

interface HistoryViewProps {
  latitude?: number
  longitude?: number
}

type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly'

// Get AQI color
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return 'text-green-600 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
  if (aqi <= 100) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
  if (aqi <= 150) return 'text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
  if (aqi <= 200) return 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
  if (aqi <= 300) return 'text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'
  return 'text-brown-600 bg-brown-50 dark:bg-brown-950 border-brown-200 dark:border-brown-800'
}

// Get AQI category
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy (Sensitive)'
  if (aqi <= 200) return 'Unhealthy'
  if (aqi <= 300) return 'Very Unhealthy'
  return 'Hazardous'
}

export function HistoryView({
  latitude: initialLatitude = 36.7783,
  longitude: initialLongitude = -119.4179
}: HistoryViewProps) {
  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Location state
  const [latitude, setLatitude] = useState(initialLatitude)
  const [longitude, setLongitude] = useState(initialLongitude)
  const [radiusKm, setRadiusKm] = useState(50)

  // Filter state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [granularity, setGranularity] = useState<Granularity>('weekly')
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(undefined)
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(undefined)
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>('weekly')

  // Initialize dates with 1 year default
  useEffect(() => {
    const now = new Date()
    const oneYearAgo = subYears(now, 1)
    setStartDate(oneYearAgo)
    setEndDate(now)
    setAppliedStartDate(oneYearAgo)
    setAppliedEndDate(now)
    setGranularity('weekly')
    setAppliedGranularity('weekly')
  }, [])

  // Historical data
  const { data: historicalData, isLoading, error } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    startDate: appliedStartDate?.toISOString() ?? '',
    endDate: appliedEndDate?.toISOString() ?? '',
    granularity: appliedGranularity,
    radiusKm,
  }, {
    enabled: !!appliedStartDate && !!appliedEndDate,
  })

  // AI context
  const aiContext = useMemo(() => {
    if (!historicalData || !historicalData.data.length) return undefined
    const { data: dataPoints, stats, trend, granularity: gran } = historicalData
    return `HISTORICAL AIR QUALITY DATA:

Period: ${appliedStartDate ? format(appliedStartDate, 'PP') : ''} - ${appliedEndDate ? format(appliedEndDate, 'PP') : ''}
Granularity: ${gran}
Location: California (${latitude.toFixed(2)}, ${longitude.toFixed(2)})

GENERAL STATISTICS:
- Average AQI: ${stats?.avg.toFixed(1)}
- Minimum AQI: ${stats?.min}
- Maximum AQI: ${stats?.max}
- Total records: ${dataPoints.length}

TREND:
- Direction: ${trend?.direction === 'improving' ? 'Improving' : trend?.direction === 'worsening' ? 'Worsening' : 'Stable'}
- Percentage change: ${trend?.percentageChange.toFixed(1)}%
- Analysis: ${trend?.message}

POLLUTANTS:
${dataPoints.map((d, i) => {
  if (i % Math.ceil(dataPoints.length / 5) === 0) {
    return `- ${format(new Date(d.timestamp), 'PP')}: AQI=${d.aqi_avg.toFixed(0)}, O₃=${d.o3_avg?.toFixed(1) ?? 'N/A'} ppb, NO₂=${d.no2_avg?.toFixed(1) ?? 'N/A'} ppb, PM2.5=${d.pm25_avg?.toFixed(1) ?? 'N/A'} μg/m³`
  }
  return null
}).filter(Boolean).join('\n')}

COMPLETE DATA AVAILABLE: ${dataPoints.length} data points from ${format(new Date(dataPoints[0].timestamp), 'PP')} to ${format(new Date(dataPoints[dataPoints.length - 1].timestamp), 'PP')}`
  }, [historicalData, appliedStartDate, appliedEndDate, latitude, longitude])

  const daysDiff = useMemo(() => {
    if (!appliedStartDate || !appliedEndDate) return 0
    return differenceInDays(appliedEndDate, appliedStartDate)
  }, [appliedStartDate, appliedEndDate])

  const hasUnappliedChanges = useMemo(() => {
    if (!startDate || !endDate || !appliedStartDate || !appliedEndDate) return false
    return (
      startDate.getTime() !== appliedStartDate.getTime() ||
      endDate.getTime() !== appliedEndDate.getTime() ||
      granularity !== appliedGranularity
    )
  }, [startDate, endDate, granularity, appliedStartDate, appliedEndDate, appliedGranularity])

  const handleApplyFilters = () => {
    if (!startDate || !endDate) return
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setAppliedGranularity(granularity)
  }

  const handleResetFilters = () => {
    if (!appliedStartDate || !appliedEndDate) return
    setStartDate(appliedStartDate)
    setEndDate(appliedEndDate)
    setGranularity(appliedGranularity)
  }

  const handlePreset = (preset: '7d' | '30d' | '90d' | '1y') => {
    const end = new Date()
    let start: Date
    let suggestedGranularity: Granularity = 'daily'

    switch (preset) {
      case '7d':
        start = subDays(end, 7)
        suggestedGranularity = 'hourly'
        break
      case '30d':
        start = subDays(end, 30)
        suggestedGranularity = 'daily'
        break
      case '90d':
        start = subDays(end, 90)
        suggestedGranularity = 'daily'
        break
      case '1y':
        start = subYears(end, 1)
        suggestedGranularity = 'weekly'
        break
    }

    setStartDate(start)
    setEndDate(end)
    setGranularity(suggestedGranularity)
  }

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }

  const handleRadiusChange = (radius: number) => {
    setRadiusKm(radius)
  }

  const TrendIcon = historicalData?.trend?.direction === 'improving'
    ? TrendingDown
    : historicalData?.trend?.direction === 'worsening'
      ? TrendingUp
      : Minus

  const trendColor = historicalData?.trend?.direction === 'improving'
    ? 'text-green-600'
    : historicalData?.trend?.direction === 'worsening'
      ? 'text-red-600'
      : 'text-muted-foreground'

  return (
    <div className="h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40 shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <BarChart3 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Historical Analysis</h1>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Export</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[320px_1fr]">

          {/* Sidebar con Filtros */}
          <aside className={cn(
            "border-r bg-background overflow-y-auto",
            "fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform lg:relative lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4 space-y-4">
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  Analysis Period
                </h2>

                {/* Preset: Solo 1 año */}
                <div className="space-y-2">
                  <Button
                    variant="default"
                    onClick={() => handlePreset('1y')}
                    className="w-full h-auto py-2 px-3 justify-start"
                  >
                    <CalendarRange className="h-4 w-4 mr-3 shrink-0" />
                    <div className="text-left flex-1">
                      <div className="font-semibold text-sm">Last year</div>
                      <div className="text-[10px] opacity-70">365 days</div>
                    </div>
                  </Button>
                </div>

                {/* Or custom */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Label className="text-xs font-medium">Custom</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {startDate ? format(startDate, "dd/MM/yy") : "Start"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          disabled={(date) => (endDate && date > endDate) || date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-1.5 h-3 w-3" />
                          {endDate ? format(endDate, "dd/MM/yy") : "End"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          disabled={(date) => (startDate && date < startDate) || date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Group Data */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Group Data
                </h2>
                <ToggleGroup
                  type="single"
                  value={granularity}
                  onValueChange={(value) => value && setGranularity(value as Granularity)}
                  className="grid grid-cols-2 gap-2"
                >
                  <ToggleGroupItem value="hourly" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium">Hourly</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Max detail</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="daily" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="text-xs font-medium">Daily</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Recommended</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weekly" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3 w-3" />
                        <span className="text-xs font-medium">Weekly</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Trends</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-3 w-3" />
                        <span className="text-xs font-medium">Monthly</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Overview</span>
                    </div>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Search Radius */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Circle className="h-4 w-4 text-primary" />
                  Search Radius
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Urban', value: 25, desc: '25 km' },
                    { label: 'Regional', value: 50, desc: '50 km' },
                    { label: 'Wide', value: 100, desc: '100 km' },
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant={radiusKm === preset.value ? "default" : "outline"}
                      onClick={() => setRadiusKm(preset.value)}
                      className="h-auto py-2 px-2"
                    >
                      <div className="flex flex-col items-center gap-1 w-full">
                        <Circle className="h-3 w-3" />
                        <div className="text-xs font-semibold">{preset.label}</div>
                        <div className="text-[9px] opacity-70">{preset.desc}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Botón Aplicar */}
              <Button
                onClick={handleApplyFilters}
                disabled={!hasUnappliedChanges}
                className="w-full"
                size="lg"
              >
                {hasUnappliedChanges ? 'Apply Changes' : 'Filters Applied ✓'}
              </Button>
            </div>
          </aside>

          {/* Área de Contenido Principal */}
          <main className="overflow-y-auto bg-muted/5">
            <div className="p-4 space-y-4">

              {/* Mapa */}
              <HistoryLocationMap
                latitude={latitude}
                longitude={longitude}
                radiusKm={radiusKm}
                onLocationChange={handleLocationChange}
                onRadiusChange={handleRadiusChange}
              />

              {/* Loading State */}
              {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="border">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-destructive">Error loading data</h3>
                        <p className="text-xs text-muted-foreground">
                          Could not retrieve historical data. Please try again.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empty State */}
              {!isLoading && !error && historicalData && historicalData.data.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
                      <h3 className="text-sm font-semibold">No data available</h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        No historical data available for this location and period.
                        Try adjusting the dates or search radius.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards */}
              {!isLoading && !error && historicalData && historicalData.data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Average AQI */}
              <Card className={cn("border", getAQIColor(historicalData.stats?.avg ?? 0))}>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Average AQI</p>
                    <p className="text-2xl font-bold tabular-nums">
                      {Math.round(historicalData.stats?.avg ?? 0)}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {getAQICategory(historicalData.stats?.avg ?? 0)}
                      </Badge>
                      <div className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
                        <TrendIcon className="h-3 w-3" />
                        {historicalData.trend?.percentageChange.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Minimum AQI */}
              <Card className="border">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Best Day</p>
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {Math.round(historicalData.stats?.min ?? 0)}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                      {getAQICategory(historicalData.stats?.min ?? 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Maximum AQI */}
              <Card className="border">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Worst Day</p>
                    <p className="text-2xl font-bold tabular-nums text-red-600">
                      {Math.round(historicalData.stats?.max ?? 0)}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-red-50 text-red-700 border-red-200">
                      {getAQICategory(historicalData.stats?.max ?? 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {!isLoading && !error && appliedStartDate && appliedEndDate && historicalData && historicalData.data.length > 0 && (
            <HistoryChart
              latitude={latitude}
              longitude={longitude}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              granularity={appliedGranularity}
            />
          )}

          {/* Insights Grid */}
          {!isLoading && !error && historicalData && historicalData.data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {/* Trend */}
              {historicalData?.trend && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
                      <h3 className="text-xs font-semibold">Trend</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">{historicalData.trend.message}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Change</span>
                        <span className={cn("font-bold", trendColor)}>
                          {historicalData.trend.percentageChange > 0 ? '+' : ''}
                          {historicalData.trend.percentageChange.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Data</span>
                        <span className="font-semibold">{historicalData.data.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Period</span>
                        <span className="font-semibold">{daysDiff} days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sources */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100">Data Info</h3>
                  </div>
                  <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                    <div className="flex justify-between">
                      <span className="text-[10px]">Source:</span>
                      <span className="text-[10px] font-medium">EPA Stations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Coverage:</span>
                      <span className="text-[10px] font-medium">California</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Radius:</span>
                      <span className="text-[10px] font-medium">{radiusKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Update:</span>
                      <span className="text-[10px] font-medium">Daily</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

              </div>
            </main>

          </div>
        </div>

      {/* Floating AI Chat */}
      <FloatingAIChat context={aiContext} />
    </div>
  )
}
