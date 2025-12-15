"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Sparkles, Loader2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  component?: React.ReactNode
}

interface AIAssistantProps {
  onShowSubscription: () => void
  onShowLogin: () => void
  onPlayVideo: (video: { url: string; title: string; contentId: string; contentType: string }) => void
}

export function AIAssistant({ onShowSubscription, onShowLogin, onPlayVideo }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm the LUO FILM AI assistant. I can help you find movies, check subscriptions, and answer questions about our platform. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [askMePosition, setAskMePosition] = useState<{ x: number; y: number } | null>(null)
  const [hoveredText, setHoveredText] = useState("")
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const askMeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isOverAskMeRef = useRef(false)
  const { user } = useAuth()
  const { hasActiveSubscription } = useSubscription()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    }
  }, [messages])

  useEffect(() => {
    if (chatPosition && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [chatPosition])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      if (chatPosition) return

      const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      if (!element) {
        if (askMeTimeoutRef.current) clearTimeout(askMeTimeoutRef.current)
        if (!isOverAskMeRef.current) setAskMePosition(null)
        return
      }

      const isOverAI = element.closest("[data-ai-assistant]")
      if (isOverAI) {
        isOverAskMeRef.current = true
        if (askMeTimeoutRef.current) clearTimeout(askMeTimeoutRef.current)
        return
      } else {
        isOverAskMeRef.current = false
      }

      let text = element.textContent?.trim() || ""

      if (element.tagName === "IMG") {
        text = element.getAttribute("alt") || element.closest("a")?.textContent?.trim() || ""
      }

      if (element.tagName === "BUTTON" || element.tagName === "A") {
        text = element.textContent?.trim() || element.getAttribute("aria-label") || element.getAttribute("title") || ""
      }

      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        const input = element as HTMLInputElement
        text = input.value || input.placeholder || ""
      }

      if (element.tagName.match(/^H[1-6]$/)) {
        text = element.textContent?.trim() || ""
      }

      const hasMinimalContent = text.length <= 3
      const isEmptySpace = element.tagName === "DIV" || element.tagName === "SECTION" || element.tagName === "MAIN"

      if (text.length > 3 || (isEmptySpace && hasMinimalContent)) {
        if (askMeTimeoutRef.current) {
          clearTimeout(askMeTimeoutRef.current)
        }

        askMeTimeoutRef.current = setTimeout(
          () => {
            setAskMePosition({ x: lastMousePosRef.current.x, y: lastMousePosRef.current.y })
            setHoveredText(text.slice(0, 200))
          },
          text.length > 3 ? 1500 : 2500,
        )
      } else {
        if (askMeTimeoutRef.current) {
          clearTimeout(askMeTimeoutRef.current)
        }
        if (!isOverAskMeRef.current) {
          setAskMePosition(null)
        }
      }
    }

    const handleMouseLeave = () => {
      if (askMeTimeoutRef.current) clearTimeout(askMeTimeoutRef.current)
      if (!isOverAskMeRef.current) {
        setAskMePosition(null)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      if (askMeTimeoutRef.current) clearTimeout(askMeTimeoutRef.current)
    }
  }, [chatPosition])

  const handleSendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || inputValue.trim()
    if (!messageToSend || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.slice(-10),
          userEmail: user?.email,
          isSubscribed: hasActiveSubscription,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        component: data.component ? renderComponent(data.component) : undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again or contact support@luofilm.site for assistance.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const renderComponent = (componentData: any) => {
    if (componentData.type === "movies") {
      return (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {componentData.movies.slice(0, 6).map((movie: any) => (
            <button
              key={movie.id}
              onClick={() => {
                if (!user) {
                  const loginMessage: Message = {
                    role: "assistant",
                    content: "You need to login first to watch this movie!",
                    timestamp: new Date(),
                    component: renderComponent({ type: "login" }),
                  }
                  setMessages((prev) => [...prev, loginMessage])
                  onShowLogin()
                  return
                }
                if (!hasActiveSubscription) {
                  const subscribeMessage: Message = {
                    role: "assistant",
                    content: "You need an active subscription to watch this movie. Choose a plan to start watching!",
                    timestamp: new Date(),
                    component: renderComponent({ type: "subscribe" }),
                  }
                  setMessages((prev) => [...prev, subscribeMessage])
                  onShowSubscription()
                  return
                }
                const videoUrl = movie.streamlink || movie.videoUrl
                if (videoUrl) {
                  onPlayVideo({
                    url: videoUrl,
                    title: movie.title,
                    contentId: movie.id,
                    contentType: movie.type || "movie",
                  })
                  setChatPosition(null)
                }
              }}
              className="group relative bg-slate-800/50 rounded-lg overflow-hidden hover:bg-slate-700/50 transition text-left w-full"
            >
              <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                <img src={movie.image || "/placeholder.svg"} alt={movie.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center">
                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
              <div className="p-2">
                <p className="text-white text-xs font-medium truncate">{movie.title}</p>
                <p className="text-yellow-400 text-xs">★ {movie.rating}</p>
              </div>
            </button>
          ))}
        </div>
      )
    }

    if (componentData.type === "login") {
      return (
        <Button
          onClick={() => {
            onShowLogin()
            setChatPosition(null)
          }}
          className="w-full mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
        >
          Login Now
        </Button>
      )
    }

    if (componentData.type === "subscribe") {
      return (
        <Button
          onClick={() => {
            onShowSubscription()
            setChatPosition(null)
          }}
          className="w-full mt-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Subscribe Now
        </Button>
      )
    }

    return null
  }

  const handleAskMeClick = () => {
    if (!askMePosition) return

    isOverAskMeRef.current = false
    setAskMePosition(null)

    const chatWidth = 380
    const chatHeight = 500
    const padding = 20

    let x = askMePosition.x + 15
    let y = askMePosition.y + 15

    if (x + chatWidth > window.innerWidth - padding) {
      x = window.innerWidth - chatWidth - padding
    }

    if (y + chatHeight > window.innerHeight - padding) {
      y = window.innerHeight - chatHeight - padding
    }

    x = Math.max(padding, x)
    y = Math.max(padding, y)

    setChatPosition({ x, y })

    if (hoveredText && hoveredText.length > 3) {
      setInputValue(`Tell me about: ${hoveredText.slice(0, 50)}${hoveredText.length > 50 ? "..." : ""}`)
      setTimeout(() => {
        const cleanText = `Tell me about: ${hoveredText.slice(0, 50)}${hoveredText.length > 50 ? "..." : ""}`
        handleSendMessage(cleanText)
      }, 300)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {askMePosition && !chatPosition && (
        <Button
          data-ai-assistant
          onMouseEnter={() => {
            isOverAskMeRef.current = true
          }}
          onMouseLeave={() => {
            isOverAskMeRef.current = false
            setTimeout(() => {
              if (!isOverAskMeRef.current) {
                setAskMePosition(null)
              }
            }, 200)
          }}
          onClick={handleAskMeClick}
          className={cn(
            "fixed z-[60] rounded-full shadow-2xl transition-all duration-200 animate-in fade-in zoom-in",
            "bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
            "hover:scale-110 active:scale-95 flex items-center gap-2 px-4 py-2 h-10",
          )}
          style={{
            left: `${askMePosition.x + 15}px`,
            top: `${askMePosition.y + 15}px`,
          }}
        >
          <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
          <span className="text-sm font-medium text-white">Ask me</span>
        </Button>
      )}

      {chatPosition && (
        <div
          data-ai-assistant
          className="fixed z-50 flex flex-col rounded-2xl shadow-2xl bg-gradient-to-br from-blue-900/95 via-blue-800/95 to-purple-900/95 backdrop-blur-xl border border-white/10 animate-in fade-in zoom-in duration-200"
          style={{
            left: `${chatPosition.x}px`,
            top: `${chatPosition.y}px`,
            width: "380px",
            height: "500px",
          }}
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-yellow-500 to-pink-500 px-4 py-3 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">LUO FILM AI</h3>
                <p className="text-xs text-white/90">Your entertainment assistant</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setChatPosition(null)
                setMessages([
                  {
                    role: "assistant",
                    content: "Hello! I'm the LUO FILM AI assistant. How can I help you today?",
                    timestamp: new Date(),
                  },
                ])
              }}
              className="h-8 w-8 text-white hover:bg-white/20 rounded-full transition-all hover:rotate-90"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-lg",
                      message.role === "user"
                        ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-br-none"
                        : "bg-white/10 backdrop-blur-sm text-white border border-white/10 rounded-bl-none",
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    {message.component && <div className="mt-2">{message.component}</div>}
                    <span className="mt-1 block text-xs opacity-60">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-white/10 backdrop-blur-sm px-4 py-3 text-white border border-white/10">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 bg-white/5 p-4 rounded-b-2xl backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-purple-400 focus:ring-purple-400/20"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 shadow-lg transition-all hover:scale-105 active:scale-95"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <Send className="h-4 w-4 text-white" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
