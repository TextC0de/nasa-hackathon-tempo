import { z } from 'zod'
import { publicProcedure } from '../trpc'

export const helloProcedure = publicProcedure
  .input(z.object({ name: z.string().optional() }))
  .query(({ input }) => {
    return {
      greeting: `Hello ${input.name ?? 'World'}!`,
    }
  })
