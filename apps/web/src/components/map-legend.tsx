"use client"

const AQI_LEVELS = [
  { range: "0-50", label: "Buena", color: "#22c55e", textColor: "text-green-700" },
  { range: "51-100", label: "Moderada", color: "#eab308", textColor: "text-yellow-700" },
  { range: "101-150", label: "Insalubre (Sensibles)", color: "#f97316", textColor: "text-orange-700" },
  { range: "151-200", label: "Insalubre", color: "#ef4444", textColor: "text-red-700" },
  { range: "201-300", label: "Muy Insalubre", color: "#a855f7", textColor: "text-purple-700" },
  { range: "301-500", label: "Peligrosa", color: "#7f1d1d", textColor: "text-red-900" },
]


export function MapLegend() {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-center">
          {/* Solo la tira de colores AQI */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              Calidad del Aire (AQI)
            </span>
            <div className="flex w-full max-w-5xl h-10 rounded-lg overflow-hidden shadow-lg border-2 border-white/30 bg-white/10 backdrop-blur-sm">
              {/* Segmentos individuales de colores AQI */}
              {AQI_LEVELS.map((level, index) => (
                <div
                  key={level.range}
                  className="flex-1 flex items-center justify-center relative"
                  style={{ 
                    backgroundColor: level.color,
                    minWidth: level.label === "Insalubre (Sensibles)" ? "180px" : "120px"
                  }}
                >
                  {/* Texto centrado en cada segmento */}
                  <span className="text-xs font-semibold text-white text-center px-1 leading-tight">
                    {level.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
