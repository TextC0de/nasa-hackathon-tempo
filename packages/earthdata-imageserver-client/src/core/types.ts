/**
 * NASA Earthdata ImageServer - Tipos compartidos
 *
 * Tipos TypeScript para trabajar con NASA Earthdata ImageServer API
 */

// Re-exportar clases validadas desde geo-types
export { GeoPoint, BoundingBox, TimeRange } from './geo-types.js';

// Re-exportar errores personalizados
export {
  ValidationError,
  NoDataError,
  AuthenticationError,
  ServiceError,
  TimeRangeError,
  isValidationError,
  isNoDataError,
  isAuthenticationError,
  isServiceError,
  isTimeRangeError,
} from './errors.js';

/**
 * Formato de respuesta del ImageServer
 */
export type ImageServerFormat = 'png' | 'jpg' | 'json' | 'jsonp' | 'png8' | 'png24' | 'png32';

/**
 * Sistema de referencia espacial (Coordinate Reference System)
 */
export interface SpatialReference {
  /** Well-known ID del sistema de coordenadas (e.g., 4326 para WGS84) */
  wkid: number;
  /** Latest WKID si el sistema fue actualizado */
  latestWkid?: number;
}

/**
 * Tamaño de imagen en píxeles (ancho x alto)
 */
export interface ImageSize {
  /** Ancho en píxeles */
  width: number;
  /** Alto en píxeles */
  height: number;
}

/**
 * Credenciales NASA Earthdata (solo para servicios que lo requieran como FIRMS)
 */
export interface EarthdataCredentials {
  /** JWT token de Earthdata Login (obtener en https://urs.earthdata.nasa.gov) */
  token: string;
}

/**
 * Tipo que acepta BoundingBox class o objeto plano
 */
export type BoundingBoxInput = import('./geo-types.js').BoundingBox | { west: number; south: number; east: number; north: number };

/**
 * Tipo que acepta GeoPoint class o objeto plano
 */
export type GeoPointInput = import('./geo-types.js').GeoPoint | { latitude: number; longitude: number };

/**
 * Tipo que acepta TimeRange class o objeto plano
 */
export type TimeRangeInput = import('./geo-types.js').TimeRange | { start: Date | number; end: Date | number };

/**
 * Parámetros para exportar imagen desde ImageServer
 */
export interface ExportImageParams {
  /** Bounding box del área a exportar */
  bbox: BoundingBoxInput;
  /** Tamaño de la imagen resultante en píxeles */
  size?: ImageSize;
  /** Formato de salida (png, jpg, json, etc.) */
  format?: ImageServerFormat;
  /** Sistema de referencia espacial para la imagen */
  imageSR?: SpatialReference;
  /** Sistema de referencia espacial del bbox */
  bboxSR?: SpatialReference;
  /** Timestamp (milliseconds desde epoch) o fecha ISO string */
  time?: number | string;
  /** Tipo de pixel (e.g., 'U8', 'S16', 'F32') */
  pixelType?: string;
  /** Valor que representa NoData */
  noData?: number;
  /** Interpretación de NoData ('esriNoDataMatchAny' | 'esriNoDataMatchAll') */
  noDataInterpretation?: string;
  /** Método de interpolación ('RSP_BilinearInterpolation' | 'RSP_NearestNeighbor') */
  interpolation?: string;
  /** Tipo de compresión */
  compression?: string;
  /** Calidad de compresión (1-100) */
  compressionQuality?: number;
  /** IDs de bandas a incluir */
  bandIds?: number[];
  /** Regla de mosaico para datos multidimensionales */
  mosaicRule?: any;
  /** Regla de renderizado (colormaps, stretch, etc.) */
  renderingRule?: any;
  /** Formato de respuesta */
  f?: 'json' | 'image' | 'kmz';
}

/**
 * Respuesta JSON del ImageServer (identificar)
 */
export interface IdentifyResponse {
  objectId?: number;
  name?: string;
  value?: string | number;
  properties?: Record<string, any>;
  catalogItems?: {
    features: Array<{
      attributes: Record<string, any>;
    }>;
  };
}

/**
 * Información del ImageServer
 */
export interface ImageServerInfo {
  currentVersion: number;
  serviceDescription: string;
  name: string;
  description: string;
  extent: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference: SpatialReference;
  };
  initialExtent?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference: SpatialReference;
  };
  fullExtent?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
    spatialReference: SpatialReference;
  };
  timeInfo?: {
    startTimeField: string;
    endTimeField: string;
    timeExtent: number[];
    timeReference: any;
    defaultTimeInterval: number;
    defaultTimeIntervalUnits: string;
  };
  pixelSizeX: number;
  pixelSizeY: number;
  bandCount: number;
  pixelType: string;
  minPixelSize: number;
  maxPixelSize: number;
  serviceDataType: string;
  minValues: number[];
  maxValues: number[];
  meanValues: number[];
  stdvValues: number[];
  capabilities: string;
  hasMultidimensions?: boolean;
  defaultVariable?: string;
}

/**
 * Dataset ID del ImageServer
 */
export interface DatasetId {
  collectionId: string;
  shortName: string;
}

/**
 * Resultado de búsqueda de datasets
 */
export interface DatasetSearchResult {
  currentVersion: number;
  folders: string[];
  services: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Opciones para consultar datos del ImageServer
 */
export interface QueryOptions {
  /** Bounding box del área de interés */
  bbox?: BoundingBoxInput;
  /** Punto geográfico de interés */
  location?: GeoPointInput;
  /** Timestamp (Date o milliseconds desde epoch) */
  time?: Date | number;
  /** Tamaño de imagen resultante */
  size?: ImageSize;
  /** Formato de salida */
  format?: ImageServerFormat;
}

/**
 * Respuesta con overlay PNG/JPG
 */
export interface ImageOverlayResponse {
  imageUrl: string;
  bbox: { west: number; south: number; east: number; north: number };
  size: ImageSize;
  format: ImageServerFormat;
}

/**
 * Respuesta con datos JSON
 */
export interface DataResponse {
  /** Datos raw del ImageServer (formato JSON) */
  data: any;
  /** Bounding box del área consultada */
  bbox: { west: number; south: number; east: number; north: number };
  /** Timestamp de los datos (Date o milliseconds desde epoch) */
  time?: Date | number;
}
