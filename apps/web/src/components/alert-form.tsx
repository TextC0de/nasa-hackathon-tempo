"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Send, 
  RefreshCw, 
  MapPin, 
  Mail, 
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { Alert as AlertType } from '@/hooks/use-alerts'

interface AlertFormProps {
  onSubmit: (alertData: Omit<AlertType, 'id' | 'createdAt' | 'status'>) => void
  isLoading?: boolean
}

export function AlertForm({ onSubmit, isLoading = false }: AlertFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    location: '',
    urgency: 'medium' as AlertType['urgency'],
    contact: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.category) {
      newErrors.category = 'La categoría es obligatoria'
    }

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria'
    }

    if (formData.description.trim().length < 10) {
      newErrors.description = 'La descripción debe tener al menos 10 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit({
      category: formData.category,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      urgency: formData.urgency,
      contact: formData.contact || undefined
    })

    // Limpiar formulario
    setFormData({
      category: '',
      title: '',
      description: '',
      location: '',
      urgency: 'medium',
      contact: ''
    })
    setErrors({})
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'air-quality': 'Calidad del Aire',
      'station-malfunction': 'Estación No Funciona',
      'data-error': 'Error en Datos',
      'health-concern': 'Preocupación de Salud',
      'environmental': 'Problema Ambiental',
      'other': 'Otro'
    }
    return labels[category] || category
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Información del formulario */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Reporta problemas de calidad del aire, estaciones que no funcionan, o cualquier situación que requiera atención.
        </AlertDescription>
      </Alert>

      {/* Categoría */}
      <div className="space-y-2">
        <Label htmlFor="category" className="text-sm font-medium">
          Categoría <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={formData.category} 
          onValueChange={(value) => handleInputChange("category", value)}
        >
          <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="air-quality">Calidad del Aire</SelectItem>
            <SelectItem value="station-malfunction">Estación No Funciona</SelectItem>
            <SelectItem value="data-error">Error en Datos</SelectItem>
            <SelectItem value="health-concern">Preocupación de Salud</SelectItem>
            <SelectItem value="environmental">Problema Ambiental</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="text-xs text-red-500">{errors.category}</p>
        )}
      </div>

      {/* Título */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Título <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Resumen breve del problema"
          value={formData.title}
          onChange={(e) => handleInputChange("title", e.target.value)}
          className={errors.title ? 'border-red-500' : ''}
        />
        {errors.title && (
          <p className="text-xs text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Ubicación */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-medium">
          Ubicación
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="location"
            placeholder="Ciudad, dirección o coordenadas"
            value={formData.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Descripción <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Describe el problema o situación que quieres reportar..."
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={4}
          className={`resize-none ${errors.description ? 'border-red-500' : ''}`}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500">
          {formData.description.length}/500 caracteres
        </p>
      </div>

      {/* Urgencia */}
      <div className="space-y-2">
        <Label htmlFor="urgency" className="text-sm font-medium">
          Nivel de Urgencia
        </Label>
        <Select 
          value={formData.urgency} 
          onValueChange={(value) => handleInputChange("urgency", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Baja - Información general</SelectItem>
            <SelectItem value="medium">Media - Requiere atención</SelectItem>
            <SelectItem value="high">Alta - Urgente</SelectItem>
            <SelectItem value="critical">Crítica - Emergencia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contacto */}
      <div className="space-y-2">
        <Label htmlFor="contact" className="text-sm font-medium">
          Información de Contacto (Opcional)
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="contact"
            placeholder="Email o teléfono para seguimiento"
            value={formData.contact}
            onChange={(e) => handleInputChange("contact", e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Botón de envío */}
      <Button 
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Enviar Alerta
          </>
        )}
      </Button>
    </form>
  )
}
