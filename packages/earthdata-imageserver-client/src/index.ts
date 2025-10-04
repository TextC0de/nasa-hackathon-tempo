/**
 * @atmos/earthdata-imageserver
 *
 * SDK para NASA Earthdata ImageServer API
 *
 * Proporciona acceso fácil a datos satelitales de NASA incluyendo:
 * - TEMPO: NO2, O3, HCHO troposférico (calidad del aire)
 * - POWER: Datos meteorológicos y climatológicos
 * - SEDAC: Datos socioeconómicos y demográficos
 * - Y más datasets disponibles en NASA Earthdata ImageServer
 *
 * @example
 * ```typescript
 * import { EarthdataImageServer } from '@atmos/earthdata-imageserver';
 *
 * const imageServer = new EarthdataImageServer();
 *
 * // Obtener datos TEMPO NO2
 * const no2 = await imageServer.tempo.getNO2AtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 },
 *   timestamp: new Date()
 * });
 *
 * // Obtener datos de población
 * const population = await imageServer.sedac.getPopulationAtPoint({
 *   location: { latitude: 34.05, longitude: -118.24 }
 * });
 * ```
 */

// Export main factory class
export { EarthdataImageServer, createEarthdataImageServer } from './earthdata-imageserver';

// Export core client (for advanced usage)
export { ImageServerClient } from './core/imageserver-client';

// Export services
export { TEMPOService, TEMPO_DATASETS } from './services/tempo-service';
export { POWERService, POWER_DATASETS, POWERVariable } from './services/power-service';
export { IMERGService, IMERG_DATASETS } from './services/imerg-service';
export { TROPOMIService, TROPOMI_DATASETS } from './services/tropomi-service';
export { SEDACService, SEDAC_DATASETS } from './services/sedac-service';

// Export core types
export type {
  EarthdataCredentials,
  BoundingBox,
  GeoPoint,
  ImageSize,
  TimeRange,
  SpatialReference,
  ImageServerFormat,
  QueryOptions,
  DataResponse,
  ImageOverlayResponse,
  ExportImageParams,
  ImageServerInfo,
  IdentifyResponse,
  DatasetSearchResult,
} from './core/types';

// Export TEMPO types
export type {
  TEMPOPollutant,
} from './services/tempo-service';

// Export POWER types
export type {
  POWERDataset,
  WeatherConditions,
} from './services/power-service';

// Export IMERG types
export type {
  IMERGDataset,
  PrecipitationDataPoint,
  PrecipitationImageResponse,
  PrecipitationStatistics,
} from './services/imerg-service';

// Export TROPOMI types
export type {
  TROPOMIDataset,
  SO2DataPoint,
  SO2ImageResponse,
  SO2Statistics,
} from './services/tropomi-service';

// Export SEDAC types
export type {
  SEDACDataset,
  PopulationDataset,
  PopulationStatistics,
} from './services/sedac-service';
