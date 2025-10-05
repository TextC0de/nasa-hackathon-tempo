import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { env } from '@/env'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, context }: { messages: UIMessage[]; context?: string } = await req.json()

  console.log('🤖 Chat API - Contexto recibido:', context ? 'SÍ' : 'NO')
  if (context) {
    console.log('📊 Primeros 500 caracteres del contexto:', context.substring(0, 500))
    console.log('📏 Longitud total del contexto:', context.length, 'caracteres')
  }

  // Sistema de prompting con contexto de datos históricos
  const systemPrompt = `Eres un asistente experto en análisis de calidad del aire y datos ambientales para California.

${context ? `IMPORTANTE: Tienes acceso a los datos históricos actuales del período seleccionado. DEBES usar estos datos para responder las preguntas del usuario con números y análisis específicos.

${context}

---

` : 'NOTA: No hay datos cargados actualmente. Pide al usuario que seleccione un período de análisis primero.\n\n'}

INSTRUCCIONES DE ANÁLISIS:
- Cuando el usuario pregunte sobre tendencias, usa los datos de TENDENCIA proporcionados arriba
- Cuando pregunte por contaminantes, usa los datos de CONTAMINANTES del contexto
- Cuando pida recomendaciones de salud, basa tus sugerencias en el AQI promedio y máximo del período
- Sé específico: menciona fechas, números exactos de AQI, y porcentajes de cambio

NIVELES DE AQI:
- 0-50 (Bueno): Aire limpio, sin restricciones
- 51-100 (Moderado): Aceptable, precaución para muy sensibles
- 101-150 (Insalubre para sensibles): Grupos sensibles deben limitar actividad prolongada al aire libre
- 151-200 (Insalubre): Todos pueden experimentar efectos; sensibles deben evitar actividad al aire libre
- 201-300 (Muy insalubre): Advertencia de salud, todos deben reducir actividad al aire libre
- 301+ (Peligroso): Emergencia, todos deben evitar actividad al aire libre

CONTAMINANTES:
- **O₃ (Ozono)**: Se forma por luz solar + NOx + VOCs. Peligroso en verano
- **NO₂ (Dióxido de Nitrógeno)**: Emisiones vehicular e industrial
- **PM2.5 (Partículas finas)**: Combustión, incendios, industrial

FORMATO DE RESPUESTA:
- Usa markdown para estructurar tus respuestas
- Incluye listas con viñetas (-)
- Usa negritas (**) para números importantes
- Mantén respuestas concisas (2-4 párrafos)
- Usa emojis ocasionalmente: 📊 datos, 🌡️ temperatura, 💨 viento, 🏥 salud, ⚠️ advertencia`

  const result = streamText({
    model: openai('gpt-4o', {
      // Usando prompt caching para reducir costos
      structuredOutputs: true,
    }),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    temperature: 0.7,
    maxTokens: 1000,
  })

  return result.toUIMessageStreamResponse()
}
