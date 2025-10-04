/**
 * SEDAC Service - Refactored with Type-Safe APIs
 *
 * SDK para SEDAC (Socioeconomic Data and Applications Center)
 * Datos sociodemográficos para análisis de equidad ambiental
 *
 * IMPORTANTE: SEDAC es un servicio PÚBLICO (NO requiere autenticación)
 * Crítico para identificar poblaciones vulnerables a contaminación
 */

import { ImageServerClient } from '../core/imageserver-client.js';
import { GeoPoint, BoundingBox } from '../core/geo-types.js';
import { NoDataError } from '../core/errors.js';
import { normalizeGeoPoint, normalizeBoundingBox } from '../core/utils.js';
import type {
  GeoPointInput,
  BoundingBoxInput,
  ImageSize,
} from '../core/types.js';

/**
 * Dataset paths para SEDAC
 */
export const SEDAC_DATASETS = {
  /** Population Density 1km (SSP scenarios by year) */
  POPULATION_DENSITY_1KM: 'SEDAC/ciesin_sedac_pd_sspbsyr_1km',
  /** Population Density 1/8 degree (SSP scenarios by year) */
  POPULATION_DENSITY_1_8TH: 'SEDAC/ciesin_sedac_pd_sspbsyr_1_8th',
  /** Land Use/Land Cover Urban Expansion to 2030 */
  URBAN_EXPANSION_2030: 'SEDAC/ciesin_sedac_lulc_puexpans_2030',
  /** Multidimensional Poverty Index 2010-2020 */
  POVERTY_INDEX: 'SEDAC/ciesin_sedac_pmp_grdi_2010_2020',
} as const;

/**
 * Tipo de dataset SEDAC disponible
 */
export type SEDACDataset = keyof typeof SEDAC_DATASETS;

/**
 * Tipo de datos de población
 */
export type PopulationDataset = 'POPULATION_DENSITY_1KM' | 'POPULATION_DENSITY_1_8TH';

/**
 * Opciones para obtener datos en un punto
 */
export interface SEDACPointQuery {
  /** Ubicación geográfica del punto */
  location: GeoPointInput;
  /** Dataset específico (default: POPULATION_DENSITY_1KM) */
  dataset?: SEDACDataset;
}

/**
 * Opciones para obtener datos en una región
 */
export interface SEDACRegionQuery {
  /** Región geográfica de interés */
  bbox: BoundingBoxInput;
  /** Resolución de la imagen resultante */
  resolution?: ImageSize;
  /** Dataset específico (default: POPULATION_DENSITY_1KM) */
  dataset?: SEDACDataset;
}

/**
 * Respuesta con datos en un punto
 */
export interface PopulationPointData {
  /** Ubicación del punto */
  location: GeoPoint;
  /** Densidad poblacional (persons/km²) */
  density: number | null;
  /** Unidad */
  unit: string;
  /** Dataset usado */
  dataset: SEDACDataset;
}

/**
 * Respuesta con datos en una región
 */
export interface PopulationRegionData {
  /** Región consultada */
  bbox: BoundingBox;
  /** URL de la imagen generada */
  imageUrl: string;
  /** Ancho de la imagen */
  width: number;
  /** Alto de la imagen */
  height: number;
  /** Unidad */
  unit: string;
  /** Dataset usado */
  dataset: SEDACDataset;
}

/**
 * Estadísticas espaciales de población
 */
export interface PopulationStatistics {
  /** Región consultada */
  bbox: BoundingBox;
  /** Dataset usado */
  dataset: SEDACDataset;
  /** Valor mínimo */
  min: number;
  /** Valor máximo */
  max: number;
  /** Media */
  mean: number;
  /** Mediana */
  median: number;
  /** Desviación estándar */
  stdDev: number;
  /** Población total estimada */
  totalPopulation: number;
  /** Percentil 25 */
  percentile25: number;
  /** Percentil 75 */
  percentile75: number;
  /** Percentil 95 */
  percentile95: number;
}

