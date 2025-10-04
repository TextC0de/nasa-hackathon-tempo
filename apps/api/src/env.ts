import { z } from 'zod'

/**
 * Environment variables schema for Atmos API
 *
 * ALL variables are REQUIRED for the API to function properly
 */
const envSchema = z.object({
  /**
   * NASA Earthdata authentication token
   * Required for accessing NASA satellite data (TEMPO, TROPOMI, etc.)
   * Get it from: https://urs.earthdata.nasa.gov/
   */
  NASA_EARTHDATA_TOKEN: z.string().min(1, 'NASA_EARTHDATA_TOKEN is required'),

  /**
   * AirNow API Key
   * Required for ground-based air quality validation data (EPA)
   * Get it from: https://docs.airnowapi.org/account/request/
   */
  AIRNOW_API_KEY: z.string().min(1, 'AIRNOW_API_KEY is required'),

  /**
   * NASA FIRMS (Fire Information for Resource Management System) API Key
   * Required for fire and thermal anomaly data
   * Get it from: https://firms.modaps.eosdis.nasa.gov/api/
   */
  FIRMS_API_KEY: z.string().min(1, 'FIRMS_API_KEY is required'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables
 *
 * @param env - Environment variables object (usually from Cloudflare Workers)
 * @throws {Error} If any required environment variable is missing or invalid
 * @returns Validated environment variables
 *
 * @example
 * ```typescript
 * // In Cloudflare Workers context
 * const validatedEnv = validateEnv(c.env);
 * ```
 */
export function validateEnv(env: Record<string, unknown>): Env {
  try {
    return envSchema.parse(env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => `  - ${err.path.join('.')}: ${err.message}`)

      throw new Error(
        `❌ Missing or invalid environment variables:\n\n${missingVars.join('\n')}\n\n` +
          `Please ensure all required API keys are configured in wrangler.toml or .dev.vars:\n` +
          `  • NASA_EARTHDATA_TOKEN - Get from https://urs.earthdata.nasa.gov/\n` +
          `  • AIRNOW_API_KEY - Get from https://docs.airnowapi.org/account/request/\n` +
          `  • FIRMS_API_KEY - Get from https://firms.modaps.eosdis.nasa.gov/api/\n`
      )
    }
    throw error
  }
}

/**
 * Check if environment is properly configured (for health checks)
 *
 * @param env - Environment variables object
 * @returns true if all required variables are present, false otherwise
 */
export function isEnvConfigured(env: Record<string, unknown>): boolean {
  try {
    validateEnv(env)
    return true
  } catch {
    return false
  }
}
