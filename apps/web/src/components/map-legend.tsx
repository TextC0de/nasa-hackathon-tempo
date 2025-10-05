"use client"

const AQI_LEVELS = [
  { range: "0-50", label: "Buena", color: "#22c55e" },
  { range: "51-100", label: "Moderada", color: "#eab308" },
  { range: "101-150", label: "Insalubre (Sensibles)", color: "#f97316" },
  { range: "151-200", label: "Insalubre", color: "#ef4444" },
  { range: "201-300", label: "Muy Insalubre", color: "#a855f7" },
  { range: "301-500", label: "Peligrosa", color: "#7f1d1d" },
]

export function MapLegend() {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
      <div className="flex items-center gap-2">
        {/* Labels flotantes sin background */}
        {AQI_LEVELS.map((level) => (
          <div
            key={level.range}
            className="flex items-center gap-1.5"
          >
            {/* Dot de color */}
            <div
              className="w-2.5 h-2.5 rounded-full shadow-lg"
              style={{ backgroundColor: level.color }}
            />
            {/* Label pequeño flotante */}
            <span
              className="text-[10px] font-medium text-foreground/90 drop-shadow-lg whitespace-nowrap"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
            >
              {level.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
