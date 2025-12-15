"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Play, Clock } from "lucide-react"
import Image from "next/image"
import { database } from "@/lib/firebase"
import { ref, onValue, get, set } from "firebase/database"
import { useAuth } from "@/lib/auth-context"

interface ContinueWatchingItem {
  id: string
  title: string
  image: string
  progress: number
  contentType: string
  contentId: string
  streamlink?: string
  lastWatched: number
}

interface ContinueWatchingProps {
  onPlayVideo: (video: { url: string; title: string; contentId: string; contentType: string }) => void
  onRequireAuth?: () => void
}

export default function ContinueWatching({ onPlayVideo, onRequireAuth }: ContinueWatchingProps) {
  const [items, setItems] = useState<ContinueWatchingItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const continueWatchingRef = ref(database, `continueWatching/${user.uid}`)
    const unsubscribe = onValue(continueWatchingRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const itemsArray = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }))
        itemsArray.sort((a, b) => b.lastWatched - a.lastWatched)
        setItems(itemsArray.slice(0, 3))
      } else {
        setItems([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleWatch = async (item: ContinueWatchingItem) => {
    try {
      const contentRef = ref(
        database,
        `${item.contentType === "series" ? "series" : item.contentType === "original" ? "originals" : "movies"}/${item.contentId}`,
      )
      const snapshot = await get(contentRef)

      if (snapshot.exists()) {
        const content = snapshot.val()
        const videoUrl =
          item.contentType === "series" && content.episodes?.[0]?.streamlink
            ? content.episodes[0].streamlink
            : content.streamlink

        if (videoUrl) {
          onPlayVideo({
            url: videoUrl,
            title: item.title,
            contentId: item.contentId,
            contentType: item.contentType,
          })

          if (user?.uid) {
            await set(ref(database, `continueWatching/${user.uid}/${item.id}`), {
              ...item,
              lastWatched: Date.now(),
            })
          }
        }
      }
    } catch (error) {
      console.error("Error loading video:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex-shrink-0 min-h-[120px] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent rounded-2xl p-4 border border-blue-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-foreground">Continue Watching</h2>
        </div>
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!user || items.length === 0) {
    return (
      <div className="flex-shrink-0 min-h-[120px] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent rounded-2xl p-4 border border-blue-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-foreground">Continue Watching</h2>
        </div>
        <p className="text-xs text-muted-foreground text-center py-6">
          {user ? "Start watching to see your progress here" : "Login to track your watching history"}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 min-h-[120px] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent rounded-2xl p-4 border border-blue-500/10 backdrop-blur-sm hover:border-blue-500/30 transition-all duration-300 shadow-lg shadow-blue-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-bold text-foreground">Continue Watching</h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-blue-500/20 rounded-lg transition">
            <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
          </button>
          <button className="p-1.5 hover:bg-blue-500/20 rounded-lg transition">
            <ChevronRight className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="group relative flex gap-3 bg-background/50 rounded-xl p-2 border border-border/50 hover:border-purple-500/50 hover:bg-background/80 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
              <Image src={item.image || "/placeholder.svg"} alt={item.title} fill className="object-cover" />

              {/* Play Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Progress Bar */}
              {item.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
              <div>
                <h3 className="text-foreground font-semibold text-xs mb-1 line-clamp-2 leading-tight">{item.title}</h3>
                <p className="text-muted-foreground text-[10px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {Math.round(item.progress)}% completed
                </p>
              </div>

              <button
                onClick={() => handleWatch(item)}
                className="mt-2 w-full px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-[10px] font-bold transition-all duration-300 shadow-sm shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/30"
              >
                Continue
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
