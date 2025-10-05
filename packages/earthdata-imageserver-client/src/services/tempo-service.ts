/**
 * TEMPO Service - Refactored with Type-Safe APIs
 *
 * SDK para TEMPO (Tropospheric Emissions: Monitoring of Pollution)
 * Datos horarios de NO2, O3, y HCHO troposféricos.
 *
 * IMPORTANTE: TEMPO es un dataset TEMPORAL (hourly), por lo tanto
 * el timestamp es REQUERIDO en todas las consultas de datos.
 */

import { ImageServerClient } from '../core/imageserver-client.js';
import { GeoPoint, BoundingBox, TimeRange } from '../core/geo-types.js';
import { NoDataError, TimeRangeError } from '../core/errors.js';
import { normalizeGeoPoint, normalizeBoundingBox } from '../core/utils.js';
import type {
  GeoPointInput,
  BoundingBoxInput,
  ImageSize,
  ImageServerInfo,
} from '../core/types.js';

/**
 * Dataset paths para TEMPO V04 (latest products - 2024-2025)
 */
export const TEMPO_DATASETS = {
  NO2: 'C3685896708-LARC_CLOUD/TEMPO_NO2_L3_V04_HOURLY_TROPOSPHERIC_VERTICAL_COLUMN',
  O3: 'C3685896625-LARC_CLOUD/TEMPO_O3TOT_L3_V04_HOURLY_OZONE_COLUMN_AMOUNT',
  HCHO: 'C3685897141-LARC_CLOUD/TEMPO_HCHO_L3_V04_HOURLY_VERTICAL_COLUMN',
} as const;

/**
 * Tipo de contaminante TEMPO disponible
 */
export type TEMPOPollutant = keyof typeof TEMPO_DATASETS;

/**
 * Unidades para cada contaminante TEMPO
 */
const TEMPO_UNITS: Record<TEMPOPollutant, string> = {
  NO2: 'moléculas/cm²',
  O3: 'DU (Dobson Units)',
  HCHO: 'moléculas/cm²',
};

/**
 * Opciones para obtener datos en un punto específico
 *
 * timestamp es REQUERIDO porque TEMPO son datos horarios
 */
export interface TEMPOPointQuery {
  /** Ubicación geográfica del punto */
  location: GeoPointInput;
  /** Timestamp UTC de la medición (REQUERIDO - datos horarios) */
  timestamp: Date | number;
  /** Tipo de contaminante (default: NO2) */
  pollutant?: TEMPOPollutant;
}

/**
 * Opciones para obtener datos en una región (bounding box)
 *
 * timestamp es REQUERIDO porque TEMPO son datos horarios
 */
export interface TEMPORegionQuery {
  /** Región geográfica de interés */
  bbox: BoundingBoxInput;
  /** Timestamp UTC de la medición (REQUERIDO - datos horarios) */
  timestamp: Date | number;
  /** Resolución de la imagen resultante */
  resolution?: ImageSize;
  /** Tipo de contaminante (default: NO2) */
  pollutant?: TEMPOPollutant;
}

/**
 * Opciones para obtener serie temporal en un punto
 */
export interface TEMPOTimeSeriesQuery {
  /** Ubicación geográfica del punto */
  location: GeoPointInput;
  /** Rango temporal de consulta */
  timeRange: { start: Date | number; end: Date | number };
  /** Tipo de contaminante (default: NO2) */
  pollutant?: TEMPOPollutant;
  /** Intervalo entre mediciones en horas (default: 1 hora) */
  intervalHours?: number;
}

/**
 * Respuesta con datos de contaminante en un punto
 */
export interface PollutantPointData {
  /** Tipo de contaminante */
  pollutant: TEMPOPollutant;
  /** Ubicación del punto */
  location: GeoPoint;
  /** Timestamp de la medición */
  timestamp: Date;
  /** Valor medido (null si NoData) */
  value: number | null;
  /** Unidad del valor */
  unit: string;
}

/**
 * Respuesta con datos de contaminante en una región
 */
