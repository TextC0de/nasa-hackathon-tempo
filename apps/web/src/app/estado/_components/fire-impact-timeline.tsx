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
  event: string | null
  reason?: 'no_data' | 'outside_coverage' | 'error' | string
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
    <Card className="overflow-visible">
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
        <div className="relative h-48 bg-muted/20 rounded-lg p-4 overflow-x-auto overflow-y-visible" style={{ paddingTop: '3rem' }}>
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

              // Color basado en estado
              let barColor = 'bg-gray-300'
              let barPattern = ''

              if (point.value !== null) {
                // Tiene valor - color por cambio
                barColor =
                  changeNum > 100 ? 'bg-red-600' :
                  changeNum > 50 ? 'bg-orange-500' :
                  changeNum > 20 ? 'bg-yellow-500' :
                  'bg-green-500'
              } else if (point.reason === 'no_data') {
                // Sin datos TEMPO (normal - noche o gaps)
                barColor = 'bg-gray-300'
                barPattern = 'opacity-40'
              } else if (point.reason === 'outside_coverage') {
                // Fuera de cobertura
                barColor = 'bg-amber-200'
                barPattern = 'opacity-60'
              } else if (point.reason === 'error') {
                // Error real
                barColor = 'bg-red-300'
                barPattern = 'opacity-30'
              }

              return (
                <div
                  key={i}
                  className="relative flex-1 flex flex-col items-center justify-end h-full group"
                >
                  {/* Barra */}
                  <div
                    className={`w-full ${barColor} ${barPattern} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                    style={{ height: point.value !== null ? `${height}%` : '8px', minHeight: '4px' }}
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
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                    <div className="bg-popover text-popover-foreground shadow-xl rounded-md p-3 text-xs whitespace-nowrap border-2">
                      <div className="font-semibold">{point.relativeTime}</div>
                      <div className="text-muted-foreground">{point.timestampLocal}</div>
                      <div className="mt-1">
                        {point.value !== null ? (
                          <>
                            <span className="font-medium">{point.valueFormatted}</span>
                            <div className={`font-semibold ${changeNum > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {changeNum > 0 ? '+' : ''}{point.changePercent}%
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground italic">
                            {point.reason === 'no_data' && '⚪ Sin datos TEMPO'}
                            {point.reason === 'outside_coverage' && '⚠️ Fuera de cobertura'}
                            {point.reason === 'error' && '❌ Error al obtener datos'}
                            {!point.reason && 'Sin datos'}
                          </div>
                        )}
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
        <div className="mt-8 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">Niveles de contaminación:</div>
          <div className="flex flex-wrap gap-4 text-xs">
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
          </div>
          <div className="text-xs font-semibold text-muted-foreground mt-4">Estados sin datos:</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 opacity-40 rounded" />
              <span>Sin datos TEMPO (esperado)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-200 opacity-60 rounded" />
              <span>Fuera de cobertura</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-300 opacity-30 rounded" />
              <span>Error al obtener</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
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
