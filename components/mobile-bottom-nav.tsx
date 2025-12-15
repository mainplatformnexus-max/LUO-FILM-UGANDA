"use client"

import { Home, Film, Tv, Globe, Music, Star, CreditCard, Shield } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface MobileBottomNavProps {
  isMobile: boolean
  activeFilter: string
  onFilterChange: (filter: string) => void
}

export default function MobileBottomNav({ isMobile, activeFilter, onFilterChange }: MobileBottomNavProps) {
  const { isAdmin } = useAuth()

  if (!isMobile) return null

  const navItems = [
    { icon: Home, label: "Home", filter: "home" },
    { icon: Film, label: "Movies", filter: "movies" },
    { icon: Tv, label: "Series", filter: "series" },
    { icon: Globe, label: "Nigerian", filter: "nigerian" },
    { icon: Music, label: "Music", filter: "music" },
    { icon: Star, label: "Top", filter: "top-rated" },
    { icon: CreditCard, label: "Plans", filter: "subscription" },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#141620] border-t border-[#2a2d3a] z-50">
      <div className="flex items-center justify-around overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeFilter === item.filter
          return (
            <button
              key={item.filter}
              onClick={() => onFilterChange(item.filter)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 flex-1 min-w-max transition ${
                isActive ? "text-purple-600" : "text-[#9ca3af] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px] font-medium whitespace-nowrap">{item.label}</span>
            </button>
          )
        })}
        {isAdmin && (
          <a
            href="/admin"
            className="flex flex-col items-center gap-0.5 px-2 py-2 flex-1 min-w-max transition text-[#9ca3af] hover:text-white"
          >
            <Shield className="w-4 h-4" />
            <span className="text-[8px] font-medium whitespace-nowrap">Admin</span>
          </a>
        )}
      </div>
    </div>
  )
}
