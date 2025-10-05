import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './router'
import { createContext } from './trpc'
import { validateEnv, type Env } from './env'

type Bindings = Env

const app = new Hono<{ Bindings: Bindings }>()

// IMPORTANTE: CORS debe ir PRIMERO para que los errores también tengan headers CORS
app.use('/*', cors({
  origin: '*',
  credentials: false,
}))

// Middleware: Validate environment variables on every request
app.use('*', async (c, next) => {
  try {
    validateEnv(c.env)
    await next()
  } catch (error) {
    // Log error to console for debugging
    console.error('❌ Environment validation failed:')
    console.error(error instanceof Error ? error.message : String(error))

    return c.json(
      {
        error: 'Configuration Error',
        message: error instanceof Error ? error.message : 'Missing required environment variables',
      },
      500
    )
  }
})

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (opts, c) => createContext({ ...opts, env: c.env }),
  })
)

app.get('/', (c) => {
  return c.json({ message: 'Atmos API - tRPC Server' })
})

export default app
