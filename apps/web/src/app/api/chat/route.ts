import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { env } from '@/env'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, context }: { messages: UIMessage[]; context?: string } = await req.json()

  console.log('🤖 Chat API - Context received:', context ? 'YES' : 'NO')
  if (context) {
    console.log('📊 First 500 characters of context:', context.substring(0, 500))
    console.log('📏 Total context length:', context.length, 'characters')
  }

  // Prompting system with historical data context
  const systemPrompt = `You are an expert assistant in air quality analysis and environmental data for California.

${context ? `IMPORTANT: You have access to current historical data for the selected period. You MUST use this data to answer user questions with specific numbers and analysis.

${context}

---

` : 'NOTE: No data currently loaded. Ask the user to select an analysis period first.\n\n'}

ANALYSIS INSTRUCTIONS:
- When the user asks about trends, use the TREND data provided above
- When they ask about pollutants, use the POLLUTANTS data from the context
- When they request health recommendations, base your suggestions on the average and maximum AQI for the period
- Be specific: mention dates, exact AQI numbers, and percentage changes

AQI LEVELS:
- 0-50 (Good): Clean air, no restrictions
- 51-100 (Moderate): Acceptable, caution for very sensitive individuals
- 101-150 (Unhealthy for Sensitive Groups): Sensitive groups should limit prolonged outdoor activity
- 151-200 (Unhealthy): Everyone may experience effects; sensitive individuals should avoid outdoor activity
- 201-300 (Very Unhealthy): Health warning, everyone should reduce outdoor activity
- 301+ (Hazardous): Emergency, everyone should avoid outdoor activity

POLLUTANTS:
- **O₃ (Ozone)**: Formed by sunlight + NOx + VOCs. Dangerous in summer
- **NO₂ (Nitrogen Dioxide)**: Vehicular and industrial emissions
- **PM2.5 (Fine Particles)**: Combustion, fires, industrial sources

RESPONSE FORMAT:
- Use markdown to structure your responses
- Include bullet lists (-)
- Use bold (**) for important numbers
- Keep responses concise (2-4 paragraphs)
- Use emojis occasionally: 📊 data, 🌡️ temperature, 💨 wind, 🏥 health, ⚠️ warning`

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages: convertToModelMessages(messages),
    temperature: 0.7,
    maxOutputTokens: 1000,
  })

  return result.toUIMessageStreamResponse()
}
