/**
 * @atmos/openmeteo-client
 *
 * Cliente TypeScript para Open-Meteo API
 *
 * Proporciona acceso a datos meteorológicos históricos y forecast para:
 * - Advection modeling (wind, PBL height)
 * - Weather-corrected air quality forecasting
 * - Atmospheric transport physics
 *
 * @example
 * ```typescript
 * import { OpenMeteoClient, HourlyVariable } from '@atmos/openmeteo-client';
 *
 * const client = new OpenMeteoClient();
 *
 * // Obtener datos históricos para advección
 * const weather = await client.getHistoricalWeather(
 *   { latitude: 34.05, longitude: -118.24 },
 *   {
 *     startDate: '2024-01-01',
 *     endDate: '2024-01-31',
 *     hourly: [
 *       HourlyVariable.WIND_SPEED_10M,
 *       HourlyVariable.WIND_DIRECTION_10M,
 *       HourlyVariable.BOUNDARY_LAYER_HEIGHT,
 *       HourlyVariable.PRECIPITATION
 *     ]
 *   }
 * );
 *
 * console.log(`PBL: ${weather.hourly?.boundary_layer_height?.[0]}m`);
 * ```
 */

// Export main client
export { OpenMeteoClient } from './openmeteo-client';

// Export types
export type {
  GeoPoint,
  HistoricalWeatherOptions,
  ForecastWeatherOptions,
  HourlyUnits,
  HourlyData,
  DailyUnits,
  DailyData,
  HistoricalWeatherResponse,
  ForecastWeatherResponse,
  OpenMeteoError,
  WeatherSnapshot,
} from './types';

// Re-export enums for convenience (as values)
export { HourlyVariable, DailyVariable } from './types';
