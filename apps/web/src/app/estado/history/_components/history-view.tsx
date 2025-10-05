"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { format, differenceInDays, subDays, subMonths, subYears } from "date-fns"
import { es } from "date-fns/locale"
import { HistoryChart } from "@/app/usuario/_components/history-chart"

interface HistoryViewProps {
  /**
   * Coordenadas del centro de California
   * Default: Centro geográfico de California
   */
  latitude?: number
  longitude?: number
}

type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly'

/**
 * History View - Vista de análisis histórico para funcionarios
 *
 * Características:
 * - Selector de rango de fechas personalizado
 * - Granularidad configurable (horaria, diaria, semanal, mensual)
 * - Presets rápidos (7d, 30d, 90d, 1y)
 * - Exportación de reportes
 */
export function HistoryView({
  latitude = 36.7783,
  longitude = -119.4179
}: HistoryViewProps) {
  // Estado de filtros (edición)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [granularity, setGranularity] = useState<Granularity>('daily')

  // Estado de filtros aplicados (los que realmente se usan)
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(subDays(new Date(), 30))
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(new Date())
  const [appliedGranularity, setAppliedGranularity] = useState<Granularity>('daily')

  // Calcular días entre fechas aplicadas
  const daysDiff = useMemo(() => {
    return differenceInDays(appliedEndDate, appliedStartDate)
  }, [appliedStartDate, appliedEndDate])

  // Detectar si hay cambios sin aplicar
  const hasUnappliedChanges = useMemo(() => {
    return (
      startDate.getTime() !== appliedStartDate.getTime() ||
      endDate.getTime() !== appliedEndDate.getTime() ||
      granularity !== appliedGranularity
    )
  }, [startDate, endDate, granularity, appliedStartDate, appliedEndDate, appliedGranularity])

  // Aplicar filtros
  const handleApplyFilters = () => {
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    setAppliedGranularity(granularity)
  }

  // Resetear filtros a los aplicados
  const handleResetFilters = () => {
    setStartDate(appliedStartDate)
    setEndDate(appliedEndDate)
    setGranularity(appliedGranularity)
  }

  // Presets rápidos
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

  const handleExportPDF = () => {
    // TODO: Implementar exportación PDF
    console.log('Exportando PDF...')
  }

  const handleExportCSV = () => {
    // TODO: Implementar exportación CSV
    console.log('Exportando CSV...')
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header con acciones */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Historical Trends</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análisis de tendencias de calidad del aire en California • {daysDiff} días seleccionados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Controles de filtrado */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Filtros y Configuración</CardTitle>
            <CardDescription>
              Personaliza el rango de fechas y granularidad de los datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets rápidos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Presets Rápidos</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('7d')}
                  className="text-xs"
                >
                  Últimos 7 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('30d')}
                  className="text-xs"
                >
                  Últimos 30 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('90d')}
                  className="text-xs"
                >
                  Últimos 90 días
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreset('1y')}
                  className="text-xs"
                >
                  Último año
                </Button>
              </div>
            </div>

            {/* Selectores de fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha inicio */}
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium">Fecha Inicio</Label>
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
                      disabled={(date) => date > endDate || date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fecha fin */}
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium">Fecha Fin</Label>
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
                      disabled={(date) => date < startDate || date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Granularidad */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Granularidad de Datos</Label>
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(value) => value && setGranularity(value as Granularity)}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="hourly" aria-label="Por hora" className="text-xs">
                  Por Hora
                </ToggleGroupItem>
                <ToggleGroupItem value="daily" aria-label="Por día" className="text-xs">
                  Por Día
                </ToggleGroupItem>
                <ToggleGroupItem value="weekly" aria-label="Por semana" className="text-xs">
                  Por Semana
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" aria-label="Por mes" className="text-xs">
                  Por Mes
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-muted-foreground mt-2">
                {granularity === 'hourly' && '⚠️ Granularidad horaria recomendada para rangos ≤ 7 días'}
                {granularity === 'daily' && '✓ Granularidad diaria ideal para rangos de 7-90 días'}
                {granularity === 'weekly' && '✓ Granularidad semanal ideal para rangos de 90-365 días'}
                {granularity === 'monthly' && '✓ Granularidad mensual ideal para rangos > 365 días'}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleApplyFilters}
                disabled={!hasUnappliedChanges}
                className="flex-1"
              >
                Aplicar Filtros
              </Button>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                disabled={!hasUnappliedChanges}
              >
                Cancelar
              </Button>
            </div>

            {hasUnappliedChanges && (
              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-600 dark:bg-orange-400"></span>
                Tienes cambios sin aplicar
              </p>
            )}
          </CardContent>
        </Card>

        {/* Chart principal - Ahora con fechas personalizadas */}
        <HistoryChart
          latitude={latitude}
          longitude={longitude}
          days={daysDiff}
        />

        {/* Insights y análisis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contexto histórico */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contexto Histórico</CardTitle>
              <CardDescription>
                Comparación con períodos anteriores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">vs Mes Anterior</span>
                  <span className="text-sm font-semibold text-green-600">-8.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">vs Mismo Mes Año Pasado</span>
                  <span className="text-sm font-semibold text-red-600">+12.3%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">vs Promedio 5 Años</span>
                  <span className="text-sm font-semibold text-yellow-600">+3.2%</span>
                </div>
              </div>
              <div className="pt-4 border-t text-xs text-muted-foreground italic">
                Los datos históricos ayudan a identificar patrones estacionales y evaluar el impacto de políticas públicas.
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas clave */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas Clave</CardTitle>
              <CardDescription>
                Último año (365 días)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Días con AQI &gt; 100</span>
                  <span className="text-sm font-semibold">45 días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Días con AQI &gt; 150</span>
                  <span className="text-sm font-semibold">12 días</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Peor día del año</span>
                  <span className="text-sm font-semibold">AQI 185 (Jun 15)</span>
                </div>
              </div>
              <div className="pt-4 border-t text-xs text-muted-foreground italic">
                Estos datos son críticos para reportes de cumplimiento con estándares federales (NAAQS).
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Nota informativa sobre datos */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Fuentes de Datos
                </h3>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Los datos históricos provienen de estaciones EPA (Environmental Protection Agency)
                  agregadas a nivel horario y diario. Los datos están pre-procesados y optimizados para
                  consultas rápidas, reduciendo el tamaño original de 6.7 GB a ~100 MB mediante agregación inteligente.
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  <strong>Cobertura:</strong> California, Enero 2024 - Presente<br />
                  <strong>Granularidad:</strong> Automática (por hora para ≤7 días, por día para &gt;7 días)<br />
                  <strong>Actualización:</strong> Cada 24 horas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
