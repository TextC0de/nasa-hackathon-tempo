/**
 * EarthdataImageServer Factory Class - Refactored
 *
 * Punto de entrada principal para acceder a todos los servicios de NASA Earthdata ImageServer
 * con APIs type-safe y validación de entrada.
 */

import { ImageServerClient } from './core/imageserver-client.js';
import { TEMPOService } from './services/tempo-service.js';
import { POWERService } from './services/power-service.js';
import { SEDACService } from './services/sedac-service.js';
import { IMERGService } from './services/imerg-service.js';
import { TROPOMIService } from './services/tropomi-service.js';
import type { EarthdataCredentials } from './core/types.js';

/**
 * Opciones para crear EarthdataImageServer
 */
export interface EarthdataImageServerOptions {
  /**
   * Credenciales NASA Earthdata (OPCIONAL)
   *
   * Servicios públicos (NO requieren token):
   * - TEMPO (Air quality)
   * - POWER (Weather/climatology)
   * - SEDAC (Socioeconomic data)
   */
  credentials?: EarthdataCredentials;
}

/**
 * Clase principal EarthdataImageServer
 *
 * Factory class que proporciona acceso type-safe a todos los servicios disponibles
 * en NASA Earthdata ImageServer.
 *
 * Servicios disponibles:
 * - **TEMPO**: Datos de calidad del aire (NO2, O3, HCHO) - Servicio PÚBLICO
 * - **POWER**: Datos meteorológicos climatológicos - Servicio PÚBLICO
 * - **SEDAC**: Datos sociodemográficos - Servicio PÚBLICO
 * - **IMERG**: Precipitación near-real-time - Servicio PÚBLICO
 * - **TROPOMI**: SO2 (dióxido de azufre) - Servicio PÚBLICO
 *
 * @example
 * ```typescript
 * // Sin autenticación (servicios públicos)
 * const imageServer = new EarthdataImageServer();
 *
 * // Acceder a TEMPO (air quality)
 * const no2 = await imageServer.tempo.getDataAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   timestamp: new Date('2025-10-01T23:00:00Z')
 * });
 *
 * // Acceder a POWER (weather)
 * const weather = await imageServer.power.getWeatherConditions({
 *   location: { latitude: 34.05, longitude: -118.24 }
 * });
 *
 * // Acceder a SEDAC (population)
 * const density = await imageServer.sedac.getPopulationAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 }
 * });
 * ```
 */
export class EarthdataImageServer {
  /**
   * Cliente base ImageServer (para uso avanzado)
   *
   * Por defecto sin autenticación. Usar setAuthToken() si se necesita.
   */
  public readonly client: ImageServerClient;

  /**
   * Servicio TEMPO (Air Quality - NO2, O3, HCHO)
   *
   * Servicio PÚBLICO - NO requiere autenticación
   */
  public readonly tempo: TEMPOService;

  /**
   * Servicio POWER (Weather/Climatology)
   *
   * Servicio PÚBLICO - NO requiere autenticación
   */
  public readonly power: POWERService;

  /**
   * Servicio SEDAC (Socioeconomic Data)
   *
   * Servicio PÚBLICO - NO requiere autenticación
   */
  public readonly sedac: SEDACService;

  /**
   * Servicio IMERG (Precipitation)
   *
   * Servicio PÚBLICO - NO requiere autenticación
   */
  public readonly imerg: IMERGService;

  /**
   * Servicio TROPOMI (SO2)
   *
   * Servicio PÚBLICO - NO requiere autenticación
   */
  public readonly tropomi: TROPOMIService;

  /**
   * Crear nueva instancia EarthdataImageServer
   *
   * @param options - Opciones de configuración (credenciales opcionales)
   *
   * @example
   * ```typescript
   * // Crear instancia (servicios públicos: TEMPO, POWER, SEDAC)
   * const imageServer = new EarthdataImageServer();
   * ```
   */
  constructor(options?: EarthdataImageServerOptions) {
    // Cliente base sin autenticación por defecto
    this.client = new ImageServerClient();

    // Si hay credenciales, configurar auth en el cliente
    if (options?.credentials?.token) {
      this.client.setAuthToken(options.credentials.token);
    }

    // Servicios PÚBLICOS (sin credenciales)
    this.tempo = new TEMPOService();
    this.power = new POWERService();
    this.sedac = new SEDACService();
    this.imerg = new IMERGService();
    this.tropomi = new TROPOMIService();
  }

  /**
   * Listar todos los datasets disponibles en ImageServer
   *
   * @param folder - Carpeta específica (opcional)
   * @returns Lista de datasets y carpetas
   *
   * @example
   * ```typescript
   * const datasets = await imageServer.listDatasets();
   * console.log(datasets.folders); // ['C3685896708-LARC_CLOUD', 'FireTracking', 'POWER', ...]
   * ```
   */
  async listDatasets(folder?: string) {
    return await this.client.listDatasets(folder);
  }

  /**
   * Obtener información de un dataset específico
   *
   * @param datasetPath - Path del dataset
   * @returns Información completa del servicio
   *
   * @example
   * ```typescript
   * const info = await imageServer.getDatasetInfo(
   *   'C3685896708-LARC_CLOUD/TEMPO_NO2_L3_V04_HOURLY_TROPOSPHERIC_VERTICAL_COLUMN'
   * );
   * console.log(`Extent: ${JSON.stringify(info.extent)}`);
   * console.log(`Time range: ${info.timeInfo?.timeExtent}`);
   * ```
   */
  async getDatasetInfo(datasetPath: string) {
    return await this.client.getServiceInfo(datasetPath);
  }

}

/**
 * Helper: Crear instancia EarthdataImageServer sin autenticación
 *
 * Función conveniente para crear una instancia con solo servicios públicos
 * (TEMPO, POWER, SEDAC)
 *
 * @returns Instancia EarthdataImageServer (sin FIRMS)
 *
 * @example
 * ```typescript
 * const imageServer = createPublicEarthdataImageServer();
 * const no2 = await imageServer.tempo.getDataAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   timestamp: new Date()
 * });
 * ```
 */
export function createPublicEarthdataImageServer(): EarthdataImageServer {
  return new EarthdataImageServer();
}

/**
 * Helper: Crear instancia EarthdataImageServer con autenticación
 *
 * @param credentials - Credenciales NASA Earthdata
 * @returns Instancia EarthdataImageServer
 *
 * @deprecated Las credenciales ya no son necesarias para los servicios disponibles.
 * Use `new EarthdataImageServer()` directamente.
 */
export function createAuthenticatedEarthdataImageServer(
  credentials: EarthdataCredentials
): EarthdataImageServer {
  return new EarthdataImageServer({ credentials });
}

/**
 * @deprecated Use `new EarthdataImageServer({ credentials })` instead
 */
export function createEarthdataImageServer(credentials?: EarthdataCredentials): EarthdataImageServer {
  return new EarthdataImageServer(credentials ? { credentials } : undefined);
}
