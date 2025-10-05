"use client"

import { useState, useRef, useEffect, memo, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
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
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/10 shadow-sm">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn(
        "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm transition-all hover:shadow-md",
        isUser
          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
          : "bg-card/80 backdrop-blur-sm rounded-tl-sm border border-border/50"
      )}>
        {message.parts.map((part: any, index: number) => {
          if (part.type === 'text') {
            return (
              <div key={index} className={cn(
                "prose prose-sm max-w-none",
                isUser ? "prose-invert" : "prose-slate dark:prose-invert"
              )}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Optimizar renderizado de elementos
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    code: ({ children, className }) => {
                      const isInline = !className
                      return isInline ? (
                        <code className="px-1.5 py-0.5 rounded bg-primary/10 text-xs font-mono border border-primary/20">
                          {children}
                        </code>
                      ) : (
                        <code className={cn("block p-3 rounded-lg bg-muted/80 text-xs font-mono overflow-x-auto border border-border/50", className)}>
                          {children}
                        </code>
                      )
                    },
                    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-3 mt-2 border-b pb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-1">{children}</h3>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-4 border-border/50" />,
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
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
      body: () => ({ context }),
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
      "fixed bottom-6 right-6 z-50 flex flex-col bg-background border-2 border-border rounded-2xl shadow-2xl transition-all duration-300",
      isMinimized
        ? "w-80 h-16"
        : "w-[440px] h-[600px] sm:h-[700px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gradient-to-br from-primary/30 to-primary/10 p-2 ring-2 ring-primary/20">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">Asistente de Análisis AI</h3>
            <p className="text-xs text-muted-foreground truncate">
              {status === 'streaming' ? 'Analizando...' : 'Listo para ayudarte'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Contenido del chat - solo visible si no está minimizado */}
      {!isMinimized && (
        <>
          {/* Mensajes */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">¡Hola! Soy tu asistente de análisis</p>
                    <p className="text-sm text-muted-foreground">
                      Puedo ayudarte a entender los datos históricos de calidad del aire
                    </p>
                  </div>

                  {/* Sugerencias iniciales */}
                  <div className="space-y-2 pt-4">
                    <p className="text-xs text-muted-foreground font-medium">Prueba preguntando:</p>
                    <div className="grid gap-2">
                      {[
                        { icon: "📈", text: "¿Cuál es la tendencia?" },
                        { icon: "🔍", text: "¿Qué contaminante predomina?" },
                        { icon: "💡", text: "Dame recomendaciones" },
                      ].map((suggestion) => (
                        <button
                          key={suggestion.text}
                          onClick={() => handleSuggestion(suggestion.text)}
                          disabled={status !== 'ready'}
                          className="text-left px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="mr-2">{suggestion.icon}</span>
                          {suggestion.text}
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
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/70 backdrop-blur-sm border border-border/50">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg px-4 py-3 bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  <p className="font-medium mb-1">Error</p>
                  <p className="text-xs">No se pudo procesar tu mensaje. Intenta de nuevo.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t bg-muted/20 shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={status !== 'ready'}
                className="flex-1 bg-background"
              />
              <Button
                type="submit"
                size="icon"
                disabled={status !== 'ready' || !input.trim()}
                className="shrink-0"
              >
                {status === 'submitted' || status === 'streaming' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Powered by GPT-4o • {messages.length} mensajes
            </p>
          </div>
        </>
      )}
    </div>
  )
}
