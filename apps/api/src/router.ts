import { router } from './trpc'
import { predecirAqiProcedure } from './procedures/predecir-aqi'
import { helloProcedure } from './procedures/hello'
import { usersProcedure } from './procedures/users'
import { createUserProcedure } from './procedures/create-user'
import { obtenerFuegoActivoenAreaProcedure } from './procedures/obtener-fuego-activo-en-area'
import { obtenerCalidadDelAireProcedure } from './procedures/obtener-calidad-del-aire'
import { obtenerEstacionesAirNowProcedure } from './procedures/obtener-estaciones-airnow'
import { obtenerDatosMeteorologicosProcedure } from './procedures/obtener-datos-meteorologicos'
import { obtenerAlturaDelTerrenoProcedure } from './procedures/obtener-altura-del-terreno'
import { obtenerDatosTEMPOProcedure } from './procedures/obtener-datos-tempo'

export const appRouter = router({
  hello: helloProcedure,
  users: usersProcedure,
  createUser: createUserProcedure,
  obtenerFuegoActivoenArea: obtenerFuegoActivoenAreaProcedure,
  obtenerCalidadDelAire: obtenerCalidadDelAireProcedure,
  obtenerEstacionesAirNow: obtenerEstacionesAirNowProcedure,
  obtenerDatosMeteorologicos: obtenerDatosMeteorologicosProcedure,
  predecirAqi: predecirAqiProcedure,
  obtenerAlturaDelTerreno: obtenerAlturaDelTerrenoProcedure,
  obtenerDatosTEMPO: obtenerDatosTEMPOProcedure,
})

export type AppRouter = typeof appRouter
