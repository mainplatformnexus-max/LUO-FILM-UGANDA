"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, get } from "firebase/database"
import { Check, X, Play } from "lucide-react"
import Image from "next/image"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-context"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"

interface Episode {
  episodeNumber: number
  title: string
  streamlink: string
}

interface Movie {
  id: string
  title: string
  year: number
  rating: number
  image: string
  category?: string
  type?: string
  isTrending?: boolean
  createdAt?: string
  streamlink?: string
  genre?: string
  episodes?: Episode[]
}

interface PopularGridProps {
  activeFilter?: string
  searchQuery?: string
  onPlayVideo: (video: { url: string; title: string; contentId: string; contentType: string }) => void
  onShowSubscription: () => void
  onRequireAuth?: () => void
}

const convertToEmbedUrl = (url: string): string => {
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
    }
  }

  if (url.includes("youtube.com/watch")) {
    const videoIdMatch = url.match(/[?&]v=([^&]+)/)
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`
    }
  }

  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0]
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`
    }
  }

  return url
}

export default function PopularGrid({
  activeFilter = "home",
  searchQuery = "",
  onPlayVideo,
  onShowSubscription,
  onRequireAuth,
}: PopularGridProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeries, setSelectedSeries] = useState<Movie | null>(null)
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const { hasActiveSubscription } = useSubscription()

  useEffect(() => {
    setSelectedSeries(null)
  }, [activeFilter, searchQuery])

  useEffect(() => {
    const fetchContent = () => {
      setLoading(true)

      if (activeFilter === "search" && searchQuery) {
        const searchContent = async () => {
          try {
            const [moviesSnap, seriesSnap, originalsSnap, animationSnap, musicSnap] = await Promise.all([
              get(ref(database, "movies")),
              get(ref(database, "series")),
              get(ref(database, "originals")),
              get(ref(database, "animation")),
              get(ref(database, "music")),
            ])

            const allContent: Movie[] = []
            const searchLower = searchQuery.toLowerCase()

            const searchInPath = (snap: any, type: string) => {
              if (snap.exists()) {
                Object.entries(snap.val()).forEach(([id, data]: [string, any]) => {
                  if (
                    data.title?.toLowerCase().includes(searchLower) ||
                    data.genre?.toLowerCase().includes(searchLower) ||
                    data.category?.toLowerCase().includes(searchLower)
                  ) {
                    allContent.push({
                      id,
                      ...data,
                      type: type,
                    })
                  }
                })
              }
            }

            searchInPath(moviesSnap, "movie")
            searchInPath(seriesSnap, "series")
            searchInPath(originalsSnap, "original")
            searchInPath(animationSnap, "animation")
            searchInPath(musicSnap, "music")

            setMovies(allContent)
            setLoading(false)
          } catch (error) {
            console.error("Error searching:", error)
            setLoading(false)
          }
        }

        searchContent()
        return
      }

      let paths: string[] = []
      if (activeFilter === "movies") {
        paths = ["movies"]
      } else if (activeFilter === "series") {
        paths = ["series"]
      } else if (activeFilter === "anime") {
        paths = ["movies"]
      } else if (activeFilter === "home" || activeFilter === "top-rated") {
        paths = ["movies", "series", "originals"]
      } else {
        paths = ["movies", "series", "originals"]
      }

      const unsubscribes: (() => void)[] = []
      const allContent: Movie[] = []
      const addedIds = new Set<string>()
      let pathsLoaded = 0
      const totalPaths = paths.length

      const processAndSetContent = () => {
        pathsLoaded++
        if (pathsLoaded === totalPaths) {
          let filteredContent = allContent

          if (activeFilter === "anime") {
            filteredContent = filteredContent.filter((item) => item.category?.toLowerCase() === "animation")
          } else if (activeFilter === "nigerian") {
            filteredContent = filteredContent.filter((item) => item.category?.toLowerCase() === "nigerian")
          } else if (activeFilter === "music") {
            filteredContent = filteredContent.filter((item) => item.category?.toLowerCase() === "music")
          } else if (activeFilter === "top-rated") {
            filteredContent = filteredContent.filter((item) => item.rating >= 4)
          }

          filteredContent.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateB - dateA
          })

          setMovies(filteredContent)
          setLoading(false)
        }
      }

      paths.forEach((path) => {
        const dbRef = ref(database, path)
        const unsubscribe = onValue(dbRef, (snapshot) => {
          const data = snapshot.val()
          if (data) {
            Object.entries(data).forEach(([key, value]: [string, any]) => {
              if (!addedIds.has(key)) {
                allContent.push({
                  id: key,
                  type: path === "movies" ? "movie" : path === "series" ? "series" : "original",
                  ...value,
                })
                addedIds.add(key)
              }
            })
          }
          processAndSetContent()
        })
        unsubscribes.push(unsubscribe)
      })

      return () => unsubscribes.forEach((unsub) => unsub())
    }

    const unsubscribe = fetchContent()
    return unsubscribe
  }, [activeFilter, searchQuery])

  const handlePosterClick = (movie: Movie, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (movie.type === "series" && movie.episodes && movie.episodes.length > 0) {
      setSelectedSeries(movie)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      handleWatch(movie, e)
    }
  }

  const handleWatch = (movie: Movie, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription()
      return
    }

    const videoUrl = movie.streamlink || ""
    if (videoUrl) {
      onPlayVideo({
        url: convertToEmbedUrl(videoUrl),
        title: movie.title,
        contentId: movie.id,
        contentType: movie.type || "movie",
      })

      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleEpisodeClick = (episode: Episode) => {
    if (!selectedSeries) return

    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription()
      return
    }

    onPlayVideo({
      url: convertToEmbedUrl(episode.streamlink),
      title: `${selectedSeries.title} - Episode ${episode.episodeNumber}`,
      contentId: selectedSeries.id,
      contentType: "series",
    })

    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (activeFilter === "settings") {
    return (
      <div className="mb-4">
        <h2 className="text-sm font-bold text-foreground mb-3">Settings</h2>
        <div className="bg-card rounded-lg p-4">
          <p className="text-foreground text-xs">Settings panel coming soon...</p>
        </div>
      </div>
    )
  }

  if (activeFilter === "subscription") {
    return (
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isPopular = plan.id === "1week"

            return (
              <div
                key={plan.id}
                className={`relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 bg-card ${
                  isPopular
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/20"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    Popular
                  </div>
                )}

                <div className="text-center mb-3">
                  <h3 className="text-base font-bold text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-xs text-muted-foreground">UGX</span>
                    <span className="text-xl font-bold text-[#e50914]">{plan.price.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs mb-4">
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Unlimited streaming</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Download movies</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>HD quality</span>
                  </div>
                </div>

                <button
                  onClick={onShowSubscription}
                  className="w-full py-2 bg-gradient-to-r from-blue-600 to-purple-700 hover:bg-gradient-to-r hover:from-blue-700 hover:to-purple-800 rounded-lg text-white text-xs font-bold transition"
                >
                  Subscribe
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const getTitle = () => {
    if (activeFilter === "search") return `Search Results for "${searchQuery}"`
    if (activeFilter === "movies") return "Movies"
    if (activeFilter === "series") return "Series"
    if (activeFilter === "anime") return "Anime"
    if (activeFilter === "nigerian") return "Nigerian Content"
    if (activeFilter === "music") return "Music"
    if (activeFilter === "top-rated") return "Top Rated"
    return "Popular on LUO FILM"
  }

  if (selectedSeries) {
    return (
      <div className="mb-4 md:mb-4 pb-16 md:pb-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs md:text-sm font-bold text-foreground">{selectedSeries.title}</h2>
            <p className="text-[8px] md:text-[10px] text-muted-foreground">
              {selectedSeries.episodes?.length} Episodes
            </p>
          </div>
          <button
            onClick={() => setSelectedSeries(null)}
            className="p-1 md:p-1.5 bg-muted hover:bg-muted/80 rounded-lg transition flex items-center gap-1"
          >
            <X className="w-3 h-3 md:w-4 md:h-4 text-foreground" />
            <span className="text-[8px] md:text-[10px] text-foreground">Close</span>
          </button>
        </div>

        {/* Episode Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 md:gap-3">
          {selectedSeries.episodes?.map((episode) => (
            <button
              key={episode.episodeNumber}
              onClick={() => handleEpisodeClick(episode)}
              className="group relative aspect-square bg-card rounded overflow-hidden border border-border hover:border-primary transition-all hover:scale-105"
            >
              {/* Episode Number */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 group-hover:from-primary/30 group-hover:to-accent/30 transition">
                <div className="w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-primary/90 flex items-center justify-center mb-0.5 md:mb-1 group-hover:scale-110 transition">
                  <Play className="w-2.5 h-2.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary-foreground fill-primary-foreground" />
                </div>
                <span className="text-[8px] md:text-[10px] lg:text-xs font-bold text-foreground">
                  EP {episode.episodeNumber}
                </span>
              </div>

              {/* Episode Title on Hover */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-0.5 md:p-1">
                <p className="text-white text-[7px] md:text-[9px] lg:text-[10px] text-center line-clamp-3 font-medium">
                  {episode.title}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 md:mb-4 pb-16 md:pb-0">
      <h2 className="text-xs md:text-sm font-bold text-foreground mb-2 md:mb-3">{getTitle()}</h2>
      {movies.length === 0 ? (
        <div className="text-muted-foreground text-[9px] md:text-xs">No content found for this category.</div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-4">
          {movies.map((movie) => (
            <div key={movie.id} className="cursor-pointer flex flex-col items-center">
              <div
                onClick={(e) => handlePosterClick(movie, e)}
                className="group relative bg-card w-full hover:scale-105 transition-transform duration-200 border border-border/50"
              >
                <div className="relative w-full" style={{ aspectRatio: "2/3" }}>
                  <Image src={movie.image || "/placeholder.svg"} alt={movie.title} fill className="object-cover" />
                </div>
              </div>
              <h3 className="mt-2 text-foreground text-[9px] md:text-xs font-medium text-center line-clamp-2 leading-tight w-full px-1">
                {movie.title}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
