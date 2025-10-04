'use client'

import { trpc } from '@/lib/trpc'
import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function ExamplePage() {
  const [newUserName, setNewUserName] = useState('')

  // Query: Obtener saludo
  const hello = trpc.hello.useQuery({ name: 'Atmos' })

  // Query: Obtener lista de usuarios
  const users = trpc.users.useQuery()

  // Mutation: Crear usuario
  const createUser = trpc.createUser.useMutation({
    onSuccess: () => {
      users.refetch()
      setNewUserName('')
    },
  })

  const handleCreateUser = () => {
    if (newUserName.trim()) {
      createUser.mutate({ name: newUserName })
    }
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-black mb-4">
            tRPC + React Query Demo
          </h1>
          <p className="text-gray-600 text-lg">
            Ejemplo de end-to-end type-safety con Cloudflare Workers + Hono
          </p>
        </div>

        {/* Grid de ejemplos */}
        <div className="grid gap-6">
          {/* Query Example 1 */}
          <div className="rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">
                  Query: Saludo
                </h2>
                <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  trpc.hello.useQuery()
                </code>
              </div>
            </div>

            {hello.isLoading && (
              <Skeleton className="h-12 w-full" />
            )}

            {hello.data && (
              <div className="border border-gray-300 rounded-lg p-4">
                <p className="text-black text-xl font-semibold">
                  {hello.data.greeting}
                </p>
              </div>
            )}

            {hello.error && (
              <div className="border border-gray-400 rounded-lg p-4">
                <p className="text-gray-900">Error: {hello.error.message}</p>
              </div>
            )}
          </div>

          {/* Query Example 2 */}
          <div className="rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-black mb-2">
                  Query: Lista de Usuarios
                </h2>
                <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  trpc.users.useQuery()
                </code>
              </div>
            </div>

            {users.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {users.data && (
              <div className="space-y-2">
                {users.data.map((user) => (
                  <div
                    key={user.id}
                    className="border border-gray-300 rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="text-black font-medium">{user.name}</span>
                    <span className="text-gray-600 text-sm">ID: {user.id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mutation Example */}
          <div className="rounded-lg p-6 border border-gray-200">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-black mb-2">
                Mutation: Crear Usuario
              </h2>
              <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                trpc.createUser.useMutation()
              </code>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  placeholder="Nombre del nuevo usuario..."
                  className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  disabled={createUser.isPending}
                />
                <button
                  onClick={handleCreateUser}
                  disabled={createUser.isPending || !newUserName.trim()}
                  className="px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {createUser.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>

              {createUser.isSuccess && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <p className="text-black">
                    Usuario creado exitosamente
                  </p>
                </div>
              )}

              {createUser.error && (
                <div className="border border-gray-400 rounded-lg p-4">
                  <p className="text-gray-900">
                    Error: {createUser.error.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Panel */}
          <div className="rounded-lg p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-black mb-4">
              Cómo funciona
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>Type-safety:</strong> El tipo del router API se comparte automáticamente con el cliente
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>React Query:</strong> Cache automático, refetch, optimistic updates
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>Cloudflare Workers:</strong> API corriendo en el edge con Hono
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>
                  <strong>Monorepo:</strong> Código compartido entre apps con Turborepo
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-gray-600 hover:text-black transition-colors"
          >
            ← Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}
