/**
 * POWER Service - Refactored with Type-Safe APIs
 *
 * SDK para POWER (Prediction Of Worldwide Energy Resources)
 * Datos meteorológicos climatológicos (MONTHLY/ANNUAL)
 *
 * IMPORTANTE: POWER es un servicio PÚBLICO (NO requiere autenticación)
 * Proporciona datos climatológicos, NO near-real-time
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
 * Dataset paths para POWER
 */
export const POWER_DATASETS = {
  MONTHLY_METEOROLOGY: 'POWER/POWER_MONTHLY_METEOROLOGY_LST',
  ANNUAL_METEOROLOGY: 'POWER/POWER_ANNUAL_METEOROLOGY_LST',
  CLIMATOLOGY_METEOROLOGY: 'POWER/POWER_CLIMATOLOGY_METEOROLOGY_LST',
} as const;

/**
 * Tipo de dataset POWER disponible
 */
export type POWERDataset = keyof typeof POWER_DATASETS;

/**
 * Variables meteorológicas disponibles (críticas para air quality)
 */
export enum POWERVariable {
  /** Temperature at 2 Meters (°C) - Affects ozone formation */
  TEMPERATURE_2M = 'T2M',
  /** Relative Humidity at 2 Meters (%) - Affects particle behavior */
  RELATIVE_HUMIDITY_2M = 'RH2M',
  /** Precipitation Corrected Sum (mm) - Removes particulates */
  PRECIPITATION = 'PRECTOTCORR_SUM',
  /** Wind Speed at 10 Meters (m/s) - Disperses/concentrates pollutants */
  WIND_SPEED_10M = 'WS10M',
  /** Surface Pressure (kPa) - Affects atmospheric mixing */
  SURFACE_PRESSURE = 'PS',
  /** Specific Humidity at 2 Meters (g/kg) */
  SPECIFIC_HUMIDITY_2M = 'QV2M',
  /** Wind Speed at 2 Meters (m/s) */
  WIND_SPEED_2M = 'WS2M',
  /** Dew/Frost Point at 2 Meters (°C) */
  DEW_POINT_2M = 'T2MDEW',
}

/**
 * Unidades para cada variable meteorológica
 */
const POWER_UNITS: Record<POWERVariable, string> = {
  [POWERVariable.TEMPERATURE_2M]: '°C',
  [POWERVariable.RELATIVE_HUMIDITY_2M]: '%',
  [POWERVariable.PRECIPITATION]: 'mm',
  [POWERVariable.WIND_SPEED_10M]: 'm/s',
  [POWERVariable.SURFACE_PRESSURE]: 'kPa',
  [POWERVariable.SPECIFIC_HUMIDITY_2M]: 'g/kg',
  [POWERVariable.WIND_SPEED_2M]: 'm/s',
  [POWERVariable.DEW_POINT_2M]: '°C',
};

/**
 * Opciones para obtener datos meteorológicos en un punto
 */
export interface POWERPointQuery {
  /** Ubicación geográfica del punto */
  location: GeoPointInput;
  /** Variable meteorológica (default: TEMPERATURE_2M) */
  variable?: POWERVariable;
  /** Dataset específico (default: MONTHLY_METEOROLOGY) */
  dataset?: POWERDataset;
}

/**
 * Opciones para obtener datos meteorológicos en una región
 */
export interface POWERRegionQuery {
  /** Región geográfica de interés */
  bbox: BoundingBoxInput;
  /** Variable meteorológica (default: TEMPERATURE_2M) */
  variable?: POWERVariable;
  /** Resolución de la imagen resultante */
  resolution?: ImageSize;
  /** Dataset específico (default: MONTHLY_METEOROLOGY) */
  dataset?: POWERDataset;
}

/**
 * Respuesta con datos meteorológicos en un punto
 */
export interface WeatherPointData {
  /** Variable meteorológica */
  variable: POWERVariable;
  /** Ubicación del punto */
  location: GeoPoint;
  /** Valor medido (null si NoData) */
  value: number | null;
  /** Unidad del valor */
  unit: string;
  /** Dataset usado */
  dataset: POWERDataset;
}

/**
 * Respuesta con datos meteorológicos en una región
 */
export interface WeatherRegionData {
  /** Variable meteorológica */
  variable: POWERVariable;
  /** Región consultada */
  bbox: BoundingBox;
  /** URL de la imagen generada */
  imageUrl: string;
  /** Ancho de la imagen */
  width: number;
  /** Alto de la imagen */
  height: number;
  /** Unidad de los valores */
  unit: string;
  /** Dataset usado */
  dataset: POWERDataset;
}

/**
 * Condiciones meteorológicas completas en un punto
 */
export interface WeatherConditions {
  /** Ubicación del punto */
  location: GeoPoint;
  /** Dataset usado */
  dataset: POWERDataset;
  /** Temperature at 2m (°C) */
  temperature?: number;
  /** Relative humidity (%) */
  humidity?: number;
  /** Precipitation (mm) */
  precipitation?: number;
  /** Wind speed at 10m (m/s) */
  windSpeed?: number;
  /** Surface pressure (kPa) */
  pressure?: number;
  /** Dew point (°C) */
  dewPoint?: number;
}

