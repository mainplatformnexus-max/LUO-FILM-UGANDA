"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Film, Tv, Star, Sparkles, Music, Wallet, ImageIcon, Newspaper } from "lucide-react"

export default function AdminMobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/carousel", label: "Carousel", icon: ImageIcon },
    { href: "/admin/news", label: "News", icon: Newspaper },
    { href: "/admin/movies", label: "Movies", icon: Film },
    { href: "/admin/series", label: "Series", icon: Tv },
    { href: "/admin/originals", label: "Originals", icon: Star },
    { href: "/admin/animation", label: "Animation", icon: Sparkles },
    { href: "/admin/music", label: "Music", icon: Music },
    { href: "/admin/wallet", label: "Wallet", icon: Wallet },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg min-w-[60px] ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
