import { router } from './trpc'
import { predecirAqiProcedure } from './procedures/predecir-aqi'
import { helloProcedure } from './procedures/hello'
import { usersProcedure } from './procedures/users'
import { createUserProcedure } from './procedures/create-user'
import { obtenerFuegoActivoenAreaProcedure } from './procedures/obtener-fuego-activo-en-area'
import { obtenerCalidadDelAireProcedure } from './procedures/obtener-calidad-del-aire'
import { obtenerEstacionesAirNowProcedure } from './procedures/obtener-estaciones-airnow'
import { obtenerPrediccionMeteorologicaProcedure } from './procedures/obtener-prediccion-meteorologicos'
import { obtenerClimaActualProcedure } from './procedures/obtener-clima-actual'
import { obtenerAlturaDelTerrenoProcedure } from './procedures/obtener-altura-del-terreno'
import { obtenerDatosTEMPOProcedure } from './procedures/obtener-datos-tempo'
import { obtenerImagenTEMPOProcedure } from './procedures/obtener-imagen-tempo'
import { analizarImpactoIncendioProcedure } from './procedures/analizar-impacto-incendio'
import { obtenerHistoricoAqiProcedure } from './procedures/obtener-historico-aqi'
import { crearAlertaProcedure } from './procedures/crear-alerta'
import { listarAlertasProcedure } from './procedures/listar-alertas'
import { actualizarAlertaProcedure } from './procedures/actualizar-alerta'
import { obtenerAlertasActivasProcedure } from './procedures/obtener-alertas-activas'
import { crearReporteUsuarioProcedure } from './procedures/crear-reporte-usuario'
import { obtenerReportesUsuarioProcedure } from './procedures/obtener-reporte-usuario'

export const appRouter = router({
  hello: helloProcedure,
  users: usersProcedure,
  createUser: createUserProcedure,
  obtenerFuegoActivoenArea: obtenerFuegoActivoenAreaProcedure,
  obtenerCalidadDelAire: obtenerCalidadDelAireProcedure,
  obtenerEstacionesAirNow: obtenerEstacionesAirNowProcedure,
  obtenerPrediccionMeteorologica: obtenerPrediccionMeteorologicaProcedure,
  obtenerClimaActual: obtenerClimaActualProcedure,
  predecirAqi: predecirAqiProcedure,
  obtenerAlturaDelTerreno: obtenerAlturaDelTerrenoProcedure,
  obtenerDatosTEMPO: obtenerDatosTEMPOProcedure,
  obtenerImagenTEMPO: obtenerImagenTEMPOProcedure,
  analizarImpactoIncendio: analizarImpactoIncendioProcedure,
  obtenerHistoricoAqi: obtenerHistoricoAqiProcedure,
  crearAlerta: crearAlertaProcedure,
  listarAlertas: listarAlertasProcedure,
  actualizarAlerta: actualizarAlertaProcedure,
  obtenerAlertasActivas: obtenerAlertasActivasProcedure,
  crearReporteUsuario: crearReporteUsuarioProcedure,
  obtenerReportesUsuario: obtenerReportesUsuarioProcedure,
})

export type AppRouter = typeof appRouter
