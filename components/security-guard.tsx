"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

export default function SecurityGuard() {
  const { user, isAdmin } = useAuth()

  useEffect(() => {
    if (isAdmin) {
      // Admins have full access, no restrictions
      return
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      return false
    }

    document.addEventListener("contextmenu", handleContextMenu, { capture: true })

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu, { capture: true })
    }
  }, [isAdmin])

  return null
}
