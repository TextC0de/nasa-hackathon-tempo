import { publicProcedure } from '../trpc'

export const usersProcedure = publicProcedure.query(() => {
  return [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]
})
