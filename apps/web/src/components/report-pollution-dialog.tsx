"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Send, CheckCircle, MapPin, Navigation } from "lucide-react"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Tipos para el formulario
interface ReportFormData {
  email: string
  latitud: number
  longitud: number
  descripcion: string
  gravedad: string
  tipo: string
}

type EventType = 'fire' | 'smoke' | 'dust'
type SeverityLevel = 'low' | 'intermediate' | 'critical'

// Importar el mapa específico para reportes
const ReportMap = dynamic(() => import("./report-map").then(mod => ({ default: mod.ReportMap })), {
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

// Configuración de tipos de eventos
const EVENT_TYPES = [
  { 
    value: 'fire' as EventType, 
    label: 'Fuego', 
    description: 'Incendios forestales, industriales o urbanos', 
    icon: '🔥' 
  },
  { 
    value: 'smoke' as EventType, 
    label: 'Humo', 
    description: 'Columnas de humo, quema de materiales', 
    icon: '💨' 
  },
  { 
    value: 'dust' as EventType, 
    label: 'Polvo', 
    description: 'Polvo en suspensión, partículas en el aire', 
    icon: '🌪️' 
  },
] as const

// Configuración de niveles de gravedad
const SEVERITY_LEVELS = [
  { 
    value: 'low' as SeverityLevel, 
    label: 'Bajo', 
    description: 'Impacto mínimo, no representa riesgo inmediato', 
    color: 'text-green-600 bg-green-50 border-green-200' 
  },
  { 
    value: 'intermediate' as SeverityLevel, 
    label: 'Intermedio', 
    description: 'Impacto moderado, requiere atención', 
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200' 
  },
  { 
    value: 'critical' as SeverityLevel, 
    label: 'Crítico', 
    description: 'Alto riesgo, requiere acción inmediata', 
    color: 'text-red-600 bg-red-50 border-red-200' 
  },
] as const

// Límites geográficos de California para validación
const CALIFORNIA_BOUNDS = {
  north: 42.0,
  south: 32.5,
  east: -114.1,
  west: -124.4
} as const

// Funciones de validación
const isValidLocation = (lat: number, lng: number): boolean => {
  return lat >= CALIFORNIA_BOUNDS.south && 
         lat <= CALIFORNIA_BOUNDS.north &&
         lng >= CALIFORNIA_BOUNDS.west && 
         lng <= CALIFORNIA_BOUNDS.east
}

const validateForm = (formData: ReportFormData): string | null => {
  if (!formData.email.trim()) return "Por favor ingresa tu email"
  if (formData.latitud === 0 && formData.longitud === 0) return "Por favor selecciona una ubicación en el mapa"
  if (!formData.tipo) return "Por favor selecciona el tipo de evento"
  if (!formData.gravedad) return "Por favor selecciona la gravedad del evento"
  return null
}

interface ReportPollutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Estado inicial del formulario
const INITIAL_FORM_DATA: ReportFormData = {
  email: '',
  latitud: 0,
  longitud: 0,
  descripcion: '',
  gravedad: '',
  tipo: ''
} as const

export function ReportPollutionDialog({ open, onOpenChange }: ReportPollutionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [reportId, setReportId] = useState<string | null>(null)
  const [formData, setFormData] = useState<ReportFormData>(INITIAL_FORM_DATA)

  // Mutación para crear reporte
  const crearReporteMutation = trpc.crearReporteUsuario.useMutation({
    onSuccess: (data) => {
      setIsSubmitted(true)
      setReportId(data.reporte?.id || 'N/A')
      toast.success("¡Reporte enviado exitosamente!")
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
    
    const validationError = validateForm(formData)
    if (validationError) {
      toast.error(validationError)
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
    setReportId(null)
    setFormData(INITIAL_FORM_DATA)
  }

  // Cerrar diálogo y resetear formulario
  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetForm, 300)
  }

  // Hacer nuevo reporte
  const handleNewReport = resetForm

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[90]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Reportar Contaminación
          </DialogTitle>
          <DialogDescription>
            Ayúdanos a identificar y resolver problemas de contaminación en California.
            Tu reporte será enviado a los administradores para su revisión.
          </DialogDescription>
        </DialogHeader>

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
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>ID del Reporte:</strong> #{reportId}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Recibirás una respuesta en las próximas 24-48 horas.
              </p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={handleClose} variant="outline">
                Cerrar
              </Button>
              <Button onClick={handleNewReport}>
                Hacer Otro Reporte
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            {/* Información de California */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Reporte en California</span>
              </div>
              <p className="text-xs text-blue-700">
                Haz clic en el mapa de California para marcar la ubicación exacta del problema de contaminación.
              </p>
            </div>

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
              
              {formData.latitud === 0 && formData.longitud === 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Haz clic en el mapa para seleccionar la ubicación del problema</span>
                </div>
              )}
            </div>

            {/* Email - Después de seleccionar ubicación */}
            {formData.latitud !== 0 && formData.longitud !== 0 && (
              <div className="space-y-2">
                <Label htmlFor="email">Email de contacto *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="transition-all duration-200"
                />
                <p className="text-xs text-muted-foreground">
                  Te contactaremos en esta dirección para seguimiento del reporte
                </p>
              </div>
            )}

            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Evento *</Label>
              {formData.latitud === 0 && formData.longitud === 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Primero selecciona una ubicación en el mapa para continuar
                </p>
              )}
              <Select 
                value={formData.tipo} 
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    tipo: value,
                    gravedad: '' // Reset gravedad when tipo changes
                  }))
                }}
                disabled={formData.latitud === 0 && formData.longitud === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona el tipo de evento" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
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
              <Label htmlFor="gravedad">Gravedad del Evento *</Label>
              <Select 
                value={formData.gravedad} 
                onValueChange={(value) => handleInputChange('gravedad', value)}
                disabled={formData.latitud === 0 && formData.longitud === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona la gravedad del evento" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
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
                disabled={formData.latitud === 0 && formData.longitud === 0}
                className="transition-all duration-200"
              />
              <p className="text-xs text-muted-foreground">
                {formData.descripcion.length}/500 caracteres
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || formData.latitud === 0 || formData.longitud === 0 || !formData.tipo || !formData.gravedad || !formData.email}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Reporte
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
