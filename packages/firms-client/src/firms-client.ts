/**
 * Cliente oficial para NASA FIRMS API
 *
 * Fire Information for Resource Management System (FIRMS)
 * API: https://firms.modaps.eosdis.nasa.gov
 *
 * Proporciona acceso a datos de incendios activos en tiempo real
 * desde satélites MODIS, VIIRS, y Landsat.
 */

import type {
  FIRMSCredentials,
  FIRMSSource,
  BoundingBox,
  FIRMSQueryOptions,
  FireDataResponse,
  FireStatistics,
  DataAvailabilityOptions,
  DataAvailability,
} from './types.js';

import {
  FIRMSError,
  FIRMSAuthError,
  FIRMSRateLimitError,
} from './types.js';

import {
  parseFireCSV,
  normalizeConfidence,
  validateBoundingBox,
  formatDateForAPI,
} from './utils/csv-parser.js';

/**
 * Cliente FIRMS
 *
 * @example
 * ```typescript
 * const firms = new FIRMSClient({ mapKey: 'tu-map-key-32-chars' });
 *
 * // Obtener incendios en California (últimas 24 horas)
 * const fires = await firms.getFiresInRegion({
 *   west: -125,
 *   south: 32,
 *   east: -114,
 *   north: 42
 * });
 *
 * console.log(`Total fires: ${fires.count}`);
 * fires.fires.forEach(fire => {
 *   console.log(`Fire at ${fire.latitude}, ${fire.longitude} - FRP: ${fire.frp} MW`);
 * });
 * ```
 */
export class FIRMSClient {
  private readonly mapKey: string;
  private readonly baseURL = 'https://firms.modaps.eosdis.nasa.gov/api';

  /**
   * Crear cliente FIRMS
   *
   * @param credentials - Credenciales FIRMS (MAP_KEY)
   *
   * Para obtener MAP_KEY gratuito:
   * https://firms.modaps.eosdis.nasa.gov/api/map_key/
   */
  constructor(credentials: FIRMSCredentials) {
    if (!credentials.mapKey || credentials.mapKey.length !== 32) {
      throw new FIRMSAuthError('MAP_KEY debe ser de 32 caracteres alfanuméricos');
    }
    this.mapKey = credentials.mapKey;
  }

  /**
   * Obtener incendios activos en una región geográfica
   *
   * Usa endpoint /api/area/csv/
   *
   * @param bbox - Bounding box geográfico
   * @param options - Opciones de consulta (sensor, días hacia atrás)
   * @returns Respuesta con lista de incendios
   *
   * @example
   * ```typescript
   * // Incendios en California (últimas 24h, sensor VIIRS)
   * const fires = await firms.getFiresInRegion({
   *   west: -125, south: 32, east: -114, north: 42
   * }, {
   *   source: 'VIIRS_SNPP_NRT',
   *   dayRange: 1
   * });
   * ```
   */
  async getFiresInRegion(
    bbox: BoundingBox,
    options: FIRMSQueryOptions = {}
  ): Promise<FireDataResponse> {
    const { west, south, east, north } = bbox;

    // Validar bbox
    validateBoundingBox(west, south, east, north);

    const source = options.source || 'VIIRS_SNPP_NRT';
    const dayRange = options.dayRange || 1;

    // Validar dayRange
    if (dayRange < 1 || dayRange > 10) {
      throw new FIRMSError('dayRange debe estar entre 1 y 10 días');
    }

    // Construir URL
    let url: string;
    if (options.date) {
      // Fecha específica
      url = `${this.baseURL}/area/csv/${this.mapKey}/${source}/${west},${south},${east},${north}/${options.date}`;
    } else {
      // Días hacia atrás
      url = `${this.baseURL}/area/csv/${this.mapKey}/${source}/${west},${south},${east},${north}/${dayRange}`;
    }

    console.log(`[FIRMS] Fetching fires: ${url}`);

    const response = await this.fetch(url);
    const csvText = await response.text();

    // Parsear CSV
    const fires = parseFireCSV(csvText);

    return {
      fires,
      count: fires.length,
      metadata: {
        source,
        bbox,
        dayRange: options.date ? undefined : dayRange,
        date: options.date,
        requestedAt: new Date(),
      },
    };
  }

