/**
 * NASA Earthdata ImageServer Client
 *
 * Cliente base para interactuar con NASA Earthdata ImageServer API
 * Documentación: https://developers.arcgis.com/rest/services-reference/enterprise/image-service.htm
 */

import type {
  ExportImageParams,
  ImageServerInfo,
  IdentifyResponse,
  DatasetSearchResult,
} from './types.js';
import { normalizeBoundingBox } from './utils.js';
import { ServiceError, AuthenticationError } from './errors.js';

/**
 * URL base del ImageServer de NASA Earthdata
 */
const IMAGESERVER_BASE_URL = 'https://gis.earthdata.nasa.gov/image';

/**
 * Cliente base para NASA Earthdata ImageServer API
 *
 * Proporciona métodos de bajo nivel para consultar servicios de imágenes satelitales
 */
export class ImageServerClient {
  private baseUrl: string;
  private authToken?: string;

  /**
   * Crear nuevo cliente ImageServer
   *
   * NOTA: La mayoría de servicios son públicos y NO requieren autenticación.
   * Solo FIRMS requiere token JWT.
   *
   * @param baseUrl - URL base del ImageServer (opcional, usa NASA Earthdata por defecto)
   *
   * @example
   * ```typescript
   * // Servicios públicos (TEMPO, POWER, SEDAC, etc.)
   * const client = new ImageServerClient();
   *
   * // Para FIRMS (requiere autenticación)
   * const client = new ImageServerClient();
   * client.setAuthToken('tu-token-jwt');
   * ```
   */
  constructor(baseUrl: string = IMAGESERVER_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Establecer token de autenticación
   *
   * Solo necesario para servicios que requieren autenticación como FIRMS.
   *
   * @param token - JWT token de NASA Earthdata
   *
   * @example
   * ```typescript
   * client.setAuthToken('eyJ0eXAiOiJKV1Q...');
   * ```
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Limpiar token de autenticación
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Crear headers de autenticación (solo si hay token)
   */
  private getAuthHeaders(): HeadersInit {
    if (this.authToken) {
      return {
        Authorization: `Bearer ${this.authToken}`,
      };
    }
    return {};
  }

  /**
   * Construir URL completa para un dataset
   *
   * @param datasetPath - Path del dataset (ej: "C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03_HOURLY_TROPOSPHERIC_VERTICAL_COLUMN")
   * @returns URL completa del ImageServer
   */
  private buildDatasetUrl(datasetPath: string): string {
    return `${this.baseUrl}/rest/services/${datasetPath}/ImageServer`;
  }

  /**
   * Obtener información del servicio ImageServer
   *
   * @param datasetPath - Path del dataset
   * @returns Información del servicio (extent, bandas, tiempo, etc.)
   *
   * @example
   * ```typescript
   * const info = await client.getServiceInfo('C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03');
   * console.log(info.timeInfo.timeExtent); // [1690989169000, 1757893440000]
   * ```
   */
  async getServiceInfo(datasetPath: string): Promise<ImageServerInfo> {
    const url = new URL(this.buildDatasetUrl(datasetPath));
    url.searchParams.append('f', 'json');

    console.log(`[ImageServer] GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] Error body:`, errorText);

      if (response.status === 498 || response.status === 499) {
        throw new AuthenticationError(
          `Authentication required or invalid token for ${datasetPath}`,
          response.status
        );
      }

      throw new ServiceError(
        `Failed to get service info: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as ImageServerInfo;
    console.log(`[ImageServer] Service info retrieved for ${datasetPath}`);
    return data;
  }

  /**
   * Exportar imagen desde ImageServer
   *
   * @param datasetPath - Path del dataset
   * @param params - Parámetros de exportación (bbox, size, format, time, etc.)
   * @returns ArrayBuffer con la imagen o JSON con datos
   *
   * @example
   * ```typescript
   * // Exportar como PNG
   * const pngBuffer = await client.exportImage(
   *   'C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03',
   *   {
   *     bbox: { west: -120, south: 34, east: -118, north: 36 },
   *     size: { width: 512, height: 512 },
   *     format: 'png',
   *     time: Date.now()
   *   }
   * );
   * ```
   */
  async exportImage(datasetPath: string, params: ExportImageParams): Promise<ArrayBuffer> {
    const url = new URL(`${this.buildDatasetUrl(datasetPath)}/exportImage`);

    // Validar y normalizar bbox
    const bbox = normalizeBoundingBox(params.bbox);
    const bboxStr = bbox.toArcGISString();
    url.searchParams.append('bbox', bboxStr);

    // Agregar size
    if (params.size) {
      url.searchParams.append('size', `${params.size.width},${params.size.height}`);
    }

    // Agregar format
    url.searchParams.append('format', params.format || 'png');

    // Agregar f (response format)
    url.searchParams.append('f', params.f || 'image');

    // Agregar time (si existe)
    if (params.time) {
      url.searchParams.append('time', String(params.time));
    }

    // Agregar spatial reference (si existe)
    if (params.imageSR) {
      url.searchParams.append('imageSR', String(params.imageSR.wkid));
    }
    if (params.bboxSR) {
      url.searchParams.append('bboxSR', String(params.bboxSR.wkid));
    }

    // Agregar interpolation (si existe)
    if (params.interpolation) {
      url.searchParams.append('interpolation', params.interpolation);
    }

    // Agregar noData (si existe)
    if (params.noData !== undefined) {
      url.searchParams.append('noData', String(params.noData));
    }

    // Agregar compression (si existe)
    if (params.compression) {
      url.searchParams.append('compression', params.compression);
    }

    // Agregar compressionQuality (si existe)
    if (params.compressionQuality !== undefined) {
      url.searchParams.append('compressionQuality', String(params.compressionQuality));
    }

    // Agregar bandIds (si existe)
    if (params.bandIds && params.bandIds.length > 0) {
      url.searchParams.append('bandIds', params.bandIds.join(','));
    }

    // Agregar mosaicRule (si existe)
    if (params.mosaicRule) {
      url.searchParams.append('mosaicRule', JSON.stringify(params.mosaicRule));
    }

    // Agregar renderingRule (si existe)
    if (params.renderingRule) {
      url.searchParams.append('renderingRule', JSON.stringify(params.renderingRule));
    }

    console.log(`[ImageServer] exportImage GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] exportImage Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] exportImage Error:`, errorText);

      if (response.status === 498 || response.status === 499) {
        throw new AuthenticationError(
          `Authentication required or invalid token for ${datasetPath}`,
          response.status
        );
      }

      throw new ServiceError(
        `Failed to export image: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const buffer = await response.arrayBuffer();
    console.log(`[ImageServer] Image exported, size: ${buffer.byteLength} bytes`);
    return buffer;
  }

