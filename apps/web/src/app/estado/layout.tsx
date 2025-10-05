"use client"

import { EstadoSidebar } from "./_components/estado-sidebar"

export default function EstadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar persistente */}
      <EstadoSidebar />

      {/* Contenido de las subpáginas */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