/**
 * SEDAC Service - Type-Safe API
 *
 * Servicio público (NO requiere autenticación) para datos sociodemográficos SEDAC.
 * Esencial para análisis de equidad ambiental e identificación de poblaciones vulnerables.
 *
 * Casos de uso:
 * - Identificar áreas de alto riesgo (high pollution + high population)
 * - Priorizar alertas de calidad del aire
 * - Análisis de environmental justice
 * - Planificación urbana
 *
 * @example
 * ```typescript
 * const sedac = new SEDACService();
 *
 * // Obtener densidad poblacional en un punto
 * const density = await sedac.getPopulationAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 }
 * });
 * console.log(`Densidad: ${density.density} ${density.unit}`);
 * ```
 */
export class SEDACService {
  private client: ImageServerClient;

  /**
   * Crear nuevo servicio SEDAC
   *
   * SEDAC es un servicio público, NO requiere autenticación.
   *
   * @example
   * ```typescript
   * const sedac = new SEDACService();
   * ```
   */
  constructor() {
    this.client = new ImageServerClient();
  }

  // ============================================================================
  // MÉTODOS PRINCIPALES - Population Density
  // ============================================================================

  /**
   * Obtener densidad poblacional en un punto específico
   *
   * Esencial para:
   * - Identificar áreas de alto riesgo (high pollution + high population)
   * - Priorizar alertas de air quality
   * - Environmental justice analysis
   *
   * @param options - Opciones de consulta
   * @returns Densidad poblacional en el punto
   * @throws {ValidationError} Si las coordenadas son inválidas
   * @throws {NoDataError} Si no hay datos para ese punto
   *
   * @example
   * ```typescript
   * const data = await sedac.getPopulationAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 }
   * });
   *
   * console.log(`Densidad: ${data.density} personas/km²`);
   * ```
   */
  async getPopulationAtPoint(options: SEDACPointQuery): Promise<PopulationPointData> {
    const location = normalizeGeoPoint(options.location);
    const dataset = options.dataset || 'POPULATION_DENSITY_1KM';

    const datasetPath = SEDAC_DATASETS[dataset];

    const result = await this.client.identify(
      datasetPath,
      location.toArcGIS(),
      { returnCatalogItems: false }
    );

    // Verificar si hay datos
    const density = result.value === 'NoData' || result.value === undefined
      ? null
      : typeof result.value === 'string'
        ? parseFloat(result.value)
        : result.value;

    if (density === null) {
      throw new NoDataError(
        `No population data available at ${location.toString()}`,
        location
      );
    }

    return {
      location,
      density,
      unit: 'persons/km²',
      dataset,
    };
  }

  /**
   * Obtener densidad poblacional en una región (imagen)
   *
   * @param options - Opciones de consulta
   * @returns Densidad poblacional en la región (URL de imagen)
   * @throws {ValidationError} Si el bounding box es inválido
   *
   * @example
   * ```typescript
   * const data = await sedac.getPopulationInRegion({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   resolution: { width: 512, height: 512 }
   * });
   *
   * console.log(`Image URL: ${data.imageUrl}`);
   *
   * // Integrar con air quality:
   * const no2 = await tempo.getNO2InRegion({ bbox, timestamp });
   * // App logic: identificar áreas con high NO2 + high population
   * ```
   */
  async getPopulationInRegion(options: SEDACRegionQuery): Promise<PopulationRegionData> {
    const bbox = normalizeBoundingBox(options.bbox);
    const resolution = options.resolution || { width: 256, height: 256 };
    const dataset = options.dataset || 'POPULATION_DENSITY_1KM';

    const datasetPath = SEDAC_DATASETS[dataset];

    // Exportar como JSON para obtener href
    const result = await this.client.exportAsJSON(datasetPath, {
      bbox,
      size: resolution,
      format: 'jpg',
    });

    return {
      bbox,
      imageUrl: result.href,
      width: result.width,
      height: result.height,
      unit: 'persons/km²',
      dataset,
    };
  }

