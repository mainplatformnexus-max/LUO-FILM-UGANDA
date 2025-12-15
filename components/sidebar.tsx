"use client"

import { Home, Film, Tv, Globe, Music, Star, Settings, Moon, Sun, CreditCard, Shield, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useTheme } from "next-themes"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  onFilterChange?: (filter: string) => void
  activeFilter?: string
}

export default function Sidebar({ onFilterChange, activeFilter = "home" }: SidebarProps) {
  const { user, isAdmin } = useAuth()
  const { theme, setTheme } = useTheme()

  const menuItems = [
    { icon: Home, label: "Home", filter: "home" },
    { icon: Film, label: "Movies", filter: "movies" },
    { icon: Tv, label: "Series", filter: "series" },
    { icon: Tv, label: "Live TV", filter: "live-tv" },
    { icon: Globe, label: "Nigerian", filter: "nigerian" },
    { icon: Music, label: "Music", filter: "music" },
    { icon: Star, label: "Top Rated", filter: "top-rated" },
    { icon: CreditCard, label: "Subscription", filter: "subscription" },
    { icon: Settings, label: "Settings", filter: "settings" },
  ]

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.href = "/"
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed left-0 top-0 h-screen w-16 bg-gradient-to-b from-card to-card/95 border-r border-border/50 backdrop-blur-xl flex flex-col z-50 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="p-4 flex-shrink-0 flex items-center justify-center border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
            VJ
          </div>
        </div>

        {/* Menu Section */}
        <div className="px-2 py-4 flex-1 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeFilter === item.filter
              return (
                <Tooltip key={item.filter}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onFilterChange?.(item.filter)}
                      className={`w-full h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    className="w-full h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105 transition-all duration-200"
                  >
                    <Shield className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  <p>Admin Panel</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Theme Switcher and Logout */}
        <div className="p-2 border-t border-border/50 flex-shrink-0 space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="w-full h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:scale-105 transition-all duration-200"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <p>{theme === "light" ? "Dark Mode" : "Light Mode"}</p>
            </TooltipContent>
          </Tooltip>

          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full h-12 flex items-center justify-center rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 hover:scale-105 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                <p>Log Out</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