export interface PollutantRegionData {
  /** Tipo de contaminante */
  pollutant: TEMPOPollutant;
  /** Región consultada */
  bbox: BoundingBox;
  /** Timestamp de la medición */
  timestamp: Date;
  /** URL de la imagen generada */
  imageUrl: string;
  /** Ancho de la imagen en píxeles */
  width: number;
  /** Alto de la imagen en píxeles */
  height: number;
  /** Unidad de los valores */
  unit: string;
}

/**
 * Punto en una serie temporal
 */
export interface TimeSeriesPoint {
  /** Timestamp de la medición */
  timestamp: Date;
  /** Valor medido (null si NoData) */
  value: number | null;
  /** Razón por la que no hay valor */
  reason?: 'no_data' | 'outside_coverage' | 'error';
}

/**
 * Serie temporal de un contaminante
 */
export interface PollutantTimeSeries {
  /** Tipo de contaminante */
  pollutant: TEMPOPollutant;
  /** Ubicación del punto */
  location: GeoPoint;
  /** Rango temporal */
  timeRange: TimeRange;
  /** Datos de la serie */
  data: TimeSeriesPoint[];
  /** Unidad de los valores */
  unit: string;
  /** Estadísticas de la serie */
  statistics: {
    min: number;
    max: number;
    mean: number;
    count: number;
  };
}

/**
 * Información de rango temporal disponible
 */
export interface TemporalExtent {
  start: Date;
  end: Date;
  isWithinRange(timestamp: Date | number): boolean;
  getSuggestedTime(requestedTime: Date | number): Date;
}

/**
 * TEMPO Service - Type-Safe API
 *
 * Servicio público (NO requiere autenticación) para datos TEMPO.
 * Todos los métodos de consulta requieren timestamp porque son datos horarios.
 *
 * @example
 * ```typescript
 * const tempo = new TEMPOService();
 *
 * // Obtener NO2 en un punto
 * const no2 = await tempo.getDataAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   timestamp: new Date('2025-10-01T23:00:00Z'),
 *   pollutant: 'NO2'
 * });
 * console.log(`NO2: ${no2.value} ${no2.unit}`);
 * ```
 */
export class TEMPOService {
  private client: ImageServerClient;
  private temporalExtentCache: Map<TEMPOPollutant, TemporalExtent> = new Map();

  /**
   * Crear nuevo servicio TEMPO
   *
   * TEMPO es un servicio público, NO requiere autenticación.
   *
   * @example
   * ```typescript
   * const tempo = new TEMPOService();
   * ```
   */
  constructor() {
    this.client = new ImageServerClient();
  }

  // ============================================================================
  // MÉTODOS PRINCIPALES - Point Queries
  // ============================================================================

  /**
   * Obtener datos de contaminante en un punto específico
   *
   * @param options - Opciones de consulta
   * @returns Datos del contaminante en el punto
   * @throws {ValidationError} Si las coordenadas son inválidas
   * @throws {TimeRangeError} Si el timestamp está fuera del rango disponible
   * @throws {NoDataError} Si no hay datos para ese punto/timestamp
   *
   * @example
   * ```typescript
   * const data = await tempo.getDataAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   timestamp: new Date('2025-10-01T23:00:00Z'),
   *   pollutant: 'NO2'
   * });
   *
   * if (data.value !== null) {
   *   console.log(`${data.pollutant}: ${data.value} ${data.unit}`);
   * }
   * ```
   */
  async getDataAtPoint(options: TEMPOPointQuery): Promise<PollutantPointData> {
    const location = normalizeGeoPoint(options.location);
    const timestamp = options.timestamp instanceof Date ? options.timestamp : new Date(options.timestamp);
    const pollutant = options.pollutant || 'NO2';

    // Validar que el timestamp esté en el rango disponible
    await this.validateTimestamp(pollutant, timestamp);

    const datasetPath = TEMPO_DATASETS[pollutant];

    // Usar identify para obtener valor en el punto
    const result = await this.client.identify(
      datasetPath,
      location.toArcGIS(),
      { time: timestamp.getTime() }
    );

    // Verificar si hay datos
    const value = result.value === 'NoData' || result.value === undefined
      ? null
      : typeof result.value === 'string'
        ? parseFloat(result.value)
        : result.value; 

    if (value === null) {
      throw new NoDataError(
        `No ${pollutant} data available at ${location.toString()} for ${timestamp.toISOString()}`,
        location,
        timestamp
      );
    }

    return {
      pollutant,
      location,
      timestamp,
      value,
      unit: TEMPO_UNITS[pollutant],
    };
  }

