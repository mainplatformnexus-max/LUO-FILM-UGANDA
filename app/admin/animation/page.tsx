"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import AdminNav from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { database } from "@/lib/firebase"
import { ref as dbRef, push, get, remove, update } from "firebase/database"
import { Star, Trash2, Edit } from 'lucide-react'

interface Animation {
  id: string
  title: string
  image: string
  rating: number
  year: number
  genre: string
  streamlink: string
  type: string
}

const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi", "Romance", "Thriller"]

export default function AnimationManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [animations, setAnimations] = useState<Animation[]>([])
  const [newAnimation, setNewAnimation] = useState({
    title: "",
    image: "",
    rating: 7.5,
    year: new Date().getFullYear(),
    genre: "Action",
    streamlink: "",
    type: "anime",
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingAnimation, setEditingAnimation] = useState<Animation | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadAnimations()
    }
  }, [isAdmin])

  const loadAnimations = async () => {
    try {
      const moviesRef = dbRef(database, "movies")
      const snapshot = await get(moviesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const animationsList = Object.entries(data)
          .map(([id, value]: any) => ({
            id,
            ...value,
          }))
          .filter((item: any) => item.category?.toLowerCase() === 'animation')
        setAnimations(animationsList)
      }
    } catch (error) {
      console.error("Error loading animations:", error)
    }
  }

  const handleAddAnimation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newAnimation.image.trim() || !newAnimation.title.trim() || !newAnimation.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      const moviesRef = dbRef(database, "movies")
      await push(moviesRef, {
        title: newAnimation.title,
        image: newAnimation.image,
        rating: Number.parseFloat(newAnimation.rating.toString()),
        year: newAnimation.year,
        category: "Animation",
        genre: newAnimation.genre,
        streamlink: newAnimation.streamlink,
        type: newAnimation.type,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Animation added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewAnimation({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        genre: "Action",
        streamlink: "",
        type: "anime",
      })
      loadAnimations()
    } catch (error) {
      console.error("Error adding animation:", error)
      alert("Error adding animation. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleEditAnimation = (animation: Animation) => {
    setEditingAnimation(animation)
    setNewAnimation({
      title: animation.title,
      image: animation.image,
      rating: animation.rating,
      year: animation.year,
      genre: animation.genre,
      streamlink: animation.streamlink,
      type: animation.type,
    })
  }

  const handleUpdateAnimation = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingAnimation) return

    if (!newAnimation.image.trim() || !newAnimation.title.trim() || !newAnimation.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      await update(dbRef(database, `movies/${editingAnimation.id}`), {
        title: newAnimation.title,
        image: newAnimation.image,
        rating: Number.parseFloat(newAnimation.rating.toString()),
        year: newAnimation.year,
        category: "Animation",
        genre: newAnimation.genre,
        streamlink: newAnimation.streamlink,
        type: newAnimation.type,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Animation updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingAnimation(null)
      setNewAnimation({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        genre: "Action",
        streamlink: "",
        type: "anime",
      })
      loadAnimations()
    } catch (error) {
      console.error("Error updating animation:", error)
      alert("Error updating animation. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingAnimation(null)
    setNewAnimation({
      title: "",
      image: "",
      rating: 7.5,
      year: new Date().getFullYear(),
      genre: "Action",
      streamlink: "",
      type: "anime",
    })
  }

  const handleDeleteAnimation = async (id: string) => {
    if (confirm("Are you sure you want to delete this animation?")) {
      try {
        await remove(dbRef(database, `movies/${id}`))
        setSuccessMessage("Animation deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadAnimations()
      } catch (error) {
        console.error("Error deleting animation:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <Sidebar onFilterChange={() => {}} activeFilter="settings" />

      <div className="flex-1 ml-48 flex flex-col h-screen overflow-hidden">
        <TopHeader />
        <AdminNav />

        <main className="flex-1 pt-24 overflow-y-auto p-6">
          <h1 className="text-4xl font-bold text-foreground mb-8">Manage Animations</h1>

          {successMessage && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
              {successMessage}
            </div>
          )}

          <Card className="bg-card border-border p-6 mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {editingAnimation ? "Edit Animation" : "Add New Animation"}
            </h2>
            <form onSubmit={editingAnimation ? handleUpdateAnimation : handleAddAnimation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                  <Input
                    value={newAnimation.title}
                    onChange={(e) => setNewAnimation({ ...newAnimation, title: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="Enter animation title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Genre *</label>
                  <select
                    value={newAnimation.genre}
                    onChange={(e) => setNewAnimation({ ...newAnimation, genre: e.target.value })}
                    className="w-full bg-background border border-border text-foreground rounded px-3 py-2"
                    required
                  >
                    {GENRES.map((genre) => (
                      <option key={genre} value={genre}>
                        {genre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Stream Link *</label>
                  <Input
                    type="url"
                    value={newAnimation.streamlink}
                    onChange={(e) => setNewAnimation({ ...newAnimation, streamlink: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="https://example.com/stream/anime.mp4"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Rating (0-10)</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={newAnimation.rating}
                    onChange={(e) => setNewAnimation({ ...newAnimation, rating: Number.parseFloat(e.target.value) })}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Year</label>
                  <Input
                    type="number"
                    value={newAnimation.year}
                    onChange={(e) => setNewAnimation({ ...newAnimation, year: Number.parseInt(e.target.value) })}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Poster Image URL *</label>
                  <Input
                    type="url"
                    value={newAnimation.image}
                    onChange={(e) => setNewAnimation({ ...newAnimation, image: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="https://example.com/image.jpg"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {uploading
                    ? editingAnimation
                      ? "Updating..."
                      : "Adding..."
                    : editingAnimation
                      ? "Update Animation"
                      : "Add Animation"}
                </Button>
                {editingAnimation && (
                  <Button
                    type="button"
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="border-border"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {animations.map((animation) => (
              <Card
                key={animation.id}
                className="bg-card border-border overflow-hidden hover:border-[#e50914] transition"
              >
                <div className="relative h-64 bg-muted">
                  <img
                    src={animation.image || "/placeholder.svg"}
                    alt={animation.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-foreground mb-2 truncate">{animation.title}</h3>
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <p>Genre: {animation.genre}</p>
                    <div className="flex justify-between items-center">
                      <span>{animation.year}</span>
                      <span className="text-yellow-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400" />
                        {animation.rating}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleEditAnimation(animation)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={() => handleDeleteAnimation(animation.id)} variant="destructive" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
