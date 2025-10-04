// Función para obtener el color del AQI
export const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "text-green-600"
  if (aqi <= 100) return "text-yellow-600"
  if (aqi <= 150) return "text-orange-600"
  if (aqi <= 200) return "text-red-600"
  if (aqi <= 300) return "text-purple-600"
  return "text-red-800"
}

// Función para obtener el badge del AQI
export const getAQIBadge = (aqi: number) => {
  if (aqi <= 50) return { color: "bg-green-500", label: "Bueno" }
  if (aqi <= 100) return { color: "bg-yellow-500", label: "Moderado" }
  if (aqi <= 150) return { color: "bg-orange-500", label: "Insalubre para grupos sensibles" }
  if (aqi <= 200) return { color: "bg-red-500", label: "Insalubre" }
  if (aqi <= 300) return { color: "bg-purple-500", label: "Muy insalubre" }
  return { color: "bg-red-800", label: "Peligroso" }
}

// Función para obtener nivel de AQI
export const getAQILevel = (aqi: number) => {
  if (aqi <= 50) return "Bueno"
  if (aqi <= 100) return "Moderado"
  if (aqi <= 150) return "Insalubre para grupos sensibles"
  if (aqi <= 200) return "Insalubre"
  if (aqi <= 300) return "Muy insalubre"
  return "Peligroso"
}
