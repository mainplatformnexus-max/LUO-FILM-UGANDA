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
import { ref as dbRef, push, get, remove, update } from "firebase/database"
import { Star, Trash2, Plus, Edit } from "lucide-react"

interface Series {
  id: string
  title: string
  image: string
  rating: number
  year: number
  category: string
  episodes: Episode[]
}

interface Episode {
  episodeNumber: number
  title: string
  streamlink: string
}

const CATEGORIES = ["Action", "Romance", "Animation", "Horror", "Special", "Drabor", "Comedy", "Drama"]

export default function SeriesManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [series, setSeries] = useState<Series[]>([])
  const [newSeries, setNewSeries] = useState({
    title: "",
    image: "",
    rating: 7.5,
    year: new Date().getFullYear(),
    category: "Animation",
    episodes: [{ episodeNumber: 1, title: "", streamlink: "" }],
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadSeries()
    }
  }, [isAdmin])

  const loadSeries = async () => {
    try {
      const seriesRef = dbRef(database, "series")
      const snapshot = await get(seriesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const seriesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setSeries(seriesList)
      }
    } catch (error) {
      console.error("Error loading series:", error)
    }
  }

  const handleAddEpisode = () => {
    setNewSeries({
      ...newSeries,
      episodes: [
        ...newSeries.episodes,
        {
          episodeNumber: newSeries.episodes.length + 1,
          title: "",
          streamlink: "",
        },
      ],
    })
  }

  const handleRemoveEpisode = (index: number) => {
    setNewSeries({
      ...newSeries,
      episodes: newSeries.episodes.filter((_, i) => i !== index),
    })
  }

  const handleEpisodeChange = (index: number, field: string, value: string) => {
    const updatedEpisodes = [...newSeries.episodes]
    updatedEpisodes[index] = { ...updatedEpisodes[index], [field]: value }
    setNewSeries({ ...newSeries, episodes: updatedEpisodes })
  }

  const handleAddSeries = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newSeries.title.trim() || !newSeries.image.trim()) {
      alert("Please fill in all required fields")
      return
    }

    if (newSeries.episodes.some((ep) => !ep.title.trim() || !ep.streamlink.trim())) {
      alert("Please fill in all episode details")
      return
    }

    setUploading(true)
    try {
      const seriesRef = dbRef(database, "series")
      await push(seriesRef, {
        title: newSeries.title,
        image: newSeries.image,
        rating: Number.parseFloat(newSeries.rating.toString()),
        year: newSeries.year,
        category: newSeries.category,
        episodes: newSeries.episodes,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Series added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewSeries({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        episodes: [{ episodeNumber: 1, title: "", streamlink: "" }],
      })
      loadSeries()
    } catch (error) {
      console.error("Error adding series:", error)
      alert("Error adding series. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingSeries) return

    if (!newSeries.title.trim() || !newSeries.image.trim()) {
      alert("Please fill in all required fields")
      return
    }

    if (newSeries.episodes.some((ep) => !ep.title.trim() || !ep.streamlink.trim())) {
      alert("Please fill in all episode details")
      return
    }

    setUploading(true)
    try {
      await update(dbRef(database, `series/${editingSeries.id}`), {
        title: newSeries.title,
        image: newSeries.image,
        rating: Number.parseFloat(newSeries.rating.toString()),
        year: newSeries.year,
        category: newSeries.category,
        episodes: newSeries.episodes,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Series updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingSeries(null)
      setNewSeries({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        episodes: [{ episodeNumber: 1, title: "", streamlink: "" }],
      })
      loadSeries()
    } catch (error) {
      console.error("Error updating series:", error)
      alert("Error updating series. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleEditSeries = (series: Series) => {
    setEditingSeries(series)
    setNewSeries({
      title: series.title,
      image: series.image,
      rating: series.rating,
      year: series.year,
      category: series.category,
      episodes: series.episodes,
    })
  }

  const handleCancelEdit = () => {
    setEditingSeries(null)
    setNewSeries({
      title: "",
      image: "",
      rating: 7.5,
      year: new Date().getFullYear(),
      category: "Animation",
      episodes: [{ episodeNumber: 1, title: "", streamlink: "" }],
    })
  }

  const handleDeleteSeries = async (id: string) => {
    if (confirm("Are you sure you want to delete this series?")) {
      try {
        await remove(dbRef(database, `series/${id}`))
        setSuccessMessage("Series deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadSeries()
      } catch (error) {
        console.error("Error deleting series:", error)
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
        <h1 className="text-4xl font-bold text-white mb-8">Manage Series</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">{editingSeries ? "Edit Series" : "Add New Series"}</h2>
          <form onSubmit={editingSeries ? handleUpdateSeries : handleAddSeries} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Series Title *</label>
                <Input
                  value={newSeries.title}
                  onChange={(e) => setNewSeries({ ...newSeries, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter series title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category *</label>
                <select
                  value={newSeries.category}
                  onChange={(e) => setNewSeries({ ...newSeries, category: e.target.value })}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded px-3 py-2"
                  required
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Poster Image URL *</label>
                <Input
                  type="url"
                  value={newSeries.image}
                  onChange={(e) => setNewSeries({ ...newSeries, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
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
                  value={newSeries.rating}
                  onChange={(e) => setNewSeries({ ...newSeries, rating: Number.parseFloat(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Year</label>
                <Input
                  type="number"
                  value={newSeries.year}
                  onChange={(e) => setNewSeries({ ...newSeries, year: Number.parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            <div className="border-t border-white/20 pt-6 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Episodes</h3>
              <div className="space-y-4">
                {newSeries.episodes.map((episode, index) => (
                  <div key={index} className="bg-white/5 p-4 rounded border border-white/10">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-medium">Episode {episode.episodeNumber}</h4>
                      {newSeries.episodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEpisode(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={episode.title}
                        onChange={(e) => handleEpisodeChange(index, "title", e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder-white/50"
                        placeholder="Episode title"
                        required
                      />
                      <Input
                        type="url"
                        value={episode.streamlink}
                        onChange={(e) => handleEpisodeChange(index, "streamlink", e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder-white/50"
                        placeholder="Stream link URL"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                onClick={handleAddEpisode}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Episode
              </Button>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {uploading
                  ? editingSeries
                    ? "Updating..."
                    : "Adding..."
                  : editingSeries
                    ? "Update Series"
                    : "Add Series"}
              </Button>
              {editingSeries && (
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
          {series.map((s) => (
            <Card
              key={s.id}
              className="bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:border-white/40 transition"
            >
              <div className="relative h-64 bg-white/5">
                <img src={s.image || "/placeholder.svg"} alt={s.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 truncate">{s.title}</h3>
                <div className="space-y-2 mb-4 text-sm text-white/80">
                  <p>Category: {s.category}</p>
                  <p>Episodes: {s.episodes.length}</p>
                  <div className="flex justify-between items-center">
                    <span>{s.year}</span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {s.rating}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleEditSeries(s)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteSeries(s.id)} variant="destructive" className="w-full">
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
