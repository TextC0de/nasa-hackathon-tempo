// Function to get AQI color
export const getAQIColor = (aqi: number) => {
  if (aqi <= 50) return "text-green-600"
  if (aqi <= 100) return "text-yellow-600"
  if (aqi <= 150) return "text-orange-600"
  if (aqi <= 200) return "text-red-600"
  if (aqi <= 300) return "text-purple-600"
  return "text-red-800"
}

// Function to get AQI badge
export const getAQIBadge = (aqi: number) => {
  if (aqi <= 50) return { color: "bg-green-500", label: "Good" }
  if (aqi <= 100) return { color: "bg-yellow-500", label: "Moderate" }
  if (aqi <= 150) return { color: "bg-orange-500", label: "Unhealthy for Sensitive Groups" }
  if (aqi <= 200) return { color: "bg-red-500", label: "Unhealthy" }
  if (aqi <= 300) return { color: "bg-purple-500", label: "Very Unhealthy" }
  return { color: "bg-red-800", label: "Hazardous" }
}

// Function to get AQI level
export const getAQILevel = (aqi: number) => {
  if (aqi <= 50) return "Good"
  if (aqi <= 100) return "Moderate"
  if (aqi <= 150) return "Unhealthy for Sensitive Groups"
  if (aqi <= 200) return "Unhealthy"
  if (aqi <= 300) return "Very Unhealthy"
  return "Hazardous"
}
