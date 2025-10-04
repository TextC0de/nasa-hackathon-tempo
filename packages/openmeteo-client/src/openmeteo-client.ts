/**
 * Open-Meteo Client
 *
 * Cliente TypeScript para Open-Meteo APIs (Historical Archive & Forecast)
 * Proporciona acceso a datos meteorológicos históricos y de pronóstico
 *
 * CRÍTICO para advección: Wind speed, wind direction, boundary layer height
 * Permite modelar transporte atmosférico de contaminantes
 *
 * Cobertura: Global
 * Resolución: Hourly desde 1940 hasta hoy
 * Latencia: Historical Archive (1940-presente), Forecast (16 días)
 * Rate limit: 10,000 requests/día (suficiente para research)
 * Costo: FREE - No API key requerida
 */

import type {
  GeoPoint,
  HistoricalWeatherOptions,
  ForecastWeatherOptions,
  HistoricalWeatherResponse,
  ForecastWeatherResponse,
  OpenMeteoError,
  WeatherSnapshot,
} from './types';
import { HourlyVariable } from './types';

/**
 * Cliente para Open-Meteo APIs
 *
 * Proporciona acceso a datos meteorológicos para:
 * - Advection modeling (wind speed, direction, PBL height)
 * - Atmospheric transport physics
 * - Weather-corrected air quality forecasting
 * - Historical analysis y validation
 *
 * CRITICAL para advección: Boundary layer height, wind fields
 *
 * NO requiere API key
 * FREE para uso research
 *
 * @example
 * ```typescript
 * import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client';
 *
 * const client = new OpenMeteoClient();
 *
 * // Obtener datos históricos para advección
 * const weather = await client.getHistoricalWeather({
 *   latitude: 34.05,
 *   longitude: -118.24
 * }, {
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   hourly: [
 *     HourlyVariable.WIND_SPEED_10M,
 *     HourlyVariable.WIND_DIRECTION_10M,
 *     HourlyVariable.BOUNDARY_LAYER_HEIGHT,
 *     HourlyVariable.PRECIPITATION,
 *     HourlyVariable.TEMPERATURE_2M
 *   ]
 * });
 *
 * console.log(`PBL Height: ${weather.hourly?.boundary_layer_height?.[0]}m`);
 * ```
 */
export class OpenMeteoClient {
  private archiveBaseUrl = 'https://archive-api.open-meteo.com/v1/archive';
  private forecastBaseUrl = 'https://api.open-meteo.com/v1/forecast';

  /**
   * Crear nuevo cliente Open-Meteo
   *
   * NO requiere credenciales (API es gratuita)
   *
   * @example
   * ```typescript
   * const client = new OpenMeteoClient();
   * ```
   */
  constructor() {
    // No credentials needed - Open-Meteo is free!
  }

  // ============================================================================
  // MÉTODOS DE HISTORICAL ARCHIVE
  // ============================================================================

