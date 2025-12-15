"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"
import { Lock, Sparkles } from "lucide-react"

interface SubscriptionGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const { hasActiveSubscription, loading: subLoading } = useSubscription()
  const router = useRouter()
  const [showPaywall, setShowPaywall] = useState(false)

  useEffect(() => {
    if (!authLoading && !subLoading) {
      if (!user) {
        router.push("/login")
      } else if (!hasActiveSubscription && !isAdmin) {
        setShowPaywall(true)
      }
    }
  }, [user, hasActiveSubscription, authLoading, subLoading, router, isAdmin])

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-400 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || (showPaywall && !isAdmin)) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Premium Content</h2>
            <p className="text-slate-300 text-lg mb-8">
              Subscribe to unlock unlimited streaming and downloads of all movies and series
            </p>
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-slate-300">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>HD Quality Streaming</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Offline Downloads</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>All Movies & Series</span>
              </div>
            </div>
            <button
              onClick={() => router.push("/subscribe")}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg font-bold text-lg transition mb-3"
            >
              View Plans
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 border border-slate-600 hover:border-slate-500 text-white rounded-lg font-semibold transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}