  /**
   * Exportar datos como JSON desde ImageServer
   *
   * @param datasetPath - Path del dataset
   * @param params - Parámetros de exportación
   * @returns Objeto JSON con los datos
   *
   * @example
   * ```typescript
   * const data = await client.exportAsJSON(
   *   'C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03',
   *   {
   *     bbox: { west: -120, south: 34, east: -118, north: 36 },
   *     size: { width: 100, height: 100 },
   *     time: Date.now()
   *   }
   * );
   * console.log(data); // { value: [...], width: 100, height: 100 }
   * ```
   */
  async exportAsJSON(datasetPath: string, params: ExportImageParams): Promise<any> {
    const url = new URL(`${this.buildDatasetUrl(datasetPath)}/exportImage`);

    // Validar y normalizar bbox
    const bbox = normalizeBoundingBox(params.bbox);
    const bboxStr = bbox.toArcGISString();
    url.searchParams.append('bbox', bboxStr);

    // Agregar size
    if (params.size) {
      url.searchParams.append('size', `${params.size.width},${params.size.height}`);
    }

    // Response format as JSON
    url.searchParams.append('f', 'json');

    // Agregar time (si existe)
    if (params.time) {
      url.searchParams.append('time', String(params.time));
    }

    // Agregar spatial reference (si existe)
    if (params.imageSR) {
      url.searchParams.append('imageSR', String(params.imageSR.wkid));
    }
    if (params.bboxSR) {
      url.searchParams.append('bboxSR', String(params.bboxSR.wkid));
    }

    console.log(`[ImageServer] exportAsJSON GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] exportAsJSON Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] exportAsJSON Error:`, errorText);

      // Error 498/499 = autenticación inválida/requerida
      if (response.status === 498 || response.status === 499) {
        throw new AuthenticationError(
          `Authentication required or invalid token for ${datasetPath}`,
          response.status
        );
      }

      // Otros errores del servicio
      throw new ServiceError(
        `Failed to export as JSON: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = await response.json();
    console.log(`[ImageServer] JSON data exported, keys:`, Object.keys(data));

    // Verificar si la respuesta contiene un error (ArcGIS retorna 200 OK con error en JSON)
    if (data.error) {
      const errorCode = data.error.code || 500;
      const errorMessage = data.error.message || 'Unknown error';

      // Error 498/499 = autenticación inválida/requerida
      if (errorCode === 498 || errorCode === 499) {
        throw new AuthenticationError(
          `${errorMessage} for ${datasetPath}`,
          errorCode
        );
      }

      // Otros errores del servicio
      throw new ServiceError(
        `Service error: ${errorMessage}`,
        errorCode,
        JSON.stringify(data.error.details || [])
      );
    }

    return data;
  }

  /**
   * Identificar valores de píxeles en una ubicación específica
   *
   * @param datasetPath - Path del dataset
   * @param geometry - Punto o geometría para identificar
   * @param options - Opciones adicionales (time, tolerance, etc.)
   * @returns Información identificada en esa ubicación
   *
   * @example
   * ```typescript
   * const result = await client.identify(
   *   'C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03',
   *   { x: -118.24, y: 34.05 },
   *   { time: Date.now() }
   * );
   * console.log(result.value); // Valor del píxel en esa ubicación
   * ```
   */
  async identify(
    datasetPath: string,
    geometry: { x: number; y: number } | string,
    options: {
      time?: number;
      mosaicRule?: any;
      renderingRule?: any;
      pixelSize?: { x: number; y: number };
      returnGeometry?: boolean;
      returnCatalogItems?: boolean;
    } = {}
  ): Promise<IdentifyResponse> {
    const url = new URL(`${this.buildDatasetUrl(datasetPath)}/identify`);

    // Agregar geometría
    const geometryStr =
      typeof geometry === 'string' ? geometry : JSON.stringify({ x: geometry.x, y: geometry.y });
    url.searchParams.append('geometry', geometryStr);
    url.searchParams.append('geometryType', 'esriGeometryPoint');

    // Response format
    url.searchParams.append('f', 'json');

    // Agregar time (si existe)
    if (options.time) {
      url.searchParams.append('time', String(options.time));
    }

    // Agregar mosaicRule (si existe)
    if (options.mosaicRule) {
      url.searchParams.append('mosaicRule', JSON.stringify(options.mosaicRule));
    }

    // Agregar renderingRule (si existe)
    if (options.renderingRule) {
      url.searchParams.append('renderingRule', JSON.stringify(options.renderingRule));
    }

    // Agregar returnGeometry
    if (options.returnGeometry !== undefined) {
      url.searchParams.append('returnGeometry', String(options.returnGeometry));
    }

    // Agregar returnCatalogItems
    if (options.returnCatalogItems !== undefined) {
      url.searchParams.append('returnCatalogItems', String(options.returnCatalogItems));
    }

    console.log(`[ImageServer] identify GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] identify Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] identify Error:`, errorText);

      if (response.status === 498 || response.status === 499) {
        throw new AuthenticationError(
          `Authentication required or invalid token for ${datasetPath}`,
          response.status
        );
      }

      throw new ServiceError(
        `Failed to identify: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as IdentifyResponse;
    console.log(`[ImageServer] Identify data retrieved:`, data);

