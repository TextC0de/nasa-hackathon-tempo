/**
 * @atmos/advection
 *
 * Motor de forecasting de calidad del aire basado en advección atmosférica
 *
 * Este paquete implementa forecasting de NO2 surface usando:
 * - Datos satelitales TEMPO (NO2 column density)
 * - Conversión NO2 column → NO2 surface (ppb) con PBL height
 * - Grids completos de ~2,700 celdas por área
 * - Tendencias temporales (T-3h → T=0)
 * - Emisiones NOx de incendios (Gaussian plume model)
 * - Advección física con pronósticos de viento
 *
 * @example
 * ```typescript
 * import {
 *   forecastGridMultiHorizon,
 *   loadTEMPOGridAtTime,
 *   getWeatherForecast,
 *   extractNO2AtLocation,
 *   DEFAULT_FACTORS
 * } from '@atmos/advection';
 *
 * // Cargar datos históricos
 * const historicalGrids = [
 *   loadTEMPOGridAtTime(T_minus_3h, ...),
 *   loadTEMPOGridAtTime(T_minus_2h, ...),
 *   loadTEMPOGridAtTime(T_minus_1h, ...),
 *   loadTEMPOGridAtTime(T_0, ...)
 * ].map(r => toAdvectionGrid(r));
 *
 * // Generar forecast
 * const result = forecastGridMultiHorizon({
 *   historicalGrids,
 *   historicalWeather,
 *   weatherForecasts: [weather_t1, weather_t2, weather_t3],
 *   forecast_horizons: [1, 2, 3],
 *   factors: DEFAULT_FACTORS
 * });
 *
 * // Extraer NO2 en ubicación específica
 * const no2 = extractNO2AtLocation(result.forecast_grids[0].grid, location);
 * ```
 */

// Export all types
export * from './types';

// Export data loaders
export * from './loaders';

// Export core forecasting engine
export * from './core';

// Export ML feature extraction
export * from './ml/feature-extractor';

// Package version
export const VERSION = '0.2.0';
