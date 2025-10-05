import { publicProcedure } from '../trpc'
import { z } from 'zod'

const inputSchema = z.object({
  nombre: z.string().min(1, 'El nombre del condado es requerido'),
})

export const obtenerPoblacionCondadoProcedure = publicProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    const censusApiKey = ctx.env.CENSUS_API_KEY
    const url = `https://api.census.gov/data/2021/acs/acs5?get=NAME,B01003_001E&for=county:*&in=state:06&key=${censusApiKey}`

    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error al consultar Census API: ${response.statusText}`)
      }

      const data = await response.json() as string[][]
      
      // Eliminar el header (primera fila)
      const condados = data.slice(1)
      
      // Buscar el condado por nombre (case-insensitive, búsqueda parcial)
      const nombreBusqueda = input.nombre.toLowerCase()
      const condadoEncontrado = condados.find(condado => 
        condado[0].toLowerCase().includes(nombreBusqueda)
      )

      if (!condadoEncontrado) {
        throw new Error(`No se encontró el condado: ${input.nombre}`)
      }

      return {
        nombre: condadoEncontrado[0],
        poblacion: parseInt(condadoEncontrado[1]),
        codigoEstado: condadoEncontrado[2],
        codigoCondado: condadoEncontrado[3],
      }
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error desconocido al obtener datos de población'
      )
    }
  })
