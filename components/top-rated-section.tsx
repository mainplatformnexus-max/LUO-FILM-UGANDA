"use client"

import { ChevronRight, Plus, Star } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"

interface ContentItem {
  id: string
  title: string
  rating?: number
  image: string
  type: string
  streamlink: string
  genre?: string
  episodes?: any[]
}

interface TopRatedSectionProps {
  onPlayVideo?: (video: { url: string; title: string; contentId: string; contentType: string }) => void
  onRequireAuth?: () => void
}

export default function TopRatedSection({ onPlayVideo, onRequireAuth }: TopRatedSectionProps) {
  const [topRatedItems, setTopRatedItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user, isAdmin } = useAuth()
  const { hasActiveSubscription } = useSubscription()

  useEffect(() => {
    const fetchTopRated = async () => {
      try {
        const [moviesSnap, seriesSnap, originalsSnap] = await Promise.all([
          get(ref(database, "movies")),
          get(ref(database, "series")),
          get(ref(database, "originals")),
        ])

        const allContent: ContentItem[] = []

        if (moviesSnap.exists()) {
          Object.entries(moviesSnap.val()).forEach(([id, data]: [string, any]) => {
            allContent.push({ id, ...data, type: "movie" })
          })
        }

        if (seriesSnap.exists()) {
          Object.entries(seriesSnap.val()).forEach(([id, data]: [string, any]) => {
            allContent.push({ id, ...data, type: "series" })
          })
        }

        if (originalsSnap.exists()) {
          Object.entries(originalsSnap.val()).forEach(([id, data]: [string, any]) => {
            allContent.push({ id, ...data, type: "original" })
          })
        }

        const sorted = allContent
          .filter((item) => item.rating && item.rating > 0)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 2)

        setTopRatedItems(sorted)
      } catch (error) {
        console.error("Error fetching top rated:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopRated()
  }, [])

  const handleWatch = (item: ContentItem) => {
    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onRequireAuth?.()
      return
    }

    if (onPlayVideo) {
      const videoUrl =
        item.type === "series" && item.episodes?.[0]?.streamlink ? item.episodes[0].streamlink : item.streamlink

      onPlayVideo({
        url: videoUrl,
        title: item.title,
        contentId: item.id,
        contentType: item.type,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-shrink-0 min-h-[140px] bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent rounded-2xl p-4 border border-red-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold text-foreground">Top Rated</h2>
        </div>
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 min-h-[140px] bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent rounded-2xl p-4 border border-red-500/10 backdrop-blur-sm hover:border-red-500/30 transition-all duration-300 shadow-lg shadow-red-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-red-500 fill-red-500" />
          <h2 className="text-sm font-bold text-foreground">Top Rated</h2>
        </div>
        <button className="text-muted-foreground hover:text-red-400 text-[10px] transition flex items-center gap-0.5 font-medium">
          See More
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-3">
        {topRatedItems.map((item, index) => (
          <div
            key={item.id}
            className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-border/30 hover:border-red-500/50"
          >
            <div className="relative h-24 w-full">
              <Image src={item.image || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

              <div className="absolute top-2 left-2 w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">#{index + 1}</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-white font-bold text-xs mb-1.5 line-clamp-1">{item.title}</h3>
              <div className="flex items-center justify-between text-[9px] text-gray-300 mb-2">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-yellow-400">{item.rating?.toFixed(1)}</span>
                </span>
                <span className="bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px]">
                  {item.genre || item.type}
                </span>
              </div>

              <div className="flex gap-1.5">
                <button className="flex-shrink-0 w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/10">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
                <button
                  onClick={() => handleWatch(item)}
                  className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-[9px] font-bold transition-all duration-300 shadow-md shadow-purple-600/30 hover:shadow-lg hover:shadow-purple-600/50"
                >
                  Watch Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
