import { publicProcedure } from '../trpc'
import { z } from 'zod'

const inputSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la ciudad es requerido'),
})

export const obtenerPoblacionCiudadProcedure = publicProcedure
  .input(inputSchema)
  .query(async ({ input, ctx }) => {
    const censusApiKey = ctx.env.CENSUS_API_KEY
    const url = `https://api.census.gov/data/2021/acs/acs5?get=NAME,B01003_001E&for=place:*&in=state:06&key=${censusApiKey}`

    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Error al consultar Census API: ${response.statusText}`)
      }

      const data = await response.json() as string[][]
      
      // Eliminar el header (primera fila)
      const ciudades = data.slice(1)
      
      // Buscar la ciudad por nombre (case-insensitive, búsqueda parcial)
      const nombreBusqueda = input.nombre.toLowerCase()
      const ciudadEncontrada = ciudades.find(ciudad => 
        ciudad[0].toLowerCase().includes(nombreBusqueda)
      )

      if (!ciudadEncontrada) {
        throw new Error(`No se encontró la ciudad: ${input.nombre}`)
      }

      return {
        nombre: ciudadEncontrada[0],
        population: parseInt(ciudadEncontrada[1]),
        codigoEstado: ciudadEncontrada[2],
        codigoCiudad: ciudadEncontrada[3],
      }
    } catch (error) {
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error desconocido al obtener datos de población'
      )
    }
  })
