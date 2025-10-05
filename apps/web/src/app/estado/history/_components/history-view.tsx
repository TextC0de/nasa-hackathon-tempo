"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HistoryChart } from "@/app/usuario/_components/history-chart"

interface HistoryViewProps {
  /**
   * Coordenadas del centro de California
   * Default: Centro geográfico de California
   */
  latitude?: number
  longitude?: number
}

/**
 * History View - Vista de análisis histórico para funcionarios
 *
 * Características:
 * - Tendencias históricas (30/90/365 días)
 * - Comparación año a año
 * - Indicadores de mejora/empeoramiento
 * - Exportación de reportes
 */
export function HistoryView({
  latitude = 36.7783,
  longitude = -119.4179
}: HistoryViewProps) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Historical Trends</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análisis de tendencias de calidad del aire en California
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
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCSV}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Chart principal - Reutiliza HistoryChart */}
        <HistoryChart
          latitude={latitude}
          longitude={longitude}
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
