/**
 * AirNow Client
 *
 * Cliente TypeScript para AirNow API (EPA - U.S. Environmental Protection Agency)
 * Proporciona acceso a datos de calidad del aire ground-based (estaciones terrestres)
 *
 * CRÍTICO para validación: "Compare satellite data with ground station data"
 * Permite validar TEMPO/TROPOMI con mediciones EPA oficiales
 *
 * Cobertura: USA (15,000+ estaciones)
 * Latencia: Hourly updates
 * Autoridad: EPA oficial
 * Rate limit: 500 requests/hour
 */

import type {
  GeoPoint,
  AirNowParameter,
  AirNowObservation,
  AirNowForecast,
  AirNowQueryOptions,
  AirNowCredentials,
  AirNowHistoricalOptions,
  BoundingBox,
  MonitoringSite,
  MonitoringDataOptions,
} from './types';

/**
 * Cliente para AirNow API (EPA)
 *
 * Proporciona acceso centrado en datos de ground stations para:
 * - Validación de datos satelitales (TEMPO, TROPOMI)
 * - Ground truth comparison
 * - EPA official measurements
 * - Historical air quality trends
 *
 * CRITICAL para challenge: Comparar satellite vs ground data
 *
 * NO incluye lógica de negocio (health alerts, AQI calculations, etc.)
 *
 * @example
 * ```typescript
 * import { AirNowClient } from '@atmos/airnow-client';
 *
 * const client = new AirNowClient({ apiKey: 'your-api-key' });
 *
 * // Obtener observaciones actuales
 * const obs = await client.getCurrentObservationsByLocation({
 *   latitude: 34.05,
 *   longitude: -118.24
 * });
 *
 * // Comparar con datos satelitales
 * const no2Obs = obs.find(o => o.ParameterName === 'NO2');
 * console.log(`Ground NO2 AQI: ${no2Obs?.AQI}`);
 * ```
 */
export class AirNowClient {
  private apiKey: string;
  private baseUrl = 'https://www.airnowapi.org';

  /**
   * Crear nuevo cliente AirNow
   *
   * @param credentials - API Key de AirNow
   *
   * @example
   * ```typescript
   * const client = new AirNowClient({ apiKey: 'tu-api-key' });
   * ```
   */
  constructor(credentials: AirNowCredentials) {
    this.apiKey = credentials.apiKey;
  }

  // ============================================================================
  // MÉTODOS DE OBSERVACIONES ACTUALES
  // ============================================================================

