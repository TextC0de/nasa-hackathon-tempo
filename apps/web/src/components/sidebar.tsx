"use client"

import { cn } from "@/lib/utils"
import {
  Circle,
  User,
  Cloud,
  Zap,
  FileText,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SidebarTabs } from "@/components/sidebar-tabs"

interface SidebarProps {
  className?: string
  onClose?: () => void
}

const navigation = [
  { name: "Panel de Control", icon: Circle, href: "#", current: false },
  { name: "Calidad del Aire", icon: User, href: "#", current: true },
  { name: "Patrones Climáticos", icon: Cloud, href: "#", current: false },
  { name: "Alertas de Exposición", icon: Zap, href: "#", current: false },
  { name: "Tendencias Históricas", icon: FileText, href: "#", current: false },
]

export function Sidebar({ className, onClose }: SidebarProps) {
  return (
    <div className={cn("flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border", className)}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          {/* Logo usando Avatar de shadcn/ui */}
          <Avatar className="h-8 w-8">
            <AvatarImage src="/atmos.svg" alt="AtmOS Logo" />
            <AvatarFallback className="text-xs font-semibold">AT</AvatarFallback>
          </Avatar>
          <span className="text-lg font-semibold text-sidebar-foreground">AtmOS</span>
        </div>
        
            {/* Close button for mobile */}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
      </div>

      <Separator className="mx-3" />
      
      {/* Navigation */}
      <nav className="px-3 py-4">
        <div className="flex flex-col gap-y-2">
          {navigation.map((item) => (
            <Button
              key={item.name}
              variant={item.current ? "secondary" : "ghost"}
              className="w-full justify-start gap-x-3 p-3 h-auto"
              onClick={onClose} // Close sidebar when navigating on mobile
              asChild
            >
              <a href={item.href}>
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </a>
            </Button>
          ))}
        </div>
      </nav>

      <Separator className="mx-3" />
      
          {/* Tabs with data */}
          <div className="px-3 py-4 flex-1 overflow-auto">
            <SidebarTabs />
          </div>
    </div>
  )
}
