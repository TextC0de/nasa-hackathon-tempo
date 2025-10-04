import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  /**
   * Client-side environment variables (exposed to browser)
   * Must be prefixed with NEXT_PUBLIC_
   */
  client: {
    NEXT_PUBLIC_API_HOST: z.string().url().describe('API URL for tRPC client (required)'),
  },

  /**
   * Server-side only environment variables
   * Never exposed to the browser
   */
  server: {},

  /**
   * Runtime environment variables
   * Destructure all variables from process.env here
   */
  runtimeEnv: {
    NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST,
  },

  /**
   * Skip validation during build (for CI/CD)
   * Set to true in production builds
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
})
