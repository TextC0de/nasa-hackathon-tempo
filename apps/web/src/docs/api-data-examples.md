# 📊 Datos de la API AirNow - Ejemplos Completos

## 🔍 **Endpoints Disponibles**

### **1. `obtenerEstacionesAirNow`**
Obtiene estaciones de monitoreo con datos en tiempo real.

### **2. `obtenerCalidadDelAire`**
Obtiene observaciones actuales de calidad del aire.

### **3. `obtenerFuegoActivoenArea`**
Obtiene datos de incendios activos en el área.

---

## 📋 **Estructura de Datos: `obtenerEstacionesAirNow`**

### **Ejemplo de Respuesta Completa:**
```json
[
  {
    "StationID": "840MMFS11093",
    "AQSID": "06-019-0001",
    "FullAQSID": "840MMFS11093",
    "ParameterName": "PM2.5",
    "Parameter": "PM2.5",
    "ParameterCode": "88101",
    "Latitude": 36.9110,
    "Longitude": -119.3060,
    "UTCDateTimeReported": "2025-10-04T20:00:00Z",
    "UTC": "2025-10-04T20:00:00Z",
    "Status": "Active",
    "AgencyID": "MMFS",
    "AgencyName": "Forest Service",
    "AQMA": "US",
    "SiteName": "Sierra National Forest",
    "SiteType": "Rural",
    "MonitorType": "1",
    "Qualifier": "",
    "RawConcentration": 8.5,
    "Unit": "UG/M3",
    "AQI": 35,
    "Category": 1,
    "EPARegion": "09",
    "Latitude_Band": "36",
    "Longitude_Band": "-119",
    "GMT_Offset": -8,
    "IntlAQSCode": "840MMFS11093",
    "DateOfLastChange": "2025-10-04T20:00:00Z"
  },
  {
    "StationID": "840CA060370002",
    "AQSID": "06-037-0002",
    "FullAQSID": "840CA060370002",
    "ParameterName": "O3",
    "Parameter": "O3",
    "ParameterCode": "44201",
    "Latitude": 37.7749,
    "Longitude": -122.4194,
    "UTCDateTimeReported": "2025-10-04T20:00:00Z",
    "UTC": "2025-10-04T20:00:00Z",
    "Status": "Active",
    "AgencyID": "CARB",
    "AgencyName": "California Air Resources Board",
    "AQMA": "US",
    "SiteName": "San Francisco Downtown",
    "SiteType": "Urban",
    "MonitorType": "1",
    "Qualifier": "",
    "RawConcentration": 0.045,
    "Unit": "PPM",
    "AQI": 42,
    "Category": 1,
    "EPARegion": "09",
    "Latitude_Band": "37",
    "Longitude_Band": "-122",
    "GMT_Offset": -8,
    "IntlAQSCode": "840CA060370002",
    "DateOfLastChange": "2025-10-04T20:00:00Z"
  }
]
```

### **Campos Explicados:**

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| `StationID` | string | ID único de la estación | "840MMFS11093" |
| `AQSID` | string | ID del sistema AQS | "06-019-0001" |
| `FullAQSID` | string | ID completo AQS | "840MMFS11093" |
| `ParameterName` | string | Nombre del parámetro | "PM2.5", "O3", "NO2" |
| `Parameter` | string | Parámetro medido | "PM2.5" |
| `ParameterCode` | string | Código EPA del parámetro | "88101" |
| `Latitude` | number | Latitud de la estación | 36.9110 |
| `Longitude` | number | Longitud de la estación | -119.3060 |
| `UTCDateTimeReported` | string | Fecha/hora UTC del reporte | "2025-10-04T20:00:00Z" |
| `UTC` | string | Timestamp UTC | "2025-10-04T20:00:00Z" |
| `Status` | string | Estado de la estación | "Active", "Inactive" |
| `AgencyID` | string | ID de la agencia | "MMFS", "CARB" |
| `AgencyName` | string | Nombre de la agencia | "Forest Service" |
| `AQMA` | string | Código de país | "US" |
| `SiteName` | string | Nombre del sitio | "Sierra National Forest" |
| `SiteType` | string | Tipo de sitio | "Rural", "Urban" |
| `MonitorType` | string | Tipo de monitor | "1", "2" |
| `Qualifier` | string | Calificador de datos | "" |
| `RawConcentration` | number | Concentración medida | 8.5 |
| `Unit` | string | Unidad de medida | "UG/M3", "PPM", "PPB" |
| `AQI` | number | Índice de calidad del aire | 35 |
| `Category` | number | Categoría AQI (1-6) | 1 |
| `EPARegion` | string | Región EPA | "09" |
| `Latitude_Band` | string | Banda de latitud | "36" |
| `Longitude_Band` | string | Banda de longitud | "-119" |
| `GMT_Offset` | number | Offset GMT | -8 |
| `IntlAQSCode` | string | Código AQS internacional | "840MMFS11093" |
| `DateOfLastChange` | string | Última actualización | "2025-10-04T20:00:00Z" |