  /**
   * Obtener datos meteorológicos históricos
   *
   * Archive API: 1940 hasta presente
   * Resolución: Hourly
   * Cobertura: Global
   *
   * CRITICAL para advección: boundary_layer_height, wind fields
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta (fechas, variables)
   * @returns Datos meteorológicos históricos
   *
   * @example
   * ```typescript
   * const weather = await client.getHistoricalWeather(
   *   { latitude: 34.05, longitude: -118.24 },
   *   {
   *     startDate: '2024-01-01',
   *     endDate: '2024-01-31',
   *     hourly: [
   *       HourlyVariable.WIND_SPEED_10M,
   *       HourlyVariable.WIND_DIRECTION_10M,
   *       HourlyVariable.BOUNDARY_LAYER_HEIGHT,
   *       HourlyVariable.PRECIPITATION,
   *       HourlyVariable.TEMPERATURE_2M,
   *       HourlyVariable.SURFACE_PRESSURE
   *     ]
   *   }
   * );
   *
   * // Usar para advection model:
   * const windSpeed = weather.hourly?.windspeed_10m?.[0];
   * const windDir = weather.hourly?.winddirection_10m?.[0];
   * const pblHeight = weather.hourly?.boundary_layer_height?.[0];
   * ```
   */
  async getHistoricalWeather(
    location: GeoPoint,
    options: HistoricalWeatherOptions
  ): Promise<HistoricalWeatherResponse> {
    const params = this.buildHistoricalParams(location, options);
    const url = `${this.archiveBaseUrl}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error: OpenMeteoError = await response.json();
      throw new Error(`Open-Meteo API error: ${error.reason}`);
    }

    return await response.json();
  }

  /**
   * Obtener múltiples locaciones en paralelo (bulk)
   *
   * Útil para obtener weather data de múltiples ciudades a la vez
   * Rate limit: 10,000 req/día
   *
   * @param locations - Array de puntos geográficos
   * @param options - Opciones de consulta
   * @returns Array de respuestas
   *
   * @example
   * ```typescript
   * const cities = [
   *   { latitude: 34.05, longitude: -118.24 }, // LA
   *   { latitude: 37.77, longitude: -122.42 }, // SF
   *   { latitude: 40.71, longitude: -74.01 }   // NYC
   * ];
   *
   * const weatherData = await client.getHistoricalWeatherBulk(cities, {
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   hourly: [HourlyVariable.WIND_SPEED_10M, HourlyVariable.BOUNDARY_LAYER_HEIGHT]
   * });
   * ```
   */
  async getHistoricalWeatherBulk(
    locations: GeoPoint[],
    options: HistoricalWeatherOptions
  ): Promise<HistoricalWeatherResponse[]> {
    const promises = locations.map((location) => this.getHistoricalWeather(location, options));
    return await Promise.all(promises);
  }

  // ============================================================================
  // MÉTODOS DE FORECAST (para producción)
  // ============================================================================

  /**
   * Obtener pronóstico meteorológico
   *
   * Forecast API: 16 días hacia adelante
   * Resolución: Hourly
   * Update: 4 veces por día
   *
   * Útil cuando se usa advection model en producción (real-time forecasting)
   *
   * @param location - Punto geográfico
   * @param options - Opciones de consulta
   * @returns Pronóstico meteorológico
   *
   * @example
   * ```typescript
   * const forecast = await client.getForecast(
   *   { latitude: 34.05, longitude: -118.24 },
   *   {
   *     forecastDays: 7,
   *     hourly: [
   *       HourlyVariable.WIND_SPEED_10M,
   *       HourlyVariable.WIND_DIRECTION_10M,
   *       HourlyVariable.BOUNDARY_LAYER_HEIGHT,
   *       HourlyVariable.PRECIPITATION
   *     ]
   *   }
   * );
   *
   * // Usar para forecast advection model
   * console.log(`Wind forecast: ${forecast.hourly?.windspeed_10m?.[0]} m/s`);
   * ```
   */
  async getForecast(location: GeoPoint, options: ForecastWeatherOptions = {}): Promise<ForecastWeatherResponse> {
    const params = this.buildForecastParams(location, options);
    const url = `${this.forecastBaseUrl}?${params}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error: OpenMeteoError = await response.json();
      throw new Error(`Open-Meteo API error: ${error.reason}`);
    }