  /**
   * Obtener datos de contaminante en una región (imagen)
   *
   * @param options - Opciones de consulta
   * @returns Datos del contaminante en la región (URL de imagen)
   * @throws {ValidationError} Si el bounding box es inválido
   * @throws {TimeRangeError} Si el timestamp está fuera del rango disponible
   *
   * @example
   * ```typescript
   * const data = await tempo.getDataInRegion({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   timestamp: new Date('2025-10-01T23:00:00Z'),
   *   resolution: { width: 512, height: 512 },
   *   pollutant: 'O3'
   * });
   *
   * console.log(`Image URL: ${data.imageUrl}`);
   * ```
   */
  async getDataInRegion(options: TEMPORegionQuery): Promise<PollutantRegionData> {
    const bbox = normalizeBoundingBox(options.bbox);
    const timestamp = options.timestamp instanceof Date ? options.timestamp : new Date(options.timestamp);
    const resolution = options.resolution || { width: 256, height: 256 };
    const pollutant = options.pollutant || 'NO2';

    // Validar timestamp
    await this.validateTimestamp(pollutant, timestamp);

    const datasetPath = TEMPO_DATASETS[pollutant];

    // Exportar como JSON para obtener href
    const result = await this.client.exportAsJSON(datasetPath, {
      bbox,
      size: resolution,
      time: timestamp.getTime(),
      format: 'jpg',
    });

    return {
      pollutant,
      bbox,
      timestamp,
      imageUrl: result.href,
      width: result.width,
      height: result.height,
      unit: TEMPO_UNITS[pollutant],
    };
  }

  /**
   * Obtener serie temporal de contaminante en un punto
   *
   * Obtiene mediciones horarias en un rango de tiempo.
   *
   * @param options - Opciones de consulta
   * @returns Serie temporal con estadísticas
   * @throws {TimeRangeError} Si el rango temporal está fuera del disponible
   *
   * @example
   * ```typescript
   * const timeSeries = await tempo.getDataTimeSeries({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   timeRange: {
   *     start: new Date('2025-10-01T00:00:00Z'),
   *     end: new Date('2025-10-01T23:00:00Z')
   *   },
   *   pollutant: 'HCHO',
   *   intervalHours: 1
   * });
   *
   * console.log(`${timeSeries.data.length} measurements`);
   * console.log(`Mean: ${timeSeries.statistics.mean}`);
   * ```
   */
  async getDataTimeSeries(options: TEMPOTimeSeriesQuery): Promise<PollutantTimeSeries> {
    const location = normalizeGeoPoint(options.location);
    const pollutant = options.pollutant || 'NO2';
    const intervalHours = options.intervalHours || 1;

    const start = options.timeRange.start instanceof Date
      ? options.timeRange.start
      : new Date(options.timeRange.start);
    const end = options.timeRange.end instanceof Date
      ? options.timeRange.end
      : new Date(options.timeRange.end);

    // Validar rango temporal
    const extent = await this.getTemporalExtent(pollutant);
    if (!extent.isWithinRange(start) || !extent.isWithinRange(end)) {
      throw new TimeRangeError(
        `Requested time range ${start.toISOString()} - ${end.toISOString()} is outside available range`,
        start,
        { start: extent.start, end: extent.end }
      );
    }

    // Generar timestamps para cada intervalo (solo horas diurnas cuando TEMPO opera)
    // TEMPO opera ~12:00-23:00 UTC (cubre América durante el día)
    const timestamps: Date[] = [];
    let currentTime = new Date(start);
    while (currentTime <= end) {
      const utcHour = currentTime.getUTCHours();
      // Solo intentar horas cuando TEMPO está activo (12-23 UTC)
      if (utcHour >= 12 && utcHour <= 23) {
        timestamps.push(new Date(currentTime));
      }
      currentTime = new Date(currentTime.getTime() + intervalHours * 60 * 60 * 1000);
    }

    // Obtener datos para cada timestamp (en paralelo con límite)
    const data: TimeSeriesPoint[] = [];
    const BATCH_SIZE = 5; // Limitar requests paralelos

    for (let i = 0; i < timestamps.length; i += BATCH_SIZE) {
      const batch = timestamps.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(timestamp =>
          this.getDataAtPoint({ location, timestamp, pollutant })
        )
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const timestamp = batch[j];

        if (result.status === 'fulfilled') {
          data.push({
            timestamp,
            value: result.value.value,
          });
        } else {
          // Determinar razón del fallo
          const errorMsg = result.reason?.message || '';
          let reason: 'no_data' | 'outside_coverage' | 'error' = 'error';

          if (errorMsg.includes('NoData') || errorMsg.includes('Unable to complete operation')) {
            reason = 'no_data';
          } else if (errorMsg.includes('outside available range')) {
            reason = 'outside_coverage';
          }

          data.push({
            timestamp,
            value: null,
            reason,
          });
        }
      }
    }

