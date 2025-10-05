import { initTRPC } from '@trpc/server'
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@atmos/database'

export function createContext(opts: FetchCreateContextFnOptions & { env?: any; executionCtx?: ExecutionContext }) {
  // Get DATABASE_URL from env (Cloudflare Workers binding)
  const databaseUrl = opts.env?.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured')
  }

  // Create postgres client
  const client = postgres(databaseUrl)

  // Create drizzle instance
  const db = drizzle(client, { schema, logger: true })

  // Cloudflare Cache API para cachear respuestas de APIs externas
  // Esto evita rate limits (ej: AirNow 500 req/hora)
  const cache = caches.default

  return {
    req: opts.req,
    db,
    env: opts.env,
    cache, // Cache API de Cloudflare
    waitUntil: opts.executionCtx?.waitUntil.bind(opts.executionCtx), // Para operaciones async
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
