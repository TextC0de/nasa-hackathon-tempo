"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, MapPin, Calendar, Mail, FileText, ArrowLeft } from "lucide-react"
import { ReportPollutionDialog } from "@/components/report-pollution-dialog"
import Link from "next/link"
import { toast } from "sonner"

// Tipos para los reportes del usuario (coincide con la API)
interface UserReport {
  id: string
  email: string
  latitud: string
  longitud: string
  descripcion: string | null
  gravedad: string // Más flexible para aceptar cualquier valor del API
  tipo: string // Más flexible para aceptar cualquier valor del API
  fechaReporte: string
  createdAt: string
  updatedAt: string
}

// Configuración de gravedad para badges - Mapeo completo de valores del API
const SEVERITY_CONFIG = {
  low: { label: 'Bajo', color: 'bg-green-100 text-green-800 border-green-200' },
  intermediate: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' },
  // Valores alternativos que podrían venir del API
  'bajo': { label: 'Bajo', color: 'bg-green-100 text-green-800 border-green-200' },
  'intermedio': { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'critico': { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' }
} as const

// Configuración de tipos para badges - Mapeo completo de valores del API
const TYPE_CONFIG = {
  fire: { label: 'Fuego', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  smoke: { label: 'Humo', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  dust: { label: 'Polvo', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  // Valores alternativos que podrían venir del API
  'fuego': { label: 'Fuego', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'humo': { label: 'Humo', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  'polvo': { label: 'Polvo', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
} as const

export default function UserReportsPage() {
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  // Query para obtener reportes del usuario
  const { data: reportsData, isLoading, refetch } = trpc.obtenerReportesUsuario.useQuery()
  
  // Extraer el array de reportes de la respuesta
  const reports = reportsData?.reportes || []

  // Debug: Mostrar los valores que llegan del API
  if (reports.length > 0) {
    console.log('Valores del API:', {
      gravedades: reports.map(r => r.gravedad),
      tipos: reports.map(r => r.tipo)
    })
  }

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Función para obtener coordenadas formateadas
  const formatCoordinates = (lat: string, lng: string) => {
    return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`
  }

  // Función helper para obtener configuración de gravedad
  const getSeverityConfig = (gravedad: string) => {
    const config = SEVERITY_CONFIG[gravedad as keyof typeof SEVERITY_CONFIG]
    if (!config) {
      console.warn(`Gravedad no reconocida: ${gravedad}`)
      return { label: gravedad, color: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
    return config
  }

  // Función helper para obtener configuración de tipo
  const getTypeConfig = (tipo: string) => {
    const config = TYPE_CONFIG[tipo as keyof typeof TYPE_CONFIG]
    if (!config) {
      console.warn(`Tipo no reconocido: ${tipo}`)
      return { label: tipo, icon: '❓', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    }
    return config
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/usuario">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Mis Reportes</h1>
              <p className="text-muted-foreground">
                Gestiona y visualiza todos tus reportes de contaminación
              </p>
            </div>
            <Button 
              onClick={() => setIsReportDialogOpen(true)}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <AlertTriangle className="h-4 w-4" />
              Nuevo Reporte
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : reports.length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reportes Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? "..." : reports.filter((r: UserReport) => 
                  r.gravedad === 'critical' || r.gravedad === 'critico'
                ).length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoading ? "..." : reports.filter((r: UserReport) => {
                  const reportDate = new Date(r.fechaReporte)
                  const thisMonth = new Date()
                  return reportDate.getMonth() === thisMonth.getMonth() && 
                         reportDate.getFullYear() === thisMonth.getFullYear()
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de reportes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Historial de Reportes
            </CardTitle>
            <CardDescription>
              Todos los reportes que has enviado, ordenados por fecha más reciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Cargando reportes...</p>
                </div>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report: UserReport) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header del reporte */}
                          <div className="flex items-center gap-3">
                            <Badge className={getSeverityConfig(report.gravedad).color}>
                              {getSeverityConfig(report.gravedad).label}
                            </Badge>
                            <Badge className={getTypeConfig(report.tipo).color}>
                              <span className="mr-1">{getTypeConfig(report.tipo).icon}</span>
                              {getTypeConfig(report.tipo).label}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ID: #{report.id.slice(-8)}
                            </span>
                          </div>

                          {/* Información del reporte */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Ubicación:</span>
                                <span className="text-muted-foreground">
                                  {formatCoordinates(report.latitud, report.longitud)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Fecha:</span>
                                <span className="text-muted-foreground">
                                  {formatDate(report.fechaReporte)}
                                </span>
                              </div>
                            </div>
                            
                            {report.descripcion && (
                              <div className="space-y-1">
                                <span className="text-sm font-medium">Descripción:</span>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                  {report.descripcion}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Estado del reporte */}
                        <div className="ml-4 text-right">
                          <Badge variant="outline" className="text-xs">
                            En revisión
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tienes reportes aún</h3>
                <p className="text-muted-foreground mb-4">
                  Comienza reportando problemas de contaminación en California
                </p>
                <Button 
                  onClick={() => setIsReportDialogOpen(true)}
                  className="gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Crear Primer Reporte
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de reporte */}
      <ReportPollutionDialog 
        open={isReportDialogOpen} 
        onOpenChange={(open) => {
          setIsReportDialogOpen(open)
          if (!open) {
            // Refrescar la lista cuando se cierre el diálogo
            refetch()
          }
        }} 
      />
    </div>
  )
}