    // Calcular estadísticas
    const validValues = data.map(d => d.value).filter((v): v is number => v !== null);
    const statistics = {
      min: validValues.length > 0 ? Math.min(...validValues) : 0,
      max: validValues.length > 0 ? Math.max(...validValues) : 0,
      mean: validValues.length > 0
        ? validValues.reduce((a, b) => a + b, 0) / validValues.length
        : 0,
      count: validValues.length,
    };

    return {
      pollutant,
      location,
      timeRange: { start, end },
      data,
      unit: TEMPO_UNITS[pollutant],
      statistics,
    };
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA - Shortcuts por pollutant
  // ============================================================================

  /**
   * Obtener NO2 en un punto (shortcut)
   *
   * @example
   * ```typescript
   * const no2 = await tempo.getNO2AtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   timestamp: new Date()
   * });
   * ```
   */
  async getNO2AtPoint(options: Omit<TEMPOPointQuery, 'pollutant'>): Promise<PollutantPointData> {
    return this.getDataAtPoint({ ...options, pollutant: 'NO2' });
  }

  /**
   * Obtener O3 en un punto (shortcut)
   */
  async getO3AtPoint(options: Omit<TEMPOPointQuery, 'pollutant'>): Promise<PollutantPointData> {
    return this.getDataAtPoint({ ...options, pollutant: 'O3' });
  }

  /**
   * Obtener HCHO en un punto (shortcut)
   */
  async getHCHOAtPoint(options: Omit<TEMPOPointQuery, 'pollutant'>): Promise<PollutantPointData> {
    return this.getDataAtPoint({ ...options, pollutant: 'HCHO' });
  }

  /**
   * Obtener NO2 en región (shortcut)
   */
  async getNO2InRegion(options: Omit<TEMPORegionQuery, 'pollutant'>): Promise<PollutantRegionData> {
    return this.getDataInRegion({ ...options, pollutant: 'NO2' });
  }

  /**
   * Obtener O3 en región (shortcut)
   */
  async getO3InRegion(options: Omit<TEMPORegionQuery, 'pollutant'>): Promise<PollutantRegionData> {
    return this.getDataInRegion({ ...options, pollutant: 'O3' });
  }

  /**
   * Obtener HCHO en región (shortcut)
   */
  async getHCHOInRegion(options: Omit<TEMPORegionQuery, 'pollutant'>): Promise<PollutantRegionData> {
    return this.getDataInRegion({ ...options, pollutant: 'HCHO' });
  }

  /**
   * Obtener serie temporal de NO2 (shortcut)
   */
  async getNO2TimeSeries(options: Omit<TEMPOTimeSeriesQuery, 'pollutant'>): Promise<PollutantTimeSeries> {
    return this.getDataTimeSeries({ ...options, pollutant: 'NO2' });
  }

