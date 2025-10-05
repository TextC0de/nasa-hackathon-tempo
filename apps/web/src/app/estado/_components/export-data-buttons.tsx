"use client"

import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Download, FileJson, FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ExportDataButtons() {
  const { data: ciudadesData } = trpc.obtenerPoblacionAfectada.useQuery({})

  const downloadGeoJSON = async () => {
    if (!ciudadesData) return

    try {
      // Cargar el GeoJSON base
      const response = await fetch('/data/cities-boundaries.geojson')
      const geoJSON = await response.json()

      // Crear un mapa de ciudades por nombre
      const ciudadesMap = new Map(
        ciudadesData.ciudades.map((ciudad: any) => [ciudad.nombre, ciudad])
      )

      // Enriquecer el GeoJSON con datos de AQI actuales
      const enrichedGeoJSON = {
        ...geoJSON,
        features: geoJSON.features.map((feature: any) => {
          const nombre = feature.properties.nombre
          const ciudad = ciudadesMap.get(nombre)

          return {
            ...feature,
            properties: {
              ...feature.properties,
              aqi: ciudad?.aqi || null,
              categoria: ciudad?.categoria || null,
              color: ciudad?.color || null,
              severidad: ciudad?.severidad || null,
              timestamp: new Date().toISOString(),
            },
          }
        }),
        metadata: {
          generatedAt: new Date().toISOString(),
          source: 'TEMPO Satellite Data + AirNow API',
          totalCities: ciudadesData.ciudades.length,
          totalPopulation: ciudadesData.estadisticas.poblacionTotal,
        },
      }

      // Crear archivo y descargar
      const blob = new Blob([JSON.stringify(enrichedGeoJSON, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `california-cities-aqi-${new Date().toISOString().split('T')[0]}.geojson`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading GeoJSON:', error)
      alert('Error al descargar GeoJSON. Por favor intenta nuevamente.')
    }
  }

  const downloadCSV = () => {
    if (!ciudadesData) return

    try {
      // Crear encabezados CSV
      const headers = [
        'Ciudad',
        'Población',
        'AQI',
        'Categoría',
        'Color',
        'Latitud',
        'Longitud',
        'Fecha',
      ]

      // Crear filas de datos
      const rows = ciudadesData.ciudades.map((ciudad) => [
        ciudad.nombre,
        ciudad.poblacion,
        ciudad.aqi || 'N/A',
        ciudad.categoria || 'Sin datos',
        ciudad.color || 'N/A',
        ciudad.lat,
        ciudad.lng,
        new Date().toISOString(),
      ])

      // Combinar encabezados y datos
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      // Crear archivo y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `california-cities-aqi-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      alert('Error al descargar CSV. Por favor intenta nuevamente.')
    }
  }

  if (!ciudadesData) return null

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <CardTitle className="text-sm">Exportar Datos</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Descarga los datos de calidad del aire en diferentes formatos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          onClick={downloadGeoJSON}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <FileJson className="mr-2 h-4 w-4" />
          Descargar GeoJSON
          <span className="ml-auto text-xs text-muted-foreground">.geojson</span>
        </Button>

        <Button
          onClick={downloadCSV}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Descargar CSV
          <span className="ml-auto text-xs text-muted-foreground">.csv</span>
        </Button>

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            💡 Los datos incluyen información actualizada de {ciudadesData.ciudades.length} ciudades
            principales de California
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