/**
 * POWER Service - Type-Safe API
 *
 * Servicio público (NO requiere autenticación) para datos meteorológicos POWER.
 * Proporciona datos climatológicos esenciales para análisis de calidad del aire.
 *
 * Variables clave:
 * - Temperature: Afecta reacciones químicas de ozono
 * - Wind: Dispersa o concentra contaminantes
 * - Precipitation: Remueve partículas
 * - Humidity: Afecta comportamiento de partículas
 * - Pressure: Controla estabilidad atmosférica
 *
 * @example
 * ```typescript
 * const power = new POWERService();
 *
 * // Obtener temperatura en un punto
 * const temp = await power.getDataAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   variable: POWERVariable.TEMPERATURE_2M
 * });
 * console.log(`Temperatura: ${temp.value}${temp.unit}`);
 * ```
 */
export class POWERService {
  private client: ImageServerClient;

  /**
   * Crear nuevo servicio POWER
   *
   * POWER es un servicio público, NO requiere autenticación.
   *
   * @example
   * ```typescript
   * const power = new POWERService();
   * ```
   */
  constructor() {
    this.client = new ImageServerClient();
  }

  // ============================================================================
  // MÉTODOS PRINCIPALES - Point Queries
  // ============================================================================

  /**
   * Obtener datos meteorológicos en un punto específico
   *
   * @param options - Opciones de consulta
   * @returns Datos meteorológicos en el punto
   * @throws {ValidationError} Si las coordenadas son inválidas
   * @throws {NoDataError} Si no hay datos para ese punto
   *
   * @example
   * ```typescript
   * const data = await power.getDataAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 },
   *   variable: POWERVariable.TEMPERATURE_2M
   * });
   *
   * if (data.value !== null) {
   *   console.log(`${data.variable}: ${data.value} ${data.unit}`);
   * }
   * ```
   */
  async getDataAtPoint(options: POWERPointQuery): Promise<WeatherPointData> {
    const location = normalizeGeoPoint(options.location);
    const variable = options.variable || POWERVariable.TEMPERATURE_2M;
    const dataset = options.dataset || 'MONTHLY_METEOROLOGY';

    const datasetPath = POWER_DATASETS[dataset];

    // POWER usa multidimensional info con variables específicas
    const mosaicRule = {
      mosaicMethod: 'esriMosaicAttribute',
      where: `Variable='${variable}'`,
    };

    const result = await this.client.identify(
      datasetPath,
      location.toArcGIS(),
      { returnCatalogItems: false, mosaicRule }
    );

    // Verificar si hay datos
    const value = result.value === 'NoData' || result.value === undefined
      ? null
      : typeof result.value === 'string'
        ? parseFloat(result.value)
        : result.value;

    if (value === null) {
      throw new NoDataError(
        `No ${variable} data available at ${location.toString()}`,
        location
      );
    }

    return {
      variable,
      location,
      value,
      unit: POWER_UNITS[variable],
      dataset,
    };
  }

  /**
   * Obtener datos meteorológicos en una región (imagen)
   *
   * @param options - Opciones de consulta
   * @returns Datos meteorológicos en la región (URL de imagen)
   * @throws {ValidationError} Si el bounding box es inválido
   *
   * @example
   * ```typescript
   * const data = await power.getDataInRegion({
   *   bbox: { west: -120, south: 34, east: -118, north: 36 },
   *   variable: POWERVariable.WIND_SPEED_10M,
   *   resolution: { width: 512, height: 512 }
   * });
   *
   * console.log(`Image URL: ${data.imageUrl}`);
   * ```
   */
  async getDataInRegion(options: POWERRegionQuery): Promise<WeatherRegionData> {
    const bbox = normalizeBoundingBox(options.bbox);
    const variable = options.variable || POWERVariable.TEMPERATURE_2M;
    const resolution = options.resolution || { width: 256, height: 256 };
    const dataset = options.dataset || 'MONTHLY_METEOROLOGY';

    const datasetPath = POWER_DATASETS[dataset];

    const mosaicRule = {
      mosaicMethod: 'esriMosaicAttribute',
      where: `Variable='${variable}'`,
    };

    // Exportar como JSON para obtener href
    const result = await this.client.exportAsJSON(datasetPath, {
      bbox,
      size: resolution,
      format: 'jpg',
      mosaicRule,
    });

    return {
      variable,
      bbox,
      imageUrl: result.href,
      width: result.width,
      height: result.height,
      unit: POWER_UNITS[variable],
      dataset,
    };
  }

  // ============================================================================
  // MÉTODOS DE CONVENIENCIA - Shortcuts por variable
  // ============================================================================

  /**
   * Obtener temperatura en un punto (shortcut)
   *
   * @example
   * ```typescript
   * const temp = await power.getTemperatureAtPoint({
   *   location: { latitude: 34.05, longitude: -118.24 }
   * });
   * console.log(`${temp.value}°C`);
   * ```
   */
  async getTemperatureAtPoint(options: Omit<POWERPointQuery, 'variable'>): Promise<WeatherPointData> {
    return this.getDataAtPoint({ ...options, variable: POWERVariable.TEMPERATURE_2M });
  }

