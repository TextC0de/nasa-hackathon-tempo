import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold text-black mb-6 tracking-tight">
            Atmos
          </h1>
          <p className="text-2xl md:text-3xl text-gray-600 mb-4">
            NASA Hackathon TEMPO
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Monorepo con Next.js 15, Cloudflare Workers, Hono, tRPC y React Query
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* tRPC Demo Card */}
          <Link href="/example">
            <div className="rounded-lg p-8 border border-gray-200 hover:border-gray-400 transition-all cursor-pointer group">
              <h2 className="text-2xl font-bold text-black mb-3">
                tRPC Demo
              </h2>
              <p className="text-gray-600 mb-4">
                Ejemplo interactivo de end-to-end type-safety con queries y mutations
              </p>
              <div className="flex items-center text-gray-500 group-hover:text-black transition-colors">
                <span className="mr-2">Ver demo</span>
                <span className="transform group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </div>
          </Link>

          {/* API Status Card */}
          <div className="rounded-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-3">API Status</h2>
            <p className="text-gray-600 mb-4">
              Cloudflare Workers + Hono + tRPC corriendo en el edge
            </p>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-black rounded-full mr-2" />
              <span className="text-gray-600 text-sm">Ready</span>
            </div>
          </div>

          {/* Stack Card */}
          <div className="rounded-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-3">Tech Stack</h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Next.js 15 + React 19
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Cloudflare Workers + Hono
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                tRPC + React Query
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Tailwind CSS v4 + shadcn/ui
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Turborepo + pnpm
              </li>
            </ul>
          </div>

          {/* Data Sources Card */}
          <div className="rounded-lg p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-3">Data Sources</h2>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                NASA TEMPO (satellite)
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                NASA TROPOMI (satellite)
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                AirNow API (EPA ground)
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                NASA FIRMS (fires)
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Built for NASA Space Apps Challenge
          </p>
        </div>
      </div>
    </div>
  )
}
