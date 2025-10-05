import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Flame, TrendingDown, TrendingUp, Minus } from "lucide-react"

interface TimelinePoint {
  timestamp: string
  timestampLocal: string
  relativeTime: string
  value: number | null
  valueFormatted: string | null
  changePercent: string
  event: 'fire_detected' | 'peak' | 'current' | null
}

interface FireImpactTimelineProps {
  data: TimelinePoint[]
  pollutant: string
  trend?: 'improving' | 'worsening' | 'stable'
}

export function FireImpactTimeline({ data, pollutant, trend }: FireImpactTimelineProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Contaminación</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Encontrar valores min/max para escalar
  const values = data.map(p => p.value).filter((v): v is number => v !== null)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue

  // Normalizar valores a 0-100 para visualización
  const normalizeValue = (value: number | null) => {
    if (value === null || range === 0) return 0
    return ((value - minValue) / range) * 100
  }

  // Encontrar puntos especiales
  const t0Point = data.find(p => p.event === 'fire_detected')
  const peakPoint = data.find(p => p.event === 'peak')

  // Iconos de trend
  const TrendIcon = trend === 'improving' ? TrendingDown : trend === 'worsening' ? TrendingUp : Minus
  const trendColor = trend === 'improving' ? 'text-green-600' : trend === 'worsening' ? 'text-red-600' : 'text-gray-600'
  const trendText = trend === 'improving' ? 'Mejorando' : trend === 'worsening' ? 'Empeorando' : 'Estable'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Timeline de {pollutant}</CardTitle>
            <CardDescription>
              Evolución desde detección del incendio
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-5 w-5 ${trendColor}`} />
            <span className={`text-sm font-medium ${trendColor}`}>{trendText}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Gráfica Simple */}
        <div className="relative h-48 bg-muted/20 rounded-lg p-4 overflow-x-auto">
          {/* Grid de fondo */}
          <div className="absolute inset-0 p-4">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute left-4 right-4 border-t border-muted-foreground/10"
                style={{ bottom: `calc(${pct}% + 1rem)` }}
              />
            ))}
          </div>

          {/* Línea de tiempo */}
          <div className="relative h-full flex items-end justify-between gap-1">
            {data.map((point, i) => {
              const height = normalizeValue(point.value)
              const isT0 = point.event === 'fire_detected'
              const isPeak = point.event === 'peak'
              const isCurrent = point.event === 'current'
              const changeNum = parseFloat(point.changePercent)

              // Color basado en cambio
              const barColor =
                changeNum > 100 ? 'bg-red-600' :
                changeNum > 50 ? 'bg-orange-500' :
                changeNum > 20 ? 'bg-yellow-500' :
                'bg-green-500'

              return (
                <div
                  key={i}
                  className="relative flex-1 flex flex-col items-center justify-end h-full group"
                >
                  {/* Barra */}
                  <div
                    className={`w-full ${barColor} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                    style={{ height: `${height}%`, minHeight: point.value !== null ? '4px' : '0' }}
                  >
                    {/* Marcador de eventos */}
                    {isT0 && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                        <Flame className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    {isPeak && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <Badge variant="destructive" className="text-xs px-1">Pico</Badge>
                      </div>
                    )}
                  </div>

                  {/* Tooltip en hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-popover text-popover-foreground shadow-lg rounded-md p-2 text-xs whitespace-nowrap border">
                      <div className="font-semibold">{point.relativeTime}</div>
                      <div className="text-muted-foreground">{point.timestampLocal}</div>
                      <div className="mt-1">
                        <span className="font-medium">{point.valueFormatted || 'Sin datos'}</span>
                      </div>
                      <div className={`font-semibold ${changeNum > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {changeNum > 0 ? '+' : ''}{point.changePercent}%
                      </div>
                      {isT0 && <div className="text-orange-600 font-semibold mt-1">🔥 Incendio detectado</div>}
                    </div>
                  </div>

                  {/* Etiqueta eje X (cada N puntos) */}
                  {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
                    <div className="absolute -bottom-6 text-xs text-muted-foreground whitespace-nowrap">
                      {point.relativeTime}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-8 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span>Normal (+0-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded" />
            <span>Elevado (+20-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded" />
            <span>Alto (+50-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded" />
            <span>Crítico (+100%)</span>
          </div>
          {t0Point && (
            <div className="flex items-center gap-2">
              <Flame className="h-3 w-3 text-orange-600" />
              <span>Detección de incendio</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
