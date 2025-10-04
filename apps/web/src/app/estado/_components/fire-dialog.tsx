"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type FireDataPoint } from "@/hooks/use-active-fires"
import { Flame, Satellite, Clock, MapPin, ThermometerSun, Zap, AlertTriangle } from "lucide-react"

/**
 * Obtiene la temperatura de brillo correcta según el sensor
 */
const getBrightness = (fire: FireDataPoint): number => {
  if (fire.bright_ti4 !== undefined) {
    const value = typeof fire.bright_ti4 === 'string' ? parseFloat(fire.bright_ti4) : fire.bright_ti4
    if (!isNaN(value)) return value
  }
  if (fire.brightness !== undefined && !isNaN(fire.brightness)) {
    return fire.brightness
  }
  return 300
}

/**
 * Normaliza el nivel de confianza
 */
const normalizeConfidence = (confidence: number | string): {
  level: 'high' | 'nominal' | 'low'
  label: string
  color: string
} => {
  let level: 'high' | 'nominal' | 'low'

  if (typeof confidence === 'number') {
    if (confidence >= 80) level = 'high'
    else if (confidence >= 50) level = 'nominal'
    else level = 'low'
  } else {
    const conf = String(confidence).toLowerCase()
    if (conf === 'h' || conf === 'high') level = 'high'
    else if (conf === 'n' || conf === 'nominal' || conf === 'medium') level = 'nominal'
    else level = 'low'
  }

  const labels = {
    high: { label: 'Alta Confianza', color: 'bg-green-500' },
    nominal: { label: 'Confianza Media', color: 'bg-yellow-500' },
    low: { label: 'Baja Confianza', color: 'bg-orange-500' }
  }

  return { level, ...labels[level] }
}

/**
 * Obtiene la categoría de intensidad basada en FRP
 */
const getFireIntensity = (frp: number): {
  level: string
  emoji: string
  color: string
  description: string
} => {
  if (frp < 10) return {
    level: 'Baja',
    emoji: '🟡',
    color: 'bg-yellow-500',
    description: 'Fuego pequeño o punto de calor'
  }
  if (frp < 50) return {
    level: 'Moderada',
    emoji: '🟠',
    color: 'bg-orange-500',
    description: 'Incendio activo de tamaño medio'
  }
  if (frp < 100) return {
    level: 'Alta',
    emoji: '🔴',
    color: 'bg-red-500',
    description: 'Incendio grande y activo'
  }
  if (frp < 300) return {
    level: 'Muy Alta',
    emoji: '🔴🔥',
    color: 'bg-red-600',
    description: 'Incendio mayor muy intenso'
  }
  return {
    level: 'Extrema',
    emoji: '🔥⚠️',
    color: 'bg-red-800',
    description: 'Megaincendio o conflagración'
  }
}

/**
 * Formatea la fecha y hora
 */
const formatFireDateTime = (date: string, time: string): string => {
  try {
    const year = date.substring(0, 4)
    const month = date.substring(5, 7)
    const day = date.substring(8, 10)
    const hour = time.substring(0, 2)
    const minute = time.substring(2, 4)

    const dateObj = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`)

    if (isNaN(dateObj.getTime())) {
      return 'Fecha no disponible'
    }

    return dateObj.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    })
  } catch {
    return 'Fecha no disponible'
  }
}

/**
 * Calcula hace cuánto tiempo fue detectado
 */
const getTimeAgo = (date: string, time: string): string => {
  try {
    const year = date.substring(0, 4)
    const month = date.substring(5, 7)
    const day = date.substring(8, 10)
    const hour = time.substring(0, 2)
    const minute = time.substring(2, 4)

    const fireDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`)
    const now = new Date()
    const diffMs = now.getTime() - fireDate.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
  } catch {
    return 'Tiempo desconocido'
  }
}

interface FireDialogProps {
  fire: FireDataPoint | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FireDialog({ fire, open, onOpenChange }: FireDialogProps) {
  if (!fire) return null

  const brightness = getBrightness(fire)
  const intensity = getFireIntensity(fire.frp)
  const confidence = normalizeConfidence(fire.confidence)
  const formattedDate = formatFireDateTime(fire.acq_date, fire.acq_time)
  const timeAgo = getTimeAgo(fire.acq_date, fire.acq_time)
  const isDayDetection = fire.daynight === 'D'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[10001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            Punto de Calor Detectado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Card */}
          <Card className={`border-l-4 ${intensity.color.replace('bg-', 'border-')}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{intensity.emoji}</div>
                  <div>
                    <CardTitle className="text-base">Intensidad: {intensity.level}</CardTitle>
                    <CardDescription className="text-sm">{intensity.description}</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">{fire.frp.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">MW</div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* ¿Qué significa esto? */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">💡</span>
                ¿Qué significa esto?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900">
              <p>
                Un satélite de la NASA detectó un <strong>punto de calor intenso</strong> en esta ubicación.
                Esto generalmente indica un incendio activo, pero también podría ser una fuente industrial
                de calor o una quema controlada.
              </p>
            </CardContent>
          </Card>

          {/* Datos del Sensor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Satellite className="w-4 h-4" />
                Datos del Sensor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* FRP */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 text-orange-500" />
                  <div>
                    <div className="font-medium text-sm">FRP (Potencia Radiativa)</div>
                    <div className="text-xs text-muted-foreground">Energía del fuego en Megavatios</div>
                  </div>
                </div>
                <div className="font-bold text-orange-600">{fire.frp.toFixed(2)} MW</div>
              </div>

              {/* Temperatura */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <ThermometerSun className="w-4 h-4 mt-0.5 text-red-500" />
                  <div>
                    <div className="font-medium text-sm">Temperatura de Brillo</div>
                    <div className="text-xs text-muted-foreground">Calor detectado por el satélite</div>
                  </div>
                </div>
                <div className="font-bold">
                  {brightness.toFixed(1)} K ({(brightness - 273.15).toFixed(1)}°C)
                </div>
              </div>

              {/* Confianza */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">Nivel de Confianza</div>
                  <div className="text-xs text-muted-foreground">Certeza de la detección</div>
                </div>
                <Badge className={confidence.color}>{confidence.label}</Badge>
              </div>

              {/* Satélite */}
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm">Satélite</div>
                <Badge variant="outline">{fire.satellite}</Badge>
              </div>

              {/* Detección */}
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm">Tipo de Detección</div>
                <Badge variant={isDayDetection ? "default" : "secondary"}>
                  {isDayDetection ? '☀️ Diurna' : '🌙 Nocturna'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Ubicación y Tiempo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Ubicación y Tiempo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Detectado:</span>
                <div className="text-right">
                  <div className="font-medium">{timeAgo}</div>
                  <div className="text-xs text-muted-foreground">{formattedDate}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coordenadas:</span>
                <span className="font-mono">{fire.latitude.toFixed(4)}°, {fire.longitude.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Versión del Algoritmo:</span>
                <span className="font-mono text-xs">{fire.version}</span>
              </div>
            </CardContent>
          </Card>

          {/* Nota de Seguridad */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900 mb-1">Nota de Seguridad</div>
                  <p className="text-sm text-red-800">
                    Si observa humo o fuego en esta área, mantenga distancia y reporte
                    inmediatamente a las autoridades locales de emergencia (911).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fuente */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            Datos de <strong>NASA FIRMS</strong> (Fire Information for Resource Management System)
            <br />
            Actualización en tiempo real desde satélites en órbita
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
