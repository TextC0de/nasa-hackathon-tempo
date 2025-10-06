"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type FireDataPoint } from "@/hooks/use-active-fires"
import { useFireImpactAnalysis } from "@/hooks/use-fire-impact-analysis"
import { FireImpactCard } from "./fire-impact-card"
import { FireImpactTimeline } from "./fire-impact-timeline"
import { Flame, Satellite, Clock, MapPin, ThermometerSun, Zap, AlertTriangle, Wind } from "lucide-react"

/**
 * Gets the correct brightness temperature according to the sensor
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
 * Normalizes the confidence level
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
    high: { label: 'High Confidence', color: 'bg-green-500' },
    nominal: { label: 'Medium Confidence', color: 'bg-yellow-500' },
    low: { label: 'Low Confidence', color: 'bg-orange-500' }
  }

  return { level, ...labels[level] }
}

/**
 * Gets the intensity category based on FRP
 */
const getFireIntensity = (frp: number): {
  level: string
  emoji: string
  color: string
  description: string
} => {
  if (frp < 10) return {
    level: 'Low',
    emoji: '🟡',
    color: 'bg-yellow-500',
    description: 'Small fire or heat point'
  }
  if (frp < 50) return {
    level: 'Moderate',
    emoji: '🟠',
    color: 'bg-orange-500',
    description: 'Active medium-sized fire'
  }
  if (frp < 100) return {
    level: 'High',
    emoji: '🔴',
    color: 'bg-red-500',
    description: 'Large active fire'
  }
  if (frp < 300) return {
    level: 'Very High',
    emoji: '🔴🔥',
    color: 'bg-red-600',
    description: 'Very intense major fire'
  }
  return {
    level: 'Extreme',
    emoji: '🔥⚠️',
    color: 'bg-red-800',
    description: 'Megafire or conflagration'
  }
}

/**
 * Formats the date and time
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
      return 'Date not available'
    }

    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Los_Angeles',
      timeZoneName: 'short'
    })
  } catch {
    return 'Date not available'
  }
}

/**
 * Calculates how long ago it was detected
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

    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  } catch {
    return 'Unknown time'
  }
}

interface FireDialogProps {
  fire: FireDataPoint | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FireDialog({ fire, open, onOpenChange }: FireDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("general")

  // Hook for air quality impact analysis
  const impactAnalysis = useFireImpactAnalysis({
    fire,
    pollutant: 'HCHO', // HCHO is a better indicator of fires
    enabled: open && activeTab === 'impacto'
  })

  if (!fire) return null

  const brightness = getBrightness(fire)
  const intensity = getFireIntensity(fire.frp)
  const confidence = normalizeConfidence(fire.confidence)
  const formattedDate = formatFireDateTime(fire.acq_date, fire.acq_time)
  const timeAgo = getTimeAgo(fire.acq_date, fire.acq_time)
  const isDayDetection = fire.daynight === 'D'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto z-[10001]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Flame className="w-5 h-5 text-orange-500" />
            Heat Point Detected
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Information</TabsTrigger>
            <TabsTrigger value="impacto">
              <Wind className="w-4 h-4 mr-2" />
              Air Impact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
          {/* Header Card */}
          <Card className={`border-l-4 ${intensity.color.replace('bg-', 'border-')}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{intensity.emoji}</div>
                  <div>
                    <CardTitle className="text-base">Intensity: {intensity.level}</CardTitle>
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

          {/* What does this mean? */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="text-lg">💡</span>
                What does this mean?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900">
              <p>
                A NASA satellite detected an <strong>intense heat point</strong> at this location.
                This generally indicates an active fire, but it could also be an industrial
                heat source or a controlled burn.
              </p>
            </CardContent>
          </Card>

          {/* Sensor Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Satellite className="w-4 h-4" />
                Sensor Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* FRP */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 text-orange-500" />
                  <div>
                    <div className="font-medium text-sm">FRP (Radiative Power)</div>
                    <div className="text-xs text-muted-foreground">Fire energy in Megawatts</div>
                  </div>
                </div>
                <div className="font-bold text-orange-600">{fire.frp.toFixed(2)} MW</div>
              </div>

              {/* Temperature */}
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <ThermometerSun className="w-4 h-4 mt-0.5 text-red-500" />
                  <div>
                    <div className="font-medium text-sm">Brightness Temperature</div>
                    <div className="text-xs text-muted-foreground">Heat detected by satellite</div>
                  </div>
                </div>
                <div className="font-bold">
                  {brightness.toFixed(1)} K ({(brightness - 273.15).toFixed(1)}°C)
                </div>
              </div>

              {/* Confidence */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">Confidence Level</div>
                  <div className="text-xs text-muted-foreground">Detection certainty</div>
                </div>
                <Badge className={confidence.color}>{confidence.label}</Badge>
              </div>

              {/* Satellite */}
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm">Satellite</div>
                <Badge variant="outline">{fire.satellite}</Badge>
              </div>

              {/* Detection */}
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm">Detection Type</div>
                <Badge variant={isDayDetection ? "default" : "secondary"}>
                  {isDayDetection ? '☀️ Daytime' : '🌙 Nighttime'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Location and Time */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location and Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Detected:</span>
                <div className="text-right">
                  <div className="font-medium">{timeAgo}</div>
                  <div className="text-xs text-muted-foreground">{formattedDate}</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coordinates:</span>
                <span className="font-mono">{fire.latitude.toFixed(4)}°, {fire.longitude.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Algorithm Version:</span>
                <span className="font-mono text-xs">{fire.version}</span>
              </div>
            </CardContent>
          </Card>

          {/* Safety Note */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900 mb-1">Safety Note</div>
                  <p className="text-sm text-red-800">
                    If you observe smoke or fire in this area, keep your distance and report
                    immediately to local emergency authorities (911).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            Data from <strong>NASA FIRMS</strong> (Fire Information for Resource Management System)
            <br />
            Real-time updates from satellites in orbit
          </div>
          </TabsContent>

          <TabsContent value="impacto" className="space-y-4 mt-4">
            {/* Impact Card */}
            <FireImpactCard
              impact={impactAnalysis.impact}
              interpretation={impactAnalysis.interpretation}
              fireInfo={impactAnalysis.fireInfo}
              isLoading={impactAnalysis.isLoading}
            />

            {/* Pollution Timeline */}
            {impactAnalysis.hasData && (
              <FireImpactTimeline
                data={impactAnalysis.timeline}
                pollutant={impactAnalysis.interpretation?.pollutant || 'HCHO'}
                trend={impactAnalysis.impact?.trend}
              />
            )}

            {/* Informative note */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Wind className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">
                      How does this analysis work?
                    </div>
                    <p className="text-sm text-blue-800">
                      We compare the levels of <strong>Formaldehyde (HCHO)</strong> measured by the
                      TEMPO satellite before and after the fire detection.
                      HCHO is a toxic gas produced by biomass burning and serves as a
                      key indicator of pollution from wildfires.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source */}
            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              Data from <strong>NASA TEMPO</strong> (Tropospheric Emissions: Monitoring of Pollution)
              <br />
              Correlated with <strong>NASA FIRMS</strong> (Fire Information for Resource Management)
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
