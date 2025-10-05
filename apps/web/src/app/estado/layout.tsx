"use client"

import { EstadoSidebar } from "./_components/estado-sidebar"

export default function EstadoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-background">
      {/* Sidebar fixed - se expande con hover */}
      <EstadoSidebar />

      {/* Contenido de las subpáginas - con margin-left para el sidebar colapsado */}
      <div className="ml-16 h-full overflow-hidden">
        {children}
      </div>
    </div>
  )
}
