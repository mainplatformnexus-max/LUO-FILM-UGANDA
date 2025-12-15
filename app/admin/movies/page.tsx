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
import { Star, Trash2, TrendingUp, Edit } from "lucide-react"

interface Movie {
  id: string
  title: string
  image: string
  rating: number
  year: number
  category: string
  streamlink: string
  isTrending: boolean
}

const CATEGORIES = ["Action", "Romance", "Animation", "Horror", "Special", "Drama", "Comedy", "Nigerian"]

export default function MoviesManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>([])
  const [newMovie, setNewMovie] = useState({
    title: "",
    image: "",
    rating: 7.5,
    year: new Date().getFullYear(),
    category: "Animation",
    streamlink: "",
    isTrending: false,
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadMovies()
    }
  }, [isAdmin])

  const loadMovies = async () => {
    try {
      const moviesRef = dbRef(database, "movies")
      const snapshot = await get(moviesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const moviesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setMovies(moviesList)
      }
    } catch (error) {
      console.error("Error loading movies:", error)
    }
  }

  const handleAddMovie = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMovie.image.trim()) {
      alert("Please enter an image URL")
      return
    }

    if (!newMovie.title.trim()) {
      alert("Please enter a movie title")
      return
    }

    if (!newMovie.streamlink.trim()) {
      alert("Please enter a stream link")
      return
    }

    setUploading(true)
    try {
      const moviesRef = dbRef(database, "movies")
      await push(moviesRef, {
        title: newMovie.title,
        image: newMovie.image,
        rating: Number.parseFloat(newMovie.rating.toString()),
        year: newMovie.year,
        category: newMovie.category,
        streamlink: newMovie.streamlink,
        isTrending: newMovie.isTrending,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Movie added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewMovie({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        streamlink: "",
        isTrending: false,
      })
      loadMovies()
    } catch (error) {
      console.error("Error adding movie:", error)
      alert("Error adding movie. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleToggleTrending = async (id: string, currentStatus: boolean) => {
    try {
      await update(dbRef(database, `movies/${id}`), {
        isTrending: !currentStatus,
      })
      loadMovies()
    } catch (error) {
      console.error("Error updating trending status:", error)
    }
  }

  const handleDeleteMovie = async (id: string) => {
    if (confirm("Are you sure you want to delete this movie?")) {
      try {
        await remove(dbRef(database, `movies/${id}`))
        setSuccessMessage("Movie deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadMovies()
      } catch (error) {
        console.error("Error deleting movie:", error)
      }
    }
  }

  const handleEditMovie = (movie: Movie) => {
    setEditingMovie(movie)
    setNewMovie({
      title: movie.title,
      image: movie.image,
      rating: movie.rating,
      year: movie.year,
      category: movie.category,
      streamlink: movie.streamlink,
      isTrending: movie.isTrending,
    })
  }

  const handleUpdateMovie = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingMovie) return

    if (!newMovie.image.trim() || !newMovie.title.trim() || !newMovie.streamlink.trim()) {
      alert("Please fill in all required fields")
      return
    }

    setUploading(true)
    try {
      await update(dbRef(database, `movies/${editingMovie.id}`), {
        title: newMovie.title,
        image: newMovie.image,
        rating: Number.parseFloat(newMovie.rating.toString()),
        year: newMovie.year,
        category: newMovie.category,
        streamlink: newMovie.streamlink,
        isTrending: newMovie.isTrending,
        updatedAt: new Date().toISOString(),
      })

      setSuccessMessage("Movie updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setEditingMovie(null)
      setNewMovie({
        title: "",
        image: "",
        rating: 7.5,
        year: new Date().getFullYear(),
        category: "Animation",
        streamlink: "",
        isTrending: false,
      })
      loadMovies()
    } catch (error) {
      console.error("Error updating movie:", error)
      alert("Error updating movie. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingMovie(null)
    setNewMovie({
      title: "",
      image: "",
      rating: 7.5,
      year: new Date().getFullYear(),
      category: "Animation",
      streamlink: "",
      isTrending: false,
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
        <h1 className="text-4xl font-bold text-white mb-8">Manage Movies</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">{editingMovie ? "Edit Movie" : "Add New Movie"}</h2>
          <form onSubmit={editingMovie ? handleUpdateMovie : handleAddMovie} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Movie Title *</label>
                <Input
                  value={newMovie.title}
                  onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter movie title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Category *</label>
                <select
                  value={newMovie.category}
                  onChange={(e) => setNewMovie({ ...newMovie, category: e.target.value })}
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
                  value={newMovie.streamlink}
                  onChange={(e) => setNewMovie({ ...newMovie, streamlink: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/stream/movie.mp4"
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
                  value={newMovie.rating}
                  onChange={(e) => setNewMovie({ ...newMovie, rating: Number.parseFloat(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Year</label>
                <Input
                  type="number"
                  value={newMovie.year}
                  onChange={(e) => setNewMovie({ ...newMovie, year: Number.parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Poster Image URL *</label>
                <Input
                  type="url"
                  value={newMovie.image}
                  onChange={(e) => setNewMovie({ ...newMovie, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="trending"
                checked={newMovie.isTrending}
                onChange={(e) => setNewMovie({ ...newMovie, isTrending: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="trending" className="text-white cursor-pointer">
                Mark as Trending
              </label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? (editingMovie ? "Updating..." : "Adding...") : editingMovie ? "Update Movie" : "Add Movie"}
              </Button>
              {editingMovie && (
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
          {movies.map((movie) => (
            <Card
              key={movie.id}
              className="bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden hover:border-white/40 transition"
            >
              <div className="relative h-64 bg-white/5">
                <img src={movie.image || "/placeholder.svg"} alt={movie.title} className="w-full h-full object-cover" />
                {movie.isTrending && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 truncate">{movie.title}</h3>
                <div className="space-y-2 mb-4 text-sm text-white/80">
                  <p>Category: {movie.category}</p>
                  <div className="flex justify-between items-center">
                    <span>{movie.year}</span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {movie.rating}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleEditMovie(movie)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleToggleTrending(movie.id, movie.isTrending)}
                    className={`w-full ${movie.isTrending ? "bg-purple-600 hover:bg-purple-700" : "bg-amber-600 hover:bg-amber-700"} text-white`}
                  >
                    {movie.isTrending ? "Remove Trending" : "Mark Trending"}
                  </Button>
                  <Button onClick={() => handleDeleteMovie(movie.id)} variant="destructive" className="w-full">
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