  /**
   * Obtener serie temporal de O3 (shortcut)
   */
  async getO3TimeSeries(options: Omit<TEMPOTimeSeriesQuery, 'pollutant'>): Promise<PollutantTimeSeries> {
    return this.getDataTimeSeries({ ...options, pollutant: 'O3' });
  }

  /**
   * Obtener serie temporal de HCHO (shortcut)
   */
  async getHCHOTimeSeries(options: Omit<TEMPOTimeSeriesQuery, 'pollutant'>): Promise<PollutantTimeSeries> {
    return this.getDataTimeSeries({ ...options, pollutant: 'HCHO' });
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD - Temporal extent y validación
  // ============================================================================

  /**
   * Obtener el rango temporal disponible para un contaminante
   *
   * @param pollutant - Tipo de contaminante
   * @returns Rango temporal disponible
   *
   * @example
   * ```typescript
   * const extent = await tempo.getTemporalExtent('NO2');
   * console.log(`Datos disponibles desde ${extent.start} hasta ${extent.end}`);
   * ```
   */
  async getTemporalExtent(pollutant: TEMPOPollutant = 'NO2'): Promise<TemporalExtent> {
    // Verificar cache
    if (this.temporalExtentCache.has(pollutant)) {
      return this.temporalExtentCache.get(pollutant)!;
    }

    const datasetPath = TEMPO_DATASETS[pollutant];
    const info: ImageServerInfo = await this.client.getServiceInfo(datasetPath);

    if (!info.timeInfo?.timeExtent) {
      throw new Error(`No temporal extent information available for ${pollutant}`);
    }

    const [startMs, endMs] = info.timeInfo.timeExtent;
    const start = new Date(startMs);
    const end = new Date(endMs);

    const extent: TemporalExtent = {
      start,
      end,
      isWithinRange(timestamp: Date | number): boolean {
        const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;
        return ts >= startMs && ts <= endMs;
      },
      getSuggestedTime(requestedTime: Date | number): Date {
        const ts = requestedTime instanceof Date ? requestedTime.getTime() : requestedTime;
        if (ts < startMs) return start;
        if (ts > endMs) return end;
        return requestedTime instanceof Date ? requestedTime : new Date(requestedTime);
      },
    };

    // Guardar en cache
    this.temporalExtentCache.set(pollutant, extent);

    return extent;
  }

  /**
   * Validar que un timestamp esté dentro del rango disponible
   *
   * @throws {TimeRangeError} Si el timestamp está fuera del rango
   */
  private async validateTimestamp(pollutant: TEMPOPollutant, timestamp: Date): Promise<void> {
    const extent = await this.getTemporalExtent(pollutant);

    if (!extent.isWithinRange(timestamp)) {
      throw new TimeRangeError(
        `Timestamp ${timestamp.toISOString()} is outside available range for ${pollutant}`,
        timestamp,
        { start: extent.start, end: extent.end }
      );
    }
  }

  /**
   * Obtener la medición más reciente disponible
   *
   * @param pollutant - Tipo de contaminante (default: NO2)
   * @returns Timestamp de la última medición disponible
   *
   * @example
   * ```typescript
   * const latestTime = await tempo.getLatestAvailableTime('NO2');
   * console.log(`Última medición: ${latestTime.toISOString()}`);
   * ```
   */
  async getLatestAvailableTime(pollutant: TEMPOPollutant = 'NO2'): Promise<Date> {
    const extent = await this.getTemporalExtent(pollutant);
    return extent.end;
  }

  /**
   * Helper: Obtener datos más recientes en un punto
   *
   * Usa automáticamente el timestamp más reciente disponible.
   *
   * @example
   * ```typescript
   * const latestNO2 = await tempo.getLatestDataAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   pollutant: 'NO2'
   * });
   * ```
   */
  async getLatestDataAtPoint(
    options: Omit<TEMPOPointQuery, 'timestamp'>
  ): Promise<PollutantPointData> {
    const pollutant = options.pollutant || 'NO2';
    const latestTime = await this.getLatestAvailableTime(pollutant);

    return this.getDataAtPoint({
      ...options,
      timestamp: latestTime,
      pollutant,
    });
  }
}
