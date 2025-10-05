"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Calendar as CalendarIcon, TrendingDown, TrendingUp, Minus, Filter, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { format, differenceInDays, subDays, subYears } from "date-fns"
import { es } from "date-fns/locale"
import { HistoryChart } from "@/app/usuario/_components/history-chart"
import { FloatingAIChat } from "./floating-ai-chat"
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
  latitude = 36.7783,
  longitude = -119.4179
}: HistoryViewProps) {
  // Estado de filtros
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [granularity, setGranularity] = useState<Granularity>('daily')
  const [appliedStartDate, setAppliedStartDate] = useState<Date | undefined>(undefined)
  const [appliedEndDate, setAppliedEndDate] = useState<Date | undefined>(undefined)
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>('daily')
  const [filtersOpen, setFiltersOpen] = useState(false)

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
  const { data: historicalData, isLoading } = trpc.obtenerHistoricoAqi.useQuery({
    latitude,
    longitude,
    startDate: appliedStartDate?.toISOString() ?? '',
    endDate: appliedEndDate?.toISOString() ?? '',
    granularity: appliedGranularity,
    radiusKm: 50,
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
    setFiltersOpen(false)
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-[1600px] mx-auto">
        {/* Hero Section */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="px-6 lg:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    Análisis Histórico
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Tendencias de calidad del aire en California
                  {appliedStartDate && appliedEndDate && (
                    <span className="ml-2">
                      • {format(appliedStartDate, 'PP', { locale: es })} - {format(appliedEndDate, 'PP', { locale: es })}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                      {hasUnappliedChanges && (
                        <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center">
                          !
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Configuración de Filtros</SheetTitle>
                      <SheetDescription>
                        Personaliza el período y granularidad de análisis
                      </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* Presets */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Períodos Predefinidos</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: '7 días', value: '7d' },
                            { label: '30 días', value: '30d' },
                            { label: '90 días', value: '90d' },
                            { label: '1 año', value: '1y' },
                          ].map((preset) => (
                            <Button
                              key={preset.value}
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreset(preset.value as '7d' | '30d' | '90d' | '1y')}
                              className="justify-start"
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Fechas */}
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">Período Personalizado</Label>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-xs text-muted-foreground">Fecha Inicio</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="start-date"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !startDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {startDate ? format(startDate, "PPP", { locale: es }) : "Selecciona fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={startDate}
                                  onSelect={(date) => date && setStartDate(date)}
                                  disabled={(date) => (endDate && date > endDate) || date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-xs text-muted-foreground">Fecha Fin</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  id="end-date"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !endDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {endDate ? format(endDate, "PPP", { locale: es }) : "Selecciona fecha"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={endDate}
                                  onSelect={(date) => date && setEndDate(date)}
                                  disabled={(date) => (startDate && date < startDate) || date > new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* Granularidad */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Granularidad</Label>
                        <ToggleGroup
                          type="single"
                          value={granularity}
                          onValueChange={(value) => value && setGranularity(value as Granularity)}
                          className="grid grid-cols-2 gap-2"
                        >
                          <ToggleGroupItem value="hourly" className="text-sm">
                            Por Hora
                          </ToggleGroupItem>
                          <ToggleGroupItem value="daily" className="text-sm">
                            Por Día
                          </ToggleGroupItem>
                          <ToggleGroupItem value="weekly" className="text-sm">
                            Por Semana
                          </ToggleGroupItem>
                          <ToggleGroupItem value="monthly" className="text-sm">
                            Por Mes
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <p className="text-xs text-muted-foreground">
                          {granularity === 'hourly' && '💡 Ideal para períodos ≤ 7 días'}
                          {granularity === 'daily' && '💡 Ideal para períodos de 7-90 días'}
                          {granularity === 'weekly' && '💡 Ideal para períodos de 90-365 días'}
                          {granularity === 'monthly' && '💡 Ideal para períodos > 365 días'}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          onClick={handleApplyFilters}
                          disabled={!hasUnappliedChanges}
                          className="flex-1"
                        >
                          Aplicar
                        </Button>
                        <Button
                          onClick={handleResetFilters}
                          variant="outline"
                          disabled={!hasUnappliedChanges}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 lg:px-8 py-8 space-y-8">
          {/* Hero Stats */}
          {historicalData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {/* AQI Promedio */}
              <Card className={cn("border-2", getAQIColor(historicalData.stats?.avg ?? 0))}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-medium">AQI Promedio</CardDescription>
                  <CardTitle className="text-4xl lg:text-5xl font-bold tabular-nums">
                    {Math.round(historicalData.stats?.avg ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-medium">
                      {getAQICategory(historicalData.stats?.avg ?? 0)}
                    </Badge>
                    <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                      <TrendIcon className="h-4 w-4" />
                      {historicalData.trend?.percentageChange.toFixed(1)}%
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AQI Mínimo */}
              <Card className="border-2 border-muted">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-medium">Mejor Día</CardDescription>
                  <CardTitle className="text-4xl lg:text-5xl font-bold tabular-nums text-green-600">
                    {Math.round(historicalData.stats?.min ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="font-medium bg-green-50 text-green-700 border-green-200">
                    {getAQICategory(historicalData.stats?.min ?? 0)}
                  </Badge>
                </CardContent>
              </Card>

              {/* AQI Máximo */}
              <Card className="border-2 border-muted">
                <CardHeader className="pb-3">
                  <CardDescription className="text-xs font-medium">Peor Día</CardDescription>
                  <CardTitle className="text-4xl lg:text-5xl font-bold tabular-nums text-red-600">
                    {Math.round(historicalData.stats?.max ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="font-medium bg-red-50 text-red-700 border-red-200">
                    {getAQICategory(historicalData.stats?.max ?? 0)}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {appliedStartDate && appliedEndDate && (
            <HistoryChart
              latitude={latitude}
              longitude={longitude}
              startDate={appliedStartDate}
              endDate={appliedEndDate}
              granularity={appliedGranularity}
            />
          )}

          {/* Insights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia */}
            {historicalData?.trend && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendIcon className={cn("h-5 w-5", trendColor)} />
                    <CardTitle className="text-lg">Tendencia del Período</CardTitle>
                  </div>
                  <CardDescription>{historicalData.trend.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Cambio Total</span>
                      <span className={cn("text-xl font-bold", trendColor)}>
                        {historicalData.trend.percentageChange > 0 ? '+' : ''}
                        {historicalData.trend.percentageChange.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Puntos de Datos</span>
                      <span className="text-lg font-semibold">{historicalData.data.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Período Analizado</span>
                      <span className="text-lg font-semibold">{daysDiff} días</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fuentes */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                    Información de Datos
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                <div className="flex justify-between">
                  <span className="font-medium">Fuente:</span>
                  <span>EPA Stations</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cobertura:</span>
                  <span>California</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Radio:</span>
                  <span>50 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Actualización:</span>
                  <span>Diaria</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Floating AI Chat */}
      <FloatingAIChat context={aiContext} />
    </div>
  )
}
