"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, Loader2, X, MessageSquare, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIChatProps {
  /**
   * Contexto de datos históricos para el análisis del AI
   */
  context?: string
  className?: string
}

/**
 * Componente de chat AI para análisis de datos históricos de calidad del aire
 *
 * Características:
 * - Chat streaming con OpenAI
 * - Contexto automático de datos históricos
 * - Prompt engineering optimizado para análisis de AQI
 * - Token caching para reducir costos
 */
export function AIChat({ context, className }: AIChatProps) {
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => ({
        context,
      }),
    }),
  })

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status !== 'ready') return

    sendMessage({ text: input })
    setInput("")
  }

  if (!isOpen) {
    return (
      <Card className={cn("border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer", className)}>
        <CardContent className="pt-6">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full"
          >
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Need help interpreting the data?</h3>
                <p className="text-sm text-muted-foreground">
                  Click to chat with our AI assistant and get detailed analysis
                </p>
              </div>
            </div>
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full border-2", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/20 p-2">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">AI Analysis Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">Analyzes and answers questions about the data</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mensajes */}
        <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  Hello! I can help you analyze air quality data.
                </p>
                <p className="text-xs mt-2">
                  Ask me about trends, pollutants, or health recommendations.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return (
                        <p key={index} className="text-sm whitespace-pre-wrap">
                          {part.text}
                        </p>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ))}

            {status === 'streaming' && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg px-4 py-2 bg-destructive/10 text-destructive text-sm">
                Error: Could not process your message. Please try again.
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the historical data..."
            disabled={status !== 'ready'}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={status !== 'ready' || !input.trim()}
          >
            {status === 'submitted' || status === 'streaming' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Sugerencias */}
        {messages.length === 0 && (
          <div className="space-y-3 bg-muted/30 rounded-lg p-4">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Suggested questions to get started
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { icon: "📈", text: "What is the general AQI trend?" },
                { icon: "🔍", text: "Which pollutant is the most problematic?" },
                { icon: "📅", text: "When was the worst day of the period?" },
                { icon: "🌡️", text: "Are there seasonal patterns?" },
              ].map((suggestion) => (
                <Button
                  key={suggestion.text}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start h-auto py-3 hover:bg-primary/5 hover:border-primary/50"
                  onClick={() => {
                    setInput(suggestion.text)
                    sendMessage({ text: suggestion.text })
                  }}
                  disabled={status !== 'ready'}
                >
                  <span className="mr-2">{suggestion.icon}</span>
                  {suggestion.text}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
