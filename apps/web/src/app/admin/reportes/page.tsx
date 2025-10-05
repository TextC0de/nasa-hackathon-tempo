"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Mail, 
  FileText, 
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  Users,
  TrendingUp
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

// Tipos para los reportes (coincide con la API)
interface AdminReport {
  id: string
  email: string
  latitud: string
  longitud: string
  descripcion: string | null
  gravedad: 'low' | 'intermediate' | 'critical'
  tipo: 'fire' | 'smoke' | 'dust'
  fechaReporte: string
  createdAt: string
  updatedAt: string
}

// Configuración de estados
const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  in_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
  resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
} as const

// Configuración de gravedad
const SEVERITY_CONFIG = {
  low: { label: 'Bajo', color: 'bg-green-100 text-green-800 border-green-200' },
  intermediate: { label: 'Intermedio', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  critical: { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200' }
} as const

// Configuración de tipos
const TYPE_CONFIG = {
  fire: { label: 'Fuego', icon: '🔥', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  smoke: { label: 'Humo', icon: '💨', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  dust: { label: 'Polvo', icon: '🌪️', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
} as const

export default function AdminReportsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")

  // Query para obtener todos los reportes (esto necesitaría implementarse en el backend)
  // Por ahora usaremos los reportes del usuario como ejemplo
  const { data: allReportsData, isLoading } = trpc.obtenerReportesUsuario.useQuery()
  
  // Extraer el array de reportes de la respuesta
  const allReports = allReportsData?.reportes || []

  // Filtrar y procesar reportes
  const filteredReports = useMemo(() => {
    if (!allReports) return []
    
    return allReports.filter((report: AdminReport) => {
      const matchesSearch = 
        report.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesSeverity = severityFilter === "all" || report.gravedad === severityFilter
      const matchesType = typeFilter === "all" || report.tipo === typeFilter
      
      return matchesSearch && matchesSeverity && matchesType
    })
  }, [allReports, searchTerm, severityFilter, typeFilter])

  // Estadísticas
  const stats = useMemo(() => {
    if (!allReports) return { total: 0, critical: 0, thisWeek: 0, resolved: 0 }
    
    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)
    
    return {
      total: allReports.length,
      critical: allReports.filter((r: AdminReport) => r.gravedad === 'critical').length,
      thisWeek: allReports.filter((r: AdminReport) => new Date(r.fechaReporte) > thisWeek).length,
      resolved: Math.floor(allReports.length * 0.3) // Simulado: 30% resueltos
    }
  }, [allReports])

  // Función para formatear fecha
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Función para formatear coordenadas
  const formatCoordinates = (lat: string, lng: string) => {
    return `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`
  }

  // Función para cambiar estado del reporte
  const handleStatusChange = (reportId: string, newStatus: string) => {
    toast.success(`Reporte ${reportId.slice(-8)} actualizado a: ${newStatus}`)
    // Aquí se implementaría la mutación para actualizar el estado
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestión de Reportes</h1>
              <p className="text-muted-foreground">
                Administra y revisa todos los reportes de contaminación
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Pestañas */}
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="reports">Reportes</TabsTrigger>
            <TabsTrigger value="analytics">Analíticas</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          {/* Resumen */}
          <TabsContent value="overview" className="space-y-6">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total Reportes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Todos los tiempos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Críticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                  <p className="text-xs text-muted-foreground">Requieren atención</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Esta Semana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
                  <p className="text-xs text-muted-foreground">Últimos 7 días</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resueltos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                  <p className="text-xs text-muted-foreground">Procesados</p>
                </CardContent>
              </Card>
            </div>

            {/* Reportes recientes */}
            <Card>
              <CardHeader>
                <CardTitle>Reportes Recientes</CardTitle>
                <CardDescription>
                  Los últimos reportes recibidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Cargando reportes...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allReports?.slice(0, 5).map((report: AdminReport) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge className={SEVERITY_CONFIG[report.gravedad].color}>
                            {SEVERITY_CONFIG[report.gravedad].label}
                          </Badge>
                          <div>
                            <p className="font-medium">#{report.id.slice(-8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.email} • {formatDate(report.fechaReporte)}
                            </p>
                          </div>
                        </div>
                        <Badge className={TYPE_CONFIG[report.tipo].color}>
                          <span className="mr-1">{TYPE_CONFIG[report.tipo].icon}</span>
                          {TYPE_CONFIG[report.tipo].label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reportes */}
          <TabsContent value="reports" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros y Búsqueda
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por email, descripción o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Gravedad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las gravedades</SelectItem>
                      <SelectItem value="low">Bajo</SelectItem>
                      <SelectItem value="intermediate">Intermedio</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="fire">🔥 Fuego</SelectItem>
                      <SelectItem value="smoke">💨 Humo</SelectItem>
                      <SelectItem value="dust">🌪️ Polvo</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_review">En Revisión</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Lista de reportes */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Reportes ({filteredReports.length})
                </CardTitle>
                <CardDescription>
                  Reportes filtrados según los criterios seleccionados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredReports.length > 0 ? (
                  <div className="space-y-4">
                    {filteredReports.map((report: AdminReport) => (
                      <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              {/* Header */}
                              <div className="flex items-center gap-3">
                                <Badge className={SEVERITY_CONFIG[report.gravedad].color}>
                                  {SEVERITY_CONFIG[report.gravedad].label}
                                </Badge>
                                <Badge className={TYPE_CONFIG[report.tipo].color}>
                                  <span className="mr-1">{TYPE_CONFIG[report.tipo].icon}</span>
                                  {TYPE_CONFIG[report.tipo].label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  ID: #{report.id.slice(-8)}
                                </span>
                              </div>

                              {/* Información */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Email:</span>
                                    <span className="text-muted-foreground">{report.email}</span>
                                  </div>
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

                            {/* Acciones */}
                            <div className="ml-4 flex flex-col gap-2">
                              <Select 
                                defaultValue="pending" 
                                onValueChange={(value) => handleStatusChange(report.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pendiente</SelectItem>
                                  <SelectItem value="in_review">En Revisión</SelectItem>
                                  <SelectItem value="resolved">Resuelto</SelectItem>
                                </SelectContent>
                              </Select>
                              
                              <Button variant="outline" size="sm" className="gap-2">
                                <Eye className="h-4 w-4" />
                                Ver Detalles
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay reportes</h3>
                    <p className="text-muted-foreground">
                      No se encontraron reportes que coincidan con los filtros seleccionados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analíticas */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analíticas de Reportes</CardTitle>
                <CardDescription>
                  Estadísticas y tendencias de los reportes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analíticas en Desarrollo</h3>
                  <p className="text-muted-foreground">
                    Próximamente: gráficos, tendencias y análisis detallados
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuración */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>
                  Configuración general del sistema de reportes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Configuración en Desarrollo</h3>
                  <p className="text-muted-foreground">
                    Próximamente: configuración de notificaciones, flujos de trabajo y más
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