  /**
   * Obtener estadísticas espaciales de población (muestreo por grid)
   *
   * Útil para:
   * - Calcular población total expuesta a contaminación
   * - Identificar hotspots poblacionales
   * - Análisis de vulnerabilidad
   *
   * NOTA: Este método usa muestreo de puntos para calcular estadísticas.
   * Para datos precisos de píxeles, usar directamente el ImageServer API.
   *
   * @param options - Opciones de consulta
   * @returns Estadísticas espaciales aproximadas
   *
   * @example
   * ```typescript
   * const stats = await sedac.getPopulationStatistics({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   resolution: { width: 10, height: 10 } // Grid 10x10 = 100 muestras
   * });
   *
   * console.log(`Población estimada: ${stats.totalPopulation.toLocaleString()}`);
   * console.log(`Densidad máxima: ${stats.max} personas/km²`);
   * ```
   */
  async getPopulationStatistics(options: SEDACRegionQuery): Promise<PopulationStatistics> {
    const bbox = normalizeBoundingBox(options.bbox);
    const gridSize = options.resolution || { width: 10, height: 10 };
    const dataset = options.dataset || 'POPULATION_DENSITY_1KM';

    // Crear grid de puntos de muestreo
    const deltaLon = bbox.width / gridSize.width;
    const deltaLat = bbox.height / gridSize.height;

    const samplePoints: { lon: number; lat: number }[] = [];
    for (let i = 0; i < gridSize.width; i++) {
      for (let j = 0; j < gridSize.height; j++) {
        samplePoints.push({
          lon: bbox.west + deltaLon * (i + 0.5),
          lat: bbox.south + deltaLat * (j + 0.5),
        });
      }
    }

    // Muestrear densidad poblacional en cada punto
    const values: number[] = [];
    const batchSize = 10;

    for (let i = 0; i < samplePoints.length; i += batchSize) {
      const batch = samplePoints.slice(i, i + batchSize);
      const densities = await Promise.all(
        batch.map(async (point) => {
          try {
            const data = await this.getPopulationAtPoint({
              location: { latitude: point.lat, longitude: point.lon },
              dataset,
            });
            return data.density || 0;
          } catch {
            return 0; // NoData
          }
        })
      );
      values.push(...densities.filter(v => v > 0));
    }

    if (values.length === 0) {
      throw new Error('No valid population values found in the specified region');
    }

    values.sort((a, b) => a - b);

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const median = values[Math.floor(values.length / 2)];
    const min = values[0];
    const max = values[values.length - 1];

    // Calculate standard deviation
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const percentile25 = values[Math.floor(values.length * 0.25)];
    const percentile75 = values[Math.floor(values.length * 0.75)];
    const percentile95 = values[Math.floor(values.length * 0.95)];

    // Estimar población total (suma * área por punto)
    const areaPerPoint = (bbox.width * 111) * (bbox.height * 111) / samplePoints.length; // km²
    const estimatedTotal = sum * areaPerPoint;

    return {
      bbox,
      dataset,
      min,
      max,
      mean,
      median,
      stdDev,
      totalPopulation: estimatedTotal,
      percentile25,
      percentile75,
      percentile95,
    };
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA - Population Shortcuts
  // ============================================================================

  /**
   * Obtener densidad poblacional en alta resolución (1km) en un punto
   *
   * @example
   * ```typescript
   * const data = await sedac.getPopulationAtPoint1km({
   *   location: { latitude: 34.05, longitude: -118.24 }
   * });
   * ```
   */
  async getPopulationAtPoint1km(
    options: Omit<SEDACPointQuery, 'dataset'>
  ): Promise<PopulationPointData> {
    return this.getPopulationAtPoint({ ...options, dataset: 'POPULATION_DENSITY_1KM' });
  }

  /**
   * Obtener densidad poblacional en baja resolución (1/8 degree) en un punto
   *
   * @example
   * ```typescript
   * const data = await sedac.getPopulationAtPoint1_8th({
   *   location: { latitude: 34.05, longitude: -118.24 }
   * });
   * ```
   */
  async getPopulationAtPoint1_8th(
    options: Omit<SEDACPointQuery, 'dataset'>
  ): Promise<PopulationPointData> {
    return this.getPopulationAtPoint({ ...options, dataset: 'POPULATION_DENSITY_1_8TH' });
  }

  /**
   * Obtener densidad poblacional en alta resolución (1km) en región
   */
  async getPopulationInRegion1km(
    options: Omit<SEDACRegionQuery, 'dataset'>
  ): Promise<PopulationRegionData> {
    return this.getPopulationInRegion({ ...options, dataset: 'POPULATION_DENSITY_1KM' });
  }

  /**
   * Obtener densidad poblacional en baja resolución (1/8 degree) en región
   */
  async getPopulationInRegion1_8th(
    options: Omit<SEDACRegionQuery, 'dataset'>
  ): Promise<PopulationRegionData> {
    return this.getPopulationInRegion({ ...options, dataset: 'POPULATION_DENSITY_1_8TH' });
  }

  // ============================================================================
  // MÉTODOS AVANZADOS - Análisis de riesgo
  // ============================================================================

  /**
   * Identificar áreas de alto riesgo en una región
   *
   * Áreas de alto riesgo = alta densidad poblacional (>threshold)
   *
   * @param options - Opciones de consulta
   * @param densityThreshold - Umbral de densidad (default: percentile 90)
   * @returns Lista de áreas de alto riesgo
   *
   * @example
   * ```typescript
   * const highRiskAreas = await sedac.identifyHighRiskAreas({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   resolution: { width: 100, height: 100 }
   * }, 1000); // >1000 personas/km²
   *
   * console.log(`${highRiskAreas.length} áreas de alto riesgo identificadas`);
   * ```
   */
  async identifyHighRiskAreas(
    options: SEDACRegionQuery,
    _densityThreshold?: number
  ): Promise<{ location: GeoPoint; density: number }[]> {
    const stats = await this.getPopulationStatistics(options);

    // TODO: Usar _densityThreshold para filtrar clusters de alta densidad

    // Aquí podrías implementar lógica para identificar clusters específicos
    // Por ahora retornamos info básica
    return [{
      location: stats.bbox.center,
      density: stats.max,
    }];
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Obtener información del servicio SEDAC
   *
   * @param dataset - Dataset a consultar (default: POPULATION_DENSITY_1KM)
   * @returns Información del ImageServer
   *
   * @example
   * ```typescript
   * const info = await sedac.getServiceInfo();
   * console.log(`Dataset: ${info.name}`);
   * ```
   */
  async getServiceInfo(dataset: SEDACDataset = 'POPULATION_DENSITY_1KM') {
    const datasetPath = SEDAC_DATASETS[dataset];
    return await this.client.getServiceInfo(datasetPath);
  }

  /**
   * Helper: Crear bounding box desde centro + radio
   *
   * @example
   * ```typescript
   * const bbox = SEDACService.createBBoxFromRadius(
   *   { latitude: 34.05, longitude: -118.24 },
   *   50 // 50km radius
   * );
   * ```
   */
  static createBBoxFromRadius(center: GeoPointInput, radiusKm: number): BoundingBox {
    const point = normalizeGeoPoint(center);
    const degreesPerKm = 1 / 111;
    const delta = radiusKm * degreesPerKm;

    return new BoundingBox({
      west: point.longitude - delta,
      south: point.latitude - delta,
      east: point.longitude + delta,
      north: point.latitude + delta,
    });
  }
}
