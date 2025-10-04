"use client"

import { cn } from "@/lib/utils"
import { Cloud } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MetricCardProps {
  title: string
  value: string
  status: string
  statusColor: "green" | "blue" | "purple" | "yellow"
  icon?: React.ReactNode
  className?: string
}

const statusVariants = {
  green: "default" as const,
  blue: "secondary" as const, 
  purple: "destructive" as const,
  yellow: "outline" as const
}

export function MetricCard({ 
  title, 
  value, 
  status, 
  statusColor, 
  icon,
  className 
}: MetricCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-xl lg:text-2xl font-bold">
            {value}
          </div>
          <Badge variant={statusVariants[statusColor]}>
            {status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente específico para el forecast local
export function LocalForecastCard({ className }: { className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pronóstico Local</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-lg lg:text-xl font-semibold">
          Calidad del Aire Moderada
        </div>
      </CardContent>
    </Card>
  )
}
