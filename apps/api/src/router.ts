import { z } from 'zod'
import { router, publicProcedure } from './trpc'

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}!`,
      }
    }),

  users: publicProcedure.query(() => {
    return [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]
  }),

  createUser: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return {
        id: Math.floor(Math.random() * 1000),
        name: input.name,
      }
    }),
})

export type AppRouter = typeof appRouter