  /**
   * Obtener observaciones actuales por coordenadas
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta
   * @returns Observaciones actuales de todas las estaciones cercanas
   *
   * @example
   * ```typescript
   * const obs = await client.getCurrentObservationsByLocation(
   *   { latitude: 34.05, longitude: -118.24 },
   *   { distance: 25 }
   * );
   *
   * // Comparar con TEMPO:
   * const tempo = await imageServer.tempo.getNO2AtPoint(location);
   * const airnowNO2 = obs.find(o => o.ParameterName === 'NO2');
   * console.log(`Satellite: ${tempo}, Ground: ${airnowNO2?.AQI}`);
   * ```
   */
  async getCurrentObservationsByLocation(
    location: GeoPoint,
    options: AirNowQueryOptions = {}
  ): Promise<AirNowObservation[]> {
    const { distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/observation/latLong/current/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Obtener observaciones actuales por ZIP code (solo USA)
   *
   * @param zipCode - Código postal USA
   * @param options - Opciones de consulta
   * @returns Observaciones actuales
   *
   * @example
   * ```typescript
   * const obs = await client.getCurrentObservationsByZip('90210');
   * console.log(`AQI: ${obs[0].AQI} - ${obs[0].Category.Name}`);
   * ```
   */
  async getCurrentObservationsByZip(
    zipCode: string,
    options: AirNowQueryOptions = {}
  ): Promise<AirNowObservation[]> {
    const { distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      zipCode,
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/observation/zipCode/current/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // ============================================================================
  // MÉTODOS DE FORECAST
  // ============================================================================

  /**
   * Obtener forecast de AQI por coordenadas
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta
   * @returns Forecast de AQI
   *
   * @example
   * ```typescript
   * const forecast = await client.getForecastByLocation({
   *   latitude: 34.05,
   *   longitude: -118.24
   * });
   * console.log(`Forecast para mañana: AQI ${forecast[0].AQI}`);
   * ```
   */
  async getForecastByLocation(
    location: GeoPoint,
    options: AirNowQueryOptions = {}
  ): Promise<AirNowForecast[]> {
    const { distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/forecast/latLong/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Obtener forecast de AQI por ZIP code
   *
   * @param zipCode - Código postal USA
   * @param options - Opciones de consulta
   * @returns Forecast de AQI
   *
   * @example
   * ```typescript
   * const forecast = await client.getForecastByZip('90210');
   * ```
   */
  async getForecastByZip(zipCode: string, options: AirNowQueryOptions = {}): Promise<AirNowForecast[]> {
    const { distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      zipCode,
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/forecast/zipCode/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // ============================================================================
  // MÉTODOS DE OBSERVACIONES HISTÓRICAS
  // ============================================================================

  /**
   * Obtener observaciones históricas por coordenadas
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta (incluye fecha)
   * @returns Observaciones históricas del día especificado
   *
   * @example
   * ```typescript
   * const historical = await client.getHistoricalObservationsByLocation(
   *   { latitude: 34.05, longitude: -118.24 },
   *   { date: '2025-10-01', distance: 25 }
   * );
   * console.log(`AQI histórico: ${historical[0].AQI}`);
   * ```
   */
  async getHistoricalObservationsByLocation(
    location: GeoPoint,
    options: AirNowHistoricalOptions
  ): Promise<AirNowObservation[]> {
    const { date, distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      date,
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/observation/latLong/historical/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Obtener observaciones históricas por ZIP code
   *
   * @param zipCode - Código postal USA
   * @param options - Opciones de consulta (incluye fecha)
   * @returns Observaciones históricas del día especificado
   *
   * @example
   * ```typescript
   * const historical = await client.getHistoricalObservationsByZip(
   *   '90210',
   *   { date: '2025-10-01' }
   * );
   * console.log(`AQI histórico: ${historical[0].AQI}`);
   * ```
   */
  async getHistoricalObservationsByZip(
    zipCode: string,
    options: AirNowHistoricalOptions
  ): Promise<AirNowObservation[]> {
    const { date, distance = 25, format = 'application/json' } = options;

    const params = new URLSearchParams({
      format,
      zipCode,
      date,
      distance: distance.toString(),
      API_KEY: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/aq/observation/zipCode/historical/?${params}`);

    if (!response.ok) {
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // ============================================================================
  // MÉTODOS DE ESTACIONES DE MONITOREO
  // ============================================================================

  /**
   * Obtener estaciones de monitoreo en un área geográfica
   *
   * @param bbox - Bounding box (área rectangular)
   * @param options - Opciones de consulta con fechas y parámetros
   * @returns Lista de estaciones de monitoreo en el área
   *
   * @example
   * ```typescript
   * const sites = await client.getMonitoringSites({
   *   minLongitude: -118.5,
   *   minLatitude: 33.5,
   *   maxLongitude: -117.5,
   *   maxLatitude: 34.5
   * }, {
   *   startDate: '2025-10-04T16',
   *   endDate: '2025-10-04T17',
   *   parameters: 'PM25'
   * });
   * console.log(`Encontradas ${sites.length} estaciones`);
   * ```
   */
  async getMonitoringSites(
    bbox: BoundingBox,
    options: MonitoringDataOptions
  ): Promise<MonitoringSite[]> {
    const {
      format = 'application/json',
      startDate,
      endDate,
      parameters = 'O3,PM25,NO2,SO2,CO',
      dataType = 'A',
      verbose = 1,
      monitorType = 2,
      includerawconcentrations = 1,
    } = options;

    const params = new URLSearchParams({
      startDate,
      endDate,
      parameters,
      BBOX: `${bbox.minLongitude},${bbox.minLatitude},${bbox.maxLongitude},${bbox.maxLatitude}`,
      dataType,
      format,
      verbose: verbose.toString(),
      monitorType: monitorType.toString(),
      includerawconcentrations: includerawconcentrations.toString(),
      API_KEY: this.apiKey,
    });

    const url = `${this.baseUrl}/aq/data/?${params}`;
    console.log("URL:", url);

    const response = await fetch(url);
    if (!response.ok) {

    console.log("pre json");
    const data = await response.json();
    console.log("data json");
    console.log(data);
      console.log(response.statusText);
      throw new Error(`AirNow API error: ${response.status} ${response.statusText}`);
    }

    console.log("pre json");
    const data = await response.json();
    console.log("data json");
    console.log(data);
    return data;
  }

  // ============================================================================
  // MÉTODOS HELPER
  // ============================================================================

  /**
   * Obtener observación de un parámetro específico
   *
   * @param location - Punto geográfico
   * @param parameter - Parámetro a obtener (O3, PM25, NO2, etc.)
   * @param options - Opciones de consulta
   * @returns Observación del parámetro o null si no existe
   *
   * @example
   * ```typescript
   * const no2 = await client.getParameterObservation(
   *   { latitude: 34.05, longitude: -118.24 },
   *   AirNowParameter.NO2
   * );
   * console.log(`NO2 AQI: ${no2?.AQI}`);
   * ```
   */
  async getParameterObservation(
    location: GeoPoint,
    parameter: AirNowParameter,
    options: AirNowQueryOptions = {}
  ): Promise<AirNowObservation | null> {
    const observations = await this.getCurrentObservationsByLocation(location, options);
    return observations.find((obs) => obs.ParameterName === parameter) || null;
  }

  /**
   * Obtener el peor AQI (máximo) de todas las estaciones cercanas
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta
   * @returns Observación con el peor AQI
   *
   * @example
   * ```typescript
   * const worst = await client.getWorstAQI({
   *   latitude: 34.05,
   *   longitude: -118.24
   * });
   * console.log(`Peor AQI: ${worst.AQI} (${worst.ParameterName})`);
   * ```
   */
  async getWorstAQI(location: GeoPoint, options: AirNowQueryOptions = {}): Promise<AirNowObservation> {
    const observations = await this.getCurrentObservationsByLocation(location, options);

    if (observations.length === 0) {
      throw new Error('No observations found for the specified location');
    }

    return observations.reduce((worst, current) => (current.AQI > worst.AQI ? current : worst));
  }

  // ============================================================================
  // HELPERS ESTÁTICOS
  // ============================================================================

  /**
   * Convertir AQI a categoría de color (para visualización)
   *
   * @param aqi - Valor AQI (0-500+)
   * @returns Color hexadecimal
   *
   * @example
   * ```typescript
   * const color = AirNowClient.getAQIColor(150);
   * console.log(color); // '#FF7E00' (Orange - Unhealthy for Sensitive)
   * ```
   */
  static getAQIColor(aqi: number): string {
    if (aqi <= 50) return '#00E400'; // Good - Green
    if (aqi <= 100) return '#FFFF00'; // Moderate - Yellow
    if (aqi <= 150) return '#FF7E00'; // Unhealthy for Sensitive - Orange
    if (aqi <= 200) return '#FF0000'; // Unhealthy - Red
    if (aqi <= 300) return '#8F3F97'; // Very Unhealthy - Purple
    return '#7E0023'; // Hazardous - Maroon
  }

  /**
   * Obtener categoría AQI por número
   *
   * @param aqi - Valor AQI (0-500+)
   * @returns Nombre de la categoría
   *
   * @example
   * ```typescript
   * const category = AirNowClient.getAQICategoryName(150);
   * console.log(category); // 'Unhealthy for Sensitive Groups'
   * ```
   */
  static getAQICategoryName(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  /**
   * Convertir Date a formato AirNow (YYYY-MM-DD)
   *
   * @param date - Fecha
   * @returns String en formato YYYY-MM-DD
   *
   * @example
   * ```typescript
   * const formatted = AirNowClient.dateToAirNowFormat(new Date());
   * console.log(formatted); // '2025-10-02'
   * ```
   */
  static dateToAirNowFormat(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
