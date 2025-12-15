"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/carousel", label: "Carousel" },
    { href: "/admin/ads", label: "Ads" },
    { href: "/admin/news", label: "News" },
    { href: "/admin/live-tv", label: "Live TV" },
    { href: "/admin/movies", label: "Movies" },
    { href: "/admin/series", label: "Series" },
    { href: "/admin/originals", label: "Originals" },
    { href: "/admin/animation", label: "Animation" },
    { href: "/admin/music", label: "Music" },
    { href: "/admin/wallet", label: "Wallet" },
  ]

  return (
    <nav className="fixed top-12 left-48 right-0 bg-card backdrop-blur-md border-b border-border z-30">
      <div className="px-6 py-2 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                className={`${pathname === item.href ? "bg-blue-600 text-white" : "text-foreground hover:bg-muted"}`}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        <Button onClick={handleLogout} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white ml-4">
          Logout
        </Button>
      </div>
    </nav>
  )
}
