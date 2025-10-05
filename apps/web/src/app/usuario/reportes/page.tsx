"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, MapPin, Calendar, FileText, ArrowLeft, Send, CheckCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import dynamic from "next/dynamic"
import { 
  UserReport, 
  ReportFormData, 
  EventType, 
  SeverityLevel, 
  EVENT_TYPES, 
  SEVERITY_LEVELS 
} from "@/lib/report-types"
import { 
  isValidLocation, 
  formatDate, 
  formatCoordinates, 
  getSeverityConfig, 
  getTypeConfig 
} from "@/lib/report-utils"




// Importar el mapa dinámicamente
const ReportMap = dynamic(() => import("@/components/report-map").then(mod => ({ default: mod.ReportMap })), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    </div>
  )
})

export default function UserReportsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState<ReportFormData>({
    email: '',
    latitud: 0,
    longitud: 0,
    descripcion: '',
    gravedad: '',
    tipo: ''
  })

  // Query para obtener reportes del usuario
  const { data: reportsData, isLoading, refetch } = trpc.obtenerReportesUsuario.useQuery()
  
  // Extraer el array de reportes de la respuesta
  const reports = reportsData?.reportes || []

  // Mutación para crear reporte
  const crearReporteMutation = trpc.crearReporteUsuario.useMutation({
    onSuccess: () => {
      setIsSubmitted(true)
      toast.success("¡Reporte enviado exitosamente!")
      refetch() // Refrescar la lista de reportes
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar el reporte")
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  // Manejar clic en el mapa
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const lat = e.latlng.lat
    const lng = e.latlng.lng
    
    if (isValidLocation(lat, lng)) {
      setFormData(prev => ({ 
        ...prev, 
        latitud: lat, 
        longitud: lng 
      }))
      toast.success('Ubicación seleccionada en el mapa')
    } else {
      toast.error('Por favor selecciona una ubicación dentro de California')
    }
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      toast.error("Por favor ingresa tu email")
      return
    }
    if (formData.latitud === 0 && formData.longitud === 0) {
      toast.error("Por favor selecciona una ubicación en el mapa")
      return
    }
    if (!formData.tipo) {
      toast.error("Por favor selecciona el tipo de evento")
      return
    }
    if (!formData.gravedad) {
      toast.error("Por favor selecciona la gravedad del evento")
      return
    }

    setIsSubmitting(true)
    
    try {
      await crearReporteMutation.mutateAsync({
        email: formData.email,
        latitud: formData.latitud,
        longitud: formData.longitud,
        descripcion: formData.descripcion || undefined,
        gravedad: formData.gravedad as SeverityLevel,
        tipo: formData.tipo as EventType
      })
    } catch (error) {
      console.error('Error submitting report:', error)
    }
  }

  // Manejar cambio de inputs
  const handleInputChange = (field: keyof ReportFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Resetear formulario
  const resetForm = () => {
    setIsSubmitted(false)
    setFormData({
      email: '',
      latitud: 0,
      longitud: 0,
      descripcion: '',
      gravedad: '',
      tipo: ''
    })
  }

  // Debug: Mostrar los valores que llegan del API
  if (reports.length > 0) {
    console.log('Valores del API:', {
      gravedades: reports.map(r => r.gravedad),
      tipos: reports.map(r => r.tipo)
    })
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
              <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
              <p className="text-muted-foreground">
                Gestiona y visualiza todos los reportes de contaminación
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Formulario de reporte */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Reportar Contaminación
            </CardTitle>
            <CardDescription>
              Ayúdanos a identificar y resolver problemas de contaminación en California
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-6 py-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">¡Reporte Enviado!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tu reporte ha sido enviado exitosamente y será revisado por nuestros administradores.
                  </p>
                </div>
                
                <div className="flex gap-3 justify-center">
                  <Button onClick={resetForm} variant="outline">
                    Cerrar
                  </Button>
                  <Button onClick={resetForm}>
                    Hacer Otro Reporte
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Mapa Interactivo */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <Label>Ubicación en California *</Label>
                  </div>
                  
                  <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
                    <ReportMap
                      onMapClick={handleMapClick}
                      selectedLocation={formData.latitud !== 0 && formData.longitud !== 0 ? 
                        { lat: formData.latitud, lng: formData.longitud } : undefined
                      }
                      className="h-full w-full"
                    />
                  </div>
                  
                  {formData.latitud !== 0 && formData.longitud !== 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-lg border border-green-200">
                      <MapPin className="h-4 w-4" />
                      <span>Ubicación seleccionada: {formData.latitud.toFixed(4)}, {formData.longitud.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email de contacto *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Te contactaremos en esta dirección para seguimiento del reporte
                  </p>
                </div>

                {/* Tipo de Evento */}
                <div className="space-y-2">
                  <Label>Tipo de Evento *</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        tipo: value,
                        gravedad: '' // Reset gravedad when tipo changes
                      }))
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona el tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{type.icon}</span>
                            <div className="flex flex-col items-start">
                              <div className="font-medium text-sm">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gravedad del Evento */}
                <div className="space-y-2">
                  <Label>Gravedad del Evento *</Label>
                  <Select 
                    value={formData.gravedad} 
                    onValueChange={(value) => handleInputChange('gravedad', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona la gravedad del evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_LEVELS.map((severity) => (
                        <SelectItem key={severity.value} value={severity.value}>
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{severity.label}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${severity.color}`}
                              >
                                {severity.value}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{severity.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Proporciona detalles sobre el incidente: cuándo ocurrió, qué observaste, cómo te afecta..."
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.descripcion.length}/500 caracteres
                  </p>
                </div>

                {/* Botón de envío */}
                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="gap-2 bg-orange-600 hover:bg-orange-700 min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Reporte
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

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
                <p className="text-muted-foreground">
                  Usa el formulario de arriba para crear tu primer reporte de contaminación
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
