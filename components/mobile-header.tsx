"use client"

import { Search, User, LogOut } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import SearchBar from "./search-bar"
import AuthModal from "./auth-modal"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import SlidingLogo from "./sliding-logo"

interface MobileHeaderProps {
  onSearch?: (query: string) => void
}

export default function MobileHeader({ onSearch }: MobileHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [showLogout, setShowLogout] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const handleUserClick = () => {
    if (user) {
      setShowLogout(!showLogout)
    } else {
      setAuthModalOpen(true)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      setShowLogout(false)
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 bg-[#141620] border-b border-[#2a2d3a] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => router.push("/")} className="flex-shrink-0 flex items-center gap-2">
            <SlidingLogo className="w-10 h-10" />
            <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
              LUO FILM
            </span>
          </button>

          {/* Search and Account */}
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 text-[#9ca3af] hover:text-white transition"
            >
              <Search className="w-5 h-5" />
            </button>

            <button onClick={handleUserClick} className="p-2 text-[#9ca3af] hover:text-white transition relative">
              {user ? (
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>

            {user && showLogout && (
              <div className="absolute top-12 right-0 bg-[#1a1d2e] border border-[#2a2d3a] rounded-lg shadow-xl p-2 min-w-[160px] z-50">
                <button
                  onClick={() => {
                    router.push("/settings")
                    setShowLogout(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-[#2a2d3a] rounded-md transition"
                >
                  <User className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search Bar Expansion */}
        {searchOpen && (
          <div className="mt-2 pb-1">
            <SearchBar />
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  )
}
