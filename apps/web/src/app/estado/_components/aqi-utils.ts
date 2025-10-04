export const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "text-green-600"
  if (aqi <= 100) return "text-yellow-600"
  if (aqi <= 150) return "text-orange-600"
  if (aqi <= 200) return "text-red-600"
  if (aqi <= 300) return "text-purple-600"
  return "text-red-800"
}

export const getAQILevel = (aqi: number) => {
  if (aqi <= 50) return "Bueno"
  if (aqi <= 100) return "Moderado"
  if (aqi <= 150) return "Insalubre para grupos sensibles"
  if (aqi <= 200) return "Insalubre"
  if (aqi <= 300) return "Muy insalubre"
  return "Peligroso"
}

export const getAQIDetails = (aqi: number) => {
  if (aqi <= 50) return {
    emoji: "🟢",
    category: "Bueno",
    description: "Aire de calidad satisfactoria",
    population: "Ninguna población afectada",
    recommendation: "Disfruta de actividades al aire libre"
  }
  if (aqi <= 100) return {
    emoji: "🟡",
    category: "Moderado",
    description: "Calidad aceptable",
    population: "Pocos inusualmente sensibles",
    recommendation: "Personas sensibles pueden experimentar síntomas leves"
  }
  if (aqi <= 150) return {
    emoji: "🟠",
    category: "Insalubre para grupos sensibles",
    description: "Efectos en grupos sensibles",
    population: "Niños, ancianos, asmáticos",
    recommendation: "Grupos sensibles deben evitar actividades prolongadas al aire libre"
  }
  if (aqi <= 200) return {
    emoji: "🔴",
    category: "Insalubre",
    description: "Efectos en población general",
    population: "Todos pueden experimentar efectos",
    recommendation: "Evita actividades al aire libre prolongadas"
  }
  if (aqi <= 300) return {
    emoji: "🟣",
    category: "Muy insalubre",
    description: "Alerta de salud",
    population: "Efectos serios más probables",
    recommendation: "Evita todas las actividades al aire libre"
  }
  return {
    emoji: "🟤",
    category: "Peligroso",
    description: "Emergencia de salud",
    population: "Toda la población afectada",
    recommendation: "Permanece en interiores con aire filtrado"
  }
}
