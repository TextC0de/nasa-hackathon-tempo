/**
 * AirNow API Types
 *
 * Tipos TypeScript para trabajar con AirNow API (EPA)
 */

/**
 * Punto geográfico (latitud, longitud)
 */
export interface GeoPoint {
  /** Latitud en grados (-90 a 90) */
  latitude: number;
  /** Longitud en grados (-180 a 180) */
  longitude: number;
}

/**
 * Parámetros disponibles en AirNow
 */
export enum AirNowParameter {
  /** Ozone (O3) */
  OZONE = 'OZONE',
  /** PM2.5 (fine particulate matter) */
  PM25 = 'PM25',
  /** PM10 (coarse particulate matter) */
  PM10 = 'PM10',
  /** Carbon Monoxide (CO) */
  CO = 'CO',
  /** Nitrogen Dioxide (NO2) */
  NO2 = 'NO2',
  /** Sulfur Dioxide (SO2) */
  SO2 = 'SO2',
}

/**
 * Categoría AQI
 */
export interface AQICategory {
  /** Número de categoría (1-6) */
  Number: number;
  /** Nombre de la categoría */
  Name: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
}

/**
 * Observación actual de AirNow
 */
export interface AirNowObservation {
  /** Fecha de observación (YYYY-MM-DD) */
  DateObserved: string;
  /** Hora de observación (0-23) */
  HourObserved: number;
  /** Timezone local (e.g., 'PST', 'EST') */
  LocalTimeZone: string;
  /** Área de reporte */
  ReportingArea: string;
  /** Código de estado (e.g., 'CA', 'NY') */
  StateCode: string;
  /** Latitud de la estación */
  Latitude: number;
  /** Longitud de la estación */
  Longitude: number;
  /** Nombre del parámetro (O3, PM2.5, NO2, etc.) */
  ParameterName: string;
  /** Valor AQI (0-500+) */
  AQI: number;
  /** Categoría AQI */
  Category: AQICategory;
}

/**
 * Forecast de AirNow
 */
export interface AirNowForecast {
  /** Fecha del forecast (YYYY-MM-DD) */
  DateForecast: string;
  /** Fecha de emisión (YYYY-MM-DD) */
  DateIssue: string;
  /** Área de reporte */
  ReportingArea: string;
  /** Código de estado */
  StateCode: string;
  /** Latitud */
  Latitude: number;
  /** Longitud */
  Longitude: number;
  /** Nombre del parámetro */
  ParameterName: string;
  /** Valor AQI pronosticado */
  AQI: number;
  /** Categoría AQI */
  Category: AQICategory;
  /** Discusión del forecast (opcional) */
  Discussion?: string;
}

/**
 * Opciones para consultas AirNow
 */
export interface AirNowQueryOptions {
  /** Radio de búsqueda en millas (por defecto 25) */
  distance?: number;
  /** Formato de respuesta (por defecto JSON) */
  format?: 'application/json' | 'text/csv';
}

/**
 * Opciones para consultas históricas
 */
export interface AirNowHistoricalOptions extends AirNowQueryOptions {
  /** Fecha de observación (YYYY-MM-DD) */
  date: string;
}

/**
 * Bounding Box geográfico
 */
export interface BoundingBox {
  /** Longitud mínima (oeste) */
  minLongitude: number;
  /** Latitud mínima (sur) */
  minLatitude: number;
  /** Longitud máxima (este) */
  maxLongitude: number;
  /** Latitud máxima (norte) */
  maxLatitude: number;
}

/**
 * Información de estación de monitoreo
 */
export interface MonitoringSite {
  /** ID de la estación AirNow */
  StationID: string;
  /** ID del sistema AQS */
  AQSID: string;
  /** Nombre completo del sitio */
  FullAQSID: string;
  /** Nombre del parámetro medido */
  ParameterName: string;
  /** Latitud de la estación */
  Latitude: number;
  /** Longitud de la estación */
  Longitude: number;
  /** Fecha y hora UTC del reporte */
  UTCDateTimeReported: string;
  /** Estado de la estación (e.g., 'Active') */
  Status: string;
  /** ID de la agencia responsable */
  AgencyID: string;
  /** Nombre de la agencia */
  AgencyName: string;
  /** Código de país (e.g., 'US') */
  AQMA: string;
}

/**
 * Opciones para obtener datos de monitoreo
 */
export interface MonitoringDataOptions extends AirNowQueryOptions {
  /** Fecha/hora de inicio (YYYY-MM-DDTHH) */
  startDate: string;
  /** Fecha/hora de fin (YYYY-MM-DDTHH) */
  endDate: string;
  /** Parámetros a consultar (e.g., 'PM25', 'O3', 'NO2') */
  parameters: string;
  /** Tipo de datos: 'A' (observaciones) o 'B' (promedios) */
  dataType?: 'A' | 'B';
  /** Modo verbose (0 o 1) */
  verbose?: 0 | 1;
  /** Tipo de monitor (1, 2, o ambos) */
  monitorType?: 1 | 2;
  /** Incluir concentraciones raw (0 o 1) */
  includerawconcentrations?: 0 | 1;
}

/**
 * Credenciales AirNow API
 */
export interface AirNowCredentials {
  /** API Key de AirNow (obtener en https://docs.airnowapi.org) */
  apiKey: string;
}
