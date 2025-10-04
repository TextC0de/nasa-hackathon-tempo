/**
 * TROPOMI Service - Refactored
 *
 * SDK para TROPOMI SO2 (Sentinel-5P)
 * Complementa TEMPO (NO2, O3, HCHO) agregando SO2 (dióxido de azufre)
 *
 * SO2 es crítico para detectar:
 * - Volcanic emissions (volcanes)
 * - Industrial pollution (refinerías, fundidoras)
 * - Coal/oil combustion (centrales eléctricas)
 *
 * Datos disponibles: Daily (no hourly como TEMPO)
 */

import { ImageServerClient } from '../core/imageserver-client.js';
import type { BoundingBox, GeoPoint } from '../core/types.js';

/**
 * Dataset paths para TROPOMI Air Quality
 */
export const TROPOMI_DATASETS = {
  /** SO2 Daily (Sentinel-5P TROPOMI) */
  SO2_DAILY: 'GESDISC/TROPOMI_SO2_DAILY',
} as const;

export type TROPOMIDataset = keyof typeof TROPOMI_DATASETS;

/**
 * Opciones para consulta de SO2 en punto
 */
export interface SO2AtPointOptions {
  /** Ubicación geográfica */
  location: GeoPoint;
  /** Timestamp (opcional, usa más reciente si no se especifica) */
  timestamp?: Date;
  /** Dataset TROPOMI (default: SO2_DAILY) */
  dataset?: TROPOMIDataset;
}

/**
 * Respuesta de SO2 en punto
 */
export interface SO2DataPoint {
  /** Valor de SO2 */
  value: number;
  /** Unidad (DU - Dobson Units) */
  unit: string;
  /** Ubicación */
  location: GeoPoint;
  /** Timestamp */
  timestamp: Date;
  /** Dataset usado */
  dataset: TROPOMIDataset;
}

/**
 * Opciones para consulta de SO2 en región
 */
export interface SO2InRegionOptions {
  /** Bounding box */
  bbox: BoundingBox;
  /** Timestamp (opcional) */
  timestamp?: Date;
  /** Resolución de imagen (default: 256x256) */
  resolution?: { width: number; height: number };
  /** Dataset TROPOMI (default: SO2_DAILY) */
  dataset?: TROPOMIDataset;
}

/**
 * Respuesta de SO2 en región (imagen)
 */
export interface SO2ImageResponse {
  /** URL de imagen generada */
  imageUrl: string;
  /** Bounding box */
  bbox: BoundingBox;
  /** Timestamp */
  timestamp?: Date;
  /** Resolución */
  resolution: { width: number; height: number };
  /** Dataset usado */
  dataset: TROPOMIDataset;
}

/**
 * Estadísticas de SO2 en región
 */
export interface SO2Statistics {
  /** Total de pixeles válidos */
  validPixels: number;
  /** SO2 mínimo (DU) */
  min: number;
  /** SO2 máximo (DU) */
  max: number;
  /** SO2 promedio (DU) */
  mean: number;
  /** Bounding box */
  bbox: BoundingBox;
  /** Dataset usado */
  dataset: TROPOMIDataset;
}

/**
 * Servicio TROPOMI (SO2)
 *
 * Servicio PÚBLICO - NO requiere autenticación
 *
 * @example
 * ```typescript
 * const tropomi = new TROPOMIService();
 *
 * // Obtener SO2 en punto
 * const so2 = await tropomi.getSO2AtPoint({
 *   location: { latitude: 19.42, longitude: -99.13 }, // Ciudad de México
 *   timestamp: new Date()
 * });
 * console.log(`SO2: ${so2.value} ${so2.unit}`);
 *
 * // Obtener imagen de región
 * const image = await tropomi.getSO2InRegion({
 *   bbox: { west: -100, south: 18, east: -98, north: 20 },
 *   timestamp: new Date()
 * });
 * console.log(`Image: ${image.imageUrl}`);
 * ```
 */
