"use client"

import { Search, User, Bell, Menu, X, LogOut, Tv } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Logo from "./logo"
import SearchBar from "./search-bar"
import PWAInstallButton from "./pwa-install-button"
import AuthModal from "./auth-modal"

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { user, isAdmin } = useAuth()
  const { hasActiveSubscription, subscription } = useSubscription()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <header className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border-b border-blue-400/20 sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <button onClick={() => router.push("/")} className="hover:opacity-80 transition">
          <Logo />
        </button>

        <button
          onClick={() => window.open("https://v0-ugavertoriginal.vercel.app/", "_blank", "noopener,noreferrer")}
          className="md:hidden flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded text-[10px] font-bold transition-all hover:scale-105"
        >
          <Tv className="w-3 h-3" />
          <span>LIVE</span>
        </button>

        {/* Center: Navigation - hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => router.push("/movies")}
            className="px-3 sm:px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 rounded-lg text-xs sm:text-sm font-medium transition backdrop-blur-sm"
          >
            Movies
          </button>
          <button
            onClick={() => router.push("/series")}
            className="px-3 sm:px-4 py-2 text-slate-300 hover:text-blue-300 transition"
          >
            Series
          </button>
          <button
            onClick={() => router.push("/originals")}
            className="px-3 sm:px-4 py-2 text-slate-300 hover:text-purple-300 transition"
          >
            Originals
          </button>
          <button
            onClick={() => window.open("https://v0-ugavertoriginal.vercel.app/", "_blank", "noopener,noreferrer")}
            className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-md text-xs font-medium transition-all hover:scale-105 ml-1"
          >
            <Tv className="w-3 h-3" />
            <span className="hidden lg:inline">LIVE</span>
          </button>
        </nav>

        {/* Center Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Right: User Profile & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <PWAInstallButton />

          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-2 text-slate-300 hover:text-blue-300 transition"
          >
            {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          <Bell className="w-5 h-5 text-slate-300 cursor-pointer hover:text-purple-300 transition hidden sm:block" />

          {user ? (
            <div className="flex items-center gap-3">
              {hasActiveSubscription ? (
                <button
                  onClick={() => router.push("/subscribe")}
                  className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/50 text-blue-300 rounded-full text-xs font-semibold hover:from-blue-500/30 hover:to-purple-500/30 transition"
                >
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  Premium Active
                </button>
              ) : (
                <button
                  onClick={() => router.push("/subscribe")}
                  className="hidden lg:block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold transition"
                >
                  Subscribe
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm text-white font-medium">{isAdmin ? "Admin" : "User"}</span>
                  <span className="text-xs text-slate-400 truncate max-w-[100px]">{user.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-300 hover:text-pink-400 transition"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
              {isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="hidden sm:block px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-xs font-medium transition"
                >
                  Admin
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-xs sm:text-sm font-medium transition"
            >
              Login
            </button>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden border-t border-blue-400/20 bg-blue-500/5 backdrop-blur-sm px-4 py-3">
          <SearchBar />
        </div>
      )}

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-blue-400/20 bg-blue-500/5 backdrop-blur-sm px-4 py-3 space-y-2">
          {user && !hasActiveSubscription && (
            <button
              onClick={() => {
                router.push("/subscribe")
                setMobileMenuOpen(false)
              }}
              className="block w-full text-left px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-bold hover:from-blue-600 hover:to-purple-700 transition"
            >
              Subscribe Now
            </button>
          )}
          {user && hasActiveSubscription && (
            <button
              onClick={() => {
                router.push("/subscribe")
                setMobileMenuOpen(false)
              }}
              className="block w-full text-left px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/50 text-blue-300 rounded-lg text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Premium Active
              </span>
            </button>
          )}
          <button
            onClick={() => {
              router.push("/movies")
              setMobileMenuOpen(false)
            }}
            className="block w-full text-left px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-100 rounded-lg text-sm font-medium transition"
          >
            Movies
          </button>
          <button
            onClick={() => {
              router.push("/series")
              setMobileMenuOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-slate-300 hover:text-blue-300 transition"
          >
            Series
          </button>
          <button
            onClick={() => {
              router.push("/originals")
              setMobileMenuOpen(false)
            }}
            className="block w-full text-left px-3 py-2 text-slate-300 hover:text-purple-300 transition"
          >
            Originals
          </button>
          <button
            onClick={() => {
              window.open("https://v0-ugavertoriginal.vercel.app/", "_blank", "noopener,noreferrer")
              setMobileMenuOpen(false)
            }}
            className="flex items-center gap-2 w-full text-left px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition"
          >
            <Tv className="w-4 h-4" />
            <span>Live TV</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                router.push("/admin")
                setMobileMenuOpen(false)
              }}
              className="block w-full text-left px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              Admin Dashboard
            </button>
          )}
        </nav>
      )}

      {/* AuthModal component */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false)
          setMobileMenuOpen(false)
        }}
      />
    </header>
  )
}