    return await response.json();
  }

  /**
   * Obtener forecast en múltiples locaciones
   *
   * @param locations - Array de puntos geográficos
   * @param options - Opciones de consulta
   * @returns Array de pronósticos
   */
  async getForecastBulk(locations: GeoPoint[], options: ForecastWeatherOptions = {}): Promise<ForecastWeatherResponse[]> {
    const promises = locations.map((location) => this.getForecast(location, options));
    return await Promise.all(promises);
  }

  // ============================================================================
  // MÉTODOS HELPER
  // ============================================================================

  /**
   * Obtener weather snapshot en un timestamp específico
   *
   * Extrae condiciones meteorológicas de la respuesta hourly
   *
   * @param weather - Respuesta de historical o forecast
   * @param timestamp - Fecha/hora a extraer
   * @returns Weather conditions en ese momento
   *
   * @example
   * ```typescript
   * const weather = await client.getHistoricalWeather(...);
   * const snapshot = client.getWeatherAtTime(
   *   weather,
   *   new Date('2024-01-15T12:00:00Z')
   * );
   *
   * console.log(`Wind: ${snapshot.windSpeed} m/s @ ${snapshot.windDirection}°`);
   * console.log(`PBL: ${snapshot.boundaryLayerHeight}m`);
   * ```
   */
  getWeatherAtTime(
    weather: HistoricalWeatherResponse | ForecastWeatherResponse,
    timestamp: Date
  ): WeatherSnapshot | null {
    if (!weather.hourly) {
      return null;
    }

    const targetTime = timestamp.toISOString().slice(0, 19); // Remove milliseconds
    const index = weather.hourly.time.findIndex((t) => t.startsWith(targetTime.slice(0, 13))); // Match hour

    if (index === -1) {
      return null;
    }

    return {
      time: new Date(weather.hourly.time[index]),
      temperature: weather.hourly.temperature_2m?.[index],
      windSpeed: weather.hourly.windspeed_10m?.[index],
      windDirection: weather.hourly.winddirection_10m?.[index],
      precipitation: weather.hourly.precipitation?.[index],
      boundaryLayerHeight: weather.hourly.boundary_layer_height?.[index],
      surfacePressure: weather.hourly.surface_pressure?.[index],
      cloudCover: weather.hourly.cloud_cover?.[index],
      relativeHumidity: weather.hourly.relative_humidity_2m?.[index],
    };
  }

  /**
   * Convertir respuesta a array de snapshots
   *
   * Convierte datos hourly en array de objetos estructurados
   *
   * @param weather - Respuesta de historical o forecast
   * @returns Array de weather snapshots
   *
   * @example
   * ```typescript
   * const weather = await client.getHistoricalWeather(...);
   * const snapshots = client.toWeatherSnapshots(weather);
   *
   * for (const snap of snapshots) {
   *   console.log(`${snap.time}: Wind ${snap.windSpeed} m/s, PBL ${snap.boundaryLayerHeight}m`);
   * }
   * ```
   */
  toWeatherSnapshots(weather: HistoricalWeatherResponse | ForecastWeatherResponse): WeatherSnapshot[] {
    if (!weather.hourly) {
      return [];
    }

    const snapshots: WeatherSnapshot[] = [];

    for (let i = 0; i < weather.hourly.time.length; i++) {
      snapshots.push({
        time: new Date(weather.hourly.time[i]),
        temperature: weather.hourly.temperature_2m?.[i],
        windSpeed: weather.hourly.windspeed_10m?.[i],
        windDirection: weather.hourly.winddirection_10m?.[i],
        precipitation: weather.hourly.precipitation?.[i],
        boundaryLayerHeight: weather.hourly.boundary_layer_height?.[i],
        surfacePressure: weather.hourly.surface_pressure?.[i],
        cloudCover: weather.hourly.cloud_cover?.[i],
        relativeHumidity: weather.hourly.relative_humidity_2m?.[i],
      });
    }

    return snapshots;
  }

  // ============================================================================
  // HELPERS ESTÁTICOS
  // ============================================================================

  /**
   * Convertir Date a formato Open-Meteo (YYYY-MM-DD)
   *
   * @param date - Fecha
   * @returns String en formato YYYY-MM-DD
   *
   * @example
   * ```typescript
   * const formatted = OpenMeteoClient.dateToOpenMeteoFormat(new Date());
   * console.log(formatted); // '2025-10-04'
   * ```
   */
  static dateToOpenMeteoFormat(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Calcular componentes U y V del viento (para advección vectorial)
   *
   * @param speed - Wind speed (m/s)
   * @param direction - Wind direction (° meteorológica, 0° = Norte)
   * @returns Componentes [u, v] en m/s
   *
   * @example
   * ```typescript
   * const [u, v] = OpenMeteoClient.windComponents(10, 45);
   * console.log(`U: ${u}, V: ${v}`); // Wind from NE
   * ```
   */
  static windComponents(speed: number, direction: number): [number, number] {
    // Meteorological convention: direction is "from"
    // Convert to radians and rotate (0° = North, clockwise)
    const radians = ((direction + 180) * Math.PI) / 180; // +180 to convert "from" to "to"

    const u = -speed * Math.sin(radians); // East-west component
    const v = -speed * Math.cos(radians); // North-south component

    return [u, v];
  }

  /**
   * Obtener variables hourly recomendadas para advección
   *
   * @returns Array de variables críticas para advection modeling
   */
  static getAdvectionVariables(): HourlyVariable[] {
    return [
      HourlyVariable.WIND_SPEED_10M,
      HourlyVariable.WIND_DIRECTION_10M,
      HourlyVariable.BOUNDARY_LAYER_HEIGHT,
      HourlyVariable.PRECIPITATION,
      HourlyVariable.TEMPERATURE_2M,
      HourlyVariable.SURFACE_PRESSURE,
    ];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private buildHistoricalParams(location: GeoPoint, options: HistoricalWeatherOptions): URLSearchParams {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      start_date: options.startDate,
      end_date: options.endDate,
    });

    if (options.hourly && options.hourly.length > 0) {
      params.append('hourly', options.hourly.join(','));
    }

    if (options.daily && options.daily.length > 0) {
      params.append('daily', options.daily.join(','));
    }

    if (options.timezone) {
      params.append('timezone', options.timezone);
    }

    if (options.elevation !== undefined) {
      params.append('elevation', options.elevation.toString());
    }

    if (options.temperatureUnit) {
      params.append('temperature_unit', options.temperatureUnit);
    }

    if (options.windspeedUnit) {
      params.append('windspeed_unit', options.windspeedUnit);
    }

    if (options.precipitationUnit) {
      params.append('precipitation_unit', options.precipitationUnit);
    }

    return params;
  }

  private buildForecastParams(location: GeoPoint, options: ForecastWeatherOptions): URLSearchParams {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
    });

    if (options.hourly && options.hourly.length > 0) {
      params.append('hourly', options.hourly.join(','));
    }

    if (options.daily && options.daily.length > 0) {
      params.append('daily', options.daily.join(','));
    }

    if (options.forecastDays !== undefined) {
      params.append('forecast_days', options.forecastDays.toString());
    }

    if (options.pastDays !== undefined) {
      params.append('past_days', options.pastDays.toString());
    }

    if (options.timezone) {
      params.append('timezone', options.timezone);
    }

    if (options.temperatureUnit) {
      params.append('temperature_unit', options.temperatureUnit);
    }

    if (options.windspeedUnit) {
      params.append('windspeed_unit', options.windspeedUnit);
    }

    if (options.precipitationUnit) {
      params.append('precipitation_unit', options.precipitationUnit);
    }

    return params;
  }
}
