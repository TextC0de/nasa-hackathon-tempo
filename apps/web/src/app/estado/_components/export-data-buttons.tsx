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
      // Load base GeoJSON
      const response = await fetch('/data/cities-boundaries.geojson')
      const geoJSON = await response.json()

      // Create a map of cities by name
      const ciudadesMap = new Map(
        ciudadesData.ciudades.map((ciudad: any) => [ciudad.nombre, ciudad])
      )

      // Enrich GeoJSON with current AQI data
      const enrichedGeoJSON = {
        ...geoJSON,
        features: geoJSON.features.map((feature: any) => {
          const nombre = feature.properties.nombre
          const ciudad = ciudadesMap.get(nombre) as any;

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

      // Create file and download
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
      alert('Error downloading GeoJSON. Please try again.')
    }
  }

  const downloadCSV = () => {
    if (!ciudadesData) return

    try {
      // Create CSV headers
      const headers = [
        'City',
        'Population',
        'AQI',
        'Category',
        'Color',
        'Latitude',
        'Longitude',
        'Date',
      ]

      // Create data rows
      const rows = ciudadesData.ciudades.map((ciudad) => [
        ciudad.nombre,
        ciudad.poblacion,
        ciudad.aqi || 'N/A',
        ciudad.categoria || 'No data',
        ciudad.color || 'N/A',
        ciudad.lat,
        ciudad.lng,
        new Date().toISOString(),
      ])

      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      // Create file and download
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
      alert('Error downloading CSV. Please try again.')
    }
  }

  if (!ciudadesData) return null

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <CardTitle className="text-sm">Export Data</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Download air quality data in different formats
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
          Download GeoJSON
          <span className="ml-auto text-xs text-muted-foreground">.geojson</span>
        </Button>

        <Button
          onClick={downloadCSV}
          variant="outline"
          size="sm"
          className="w-full justify-start"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Download CSV
          <span className="ml-auto text-xs text-muted-foreground">.csv</span>
        </Button>

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            Data includes updated information from {ciudadesData.ciudades.length} major
            California cities
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
