/**
 * Utilidad para dividir bounding boxes grandes en chunks más pequeños
 * Útil para APIs con límites de área de consulta (ej: AirNow)
 */

export interface BoundingBox {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

/**
 * Calcula la distancia aproximada en km entre dos puntos de latitud
 * 1 grado de latitud ≈ 111 km (constante)
 */
function latitudeToKm(deltaLat: number): number {
  return deltaLat * 111
}

/**
 * Calcula la distancia aproximada en km entre dos puntos de longitud
 * 1 grado de longitud ≈ 111 * cos(latitud) km (varía con la latitud)
 */
function longitudeToKm(deltaLng: number, latitude: number): number {
  return deltaLng * 111 * Math.cos((latitude * Math.PI) / 180)
}

/**
 * Convierte kilómetros a grados de latitud
 */
function kmToLatitude(km: number): number {
  return km / 111
}

/**
 * Convierte kilómetros a grados de longitud a una latitud específica
 */
function kmToLongitude(km: number, latitude: number): number {
  return km / (111 * Math.cos((latitude * Math.PI) / 180))
}

/**
 * Divide un bounding box grande en chunks más pequeños
 *
 * @param bbox - Bounding box a dividir
 * @param maxSizeKm - Tamaño máximo de cada chunk en km (por defecto 20km)
 * @returns Array de sub-bboxes que no se solapan
 *
 * @example
 * ```typescript
 * const bbox = {
 *   minLatitude: 32.5,
 *   maxLatitude: 42.0,
 *   minLongitude: -124.5,
 *   maxLongitude: -114.0
 * }
 * const chunks = dividirBboxEnChunks(bbox, 20)
 * // Retorna ~280 chunks de 20km × 20km
 * ```
 */
export function dividirBboxEnChunks(
  bbox: BoundingBox,
  maxSizeKm: number = 20
): BoundingBox[] {
  const { minLatitude, maxLatitude, minLongitude, maxLongitude } = bbox

  // Calcular latitud central para conversión de longitud
  const centerLat = (minLatitude + maxLatitude) / 2

  // Calcular dimensiones totales en km
  const totalLatKm = latitudeToKm(maxLatitude - minLatitude)
  const totalLngKm = longitudeToKm(maxLongitude - minLongitude, centerLat)

  // Calcular número de chunks necesarios en cada dirección
  const numLatChunks = Math.ceil(totalLatKm / maxSizeKm)
  const numLngChunks = Math.ceil(totalLngKm / maxSizeKm)

  // Calcular tamaño real de cada chunk en grados
  const latChunkSize = (maxLatitude - minLatitude) / numLatChunks
  const lngChunkSize = (maxLongitude - minLongitude) / numLngChunks

  const chunks: BoundingBox[] = []

  // Generar chunks
  for (let latIdx = 0; latIdx < numLatChunks; latIdx++) {
    for (let lngIdx = 0; lngIdx < numLngChunks; lngIdx++) {
      const chunkMinLat = minLatitude + latIdx * latChunkSize
      const chunkMaxLat = Math.min(minLatitude + (latIdx + 1) * latChunkSize, maxLatitude)
      const chunkMinLng = minLongitude + lngIdx * lngChunkSize
      const chunkMaxLng = Math.min(minLongitude + (lngIdx + 1) * lngChunkSize, maxLongitude)

      chunks.push({
        minLatitude: chunkMinLat,
        maxLatitude: chunkMaxLat,
        minLongitude: chunkMinLng,
        maxLongitude: chunkMaxLng,
      })
    }
  }

  console.log(`📦 [GEO-CHUNKING] Dividido bbox en ${chunks.length} chunks (${numLatChunks} lat × ${numLngChunks} lng)`)
  console.log(`   Área total: ${totalLatKm.toFixed(1)}km × ${totalLngKm.toFixed(1)}km`)
  console.log(`   Tamaño chunk: ~${maxSizeKm}km × ~${maxSizeKm}km`)

  return chunks
}
