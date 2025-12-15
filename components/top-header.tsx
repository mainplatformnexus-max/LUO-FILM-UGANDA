"use client"

import type React from "react"

import { Search, Sun, Moon } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import PWAInstallButton from "./pwa-install-button"
import AuthModal from "./auth-modal"
import SlidingLogo from "./sliding-logo"

interface TopHeaderProps {
  onTabChange?: (tab: "movies" | "series" | "anime") => void
  activeTab?: string
  onSearch?: (query: string) => void
}

export default function TopHeader({ onTabChange, activeTab = "series", onSearch }: TopHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch?.(searchQuery)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <>
      <header className="hidden md:flex fixed top-0 left-16 right-0 h-12 bg-background border-b border-border items-center justify-between px-4 z-40">
        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 mr-2">
            <SlidingLogo className="w-8 h-8" />
            <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
              LUO FILM
            </span>
          </button>
          <button
            onClick={() => onTabChange?.("movies")}
            className={`text-xs font-medium transition ${
              activeTab === "movies"
                ? "text-[#e50914] font-bold border-b border-[#e50914] pb-0.5"
                : "text-foreground hover:text-[#e50914]"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => onTabChange?.("series")}
            className={`text-xs font-medium transition ${
              activeTab === "series"
                ? "text-purple-600 font-bold border-b border-purple-600 pb-0.5"
                : "text-foreground hover:text-purple-600"
            }`}
          >
            TV Shows
          </button>
          <button
            onClick={() => onTabChange?.("anime")}
            className={`text-xs font-medium transition ${
              activeTab === "anime"
                ? "text-[#e50914] font-bold border-b border-[#e50914] pb-0.5"
                : "text-foreground hover:text-[#e50914]"
            }`}
          >
            Anime
          </button>
          <a
            href="https://v0-ugavertoriginal.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-[10px] font-bold transition"
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            <span>LIVE TV CHANNELS</span>
          </a>
        </nav>

        {/* Search & Profile */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 h-7 pl-8 pr-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground text-xs focus:outline-none focus:border-[#e50914]"
            />
          </form>

          <button
            onClick={toggleTheme}
            className="p-1 text-muted-foreground hover:text-foreground transition"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <PWAInstallButton />

          <div className="flex items-center gap-2">
            {user ? (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded transition"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
