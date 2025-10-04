/**
 * @atmos/advection
 *
 * Atmospheric advection modeling and air quality forecasting
 *
 * @example
 * ```typescript
 * import { forecastAdvection, DEFAULT_FACTORS } from '@atmos/advection';
 *
 * const forecast = forecastAdvection(
 *   { latitude: 34.05, longitude: -118.24 },
 *   1.5e16, // NO2 column density
 *   weather,
 *   fires,
 *   groundTruth,
 *   DEFAULT_FACTORS,
 *   3 // hours ahead
 * );
 * ```
 */

// Export all types
export * from './types';

// Export data loaders
export * from './loaders';

// Export core advection model
export * from './core';

// Export validation utilities
export * from './validation';

// Package version
export const VERSION = '0.1.0';
