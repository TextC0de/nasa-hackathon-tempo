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

// Obtener color de AQI
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return 'text-green-600 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
  if (aqi <= 100) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
  if (aqi <= 150) return 'text-orange-600 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
  if (aqi <= 200) return 'text-red-600 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
  if (aqi <= 300) return 'text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'
  return 'text-brown-600 bg-brown-50 dark:bg-brown-950 border-brown-200 dark:border-brown-800'
}

// Obtener categoría de AQI
function getAQICategory(aqi: number): string {
  if (aqi <= 50) return 'Bueno'
  if (aqi <= 100) return 'Moderado'
  if (aqi <= 150) return 'Insalubre (Sensibles)'
  if (aqi <= 200) return 'Insalubre'
  if (aqi <= 300) return 'Muy Insalubre'
  return 'Peligroso'
}

export function HistoryView({
  latitude: initialLatitude = 36.7783,
  longitude: initialLongitude = -119.4179
}: HistoryViewProps) {
  // Estado de UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Estado de ubicación
  const [latitude, setLatitude] = useState(initialLatitude)
  const [longitude, setLongitude] = useState(initialLongitude)
  const [radiusKm, setRadiusKm] = useState(50)

  // Estado de filtros
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(undefined)
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(undefined)
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>('daily')

  // Inicializar fechas
  useEffect(() => {
    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    setStartDate(thirtyDaysAgo)
    setEndDate(now)
    setAppliedStartDate(thirtyDaysAgo)
    setAppliedEndDate(now)
  }, [])

  // Datos históricos
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

  // Contexto AI
  const aiContext = useMemo(() => {
    if (!historicalData || !historicalData.data.length) return undefined
    const { data: dataPoints, stats, trend, granularity: gran } = historicalData
    return `DATOS HISTÓRICOS DE CALIDAD DEL AIRE:

Período: ${appliedStartDate ? format(appliedStartDate, 'PP', { locale: es }) : ''} - ${appliedEndDate ? format(appliedEndDate, 'PP', { locale: es }) : ''}
Granularidad: ${gran}
Ubicación: California (${latitude.toFixed(2)}, ${longitude.toFixed(2)})

ESTADÍSTICAS GENERALES:
- AQI Promedio: ${stats?.avg.toFixed(1)}
- AQI Mínimo: ${stats?.min}
- AQI Máximo: ${stats?.max}
- Total de registros: ${dataPoints.length}

TENDENCIA:
- Dirección: ${trend?.direction === 'improving' ? 'Mejorando' : trend?.direction === 'worsening' ? 'Empeorando' : 'Estable'}
- Cambio porcentual: ${trend?.percentageChange.toFixed(1)}%
- Análisis: ${trend?.message}

CONTAMINANTES:
${dataPoints.map((d, i) => {
  if (i % Math.ceil(dataPoints.length / 5) === 0) {
    return `- ${format(new Date(d.timestamp), 'PP', { locale: es })}: AQI=${d.aqi_avg.toFixed(0)}, O₃=${d.o3_avg?.toFixed(1) ?? 'N/A'} ppb, NO₂=${d.no2_avg?.toFixed(1) ?? 'N/A'} ppb, PM2.5=${d.pm25_avg?.toFixed(1) ?? 'N/A'} μg/m³`
  }
  return null
}).filter(Boolean).join('\n')}

DATOS COMPLETOS DISPONIBLES: ${dataPoints.length} puntos de datos desde ${format(new Date(dataPoints[0].timestamp), 'PP', { locale: es })} hasta ${format(new Date(dataPoints[dataPoints.length - 1].timestamp), 'PP', { locale: es })}`
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
              <h1 className="text-lg font-bold">Análisis Histórico</h1>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Exportar</span>
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
                  Período de Análisis
                </h2>

                {/* Presets Mejorados */}
                <div className="space-y-2">
                  {[
                    { label: 'Última semana', value: '7d', days: '7 días', icon: CalendarIcon },
                    { label: 'Último mes', value: '30d', days: '30 días', icon: CalendarIcon },
                    { label: 'Últimos 3 meses', value: '90d', days: '90 días', icon: CalendarDays },
                    { label: 'Último año', value: '1y', days: '365 días', icon: CalendarRange },
                  ].map((preset) => (
                    <Button
                      key={preset.value}
                      variant="outline"
                      onClick={() => handlePreset(preset.value as '7d' | '30d' | '90d' | '1y')}
                      className="w-full h-auto py-2 px-3 justify-start"
                    >
                      <preset.icon className="h-4 w-4 mr-3 shrink-0" />
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{preset.label}</div>
                        <div className="text-[10px] text-muted-foreground">{preset.days}</div>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* O personalizado */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  <Label className="text-xs font-medium">Personalizado</Label>
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
                          {startDate ? format(startDate, "dd/MM/yy") : "Inicio"}
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
                          {endDate ? format(endDate, "dd/MM/yy") : "Fin"}
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

              {/* Agrupar Datos */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Agrupar Datos
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
                        <span className="text-xs font-medium">Por hora</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Detalle máx</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="daily" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="text-xs font-medium">Por día</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Recomendado</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="weekly" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3 w-3" />
                        <span className="text-xs font-medium">Por semana</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Tendencias</span>
                    </div>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" className="h-auto py-2 px-3">
                    <div className="flex flex-col items-start text-left w-full">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-3 w-3" />
                        <span className="text-xs font-medium">Por mes</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Vista general</span>
                    </div>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Radio de Búsqueda */}
              <div>
                <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Circle className="h-4 w-4 text-primary" />
                  Radio de Búsqueda
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Urbano', value: 25, desc: '25 km' },
                    { label: 'Regional', value: 50, desc: '50 km' },
                    { label: 'Amplio', value: 100, desc: '100 km' },
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
                {hasUnappliedChanges ? 'Aplicar Cambios' : 'Filtros Aplicados ✓'}
              </Button>
            </div>
          </aside>

          {/* Área de Contenido Principal */}
          <main className="overflow-y-auto bg-muted/5">
            <div className="p-4 space-y-4">

              {/* Mapa con aspect ratio 4:3 */}
              <div className="w-full" style={{ aspectRatio: '4/3' }}>
                <HistoryLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  radiusKm={radiusKm}
                  onLocationChange={handleLocationChange}
                  onRadiusChange={handleRadiusChange}
                  className="h-full"
                />
              </div>

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
                        <h3 className="text-sm font-semibold text-destructive">Error al cargar datos</h3>
                        <p className="text-xs text-muted-foreground">
                          No se pudieron obtener los datos históricos. Por favor, intenta nuevamente.
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
                      <h3 className="text-sm font-semibold">Sin datos disponibles</h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        No hay datos históricos para esta ubicación y período.
                        Intenta ajustar las fechas o el radio de búsqueda.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards */}
              {!isLoading && !error && historicalData && historicalData.data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* AQI Promedio */}
              <Card className={cn("border", getAQIColor(historicalData.stats?.avg ?? 0))}>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">AQI Promedio</p>
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

              {/* AQI Mínimo */}
              <Card className="border">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Mejor Día</p>
                    <p className="text-2xl font-bold tabular-nums text-green-600">
                      {Math.round(historicalData.stats?.min ?? 0)}
                    </p>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 border-green-200">
                      {getAQICategory(historicalData.stats?.min ?? 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* AQI Máximo */}
              <Card className="border">
                <CardContent className="p-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Peor Día</p>
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
              {/* Tendencia */}
              {historicalData?.trend && (
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendIcon className={cn("h-3.5 w-3.5", trendColor)} />
                      <h3 className="text-xs font-semibold">Tendencia</h3>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">{historicalData.trend.message}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Cambio</span>
                        <span className={cn("font-bold", trendColor)}>
                          {historicalData.trend.percentageChange > 0 ? '+' : ''}
                          {historicalData.trend.percentageChange.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Datos</span>
                        <span className="font-semibold">{historicalData.data.length}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Período</span>
                        <span className="font-semibold">{daysDiff} días</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fuentes */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100">Info de Datos</h3>
                  </div>
                  <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                    <div className="flex justify-between">
                      <span className="text-[10px]">Fuente:</span>
                      <span className="text-[10px] font-medium">EPA Stations</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Cobertura:</span>
                      <span className="text-[10px] font-medium">California</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Radio:</span>
                      <span className="text-[10px] font-medium">{radiusKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px]">Actualización:</span>
                      <span className="text-[10px] font-medium">Diaria</span>
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
