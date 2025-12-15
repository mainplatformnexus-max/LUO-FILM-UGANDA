"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface ContentToPlay {
  id: string
  type: "movie" | "series" | "original"
  title?: string
  streamLink?: string
}

interface PlayerContextType {
  contentToPlay: ContentToPlay | null
  setContentToPlay: (content: ContentToPlay | null) => void
  isPlayerActive: boolean
  setIsPlayerActive: (active: boolean) => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [contentToPlay, setContentToPlay] = useState<ContentToPlay | null>(null)
  const [isPlayerActive, setIsPlayerActive] = useState(false)

  return (
    <PlayerContext.Provider value={{ contentToPlay, setContentToPlay, isPlayerActive, setIsPlayerActive }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}