export class TROPOMIService {
  private client: ImageServerClient;

  constructor() {
    this.client = new ImageServerClient();
  }

  /**
   * Obtener SO2 en un punto específico
   *
   * @param options - Opciones de consulta
   * @returns Dato de SO2
   *
   * @example
   * ```typescript
   * // SO2 cerca de un volcán
   * const so2 = await tropomi.getSO2AtPoint({
   *   location: { latitude: 19.023, longitude: -98.622 }, // Popocatépetl
   *   timestamp: new Date('2025-10-01T12:00:00Z')
   * });
   * ```
   */
  async getSO2AtPoint(options: SO2AtPointOptions): Promise<SO2DataPoint> {
    const { location, timestamp, dataset = 'SO2_DAILY' } = options;
    const datasetPath = TROPOMI_DATASETS[dataset];

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
      unit: 'DU',
      location,
      timestamp: timestamp || new Date(),
      dataset,
    };
  }

  /**
   * Obtener imagen de SO2 en región
   *
   * @param options - Opciones de consulta
   * @returns Imagen con overlay de SO2
   *
   * @example
   * ```typescript
   * // Pluma volcánica de Popocatépetl
   * const image = await tropomi.getSO2InRegion({
   *   bbox: { west: -100, south: 18, east: -98, north: 20 },
   *   timestamp: new Date(),
   *   resolution: { width: 512, height: 512 }
   * });
   * ```
   */
  async getSO2InRegion(options: SO2InRegionOptions): Promise<SO2ImageResponse> {
    const { bbox, timestamp, resolution = { width: 256, height: 256 }, dataset = 'SO2_DAILY' } = options;
    const datasetPath = TROPOMI_DATASETS[dataset];

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
   * Obtener estadísticas de SO2 en región
   *
   * Muestrea una grilla de puntos para calcular estadísticas espaciales
   *
   * @param options - Opciones de consulta
   * @returns Estadísticas de SO2
   *
   * @example
   * ```typescript
   * // Detección de pluma volcánica
   * const stats = await tropomi.getSO2Statistics({
   *   bbox: { west: -100, south: 18, east: -98, north: 20 },
   *   resolution: { width: 10, height: 10 } // Grid 10x10
   * });
   * if (stats.max > 5) {
   *   console.log('Posible emisión volcánica detectada!');
   * }
   * ```
   */
  async getSO2Statistics(options: SO2InRegionOptions): Promise<SO2Statistics> {
    const { bbox, timestamp, resolution = { width: 5, height: 5 }, dataset = 'SO2_DAILY' } = options;

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
          this.getSO2AtPoint({
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
      bbox,
      dataset,
    };
  }

  /**
   * Obtener información del servicio TROPOMI
   *
   * @param dataset - Dataset TROPOMI (default: SO2_DAILY)
   * @returns Metadata del servicio
   */
  async getServiceInfo(dataset: TROPOMIDataset = 'SO2_DAILY') {
    const datasetPath = TROPOMI_DATASETS[dataset];
    return await this.client.getServiceInfo(datasetPath);
  }

  /**
   * Obtener extent temporal del dataset
   *
   * @param dataset - Dataset TROPOMI (default: SO2_DAILY)
   * @returns Rango temporal disponible
   */
  async getTemporalExtent(dataset: TROPOMIDataset = 'SO2_DAILY'): Promise<{ start: Date; end: Date }> {
    const info = await this.getServiceInfo(dataset);

    if (!info.timeInfo?.timeExtent) {
      throw new Error(`Temporal extent not available for TROPOMI ${dataset}`);
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
   * @param dataset - Dataset TROPOMI (default: SO2_DAILY)
   * @returns Timestamp más reciente
   */
  async getLatestAvailableTime(dataset: TROPOMIDataset = 'SO2_DAILY'): Promise<Date> {
    const { end } = await this.getTemporalExtent(dataset);
    return end;
  }
}