  /**
   * Obtener humedad en un punto (shortcut)
   */
  async getHumidityAtPoint(options: Omit<POWERPointQuery, 'variable'>): Promise<WeatherPointData> {
    return this.getDataAtPoint({ ...options, variable: POWERVariable.RELATIVE_HUMIDITY_2M });
  }

  /**
   * Obtener precipitación en un punto (shortcut)
   */
  async getPrecipitationAtPoint(options: Omit<POWERPointQuery, 'variable'>): Promise<WeatherPointData> {
    return this.getDataAtPoint({ ...options, variable: POWERVariable.PRECIPITATION });
  }

  /**
   * Obtener viento en un punto (shortcut)
   */
  async getWindSpeedAtPoint(options: Omit<POWERPointQuery, 'variable'>): Promise<WeatherPointData> {
    return this.getDataAtPoint({ ...options, variable: POWERVariable.WIND_SPEED_10M });
  }

  /**
   * Obtener temperatura en región (shortcut)
   */
  async getTemperatureInRegion(options: Omit<POWERRegionQuery, 'variable'>): Promise<WeatherRegionData> {
    return this.getDataInRegion({ ...options, variable: POWERVariable.TEMPERATURE_2M });
  }

  /**
   * Obtener viento en región (shortcut)
   */
  async getWindSpeedInRegion(options: Omit<POWERRegionQuery, 'variable'>): Promise<WeatherRegionData> {
    return this.getDataInRegion({ ...options, variable: POWERVariable.WIND_SPEED_10M });
  }

  // ============================================================================
  // MÉTODOS AVANZADOS - Múltiples variables
  // ============================================================================

  /**
   * Obtener condiciones meteorológicas completas en un punto
   *
   * Obtiene temperatura, humedad, precipitación, viento, presión en una sola llamada
   *
   * @param options - Opciones de consulta
   * @returns Condiciones meteorológicas
   *
   * @example
   * ```typescript
   * const conditions = await power.getWeatherConditions({
   *   location: { latitude: 34.05, longitude: -118.24 }
   * });
   *
   * console.log(`Temperatura: ${conditions.temperature}°C`);
   * console.log(`Viento: ${conditions.windSpeed} m/s`);
   * console.log(`Humedad: ${conditions.humidity}%`);
   * ```
   */
  async getWeatherConditions(
    options: Omit<POWERPointQuery, 'variable'>
  ): Promise<WeatherConditions> {
    const location = normalizeGeoPoint(options.location);
    const dataset = options.dataset || 'MONTHLY_METEOROLOGY';

    const variables: POWERVariable[] = [
      POWERVariable.TEMPERATURE_2M,
      POWERVariable.RELATIVE_HUMIDITY_2M,
      POWERVariable.PRECIPITATION,
      POWERVariable.WIND_SPEED_10M,
      POWERVariable.SURFACE_PRESSURE,
      POWERVariable.DEW_POINT_2M,
    ];

    const results = await Promise.all(
      variables.map(async (variable) => {
        try {
          const data = await this.getDataAtPoint({
            location,
            variable,
            dataset,
          });
          return { variable, value: data.value };
        } catch (error) {
          return { variable, value: null };
        }
      })
    );

    const conditions: WeatherConditions = {
      location,
      dataset,
    };

    results.forEach(({ variable, value }) => {
      if (value !== null) {
        switch (variable) {
          case POWERVariable.TEMPERATURE_2M:
            conditions.temperature = value;
            break;
          case POWERVariable.RELATIVE_HUMIDITY_2M:
            conditions.humidity = value;
            break;
          case POWERVariable.PRECIPITATION:
            conditions.precipitation = value;
            break;
          case POWERVariable.WIND_SPEED_10M:
            conditions.windSpeed = value;
            break;
          case POWERVariable.SURFACE_PRESSURE:
            conditions.pressure = value;
            break;
          case POWERVariable.DEW_POINT_2M:
            conditions.dewPoint = value;
            break;
        }
      }
    });

    return conditions;
  }

  // ============================================================================
  // MÉTODOS DE UTILIDAD
  // ============================================================================

  /**
   * Obtener información del servicio POWER
   *
   * @param dataset - Dataset a consultar (default: MONTHLY_METEOROLOGY)
   * @returns Información del ImageServer
   *
   * @example
   * ```typescript
   * const info = await power.getServiceInfo();
   * console.log(`Dataset: ${info.name}`);
   * ```
   */
  async getServiceInfo(dataset: POWERDataset = 'MONTHLY_METEOROLOGY') {
    const datasetPath = POWER_DATASETS[dataset];
    return await this.client.getServiceInfo(datasetPath);
  }

  /**
   * Helper: Crear bounding box desde centro + radio
   *
   * @example
   * ```typescript
   * const bbox = POWERService.createBBoxFromRadius(
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
