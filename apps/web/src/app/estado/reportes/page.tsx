"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"

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
import { toast } from "sonner"
import { UserReport } from "@/lib/report-types"
import { formatDate, formatCoordinates, getSeverityConfig, getTypeConfig } from "@/lib/report-utils"

// Import map component dynamically to avoid SSR issues
const ReportsMap = dynamic(() => import("@/components/reports-map").then(mod => ({ default: mod.ReportsMap })), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

// Alias for compatibility with existing code
type AdminReport = UserReport

// Status configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Eye },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle }
} as const



export default function AdminReportsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>()

  // Query to get all reports (this would need to be implemented in the backend)
  // For now we'll use user reports as an example
  const { data: allReportsData, isLoading } = trpc.obtenerReportesUsuario.useQuery()

  // Extract reports array from response
  const allReports = allReportsData?.reportes || []

  // Filter and process reports
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

  // Statistics
  const stats = useMemo(() => {
    if (!allReports) return { total: 0, critical: 0, thisWeek: 0, resolved: 0 }

    const thisWeek = new Date()
    thisWeek.setDate(thisWeek.getDate() - 7)

    return {
      total: allReports.length,
      critical: allReports.filter((r: AdminReport) => r.gravedad === 'critical').length,
      thisWeek: allReports.filter((r: AdminReport) => new Date(r.fechaReporte) > thisWeek).length,
      resolved: Math.floor(allReports.length * 0.3) // Simulated: 30% resolved
    }
  }, [allReports])


  // Función para cambiar estado del reporte
  const handleStatusChange = (reportId: string, newStatus: string) => {
    toast.success(`Reporte ${reportId.slice(-8)} actualizado a: ${newStatus}`)
    // Aquí se implementaría la mutación para actualizar el estado
  }

  // Función para manejar clicks en reportes del mapa
  const handleReportClick = (report: UserReport) => {
    setSelectedReportId(report.id)
    setActiveTab("reports") // Cambiar a la pestaña de reportes
    toast.info(`Reporte ${report.id.slice(-8)} seleccionado`)
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports Management</h1>
              <p className="text-muted-foreground text-sm">
                Manage and review all pollution reports
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          
          {/* Columna izquierda - Mapa */}
          <div className="h-full">
            <div className="h-full bg-muted/20 rounded-lg border overflow-hidden">
              <ReportsMap 
                reports={allReports || []}
                selectedReportId={selectedReportId}
                onReportClick={handleReportClick}
                className="h-full"
              />
            </div>
          </div>

          {/* Columna derecha - Panel de gestión */}
          <div className="h-full overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* Pestañas */}
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Critical
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                  <p className="text-xs text-muted-foreground">Require attention</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.thisWeek}</div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Resolved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                  <p className="text-xs text-muted-foreground">Processed</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent reports */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Reports</CardTitle>
                <CardDescription>
                  Latest received reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading reports...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allReports?.slice(0, 5).map((report: AdminReport) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge className={getSeverityConfig(report.gravedad).color}>
                            {getSeverityConfig(report.gravedad).label}
                          </Badge>
                          <div>
                            <p className="font-medium">#{report.id.slice(-8)}</p>
                            <p className="text-sm text-muted-foreground">
                              {report.email} • {formatDate(report.fechaReporte)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getTypeConfig(report.tipo).color}>
                          <span className="mr-1">{getTypeConfig(report.tipo).icon}</span>
                          {getTypeConfig(report.tipo).label}
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
                  Filters and Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email, description or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All severities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="fire">🔥 Fire</SelectItem>
                      <SelectItem value="smoke">💨 Smoke</SelectItem>
                      <SelectItem value="dust">🌪️ Dust</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reports list */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Reports ({filteredReports.length})
                </CardTitle>
                <CardDescription>
                  Reports filtered by selected criteria
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

                              {/* Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Email:</span>
                                    <span className="text-muted-foreground">{report.email}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Location:</span>
                                    <span className="text-muted-foreground">
                                      {formatCoordinates(report.latitud, report.longitud)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">Date:</span>
                                    <span className="text-muted-foreground">
                                      {formatDate(report.fechaReporte)}
                                    </span>
                                  </div>
                                </div>

                                {report.descripcion && (
                                  <div className="space-y-1">
                                    <span className="text-sm font-medium">Description:</span>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                      {report.descripcion}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="ml-4 flex flex-col gap-2">
                              <Select
                                defaultValue="pending"
                                onValueChange={(value) => handleStatusChange(report.id, value)}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_review">In Review</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button variant="outline" size="sm" className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
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
                    <h3 className="text-lg font-semibold mb-2">No reports</h3>
                    <p className="text-muted-foreground">
                      No reports found matching the selected filters
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports Analytics</CardTitle>
                <CardDescription>
                  Reports statistics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics in Development</h3>
                  <p className="text-muted-foreground">
                    Coming soon: charts, trends and detailed analysis
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  General report system configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Settings in Development</h3>
                  <p className="text-muted-foreground">
                    Coming soon: notification settings, workflows and more
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