  /**
   * Obtener estadísticas de incendios en una región
   *
   * Calcula métricas agregadas sobre los incendios detectados
   *
   * @param bbox - Bounding box geográfico
   * @param options - Opciones de consulta
   * @returns Estadísticas de incendios
   *
   * @example
   * ```typescript
   * const stats = await firms.getFireStatistics({
   *   west: -125, south: 32, east: -114, north: 42
   * });
   * console.log(`Total fires: ${stats.totalFires}`);
   * console.log(`Average FRP: ${stats.averageFRP} MW`);
   * ```
   */
  async getFireStatistics(
    bbox: BoundingBox,
    options: FIRMSQueryOptions = {}
  ): Promise<FireStatistics> {
    const response = await this.getFiresInRegion(bbox, options);
    const fires = response.fires;

    if (fires.length === 0) {
      return {
        totalFires: 0,
        averageFRP: 0,
        maxFRP: 0,
        totalFRP: 0,
        confidenceDistribution: { high: 0, nominal: 0, low: 0 },
        daynightDistribution: { day: 0, night: 0 },
      };
    }

    // Calcular FRP stats
    const frpValues = fires.map(f => f.frp);
    const totalFRP = frpValues.reduce((sum, frp) => sum + frp, 0);
    const averageFRP = totalFRP / fires.length;
    const maxFRP = Math.max(...frpValues);

    // Distribución de confianza
    const confidenceDistribution = { high: 0, nominal: 0, low: 0 };
    fires.forEach(fire => {
      const level = normalizeConfidence(fire.confidence);
      confidenceDistribution[level]++;
    });

    // Distribución día/noche
    const daynightDistribution = { day: 0, night: 0 };
    fires.forEach(fire => {
      if (fire.daynight === 'D') {
        daynightDistribution.day++;
      } else {
        daynightDistribution.night++;
      }
    });

    return {
      totalFires: fires.length,
      averageFRP,
      maxFRP,
      totalFRP,
      confidenceDistribution,
      daynightDistribution,
    };
  }

  /**
   * Verificar disponibilidad de datos
   *
   * Usa endpoint /api/data_availability/
   *
   * @param options - Opciones de disponibilidad
   * @returns Fechas disponibles
   *
   * @example
   * ```typescript
   * const availability = await firms.checkDataAvailability({
   *   source: 'VIIRS_SNPP_NRT',
   *   year: '2024',
   *   month: 1
   * });
   * console.log(`Available dates: ${availability.availableDates.join(', ')}`);
   * ```
   */
  async checkDataAvailability(
    options: DataAvailabilityOptions
  ): Promise<DataAvailability> {
    const { source, year, month, day } = options;

    // Construir URL
    let url = `${this.baseURL}/data_availability/csv/${this.mapKey}/${source}`;

    if (year) url += `/${year}`;
    if (month) url += `/${month}`;
    if (day) url += `/${day}`;

    console.log(`[FIRMS] Checking availability: ${url}`);

    const response = await this.fetch(url);
    const csvText = await response.text();

    // Parsear CSV de disponibilidad (formato simple: fecha por línea)
    const lines = csvText.trim().split('\n');
    const availableDates = lines.filter((line: string) => line.trim()).slice(1); // Skip header

    return {
      source,
      availableDates,
    };
  }

  /**
   * Validar MAP_KEY
   *
   * Intenta una consulta simple para verificar que el MAP_KEY sea válido
   *
   * @returns true si el MAP_KEY es válido
   * @throws FIRMSAuthError si el MAP_KEY es inválido
   *
   * @example
   * ```typescript
   * try {
   *   await firms.validateMapKey();
   *   console.log('MAP_KEY is valid');
   * } catch (error) {
   *   console.error('Invalid MAP_KEY');
   * }
   * ```
   */
  async validateMapKey(): Promise<boolean> {
    // Intenta obtener disponibilidad de datos (consulta ligera)
    try {
      await this.checkDataAvailability({
        source: 'VIIRS_SNPP_NRT',
      });
      return true;
    } catch (error) {
      if (error instanceof FIRMSAuthError) {
        throw error;
      }
      // Otros errores no son de autenticación
      return true;
    }
  }

  /**
   * Fetch wrapper con manejo de errores FIRMS
   */
  private async fetch(url: string): Promise<Response> {
    try {
      const response = await fetch(url);

      // Verificar errores HTTP
      if (!response.ok) {
        const text = await response.text();

        // Rate limit
        if (response.status === 429) {
          throw new FIRMSRateLimitError();
        }

        // Auth error
        if (response.status === 401 || response.status === 403) {
          throw new FIRMSAuthError('Invalid or expired MAP_KEY');
        }

        // Otros errores
        throw new FIRMSError(
          `FIRMS API error: ${response.status} ${response.statusText}`,
          response.status,
          text
        );
      }

      return response;
    } catch (error) {
      if (error instanceof FIRMSError) {
        throw error;
      }

      // Network error
      throw new FIRMSError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
