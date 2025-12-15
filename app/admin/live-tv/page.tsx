"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AdminNav from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { database } from "@/lib/firebase"
import { ref as dbRef, push, get, remove } from "firebase/database"

interface LiveChannel {
  id: string
  name: string
  poster: string
  streamUrl: string
  description?: string
}

export default function LiveTVManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [channels, setChannels] = useState<LiveChannel[]>([])
  const [newChannel, setNewChannel] = useState({
    name: "",
    poster: "",
    streamUrl: "",
    description: "",
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadChannels()
    }
  }, [isAdmin])

  const loadChannels = async () => {
    try {
      const channelsRef = dbRef(database, "liveTV")
      const snapshot = await get(channelsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const channelsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setChannels(channelsList)
      }
    } catch (error) {
      console.error("Error loading channels:", error)
    }
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newChannel.name.trim()) {
      alert("Please enter a channel name")
      return
    }

    if (!newChannel.poster.trim()) {
      alert("Please enter a poster URL")
      return
    }

    if (!newChannel.streamUrl.trim()) {
      alert("Please enter a stream URL")
      return
    }

    setUploading(true)
    try {
      const channelsRef = dbRef(database, "liveTV")
      await push(channelsRef, {
        name: newChannel.name,
        poster: newChannel.poster,
        streamUrl: newChannel.streamUrl,
        description: newChannel.description || "",
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Live TV channel added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewChannel({
        name: "",
        poster: "",
        streamUrl: "",
        description: "",
      })
      loadChannels()
    } catch (error) {
      console.error("Error adding channel:", error)
      alert("Error adding channel")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteChannel = async (id: string) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      try {
        await remove(dbRef(database, `liveTV/${id}`))
        setSuccessMessage("Channel deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadChannels()
      } catch (error) {
        console.error("Error deleting channel:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white mb-8">Manage Live TV Channels</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Add Live TV Channel</h2>
          <form onSubmit={handleAddChannel} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Channel Name *</label>
                <Input
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="e.g., CNN Live"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Poster Image URL *</label>
                <Input
                  type="url"
                  value={newChannel.poster}
                  onChange={(e) => setNewChannel({ ...newChannel, poster: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/poster.jpg"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Stream URL *</label>
                <Input
                  type="url"
                  value={newChannel.streamUrl}
                  onChange={(e) => setNewChannel({ ...newChannel, streamUrl: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/stream.m3u8"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Description (Optional)</label>
                <Input
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Channel description"
                />
              </div>
            </div>

            <Button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {uploading ? "Adding..." : "Add Channel"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Current Live TV Channels</h2>
          {channels.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6">
              <p className="text-white/70">No channels yet. Add one to get started!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((channel) => (
                <Card
                  key={channel.id}
                  className="bg-white/10 backdrop-blur-md border border-white/20 p-4 hover:border-white/40 transition"
                >
                  <div className="w-full h-40 bg-white/5 rounded overflow-hidden mb-4">
                    <img
                      src={channel.poster || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{channel.name}</h3>
                  {channel.description && <p className="text-white/70 text-sm mb-2">{channel.description}</p>}
                  <p className="text-cyan-400 text-xs mb-3 truncate">Stream: {channel.streamUrl}</p>
                  <Button onClick={() => handleDeleteChannel(channel.id)} variant="destructive" className="w-full">
                    Delete
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
