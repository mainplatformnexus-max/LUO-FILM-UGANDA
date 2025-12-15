"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { database } from "@/lib/firebase"
import { updatePassword, updateProfile } from "firebase/auth"
import { ref, set } from "firebase/database"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import { ChevronLeft } from "lucide-react"

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState("settings")
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    router.push("/")
    return null
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName })
      }

      // Update in database
      await set(
        ref(database, `users/${user.uid}`),
        {
          email: user.email,
          displayName: displayName || user.email?.split("@")[0],
          photoURL: user.photoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      )

      setSuccess("Profile updated successfully!")
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match")
        setSaving(false)
        return
      }

      if (newPassword.length < 6) {
        setError("Password must be at least 6 characters")
        setSaving(false)
        return
      }

      await updatePassword(user, newPassword)
      setSuccess("Password updated successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message || "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  const handleFilterChange = (filter: string) => {
    if (filter === "settings") {
      return // Already on settings
    }
    router.push(`/?filter=${filter}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      <div className="hidden md:block">
        <Sidebar onFilterChange={handleFilterChange} activeFilter="settings" />
      </div>

      <div className="flex-1 md:ml-16 flex flex-col h-screen overflow-hidden">
        <TopHeader onTabChange={() => {}} activeTab="series" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Settings</h1>

            {error && (
              <div className="mb-4 p-3 bg-blue-500/20 border border-blue-400/50 rounded text-blue-100 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-400/50 rounded text-green-100 text-sm">
                {success}
              </div>
            )}

            {/* Profile Section */}
            <div className="bg-secondary rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Profile Settings</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="w-full px-3 py-2 bg-background text-foreground rounded border border-muted-foreground/20 text-sm opacity-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-background text-foreground rounded border border-muted-foreground/20 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Profile"}
                </button>
              </form>
            </div>

            {/* Password Section */}
            <div className="bg-secondary rounded-lg p-6 mb-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Change Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 bg-background text-foreground rounded border border-muted-foreground/20 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-background text-foreground rounded border border-muted-foreground/20 text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>

            {/* Account Info */}
            <div className="bg-secondary rounded-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">Account Information</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Email: {user.email}</p>
                <p>
                  Account created:{" "}
                  {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
