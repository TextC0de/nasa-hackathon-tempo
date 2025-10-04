/**
 * Custom Error Classes
 *
 * Errores específicos para manejar diferentes casos de fallo en el SDK.
 * Cada error incluye contexto relevante para debugging.
 */

import type { GeoPoint } from './geo-types.js';

/**
 * Error de validación de parámetros
 *
 * Se lanza cuando un parámetro tiene un valor inválido.
 *
 * @example
 * ```typescript
 * throw new ValidationError('Latitude must be between -90 and 90', 'latitude');
 * ```
 */
export class ValidationError extends Error {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Error cuando no hay datos disponibles para la ubicación/tiempo solicitado
 *
 * @example
 * ```typescript
 * throw new NoDataError(
 *   'No NO2 data available at this location/time',
 *   point,
 *   timestamp
 * );
 * ```
 */
export class NoDataError extends Error {
  public readonly location?: GeoPoint;
  public readonly timestamp?: Date;

  constructor(message: string, location?: GeoPoint, timestamp?: Date | number) {
    super(message);
    this.name = 'NoDataError';
    this.location = location;
    this.timestamp = timestamp instanceof Date ? timestamp : timestamp ? new Date(timestamp) : undefined;
  }
}

/**
 * Error de autenticación (token inválido, expirado o requerido)
 *
 * @example
 * ```typescript
 * throw new AuthenticationError('Invalid or expired token');
 * ```
 */
export class AuthenticationError extends Error {
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }
}

/**
 * Error del servicio ArcGIS ImageServer
 *
 * @example
 * ```typescript
 * throw new ServiceError('Service temporarily unavailable', 503);
 * ```
 */
export class ServiceError extends Error {
  public readonly statusCode: number;
  public readonly response?: any;

  constructor(message: string, statusCode: number, response?: any) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/**
 * Error cuando el timestamp está fuera del rango disponible
 *
 * @example
 * ```typescript
 * throw new TimeRangeError(
 *   'Timestamp is outside available range',
 *   requestedTime,
 *   { start: availableStart, end: availableEnd }
 * );
 * ```
 */
export class TimeRangeError extends Error {
  public readonly requestedTime: Date;
  public readonly availableRange: { start: Date; end: Date };

  constructor(
    message: string,
    requestedTime: Date | number,
    availableRange: { start: Date | number; end: Date | number }
  ) {
    super(message);
    this.name = 'TimeRangeError';
    this.requestedTime =
      requestedTime instanceof Date ? requestedTime : new Date(requestedTime);
    this.availableRange = {
      start: availableRange.start instanceof Date ? availableRange.start : new Date(availableRange.start),
      end: availableRange.end instanceof Date ? availableRange.end : new Date(availableRange.end),
    };
  }

  /**
   * Sugerencia de timestamp más cercano disponible
   */
  getSuggestedTime(): Date {
    const requested = this.requestedTime.getTime();
    const start = this.availableRange.start.getTime();
    const end = this.availableRange.end.getTime();

    // Si es anterior al inicio, sugerir inicio
    if (requested < start) {
      return this.availableRange.start;
    }

    // Si es posterior al fin, sugerir fin
    if (requested > end) {
      return this.availableRange.end;
    }

    // Si está en medio (no debería pasar), sugerir el más cercano
    const distToStart = Math.abs(requested - start);
    const distToEnd = Math.abs(requested - end);
    return distToStart < distToEnd ? this.availableRange.start : this.availableRange.end;
  }
}

/**
 * Helper: Verificar si un error es de un tipo específico
 *
 * @example
 * ```typescript
 * try {
 *   await service.getData({...});
 * } catch (error) {
 *   if (isNoDataError(error)) {
 *     console.log('No data at', error.location);
 *   }
 * }
 * ```
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNoDataError(error: unknown): error is NoDataError {
  return error instanceof NoDataError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function isTimeRangeError(error: unknown): error is TimeRangeError {
  return error instanceof TimeRangeError;
}
