/**
 * Utility functions for type conversion and validation
 */

import { GeoPoint, BoundingBox, TimeRange } from './geo-types.js';
import type { GeoPointInput, BoundingBoxInput, TimeRangeInput } from './types.js';

/**
 * Normalizar GeoPointInput a GeoPoint class
 *
 * @param input - Objeto GeoPoint o coordenadas planas
 * @returns GeoPoint validado
 */
export function normalizeGeoPoint(input: GeoPointInput): GeoPoint {
  if (input instanceof GeoPoint) {
    return input;
  }
  return new GeoPoint(input);
}

/**
 * Normalizar BoundingBoxInput a BoundingBox class
 *
 * @param input - Objeto BoundingBox o coordenadas planas
 * @returns BoundingBox validado
 */
export function normalizeBoundingBox(input: BoundingBoxInput): BoundingBox {
  if (input instanceof BoundingBox) {
    return input;
  }
  return new BoundingBox(input);
}

/**
 * Normalizar TimeRangeInput a TimeRange class
 *
 * @param input - Objeto TimeRange o rango plano
 * @returns TimeRange validado
 */
export function normalizeTimeRange(input: TimeRangeInput): TimeRange {
  if (input instanceof TimeRange) {
    return input;
  }
  return new TimeRange(input);
}

/**
 * Helper: Convertir timestamp a Date
 */
export function normalizeDate(input: Date | number): Date {
  return input instanceof Date ? input : new Date(input);
}
