"use client"

import type React from "react"

import { useState } from "react"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose()
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || (isSignup ? "Signup failed" : "Login failed. Please check your credentials."))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      onClose()
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || "Google authentication failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-900/80 to-blue-900/30 backdrop-blur-xl rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-400/20 relative animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-600/40 hover:from-blue-500/60 hover:to-purple-600/60 flex items-center justify-center transition"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent mb-1">
            LUO FILM
          </h2>
          <p className="text-slate-400 text-sm">{isSignup ? "Create Account" : "Welcome Back"}</p>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-pink-500/20 border border-pink-400/50 rounded text-pink-100 text-xs">{error}</div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-white mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 bg-blue-900/20 border-blue-400/30 text-white placeholder-slate-500 text-xs focus:border-blue-400/60"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-8 bg-blue-900/20 border-blue-400/30 text-white placeholder-slate-500 text-xs focus:border-blue-400/60"
              placeholder="Enter your password"
              required
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-xs font-medium text-white mb-1">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-8 bg-blue-900/20 border-blue-400/30 text-white placeholder-slate-500 text-xs focus:border-blue-400/60"
                placeholder="Confirm your password"
                required
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-8 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xs font-semibold"
          >
            {loading ? (isSignup ? "Creating..." : "Logging in...") : isSignup ? "Sign Up" : "Login"}
          </Button>
        </form>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-blue-400/30"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-gradient-to-br from-slate-900/80 to-blue-900/30 text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full h-8 bg-blue-900/20 hover:bg-blue-900/40 text-blue-300 border border-blue-400/40 text-xs mb-4 font-medium"
        >
          {loading ? "Signing in..." : "Sign in with Google"}
        </Button>

        <div className="text-center text-xs text-slate-400">
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup)
              setError("")
              setConfirmPassword("")
            }}
            className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-blue-300 hover:to-purple-300 font-medium transition"
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </div>
      </div>
    </div>
  )
}
