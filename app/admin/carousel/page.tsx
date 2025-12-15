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

interface CarouselItem {
  id: string
  title: string
  subtitle: string
  image: string
  contentType?: string
  contentId?: string
}

interface Content {
  id: string
  title: string
}

export default function CarouselManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<CarouselItem[]>([])
  const [movies, setMovies] = useState<Content[]>([])
  const [series, setSeries] = useState<Content[]>([])
  const [newItem, setNewItem] = useState({
    title: "",
    subtitle: "",
    image: "",
    contentType: "",
    contentId: "",
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
      loadCarousel()
      loadMovies()
      loadSeries()
    }
  }, [isAdmin])

  const loadCarousel = async () => {
    try {
      const carouselRef = dbRef(database, "carousel")
      const snapshot = await get(carouselRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const itemsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setItems(itemsList)
      }
    } catch (error) {
      console.error("Error loading carousel:", error)
    }
  }

  const loadMovies = async () => {
    try {
      const moviesRef = dbRef(database, "movies")
      const snapshot = await get(moviesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const moviesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          title: value.title,
        }))
        setMovies(moviesList)
      }
    } catch (error) {
      console.error("Error loading movies:", error)
    }
  }

  const loadSeries = async () => {
    try {
      const seriesRef = dbRef(database, "series")
      const snapshot = await get(seriesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const seriesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          title: value.title,
        }))
        setSeries(seriesList)
      }
    } catch (error) {
      console.error("Error loading series:", error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newItem.image.trim()) {
      alert("Please enter an image URL")
      return
    }

    if (!newItem.title.trim()) {
      alert("Please enter a title")
      return
    }

    if (newItem.contentType && !newItem.contentId) {
      alert("Please select a content item to link")
      return
    }

    setUploading(true)
    try {
      const carouselRef = dbRef(database, "carousel")
      await push(carouselRef, {
        title: newItem.title,
        subtitle: newItem.subtitle,
        image: newItem.image,
        contentType: newItem.contentType || null,
        contentId: newItem.contentId || null,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Carousel item added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewItem({
        title: "",
        subtitle: "",
        image: "",
        contentType: "",
        contentId: "",
      })
      loadCarousel()
    } catch (error) {
      console.error("Error adding carousel item:", error)
      alert("Error adding carousel item")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to delete this carousel item?")) {
      try {
        await remove(dbRef(database, `carousel/${id}`))
        setSuccessMessage("Carousel item deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadCarousel()
      } catch (error) {
        console.error("Error deleting item:", error)
      }
    }
  }

  const getAvailableContent = () => {
    if (newItem.contentType === "movie") return movies
    if (newItem.contentType === "series") return series
    return []
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
        <h1 className="text-4xl font-bold text-white mb-8">Manage Carousel</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Add Carousel Item</h2>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title *</label>
                <Input
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Subtitle</label>
                <Input
                  value={newItem.subtitle}
                  onChange={(e) => setNewItem({ ...newItem, subtitle: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter subtitle"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Banner Image URL *</label>
                <Input
                  type="url"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Link to Content (Optional)</label>
                <select
                  value={newItem.contentType}
                  onChange={(e) => setNewItem({ ...newItem, contentType: e.target.value, contentId: "" })}
                  className="w-full bg-white/10 border border-white/20 text-white rounded px-3 py-2"
                >
                  <option value="" className="bg-slate-900">
                    No Link
                  </option>
                  <option value="movie" className="bg-slate-900">
                    Movie
                  </option>
                  <option value="series" className="bg-slate-900">
                    Series
                  </option>
                </select>
              </div>

              {newItem.contentType && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Select {newItem.contentType === "movie" ? "Movie" : "Series"} *
                  </label>
                  <select
                    value={newItem.contentId}
                    onChange={(e) => setNewItem({ ...newItem, contentId: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 text-white rounded px-3 py-2"
                    required
                  >
                    <option value="" className="bg-slate-900">
                      Select...
                    </option>
                    {getAvailableContent().map((content) => (
                      <option key={content.id} value={content.id} className="bg-slate-900">
                        {content.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {uploading ? "Adding..." : "Add Item"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {items.map((item) => (
            <Card
              key={item.id}
              className="bg-white/10 backdrop-blur-md border border-white/20 p-4 hover:border-white/40 transition"
            >
              <div className="flex gap-4">
                <div className="w-32 h-32 bg-white/5 rounded overflow-hidden flex-shrink-0">
                  <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                  <p className="text-white/70 mb-2">{item.subtitle}</p>
                  {item.contentType && item.contentId && (
                    <p className="text-cyan-400 text-sm mb-2">
                      Linked to: {item.contentType === "movie" ? "Movie" : "Series"}
                    </p>
                  )}
                  <Button onClick={() => handleDeleteItem(item.id)} variant="destructive">
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
