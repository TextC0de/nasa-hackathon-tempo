# Atmos - NASA Hackathon TEMPO

Plataforma para visualizar y analizar datos de calidad del aire y contaminación atmosférica, combinando datos satelitales de NASA (TEMPO, TROPOMI, FIRMS) con datos terrestres de EPA (AirNow).

## Tabla de Contenidos

- [Prerrequisitos](#prerrequisitos)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [Variables de Entorno](#variables-de-entorno)
- [Despliegue](#despliegue)
- [Scripts](#scripts)

## Prerrequisitos

### Node.js y pnpm

- **Node.js** >= 18
- **pnpm** >= 8

#### Instalar pnpm

```bash
# Usando npm
npm install -g pnpm

# O usando corepack (incluido con Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

## Estructura del Proyecto

```
atmos/
├── apps/
│   ├── web/          # Next.js 15 + tRPC Client
│   └── api/          # Cloudflare Workers + Hono + tRPC Server
├── packages/
│   ├── airnow-client/                 # Cliente AirNow API (EPA)
│   ├── earthdata-imageserver-client/  # Cliente NASA Earthdata (TEMPO, TROPOMI)
│   └── firms-client/                  # Cliente NASA FIRMS
└── turbo.json
```

## Stack Tecnológico

### ¿Qué es un monorepo?

Un **monorepo** es un solo repositorio que contiene múltiples aplicaciones y librerías. En vez de tener 3 repos separados (web, api, clients), todo vive en un solo lugar.

**Ventajas para el hackathon:**
- Compartir código entre apps fácilmente
- Un solo `pnpm install` instala todo
- Cambios en un cliente se reflejan instantáneamente en la app
- No hay que publicar packages a npm para probarlos

### ¿Por qué estas tecnologías?

**Turborepo**: Cuando corres `pnpm build`, solo recompila lo que cambió. Usa caché inteligente para no perder tiempo rebuildeando todo.

**pnpm**: Más rápido que npm y ocupa menos espacio. Instala dependencias una sola vez y las comparte entre todos los packages.

**Next.js 15**: Framework React para hacer aplicaciones web. Tiene todo incluido: routing, optimización de imágenes, server components.

**Cloudflare Workers**: Corre tu API cerca del usuario y es Cloud.

**tRPC**: Los tipos de TypeScript del backend se comparten automáticamente con el frontend. Si cambias una API, TypeScript te avisa en el frontend antes de correr el código.

**Hono**: Framework web simple y ligero para crear APIs. Muy parecido a Express pero optimizado para Cloudflare Workers.

### Stack Completo

**Frontend** (`apps/web`)
- Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, tRPC Client, React Query

**Backend** (`apps/api`)
- Cloudflare Workers, Hono, tRPC Server, Zod

**Clientes** (`packages/`)
- AirNow (EPA) - Calidad del aire terrestre
- NASA Earthdata - Datos satelitales TEMPO y TROPOMI
- NASA FIRMS - Incendios activos y anomalías térmicas

## Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd atmos

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
# Frontend
cd apps/web
echo "NEXT_PUBLIC_API_URL=http://localhost:8787/trpc" > .env.local

# Backend
cd ../api
cp .dev.vars.example .dev.vars
# Edita .dev.vars con tus API keys (NASA_EARTHDATA_TOKEN, AIRNOW_API_KEY, FIRMS_API_KEY)
```

## Desarrollo

```bash
# Iniciar todo (web + api)
pnpm dev

# O apps individuales
pnpm dev:web      # Solo frontend → http://localhost:3000
pnpm dev:api      # Solo API → http://localhost:8787
pnpm dev:packages # Solo packages (watch mode)
```

### Demo de tRPC

Visita http://localhost:3000/example para ver:
- Queries con React Query + Skeleton loading states
- Mutations con optimistic updates
- Type-safety end-to-end
- Error handling

### Otros comandos

```bash
# Typecheck
pnpm typecheck

# Build
pnpm build

# Lint
pnpm lint

# Format
pnpm format
```

## Variables de Entorno

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787/trpc  # Dev
# NEXT_PUBLIC_API_URL=https://api.workers.dev/trpc  # Prod
```

### Backend (`apps/api/.dev.vars`)

```bash
NASA_EARTHDATA_TOKEN=your_token_here
AIRNOW_API_KEY=your_key_here
FIRMS_API_KEY=your_key_here
```

Ver `apps/api/.dev.vars.example` para más detalles.

## Despliegue

```bash
# Frontend (Vercel)
cd apps/web && vercel

# API (Cloudflare Workers)
cd apps/api && pnpm deploy
```

## Scripts

```bash
pnpm dev              # Todo (web + api)
pnpm dev:web          # Solo frontend
pnpm dev:api          # Solo API
pnpm dev:packages     # Solo packages

pnpm build            # Build todo
pnpm typecheck        # Typecheck todo
pnpm lint             # Lint todo
pnpm format           # Format con Prettier
```
