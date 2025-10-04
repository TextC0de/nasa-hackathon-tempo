import { z } from 'zod'
import { publicProcedure } from '../trpc'

export const createUserProcedure = publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    return {
      id: Math.floor(Math.random() * 1000),
      name: input.name,
    }
  })
