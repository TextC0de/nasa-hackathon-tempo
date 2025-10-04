/**
 * Validated Geographic Types
 *
 * Clases para tipos geográficos con validación runtime.
 * Previene errores comunes como coordenadas fuera de rango.
 */

import { ValidationError } from './errors.js';

/**
 * Punto geográfico validado (latitud, longitud)
 *
 * @example
 * ```typescript
 * const point = new GeoPoint({ latitude: 34.05, longitude: -118.24 });
 * console.log(point.latitude);  // 34.05
 * console.log(point.longitude); // -118.24
 * ```
 */
export class GeoPoint {
  public readonly latitude: number;
  public readonly longitude: number;

  /**
   * Crear punto geográfico con validación
   *
   * @param coords - Coordenadas del punto
   * @throws {ValidationError} Si latitud no está entre -90 y 90
   * @throws {ValidationError} Si longitud no está entre -180 y 180
   */
  constructor(coords: { latitude: number; longitude: number }) {
    if (coords.latitude < -90 || coords.latitude > 90) {
      throw new ValidationError(
        `Latitude must be between -90 and 90, got ${coords.latitude}`,
        'latitude'
      );
    }

    if (coords.longitude < -180 || coords.longitude > 180) {
      throw new ValidationError(
        `Longitude must be between -180 and 180, got ${coords.longitude}`,
        'longitude'
      );
    }

    this.latitude = coords.latitude;
    this.longitude = coords.longitude;
  }

  /**
   * Convertir a objeto plano
   */
  toJSON(): { latitude: number; longitude: number } {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
    };
  }

  /**
   * Convertir a string
   */
  toString(): string {
    return `(${this.latitude}, ${this.longitude})`;
  }

  /**
   * Convertir a formato ArcGIS {x, y}
   */
  toArcGIS(): { x: number; y: number } {
    return {
      x: this.longitude,
      y: this.latitude,
    };
  }
}

/**
 * Bounding box validado (rectángulo geográfico)
 *
 * @example
 * ```typescript
 * const bbox = new BoundingBox({
 *   west: -118.5,
 *   south: 33.5,
 *   east: -117.5,
 *   north: 34.5
 * });
 *
 * console.log(bbox.width);  // 1.0 grados
 * console.log(bbox.height); // 1.0 grados
 * ```
 */
export class BoundingBox {
  public readonly west: number;
  public readonly south: number;
  public readonly east: number;
  public readonly north: number;

  /**
   * Crear bounding box con validación
   *
   * @param coords - Coordenadas del rectángulo
   * @throws {ValidationError} Si coordenadas están fuera de rango
   * @throws {ValidationError} Si west >= east o south >= north
   */
  constructor(coords: { west: number; south: number; east: number; north: number }) {
    // Validar rangos
    if (coords.west < -180 || coords.west > 180) {
      throw new ValidationError(
        `West must be between -180 and 180, got ${coords.west}`,
        'west'
      );
    }

    if (coords.east < -180 || coords.east > 180) {
      throw new ValidationError(
        `East must be between -180 and 180, got ${coords.east}`,
        'east'
      );
    }

    if (coords.south < -90 || coords.south > 90) {
      throw new ValidationError(
        `South must be between -90 and 90, got ${coords.south}`,
        'south'
      );
    }

    if (coords.north < -90 || coords.north > 90) {
      throw new ValidationError(
        `North must be between -90 and 90, got ${coords.north}`,
        'north'
      );
    }

    // Validar orden
    if (coords.west >= coords.east) {
      throw new ValidationError(
        `West (${coords.west}) must be less than east (${coords.east})`,
        'west'
      );
    }

    if (coords.south >= coords.north) {
      throw new ValidationError(
        `South (${coords.south}) must be less than north (${coords.north})`,
        'south'
      );
    }

    this.west = coords.west;
    this.south = coords.south;
    this.east = coords.east;
    this.north = coords.north;
  }

  /**
   * Ancho del bounding box en grados
   */
  get width(): number {
    return this.east - this.west;
  }

  /**
   * Alto del bounding box en grados
   */
  get height(): number {
    return this.north - this.south;
  }

  /**
   * Centro del bounding box
   */
  get center(): GeoPoint {
    return new GeoPoint({
      latitude: (this.south + this.north) / 2,
      longitude: (this.west + this.east) / 2,
    });
  }

  /**
   * Verificar si contiene un punto
   */
  contains(point: GeoPoint): boolean {
    return (
      point.longitude >= this.west &&
      point.longitude <= this.east &&
      point.latitude >= this.south &&
      point.latitude <= this.north
    );
  }

  /**
   * Convertir a objeto plano
   */
  toJSON(): { west: number; south: number; east: number; north: number } {
    return {
      west: this.west,
      south: this.south,
      east: this.east,
      north: this.north,
    };
  }

  /**
   * Convertir a string
   */
  toString(): string {
    return `BBox(${this.west}, ${this.south}, ${this.east}, ${this.north})`;
  }

  /**
   * Convertir a string CSV para ArcGIS API
   */
  toArcGISString(): string {
    return `${this.west},${this.south},${this.east},${this.north}`;
  }
}

/**
 * Rango temporal validado
 *
 * @example
 * ```typescript
 * const range = new TimeRange({
 *   start: new Date('2025-10-01T00:00:00Z'),
 *   end: new Date('2025-10-01T23:59:59Z')
 * });
 *
 * console.log(range.duration); // 86399000 ms (23h 59m 59s)
 * ```
 */
export class TimeRange {
  public readonly start: Date;
  public readonly end: Date;

  /**
   * Crear rango temporal con validación
   *
   * @param range - Rango de fechas
   * @throws {ValidationError} Si start >= end
   */
  constructor(range: { start: Date | number; end: Date | number }) {
    const start = range.start instanceof Date ? range.start : new Date(range.start);
    const end = range.end instanceof Date ? range.end : new Date(range.end);

    if (start.getTime() >= end.getTime()) {
      throw new ValidationError(
        `Start time (${start.toISOString()}) must be before end time (${end.toISOString()})`,
        'start'
      );
    }

    this.start = start;
    this.end = end;
  }

  /**
   * Duración del rango en milisegundos
   */
  get duration(): number {
    return this.end.getTime() - this.start.getTime();
  }

  /**
   * Duración en horas
   */
  get durationInHours(): number {
    return this.duration / (1000 * 60 * 60);
  }

  /**
   * Duración en días
   */
  get durationInDays(): number {
    return this.duration / (1000 * 60 * 60 * 24);
  }

  /**
   * Verificar si contiene una fecha
   */
  contains(date: Date | number): boolean {
    const timestamp = date instanceof Date ? date.getTime() : date;
    return timestamp >= this.start.getTime() && timestamp <= this.end.getTime();
  }

  /**
   * Convertir a objeto plano
   */
  toJSON(): { start: string; end: string } {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };
  }

  /**
   * Convertir a string
   */
  toString(): string {
    return `${this.start.toISOString()} - ${this.end.toISOString()}`;
  }
}
