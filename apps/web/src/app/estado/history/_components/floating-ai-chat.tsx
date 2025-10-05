"use client"

import { useState, useRef, useEffect, memo, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send, Loader2, X, Sparkles, Minimize2, Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface FloatingAIChatProps {
  context?: string
}

// Componente optimizado para renderizar mensajes individuales
const MessageBubble = memo(({ message, isUser }: { message: any; isUser: boolean }) => {
  return (
    <div className={cn(
      "flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200",
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className={cn(
        "rounded-xl px-3 py-2 max-w-[85%] text-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted/60 rounded-tl-sm border border-border/40"
      )}>
        {message.parts.map((part: any, index: number) => {
          if (part.type === 'text') {
            return (
              <div key={index} className="text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-3 mb-1.5 space-y-0.5 text-xs">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-3 mb-1.5 space-y-0.5 text-xs">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className
                      return isInline ? (
                        <code className="px-1 py-0.5 rounded bg-primary/10 text-xs font-mono">
                          {children}
                        </code>
                      ) : (
                        <code className={cn("block p-2 rounded bg-muted/50 text-xs font-mono overflow-x-auto my-1", className)}>
                          {children}
                        </code>
                      )
                    },
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <h1 className="text-sm font-bold mb-1 mt-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-sm font-bold mb-1 mt-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-bold mb-0.5 mt-0.5">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-primary/30 pl-2 italic my-1 text-muted-foreground text-xs">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-2 border-border/50" />,
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {children}
                      </a>
                    ),
                  }}
                >
                  {part.text}
                </ReactMarkdown>
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Optimización: solo re-renderizar si el mensaje cambió
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.parts === nextProps.message.parts
})

MessageBubble.displayName = 'MessageBubble'

export function FloatingAIChat({ context }: FloatingAIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: () => {
        console.log('🤖 Enviando contexto al chat:', context ? 'Con datos' : 'Sin datos')
        return { context }
      },
    }),
  })

  // Auto-scroll optimizado - solo durante streaming
  useEffect(() => {
    if (scrollRef.current && (status === 'streaming' || status === 'submitted')) {
      const scrollElement = scrollRef.current
      // Usar requestAnimationFrame para suavizar el scroll
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight
      })
    }
  }, [messages.length, status])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || status !== 'ready') return

    sendMessage({ text: input })
    setInput("")
  }, [input, status, sendMessage])

  const handleSuggestion = useCallback((text: string) => {
    sendMessage({ text })
  }, [sendMessage])

  // Botón flotante
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-2xl hover:shadow-primary/20 hover:scale-110 transition-all duration-300 bg-gradient-to-br from-primary to-primary/80 group relative overflow-hidden"
        >
          {/* Efecto de brillo animado */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

          <Sparkles className="h-6 w-6 relative z-10 animate-pulse" />

          {/* Badge de "nuevo" */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse ring-4 ring-background" />
        </Button>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          Pregúntame sobre los datos
          <div className="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-popover" />
        </div>
      </div>
    )
  }

  // Panel lateral del chat
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 flex flex-col bg-background border-2 border-border rounded-xl shadow-2xl transition-all duration-300",
      isMinimized
        ? "w-80 h-14"
        : "w-96 h-[500px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold truncate">Análisis AI</h3>
            <p className="text-[10px] text-muted-foreground truncate">
              {status === 'streaming' ? 'Escribiendo...' : 'Disponible'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 w-7"
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Contenido del chat - solo visible si no está minimizado */}
      {!isMinimized && (
        <>
          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-4 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-0.5">Asistente de Análisis</p>
                    <p className="text-xs text-muted-foreground">
                      Pregúntame sobre los datos actuales
                    </p>
                  </div>

                  {/* Sugerencias iniciales */}
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs text-muted-foreground font-medium">Preguntas sugeridas:</p>
                    <div className="grid gap-1.5">
                      {[
                        "¿Cuál es la tendencia del AQI en este período?",
                        "¿En qué días hubo peor calidad del aire?",
                        "¿Qué recomendaciones de salud me das según estos datos?",
                        "Explícame los contaminantes principales detectados",
                      ].map((text) => (
                        <button
                          key={text}
                          onClick={() => handleSuggestion(text)}
                          disabled={status !== 'ready'}
                          className="text-left px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed border border-border/30"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.role === 'user'}
                />
              ))}

              {status === 'streaming' && (
                <div className="flex gap-2 justify-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-xl rounded-tl-sm px-3 py-2 bg-muted/60 border border-border/40">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-3 py-2 bg-destructive/10 text-destructive text-xs border border-destructive/20">
                  <p className="font-medium mb-0.5">Error</p>
                  <p className="text-[11px]">No se pudo procesar tu mensaje.</p>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="p-2.5 border-t bg-muted/10 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pregunta sobre los datos..."
                disabled={status !== 'ready'}
                className="flex-1 bg-background h-8 text-xs"
              />
              <Button
                type="submit"
                size="icon"
                disabled={status !== 'ready' || !input.trim()}
                className="shrink-0 h-8 w-8"
              >
                {status === 'submitted' || status === 'streaming' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </Button>
            </form>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              GPT-4o • {messages.length} mensajes
            </p>
          </div>
        </>
      )}
    </div>
  )
}