    // Verificar si la respuesta contiene un error (ArcGIS retorna 200 OK con error en JSON)
    if ((data as any).error) {
      const errorCode = (data as any).error.code || 500;
      const errorMessage = (data as any).error.message || 'Unknown error';
      const errorDetails = (data as any).error.details || [];

      console.error(`[ImageServer] ❌ Identify returned error in JSON:`, {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        datasetPath,
        geometry,
        time: options.time ? new Date(options.time).toISOString() : 'N/A'
      });

      // Error 498/499 = autenticación inválida/requerida
      if (errorCode === 498 || errorCode === 499) {
        throw new AuthenticationError(
          `${errorMessage} for ${datasetPath}`,
          errorCode
        );
      }

      // Otros errores del servicio
      throw new ServiceError(
        `Service error: ${errorMessage}`,
        errorCode,
        JSON.stringify(errorDetails)
      );
    }

    return data;
  }

  /**
   * Listar datasets disponibles en el ImageServer
   *
   * @param folder - Carpeta específica (opcional)
   * @returns Lista de datasets y carpetas disponibles
   *
   * @example
   * ```typescript
   * const datasets = await client.listDatasets();
   * console.log(datasets.folders); // ['C2930763263-LARC_CLOUD', 'FireTracking', ...]
   * console.log(datasets.services); // [{ name: 'FireTracking/...', type: 'MapServer' }]
   * ```
   */
  async listDatasets(folder?: string): Promise<DatasetSearchResult> {
    const url = new URL(`${this.baseUrl}/rest/services${folder ? `/${folder}` : ''}`);
    url.searchParams.append('f', 'json');

    console.log(`[ImageServer] listDatasets GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] listDatasets Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] listDatasets Error:`, errorText);

      throw new ServiceError(
        `Failed to list datasets: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const data = (await response.json()) as DatasetSearchResult;
    console.log(`[ImageServer] Found ${data.folders?.length || 0} folders, ${data.services?.length || 0} services`);
    return data;
  }

  /**
   * Obtener capacidades WMS del servicio
   *
   * @param datasetPath - Path del dataset
   * @returns XML con las capacidades WMS
   *
   * @example
   * ```typescript
   * const wmsCapabilities = await client.getWMSCapabilities(
   *   'C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03'
   * );
   * ```
   */
  async getWMSCapabilities(datasetPath: string): Promise<string> {
    const url = new URL(`${this.buildDatasetUrl(datasetPath)}/WMSServer`);
    url.searchParams.append('request', 'GetCapabilities');
    url.searchParams.append('service', 'WMS');

    console.log(`[ImageServer] getWMSCapabilities GET ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: this.getAuthHeaders(),
    });

    console.log(`[ImageServer] getWMSCapabilities Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ImageServer] getWMSCapabilities Error:`, errorText);

      if (response.status === 498 || response.status === 499) {
        throw new AuthenticationError(
          `Authentication required or invalid token for ${datasetPath}`,
          response.status
        );
      }

      throw new ServiceError(
        `Failed to get WMS capabilities: ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const xml = await response.text();
    console.log(`[ImageServer] WMS Capabilities retrieved, length: ${xml.length} chars`);
    return xml;
  }
}
