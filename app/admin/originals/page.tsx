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
import { Star, Trash2, Edit } from "lucide-react"

interface Original {
  id: string
  title: string
  image: string
  rating: number
  year: number
  category: string
  streamlink: string
}

const CATEGORIES = ["Action", "Romance", "Animation", "Horror", "Special", "Drabor", "Comedy", "Drama"]

export default function OriginalsManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [originals, setOriginals] = useState<Original[]>([])
  const [newOriginal, setNewOriginal] = useState({
    title: "",
    image: "",
    rating: 7.5,
    year: new Date().getFullYear(),
    category: "Animation",
    streamlink: "",
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingOriginal, setEditingOriginal] = useState<Original | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadOriginals()
    }
  }, [isAdmin])

  const loadOriginals = async () => {
    try {
      const originalsRef = dbRef(database, "originals")
      const snapshot = await get(originalsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const originalsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setOriginals(originalsList)
      }
    } catch (error) {
      console.error("Error loading originals:", error)
    }
  }

  const handleAddOriginal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newOriginal.image.trim() || !newOriginal.title.trim() || !newOriginal.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      const originalsRef = dbRef(database, "originals")
      await push(originalsRef, {
        title: newOriginal.title,
        image: newOriginal.image,
        rating: Number.parseFloat(newOriginal.rating.toString()),
        year: newOriginal.year,
        category: newOriginal.category,
        streamlink: newOriginal.streamlink,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Original content added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewOriginal({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        streamlink: "",
      })
      loadOriginals()
    } catch (error) {
      console.error("Error adding original:", error)
      alert("Error adding original. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleEditOriginal = (original: Original) => {
    setEditingOriginal(original)
    setNewOriginal({
      title: original.title,
      image: original.image,
      rating: original.rating,
      year: original.year,
      category: original.category,
      streamlink: original.streamlink,
    })
  }

  const handleUpdateOriginal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingOriginal) return

    if (!newOriginal.image.trim() || !newOriginal.title.trim() || !newOriginal.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      await update(dbRef(database, `originals/${editingOriginal.id}`), {
        title: newOriginal.title,
        image: newOriginal.image,
        rating: Number.parseFloat(newOriginal.rating.toString()),
        year: newOriginal.year,
        category: newOriginal.category,
        streamlink: newOriginal.streamlink,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Original updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingOriginal(null)
      setNewOriginal({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        streamlink: "",
      })
      loadOriginals()
    } catch (error) {
      console.error("Error updating original:", error)
      alert("Error updating original. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingOriginal(null)
    setNewOriginal({
      title: "",
      image: "",
      rating: 7.5,
      year: new Date().getFullYear(),
      category: "Animation",
      streamlink: "",
    })
  }

  const handleDeleteOriginal = async (id: string) => {
    if (confirm("Are you sure you want to delete this original?")) {
      try {
        await remove(dbRef(database, `originals/${id}`))
        setSuccessMessage("Original deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadOriginals()
      } catch (error) {
        console.error("Error deleting original:", error)
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
        <h1 className="text-4xl font-bold text-white mb-8">Manage Originals</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            {editingOriginal ? "Edit Original" : "Add New Original"}
          </h2>
          <form onSubmit={editingOriginal ? handleUpdateOriginal : handleAddOriginal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title *</label>
                <Input
                  value={newOriginal.title}
                  onChange={(e) => setNewOriginal({ ...newOriginal, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category *</label>
                <select
                  value={newOriginal.category}
                  onChange={(e) => setNewOriginal({ ...newOriginal, category: e.target.value })}
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
                <label className="block text-sm font-medium text-white mb-2">Stream Link *</label>
                <Input
                  type="url"
                  value={newOriginal.streamlink}
                  onChange={(e) => setNewOriginal({ ...newOriginal, streamlink: e.target.value })}
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
                  value={newOriginal.rating}
                  onChange={(e) => setNewOriginal({ ...newOriginal, rating: Number.parseFloat(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Year</label>
                <Input
                  type="number"
                  value={newOriginal.year}
                  onChange={(e) => setNewOriginal({ ...newOriginal, year: Number.parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Poster Image URL *</label>
                <Input
                  type="url"
                  value={newOriginal.image}
                  onChange={(e) => setNewOriginal({ ...newOriginal, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {uploading
                  ? editingOriginal
                    ? "Updating..."
                    : "Adding..."
                  : editingOriginal
                    ? "Update Original"
                    : "Add Original"}
              </Button>
              {editingOriginal && (
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
          {originals.map((original) => (
            <Card
              key={original.id}
              className="bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:border-white/40 transition"
            >
              <div className="relative h-64 bg-white/5">
                <img
                  src={original.image || "/placeholder.svg"}
                  alt={original.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 truncate">{original.title}</h3>
                <div className="space-y-2 mb-4 text-sm text-white/80">
                  <p>Category: {original.category}</p>
                  <div className="flex justify-between items-center">
                    <span>{original.year}</span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {original.rating}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleEditOriginal(original)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => handleDeleteOriginal(original.id)} variant="destructive" className="w-full">
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
