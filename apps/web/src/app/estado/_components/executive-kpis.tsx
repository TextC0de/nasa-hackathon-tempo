import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, AlertTriangle, Radio, Users } from "lucide-react"
import { useMemo } from "react"

interface ExecutiveKPIsProps {
  stats: {
    active: number
    total: number
    avgAQI?: number
  } | null
  fires?: {
    totalFires: number
    highConfidenceFires: number
  } | null
  isLoading: boolean
}

/**
 * Executive KPI Cards - Estilo Vercel/Linear
 * Números grandes, minimalista, focus en métricas clave
 */
export function ExecutiveKPIs({ stats, fires, isLoading }: ExecutiveKPIsProps) {
  // Calcular zonas críticas (AQI > 150) - Mock por ahora
  const criticalZones = useMemo(() => {
    if (!stats?.avgAQI) return 0
    // TODO: Calcular real based on grouped stations
    return stats.avgAQI > 150 ? 3 : stats.avgAQI > 100 ? 1 : 0
  }, [stats])

  // Estimar población afectada - Mock por ahora
  const affectedPopulation = useMemo(() => {
    if (criticalZones === 0) return "0"
    // TODO: Calcular real based on geographic overlay
    return criticalZones > 2 ? "1.2M" : criticalZones > 0 ? "450K" : "0"
  }, [criticalZones])

  // Calcular tendencia (mock - comparar con promedio histórico)
  const trend = useMemo(() => {
    if (!stats?.avgAQI) return null
    // TODO: Comparar con histórico real via trpc
    const historicalAvg = 68 // Mock
    const change = ((stats.avgAQI - historicalAvg) / historicalAvg) * 100
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      value: Math.abs(change)
    }
  }, [stats])

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/40">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                <div className="h-12 bg-muted rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4">
      {/* KPI 1: AQI Promedio Estatal */}
      <Card className="border-border/40 hover:border-border transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AQI Promedio
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums" style={{
                color: getAQITextColor(stats.avgAQI || 0)
              }}>
                {Math.round(stats.avgAQI || 0)}
              </span>
              {trend && trend.direction !== 'stable' && (
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${
                  trend.direction === 'up' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {trend.direction === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.value.toFixed(1)}%
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              vs mes anterior
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI 2: Zonas Críticas */}
      <Card className="border-border/40 hover:border-border transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Zonas Críticas
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tabular-nums ${
                criticalZones > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {criticalZones}
              </span>
              {criticalZones > 0 && (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              AQI &gt; 150
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI 3: Población Afectada */}
      <Card className="border-border/40 hover:border-border transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Población Afectada
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tabular-nums ${
                affectedPopulation !== "0" ? 'text-orange-600' : 'text-muted-foreground'
              }`}>
                {affectedPopulation}
              </span>
              {affectedPopulation !== "0" && (
                <Users className="h-5 w-5 text-orange-600" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              en zonas insalubres
            </span>
          </div>
        </CardContent>
      </Card>

      {/* KPI 4: Estaciones Activas */}
      <Card className="border-border/40 hover:border-border transition-colors">
        <CardContent className="p-6">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Estaciones Activas
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">
                {stats.active}
              </span>
              <span className="text-2xl font-medium text-muted-foreground">
                /{stats.total}
              </span>
              <Radio className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs text-muted-foreground">
              operacionales
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Determina el color del texto basado en AQI
 */
function getAQITextColor(aqi: number): string {
  if (aqi <= 50) return 'hsl(var(--chart-1))'       // Verde
  if (aqi <= 100) return 'hsl(var(--chart-2))'      // Amarillo
  if (aqi <= 150) return 'hsl(var(--chart-3))'      // Naranja
  if (aqi <= 200) return 'hsl(var(--chart-4))'      // Rojo
  if (aqi <= 300) return 'hsl(var(--chart-5))'      // Púrpura
  return 'hsl(var(--destructive))'                   // Marrón/Peligroso
}
