/**
 * IMERG Service - Refactored
 *
 * SDK para GPM IMERG (Integrated Multi-satellitE Retrievals for GPM)
 * Proporciona acceso a datos de precipitación near-real-time
 *
 * Casos de uso:
 * - Flash flood monitoring (critical para emergency response)
 * - Air quality analysis (precipitation removes PM2.5/aerosols)
 * - Weather-pollution correlation
 *
 * IMERG Early: 4-hour latency (ideal para flash floods)
 * IMERG Half-hourly: 30-min intervals (high temporal resolution)
 */

import { ImageServerClient } from '../core/imageserver-client.js';
import type { BoundingBox, GeoPoint } from '../core/types.js';

/**
 * Dataset paths para IMERG Precipitation
 */
export const IMERG_DATASETS = {
  /** IMERG Early - 4 hour latency (para flash floods) */
  EARLY: 'GESDISC/GPM_3IMERGHHE',
  /** IMERG Half-hourly - 30 min intervals */
  HALF_HOURLY: 'GESDISC/GPM_3IMERGHH',
} as const;

export type IMERGDataset = keyof typeof IMERG_DATASETS;

/**
 * Opciones para consulta de precipitación en punto
 */
export interface PrecipitationAtPointOptions {
  /** Ubicación geográfica */
  location: GeoPoint;
  /** Timestamp (opcional, usa más reciente si no se especifica) */
  timestamp?: Date;
  /** Dataset IMERG (default: EARLY) */
  dataset?: IMERGDataset;
}

/**
 * Respuesta de precipitación en punto
 */
export interface PrecipitationDataPoint {
  /** Valor de precipitación */
  value: number;
  /** Unidad (mm/hr) */
  unit: string;
  /** Ubicación */
  location: GeoPoint;
  /** Timestamp */
  timestamp: Date;
  /** Dataset usado */
  dataset: IMERGDataset;
}

/**
 * Opciones para consulta de precipitación en región
 */
export interface PrecipitationInRegionOptions {
  /** Bounding box */
  bbox: BoundingBox;
  /** Timestamp (opcional) */
  timestamp?: Date;
  /** Resolución de imagen (default: 256x256) */
  resolution?: { width: number; height: number };
  /** Dataset IMERG (default: EARLY) */
  dataset?: IMERGDataset;
}

/**
 * Respuesta de precipitación en región (imagen)
 */
export interface PrecipitationImageResponse {
  /** URL de imagen generada */
  imageUrl: string;
  /** Bounding box */
  bbox: BoundingBox;
  /** Timestamp */
  timestamp?: Date;
  /** Resolución */
  resolution: { width: number; height: number };
  /** Dataset usado */
  dataset: IMERGDataset;
}

/**
 * Estadísticas de precipitación en región
 */
export interface PrecipitationStatistics {
  /** Total de pixeles válidos */
  validPixels: number;
  /** Precipitación mínima (mm/hr) */
  min: number;
  /** Precipitación máxima (mm/hr) */
  max: number;
  /** Precipitación promedio (mm/hr) */
  mean: number;
  /** Acumulado total estimado (mm) */
  totalAccumulated: number;
  /** Bounding box */
  bbox: BoundingBox;
  /** Dataset usado */
  dataset: IMERGDataset;
}

/**
 * Servicio IMERG (Precipitation)
 *
 * Servicio PÚBLICO - NO requiere autenticación
 *
 * @example
 * ```typescript
 * const imerg = new IMERGService();
 *
 * // Obtener precipitación en punto
 * const precip = await imerg.getPrecipitationAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   timestamp: new Date()
 * });
 * console.log(`Precipitation: ${precip.value} ${precip.unit}`);
 *
 * // Obtener imagen de región
 * const image = await imerg.getPrecipitationInRegion({
 *   bbox: { west: -120, south: 34, east: -118, north: 36 },
 *   timestamp: new Date()
 * });
 * console.log(`Image: ${image.imageUrl}`);
 * ```
 */
export class IMERGService {
  private client: ImageServerClient;

  constructor() {
    this.client = new ImageServerClient();
  }

  /**
   * Obtener precipitación en un punto específico
   *
   * @param options - Opciones de consulta
   * @returns Dato de precipitación
   *
   * @example
   * ```typescript
   * const precip = await imerg.getPrecipitationAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   timestamp: new Date('2025-10-01T12:00:00Z')
   * });
   * ```
   */
  async getPrecipitationAtPoint(
    options: PrecipitationAtPointOptions
  ): Promise<PrecipitationDataPoint> {
    const { location, timestamp, dataset = 'EARLY' } = options;
    const datasetPath = IMERG_DATASETS[dataset];

    const result = await this.client.identify(
      datasetPath,
      { x: location.longitude, y: location.latitude },
      {
        time: timestamp?.getTime(),
        returnCatalogItems: false,
      }
    );

    const value = typeof result.value === 'string' ? parseFloat(result.value) : result.value;

    return {
      value: value || 0,
      unit: 'mm/hr',
      location,
      timestamp: timestamp || new Date(),
      dataset,
    };
  }

