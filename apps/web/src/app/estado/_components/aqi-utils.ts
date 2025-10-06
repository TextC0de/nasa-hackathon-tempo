export const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "text-green-600"
  if (aqi <= 100) return "text-yellow-600"
  if (aqi <= 150) return "text-orange-600"
  if (aqi <= 200) return "text-red-600"
  if (aqi <= 300) return "text-purple-600"
  return "text-red-800"
}

export const getAQILevel = (aqi: number) => {
  if (aqi <= 50) return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy for Sensitive Groups"
  if (aqi <= 200) return "Unhealthy"
  if (aqi <= 300) return "Very Unhealthy"
  return "Hazardous"
}

export const getAQIDetails = (aqi: number) => {
  if (aqi <= 50) return {
    emoji: "🟢",
    category: "Good",
    description: "Satisfactory air quality",
    population: "No population affected",
    recommendation: "Enjoy outdoor activities"
  }
  if (aqi <= 100) return {
    emoji: "🟡",
    category: "Moderate",
    description: "Acceptable quality",
    population: "Few unusually sensitive individuals",
    recommendation: "Sensitive individuals may experience mild symptoms"
  }
  if (aqi <= 150) return {
    emoji: "🟠",
    category: "Unhealthy for Sensitive Groups",
    description: "Effects on sensitive groups",
    population: "Children, elderly, asthmatics",
    recommendation: "Sensitive groups should avoid prolonged outdoor activities"
  }
  if (aqi <= 200) return {
    emoji: "🔴",
    category: "Unhealthy",
    description: "Effects on general population",
    population: "Everyone may experience effects",
    recommendation: "Avoid prolonged outdoor activities"
  }
  if (aqi <= 300) return {
    emoji: "🟣",
    category: "Very Unhealthy",
    description: "Health alert",
    population: "Serious effects more likely",
    recommendation: "Avoid all outdoor activities"
  }
  return {
    emoji: "🟤",
    category: "Hazardous",
    description: "Health emergency",
    population: "Entire population affected",
    recommendation: "Stay indoors with filtered air"
  }
}
