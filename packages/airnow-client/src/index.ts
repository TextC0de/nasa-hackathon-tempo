/**
 * @atmos/airnow-client
 *
 * Cliente TypeScript para AirNow API (EPA)
 *
 * Proporciona acceso a datos de calidad del aire ground-based para:
 * - Validación de datos satelitales (TEMPO, TROPOMI)
 * - Ground truth comparison
 * - EPA official measurements
 *
 * @example
 * ```typescript
 * import { AirNowClient, AirNowParameter } from '@atmos/airnow-client';
 *
 * const client = new AirNowClient({ apiKey: 'your-api-key' });
 *
 * // Obtener observaciones actuales
 * const obs = await client.getCurrentObservationsByLocation({
 *   latitude: 34.05,
 *   longitude: -118.24
 * });
 *
 * // Obtener parámetro específico
 * const no2 = await client.getParameterObservation(
 *   { latitude: 34.05, longitude: -118.24 },
 *   AirNowParameter.NO2
 * );
 * ```
 */

// Export main client
export { AirNowClient } from './airnow-client';

// Export types
export type {
  GeoPoint,
  AirNowParameter,
  AQICategory,
  AirNowObservation,
  AirNowForecast,
  AirNowQueryOptions,
  AirNowHistoricalOptions,
  AirNowCredentials,
  BoundingBox,
  MonitoringSite,
} from './types';

// Re-export enum for convenience
export { AirNowParameter as Parameter } from './types';
