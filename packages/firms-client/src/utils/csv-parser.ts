/**
 * Parser CSV para respuestas de FIRMS API
 *
 * FIRMS devuelve datos en formato CSV con diferentes columnas según el sensor
 */

import type { FireDataPoint } from '../types.js';

/**
 * Parsear respuesta CSV de FIRMS a array de objetos
 *
 * @param csvText - Texto CSV de la respuesta
 * @returns Array de puntos de incendio
 */
export function parseFireCSV(csvText: string): FireDataPoint[] {
  const lines = csvText.trim().split('\n');

  if (lines.length === 0) {
    return [];
  }

  // Primera línea = headers
  const headers = lines[0].split(',').map(h => h.trim());

  // Resto = data rows
  const fires: FireDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.trim());

    const fire: any = {};

    headers.forEach((header, index) => {
      const value = values[index];

      // Parsear tipos específicos
      if (header === 'latitude' || header === 'longitude') {
        fire[header] = parseFloat(value);
      } else if (header === 'brightness' || header === 'frp') {
        fire[header] = parseFloat(value);
      } else if (header === 'confidence') {
        // MODIS: número 0-100
        // VIIRS: 'l', 'n', 'h'
        // Landsat: 'low', 'medium', 'high'
        const numValue = parseFloat(value);
        fire[header] = isNaN(numValue) ? value : numValue;
      } else {
        fire[header] = value;
      }
    });

    fires.push(fire as FireDataPoint);
  }

  return fires;
}

/**
 * Normalizar nivel de confianza a string consistente
 *
 * @param confidence - Valor de confianza (0-100, 'l'/'n'/'h', 'low'/'medium'/'high')
 * @returns 'low' | 'nominal' | 'high'
 */
export function normalizeConfidence(confidence: number | string): 'low' | 'nominal' | 'high' {
  if (typeof confidence === 'number') {
    // MODIS: 0-100
    if (confidence < 30) return 'low';
    if (confidence < 80) return 'nominal';
    return 'high';
  }

  // VIIRS: 'l', 'n', 'h'
  if (confidence === 'l' || confidence === 'low') return 'low';
  if (confidence === 'n' || confidence === 'nominal') return 'nominal';
  if (confidence === 'h' || confidence === 'high') return 'high';

  // Fallback
  return 'nominal';
}

/**
 * Validar bounding box
 *
 * @param west - Longitud oeste (-180 a 180)
 * @param south - Latitud sur (-90 a 90)
 * @param east - Longitud este (-180 a 180)
 * @param north - Latitud norte (-90 a 90)
 * @throws Error si bbox inválido
 */
export function validateBoundingBox(
  west: number,
  south: number,
  east: number,
  north: number
): void {
  if (west < -180 || west > 180) {
    throw new Error(`Invalid west longitude: ${west} (must be -180 to 180)`);
  }
  if (east < -180 || east > 180) {
    throw new Error(`Invalid east longitude: ${east} (must be -180 to 180)`);
  }
  if (south < -90 || south > 90) {
    throw new Error(`Invalid south latitude: ${south} (must be -90 to 90)`);
  }
  if (north < -90 || north > 90) {
    throw new Error(`Invalid north latitude: ${north} (must be -90 to 90)`);
  }
  if (west >= east) {
    throw new Error(`Invalid bbox: west (${west}) must be less than east (${east})`);
  }
  if (south >= north) {
    throw new Error(`Invalid bbox: south (${south}) must be less than north (${north})`);
  }
}

/**
 * Formatear fecha para API FIRMS (YYYY-MM-DD)
 *
 * @param date - Date object
 * @returns String en formato YYYY-MM-DD
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