---

## 📋 **Estructura de Datos: `obtenerCalidadDelAire`**

### **Ejemplo de Respuesta:**
```json
[
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
```

---

## 📋 **Estructura de Datos: `obtenerFuegoActivoenArea`**

### **Ejemplo de Respuesta:**
```json
[
  {
    "latitude": 36.9110,
    "longitude": -119.3060,
    "brightness": 312.5,
    "scan": 0.5,
    "track": 0.5,
    "acq_date": "2025-10-04",
    "acq_time": "2015",
    "satellite": "Terra",
    "confidence": "n",
    "version": "6.0",
    "bright_t31": 290.2,
    "frp": 0.8,
    "daynight": "D"
  }
]
```

---

## 🔧 **Parámetros Disponibles**

### **Contaminantes Medidos:**
- **PM2.5**: Partículas finas (μg/m³)
- **PM10**: Partículas gruesas (μg/m³)
- **O3**: Ozono (ppm)
- **NO2**: Dióxido de nitrógeno (ppb)
- **CO**: Monóxido de carbono (ppm)
- **SO2**: Dióxido de azufre (ppb)

### **Categorías AQI:**
1. **Good** (0-50): Verde
2. **Moderate** (51-100): Amarillo
3. **Unhealthy for Sensitive Groups** (101-150): Naranja
4. **Unhealthy** (151-200): Rojo
5. **Very Unhealthy** (201-300): Púrpura
6. **Hazardous** (301+): Marrón

### **Agencias Comunes:**
- **CARB**: California Air Resources Board
- **MMFS**: Forest Service
- **EPA**: Environmental Protection Agency
- **SJVAPCD**: San Joaquin Valley Air Pollution Control District

---

## ⚠️ **Valores de Error Comunes**

### **Concentraciones Inválidas:**
- `-999`: Dato no disponible
- `-9999`: Error de medición
- `-1`: Sensor offline
- `999`: Valor fuera de rango
- `9999`: Error del sistema

### **Estados de Estación:**
- `"Active"`: Estación operativa
- `"Inactive"`: Estación no operativa
- `"Maintenance"`: En mantenimiento
- `"Offline"`: Fuera de línea
- `undefined`: Estado no definido

---

## 🚀 **Uso en el Código**

### **Hook Personalizado:**
```typescript
const { stations, airQuality, isLoading, error, stats } = useMonitoringStations({
  centerLat: 36.7783,
  centerLng: -119.4179,
  radiusKm: 200
})
```

### **Filtrado de Datos Válidos:**
```typescript
const validStations = stations.filter(station => 
  station.RawConcentration > 0 && 
  ![-999, -9999, -1, 999, 9999].includes(station.RawConcentration)
)
```

### **Cálculo de Estadísticas:**
```typescript
const stats = {
  total: stations.length,
  active: stations.filter(s => s.Status === 'Active').length,
  validData: validStations.length,
  avgAQI: validStations.reduce((sum, s) => sum + s.AQI, 0) / validStations.length
}
```
