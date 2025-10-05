import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, Satellite, Info, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { PoblacionAfectada } from "./poblacion-afectada"

interface TempoSidebarProps {
  metadata?: {
    pollutant: string
    timestampLocal: string
    center: {
      value: number | null
      valueFormatted: string | null
    }
    interpretation: {
      nivel: string
      color: string
      descripcion: string
    }
  }
  satellite?: {
    name: string
    fullName: string
    agency: string
    resolution: string
  }
  isLoading: boolean
  error: Error | null
  onRefresh: () => void
  onPollutantChange: (pollutant: 'NO2' | 'O3' | 'HCHO') => void
  currentPollutant: 'NO2' | 'O3' | 'HCHO'
}

const POLLUTANT_INFO = {
  NO2: {
    name: 'Dióxido de Nitrógeno',
    shortName: 'NO₂',
    icon: '🚗',
    fuente: 'Principalmente de vehículos y plantas de energía',
    efectos: 'Irrita las vías respiratorias, agrava el asma',
  },
  O3: {
    name: 'Ozono Estratosférico',
    shortName: 'O₃',
    icon: '🛡️',
    fuente: 'Capa protectora en la atmósfera superior',
    efectos: 'Nos protege de la radiación UV del sol',
  },
  HCHO: {
    name: 'Formaldehído',
    shortName: 'HCHO',
    icon: '🏭',
    fuente: 'Industrias, incendios forestales, vehículos',
    efectos: 'Irritante ocular y respiratorio',
  },
}

const getColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-500',
  }
  return colorMap[color] || 'bg-gray-500'
}

const getTextColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    green: 'text-green-700 dark:text-green-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
    orange: 'text-orange-700 dark:text-orange-400',
    red: 'text-red-700 dark:text-red-400',
    purple: 'text-purple-700 dark:text-purple-400',
    blue: 'text-blue-700 dark:text-blue-400',
    gray: 'text-gray-700 dark:text-gray-400',
  }
  return colorMap[color] || 'text-gray-700'
}

export function TempoSidebar({
  metadata,
  satellite,
  isLoading,
  error,
  onRefresh,
  onPollutantChange,
  currentPollutant,
}: TempoSidebarProps) {
  const pollutantInfo = POLLUTANT_INFO[currentPollutant]

  if (error) {
    return (
      <div className="h-full p-6 overflow-y-auto bg-muted/30">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar datos TEMPO: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={onRefresh} className="mt-4 w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/30">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Satellite className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Panel de Análisis</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Datos satelitales y población afectada
          </p>
        </div>

        {/* Selector de Contaminante */}
        <div className="flex gap-2">
          {(['NO2', 'O3', 'HCHO'] as const).map((pollutant) => (
            <Button
              key={pollutant}
              variant={currentPollutant === pollutant ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPollutantChange(pollutant)}
              className="flex-1"
            >
              {POLLUTANT_INFO[pollutant].icon} {POLLUTANT_INFO[pollutant].shortName}
            </Button>
          ))}
        </div>

        {/* Estado Actual (siempre visible) */}
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ) : metadata ? (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Estado Actual</span>
                <Badge
                  className={`${getColorClass(metadata.interpretation.color)} text-white`}
                  variant="default"
                >
                  {metadata.interpretation.nivel}
                </Badge>
              </CardTitle>
              <CardDescription>
                Última actualización: {metadata.timestampLocal}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`text-lg font-medium ${getTextColorClass(metadata.interpretation.color)}`}>
                {metadata.interpretation.descripcion}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Acordiones para secciones colapsables */}
        <Accordion type="multiple" defaultValue={["contaminante", "recomendaciones"]} className="space-y-2">
          {/* Info del Contaminante */}
          <AccordionItem value="contaminante" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="text-xl">{pollutantInfo.icon}</span>
                <span className="font-semibold">{pollutantInfo.name}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2 pb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fuente principal:</p>
                <p className="text-sm">{pollutantInfo.fuente}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {currentPollutant === 'O3' ? 'Beneficio:' : 'Efectos en salud:'}
                </p>
                <p className="text-sm">{pollutantInfo.efectos}</p>
              </div>

              {/* Valor científico (colapsable) */}
              {metadata?.center.valueFormatted && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <Info className="h-3 w-3" />
                    Valor técnico
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-xs font-mono">{metadata.center.valueFormatted}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Medido en el centro de California
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Recomendaciones */}
          {metadata && (
            <AccordionItem value="recomendaciones" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="font-semibold">Recomendaciones</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm pt-2 pb-4">
                {metadata.interpretation.color === 'green' && (
                  <>
                    <p>✅ Excelente momento para actividades al aire libre</p>
                    <p>✅ Calidad del aire óptima</p>
                  </>
                )}
                {metadata.interpretation.color === 'yellow' && (
                  <>
                    <p>⚠️ Grupos sensibles deben considerar reducir exposición prolongada</p>
                    <p>✅ La mayoría de las personas pueden realizar actividades normales</p>
                  </>
                )}
                {(metadata.interpretation.color === 'orange' || metadata.interpretation.color === 'red') && (
                  <>
                    <p>🚫 Evitar ejercicio intenso al aire libre</p>
                    <p>🏠 Considerar permanecer en interiores</p>
                    <p>😷 Grupos sensibles deben usar protección</p>
                  </>
                )}
                {metadata.interpretation.color === 'purple' && (
                  <>
                    <p>🚨 Alerta de salud - evitar exposición al aire libre</p>
                    <p>🏠 Permanecer en interiores con ventanas cerradas</p>
                    <p>😷 Usar mascarilla si debe salir</p>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Población Afectada */}
          <PoblacionAfectada />

          {/* Info del Satélite */}
          {satellite && (
            <AccordionItem value="satelite" className="border rounded-lg px-4 bg-primary/5">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4" />
                  <span className="font-semibold text-sm">Información del Satélite</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-1 text-muted-foreground pt-2 pb-4">
                <p>
                  <span className="font-medium">Satélite:</span> {satellite.name}
                </p>
                <p>
                  <span className="font-medium">Agencia:</span> {satellite.agency}
                </p>
                <p>
                  <span className="font-medium">Resolución:</span> {satellite.resolution}
                </p>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {/* Botón de Refresh */}
        <Button onClick={onRefresh} disabled={isLoading} className="w-full" variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar datos'}
        </Button>
      </div>
    </div>
  )
}