  /**
   * Obtener imagen de precipitación en región
   *
   * @param options - Opciones de consulta
   * @returns Imagen con overlay de precipitación
   *
   * @example
   * ```typescript
   * const image = await imerg.getPrecipitationInRegion({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   timestamp: new Date(),
   *   resolution: { width: 512, height: 512 }
   * });
   * ```
   */
  async getPrecipitationInRegion(
    options: PrecipitationInRegionOptions
  ): Promise<PrecipitationImageResponse> {
    const { bbox, timestamp, resolution = { width: 256, height: 256 }, dataset = 'EARLY' } = options;
    const datasetPath = IMERG_DATASETS[dataset];

    const json = await this.client.exportAsJSON(datasetPath, {
      bbox,
      size: resolution,
      time: timestamp?.getTime(),
    });

    return {
      imageUrl: json.href,
      bbox,
      timestamp,
      resolution,
      dataset,
    };
  }

  /**
   * Obtener estadísticas de precipitación en región
   *
   * Muestrea una grilla de puntos para calcular estadísticas espaciales
   *
   * @param options - Opciones de consulta
   * @returns Estadísticas de precipitación
   *
   * @example
   * ```typescript
   * const stats = await imerg.getPrecipitationStatistics({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   resolution: { width: 10, height: 10 } // Grid 10x10
   * });
   * console.log(`Mean: ${stats.mean} mm/hr`);
   * console.log(`Max: ${stats.max} mm/hr`);
   * ```
   */
  async getPrecipitationStatistics(
    options: PrecipitationInRegionOptions
  ): Promise<PrecipitationStatistics> {
    const { bbox, timestamp, resolution = { width: 5, height: 5 }, dataset = 'EARLY' } = options;

    // Sample grid points
    const values: number[] = [];
    const latStep = (bbox.north - bbox.south) / resolution.height;
    const lonStep = (bbox.east - bbox.west) / resolution.width;

    const promises: Promise<number>[] = [];

    for (let i = 0; i < resolution.height; i++) {
      for (let j = 0; j < resolution.width; j++) {
        const latitude = bbox.south + latStep * (i + 0.5);
        const longitude = bbox.west + lonStep * (j + 0.5);

        promises.push(
          this.getPrecipitationAtPoint({
            location: { latitude, longitude } as GeoPoint,
            timestamp,
            dataset,
          }).then((data) => data.value)
        );
      }
    }

    const results = await Promise.all(promises);
    values.push(...results.filter((v) => v !== null && !isNaN(v)));

    if (values.length === 0) {
      return {
        validPixels: 0,
        min: 0,
        max: 0,
        mean: 0,
        totalAccumulated: 0,
        bbox,
        dataset,
      };
    }

    values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    return {
      validPixels: values.length,
      min: values[0],
      max: values[values.length - 1],
      mean,
      totalAccumulated: sum, // Simplified: total mm/hr across all points
      bbox,
      dataset,
    };
  }

  /**
   * Obtener información del servicio IMERG
   *
   * @param dataset - Dataset IMERG (default: EARLY)
   * @returns Metadata del servicio
   */
  async getServiceInfo(dataset: IMERGDataset = 'EARLY') {
    const datasetPath = IMERG_DATASETS[dataset];
    return await this.client.getServiceInfo(datasetPath);
  }

  /**
   * Obtener extent temporal del dataset
   *
   * @param dataset - Dataset IMERG (default: EARLY)
   * @returns Rango temporal disponible
   */
  async getTemporalExtent(dataset: IMERGDataset = 'EARLY'): Promise<{ start: Date; end: Date }> {
    const info = await this.getServiceInfo(dataset);

    if (!info.timeInfo?.timeExtent) {
      throw new Error(`Temporal extent not available for IMERG ${dataset}`);
    }

    const [start, end] = info.timeInfo.timeExtent;
    return {
      start: new Date(start),
      end: new Date(end),
    };
  }

  /**
   * Obtener timestamp más reciente disponible
   *
   * @param dataset - Dataset IMERG (default: EARLY)
   * @returns Timestamp más reciente
   */
  async getLatestAvailableTime(dataset: IMERGDataset = 'EARLY'): Promise<Date> {
    const { end } = await this.getTemporalExtent(dataset);
    return end;
  }
}
