// Ejemplo práctico de datos recibidos de la API AirNow
// Este es un ejemplo real de lo que recibimos en nuestro hook useMonitoringStations

export const EXAMPLE_API_RESPONSE = [
  {
    // Identificación de la estación
    "StationID": "840MMFS11093",
    "AQSID": "06-019-0001", 
    "FullAQSID": "840MMFS11093",
    "IntlAQSCode": "840MMFS11093",
    
    // Información del parámetro medido
    "ParameterName": "PM2.5",
    "Parameter": "PM2.5",
    "ParameterCode": "88101",
    
    // Ubicación geográfica
    "Latitude": 36.9110,
    "Longitude": -119.3060,
    "Latitude_Band": "36",
    "Longitude_Band": "-119",
    
    // Timestamps
    "UTCDateTimeReported": "2025-10-04T20:00:00Z",
    "UTC": "2025-10-04T20:00:00Z",
    "DateOfLastChange": "2025-10-04T20:00:00Z",
    
    // Estado y configuración
    "Status": "Active",
    "SiteName": "Sierra National Forest",
    "SiteType": "Rural",
    "MonitorType": "1",
    "Qualifier": "",
    
    // Información de la agencia
    "AgencyID": "MMFS",
    "AgencyName": "Forest Service",
    "AQMA": "US",
    "EPARegion": "09",
    
    // Datos de medición
    "RawConcentration": 8.5,        // ← Valor real de concentración
    "Unit": "UG/M3",                // ← Unidad de medida
    "AQI": 35,                      // ← Índice de calidad del aire
    "Category": 1,                  // ← Categoría AQI (1-6)
    
    // Configuración regional
    "GMT_Offset": -8
  },
  
  {
    "StationID": "840CA060370002",
    "AQSID": "06-037-0002",
    "FullAQSID": "840CA060370002", 
    "IntlAQSCode": "840CA060370002",
    
    "ParameterName": "O3",
    "Parameter": "O3",
    "ParameterCode": "44201",
    
    "Latitude": 37.7749,
    "Longitude": -122.4194,
    "Latitude_Band": "37",
    "Longitude_Band": "-122",
    
    "UTCDateTimeReported": "2025-10-04T20:00:00Z",
    "UTC": "2025-10-04T20:00:00Z",
    "DateOfLastChange": "2025-10-04T20:00:00Z",
    
    "Status": "Active",
    "SiteName": "San Francisco Downtown",
    "SiteType": "Urban", 
    "MonitorType": "1",
    "Qualifier": "",
    
    "AgencyID": "CARB",
    "AgencyName": "California Air Resources Board",
    "AQMA": "US",
    "EPARegion": "09",
    
    "RawConcentration": 0.045,      // ← Concentración en PPM
    "Unit": "PPM",                  // ← Partes por millón
    "AQI": 42,                      // ← AQI moderado
    "Category": 1,                  // ← Categoría "Good"
    
    "GMT_Offset": -8
  },
  
  {
    "StationID": "840CA060370003",
    "AQSID": "06-037-0003",
    "FullAQSID": "840CA060370003",
    "IntlAQSCode": "840CA060370003",
    
    "ParameterName": "NO2",
    "Parameter": "NO2", 
    "ParameterCode": "42602",
    
    "Latitude": 34.0522,
    "Longitude": -118.2437,
    "Latitude_Band": "34",
    "Longitude_Band": "-118",
    
    "UTCDateTimeReported": "2025-10-04T20:00:00Z",
    "UTC": "2025-10-04T20:00:00Z",
    "DateOfLastChange": "2025-10-04T20:00:00Z",
    
    "Status": "Active",
    "SiteName": "Los Angeles Central",
    "SiteType": "Urban",
    "MonitorType": "1", 
    "Qualifier": "",
    
    "AgencyID": "CARB",
    "AgencyName": "California Air Resources Board",
    "AQMA": "US",
    "EPARegion": "09",
    
    "RawConcentration": -999,       // ← VALOR DE ERROR
    "Unit": "PPB",                  // ← Partes por billón
    "AQI": 22,                      // ← AQI inválido (por concentración -999)
    "Category": 1,
    
    "GMT_Offset": -8
  }
]

// Ejemplo de datos de calidad del aire (obtenerCalidadDelAire)
export const EXAMPLE_AIR_QUALITY_RESPONSE = [
  {
    "DateObserved": "2025-10-04",
    "HourObserved": 20,
    "LocalTimeZone": "PST", 
    "ReportingArea": "San Francisco Bay Area",
    "StateCode": "CA",
    "Latitude": 37.7749,
    "Longitude": -122.4194,
    "ParameterName": "PM2.5",
    "AQI": 45,
    "Category": {
      "Number": 1,
      "Name": "Good"
    }
  },
  {
    "DateObserved": "2025-10-04", 
    "HourObserved": 20,
    "LocalTimeZone": "PST",
    "ReportingArea": "Los Angeles Area",
    "StateCode": "CA", 
    "Latitude": 34.0522,
    "Longitude": -118.2437,
    "ParameterName": "O3",
    "AQI": 78,
    "Category": {
      "Number": 2,
      "Name": "Moderate"
    }
  }
]

// Ejemplo de datos de incendios (obtenerFuegoActivoenArea)
export const EXAMPLE_FIRE_DATA_RESPONSE = [
  {
    "latitude": 36.9110,
    "longitude": -119.3060,
    "brightness": 312.5,           // ← Brillo del fuego (Kelvin)
    "scan": 0.5,                   // ← Resolución de escaneo
    "track": 0.5,                  // ← Resolución de seguimiento
    "acq_date": "2025-10-04",      // ← Fecha de adquisición
    "acq_time": "2015",            // ← Hora de adquisición
    "satellite": "Terra",          // ← Satélite que detectó
    "confidence": "n",             // ← Confianza de detección
    "version": "6.0",              // ← Versión del algoritmo
    "bright_t31": 290.2,           // ← Brillo en banda T31
    "frp": 0.8,                    // ← Fire Radiative Power (MW)
    "daynight": "D"                // ← Día (D) o Noche (N)
  }
]
