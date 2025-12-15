"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import AdminNav from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { database } from "@/lib/firebase"
import { ref as dbRef, push, get, remove, update } from "firebase/database"
import { Star, Trash2, Edit, Music } from 'lucide-react'

interface MusicVideo {
  id: string
  title: string
  image: string
  rating: number
  year: number
  category: string
  streamlink: string
  artist?: string
}

export default function MusicManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [musicVideos, setMusicVideos] = useState<MusicVideo[]>([])
  const [newMusic, setNewMusic] = useState({
    title: "",
    image: "",
    rating: 7.5,
    year: new Date().getFullYear(),
    category: "Music",
    streamlink: "",
    artist: "",
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingMusic, setEditingMusic] = useState<MusicVideo | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadMusicVideos()
    }
  }, [isAdmin])

  const loadMusicVideos = async () => {
    try {
      const musicRef = dbRef(database, "movies")
      const snapshot = await get(musicRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const musicList = Object.entries(data)
          .map(([id, value]: any) => ({ id, ...value }))
          .filter((item: any) => item.category?.toLowerCase() === "music")
        setMusicVideos(musicList)
      }
    } catch (error) {
      console.error("Error loading music videos:", error)
    }
  }

  const handleAddMusic = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMusic.image.trim() || !newMusic.title.trim() || !newMusic.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      const musicRef = dbRef(database, "movies")
      await push(musicRef, {
        title: newMusic.title,
        image: newMusic.image,
        rating: Number.parseFloat(newMusic.rating.toString()),
        year: newMusic.year,
        category: "Music",
        streamlink: newMusic.streamlink,
        artist: newMusic.artist,
        type: "music",
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Music video added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewMusic({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Music",
        streamlink: "",
        artist: "",
      })
      loadMusicVideos()
    } catch (error) {
      console.error("Error adding music video:", error)
      alert("Error adding music video. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteMusic = async (id: string) => {
    if (confirm("Are you sure you want to delete this music video?")) {
      try {
        await remove(dbRef(database, `movies/${id}`))
        setSuccessMessage("Music video deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadMusicVideos()
      } catch (error) {
        console.error("Error deleting music video:", error)
      }
    }
  }

  const handleEditMusic = (music: MusicVideo) => {
    setEditingMusic(music)
    setNewMusic({
      title: music.title,
      image: music.image,
      rating: music.rating,
      year: music.year,
      category: "Music",
      streamlink: music.streamlink,
      artist: music.artist || "",
    })
  }

  const handleUpdateMusic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMusic) return

    if (!newMusic.image.trim() || !newMusic.title.trim() || !newMusic.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      await update(dbRef(database, `movies/${editingMusic.id}`), {
        title: newMusic.title,
        image: newMusic.image,
        rating: Number.parseFloat(newMusic.rating.toString()),
        year: newMusic.year,
        category: "Music",
        streamlink: newMusic.streamlink,
        artist: newMusic.artist,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Music video updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingMusic(null)
      setNewMusic({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Music",
        streamlink: "",
        artist: "",
      })
      loadMusicVideos()
    } catch (error) {
      console.error("Error updating music video:", error)
      alert("Error updating music video. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingMusic(null)
    setNewMusic({
      title: "",
      image: "",
      rating: 7.5,
      year: new Date().getFullYear(),
      category: "Music",
      streamlink: "",
      artist: "",
    })
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
        <h1 className="text-4xl font-bold text-white mb-8 flex items-center gap-3">
          <Music className="w-10 h-10" />
          Manage Music Videos
        </h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingMusic ? "Edit Music Video" : "Add New Music Video"}
          </h2>
          <form onSubmit={editingMusic ? handleUpdateMusic : handleAddMusic} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Video Title *</label>
                <Input
                  value={newMusic.title}
                  onChange={(e) => setNewMusic({ ...newMusic, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter music video title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Artist Name</label>
                <Input
                  value={newMusic.artist}
                  onChange={(e) => setNewMusic({ ...newMusic, artist: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter artist name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Stream Link *</label>
                <Input
                  type="url"
                  value={newMusic.streamlink}
                  onChange={(e) => setNewMusic({ ...newMusic, streamlink: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/stream/video.mp4"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Rating (0-10)</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={newMusic.rating}
                  onChange={(e) => setNewMusic({ ...newMusic, rating: Number.parseFloat(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Year</label>
                <Input
                  type="number"
                  value={newMusic.year}
                  onChange={(e) => setNewMusic({ ...newMusic, year: Number.parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Thumbnail Image URL *</label>
                <Input
                  type="url"
                  value={newMusic.image}
                  onChange={(e) => setNewMusic({ ...newMusic, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? (editingMusic ? "Updating..." : "Adding...") : editingMusic ? "Update Music Video" : "Add Music Video"}
              </Button>
              {editingMusic && (
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {musicVideos.map((music) => (
            <Card
              key={music.id}
              className="bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:border-white/40 transition"
            >
              <div className="relative h-64 bg-white/5">
                <img src={music.image || "/placeholder.svg"} alt={music.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  Music
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white mb-1 truncate">{music.title}</h3>
                {music.artist && <p className="text-xs text-white/60 mb-2">{music.artist}</p>}
                <div className="space-y-2 mb-4 text-sm text-white/80">
                  <div className="flex justify-between items-center">
                    <span>{music.year}</span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {music.rating}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleEditMusic(music)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteMusic(music.id)} variant="destructive" className="w-full">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
