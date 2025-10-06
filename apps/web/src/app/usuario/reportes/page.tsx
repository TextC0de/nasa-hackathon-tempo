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




// Import map dynamically
const ReportMap = dynamic(() => import("@/components/report-map").then(mod => ({ default: mod.ReportMap })), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
})

export default function UserReportsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  // Default location: Los Angeles, California (same as /usuario)
  const [formData, setFormData] = useState<ReportFormData>({
    email: '',
    latitud: 34.0522,
    longitud: -118.2437,
    descripcion: '',
    gravedad: '',
    tipo: ''
  })

  // Query to get user reports
  const { data: reportsData, isLoading, refetch } = trpc.obtenerReportesUsuario.useQuery()

  // Extract reports array from response
  const reports = reportsData?.reportes || []

  // Mutation to create report
  const crearReporteMutation = trpc.crearReporteUsuario.useMutation({
    onSuccess: () => {
      setIsSubmitted(true)
      toast.success("Report submitted successfully!")
      refetch() // Refresh reports list
    },
    onError: (error) => {
      toast.error(error.message || "Error submitting report")
    },
    onSettled: () => {
      setIsSubmitting(false)
    }
  })

  // Handle map click
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const lat = e.latlng.lat
    const lng = e.latlng.lng

    if (isValidLocation(lat, lng)) {
      setFormData(prev => ({
        ...prev,
        latitud: lat,
        longitud: lng
      }))
      toast.success('Location selected on map')
    } else {
      toast.error('Please select a location within California')
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email.trim()) {
      toast.error("Please enter your email")
      return
    }
    if (formData.latitud === 0 && formData.longitud === 0) {
      toast.error("Please select a location on the map")
      return
    }
    if (!formData.tipo) {
      toast.error("Please select the event type")
      return
    }
    if (!formData.gravedad) {
      toast.error("Please select the event severity")
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

  // Handle input changes
  const handleInputChange = (field: keyof ReportFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Reset form
  const resetForm = () => {
    setIsSubmitted(false)
    setFormData({
      email: '',
      latitud: 34.0522,
      longitud: -118.2437,
      descripcion: '',
      gravedad: '',
      tipo: ''
    })
  }

  // Debug: Show values coming from API
  if (reports.length > 0) {
    console.log('API values:', {
      gravedades: reports.map(r => r.gravedad),
      tipos: reports.map(r => r.tipo)
    })
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-green-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/usuario">
              <Button variant="outline" size="sm" className="gap-2 bg-white/80 hover:bg-white border-blue-200 hover:border-blue-300">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                My Reports
              </h1>
              <p className="text-gray-600">
                Manage and view all your pollution reports
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">
        {/* Report form */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-200">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Report Pollution
            </CardTitle>
            <CardDescription className="text-orange-600">
              Help us identify and resolve pollution issues in California
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="space-y-6 py-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">Report Submitted!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your report has been successfully submitted and will be reviewed by our administrators.
                  </p>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button onClick={resetForm} variant="outline">
                    Close
                  </Button>
                  <Button onClick={resetForm}>
                    Submit Another Report
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Interactive Map */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <Label>Location in California *</Label>
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
                      <span>Selected location: {formData.latitud.toFixed(4)}, {formData.longitud.toFixed(4)}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Contact email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll contact you at this address for report follow-up
                  </p>
                </div>

                {/* Event Type */}
                <div className="space-y-2">
                  <Label>Event Type *</Label>
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
                      <SelectValue placeholder="Select event type" />
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

                {/* Event Severity */}
                <div className="space-y-2">
                  <Label>Event Severity *</Label>
                  <Select
                    value={formData.gravedad}
                    onValueChange={(value) => handleInputChange('gravedad', value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select event severity" />
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

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Description (Optional)</Label>
                  <Textarea
                    id="descripcion"
                    placeholder="Provide details about the incident: when it occurred, what you observed, how it affects you..."
                    value={formData.descripcion}
                    onChange={(e) => handleInputChange('descripcion', e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.descripcion.length}/500 characters
                  </p>
                </div>

                {/* Submit button */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2 bg-orange-600 hover:bg-orange-700 min-w-[200px]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Quick statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Reports
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
                Critical Reports
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
                This Month
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

        {/* Reports list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report History
            </CardTitle>
            <CardDescription>
              All reports you've submitted, sorted by most recent date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading reports...</p>
                </div>
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report: UserReport) => (
                  <Card key={report.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Report header */}
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

                          {/* Report information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
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

                        {/* Report status */}
                        <div className="ml-4 text-right">
                          <Badge variant="outline" className="text-xs">
                            Under review
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
                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                <p className="text-muted-foreground">
                  Use the form above to create your first pollution report
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
