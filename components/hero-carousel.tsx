"use client"

import { useEffect, useState, useRef } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue, get, set } from "firebase/database"
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"
import NexPlayer from "./nex-player"
import { requestSecureDownload } from "@/lib/download-utils"
import { useRouter } from "next/navigation"

interface CarouselItem {
  id: string
  title: string
  subtitle?: string
  image: string
  contentType?: string
  contentId?: string
  createdAt?: string
}

interface HeroCarouselProps {
  playingVideo: { url: string; title: string; contentId: string; contentType: string } | null
  onPlayVideo: (video: { url: string; title: string; contentId: string; contentType: string } | null) => void
  onShowSubscription: () => void
  onRequireAuth?: () => void
}

const convertToEmbedUrl = (url: string): string => {
  // Google Drive: https://drive.google.com/file/d/FILE_ID/view -> https://drive.google.com/file/d/FILE_ID/preview
  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
    if (fileIdMatch) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
    }
  }

  // YouTube: convert watch URLs to embed
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

  // Return original URL if no conversion needed
  return url
}

export default function HeroCarousel({
  playingVideo,
  onPlayVideo,
  onShowSubscription,
  onRequireAuth,
}: HeroCarouselProps) {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user, isAdmin } = useAuth()
  const { hasActiveSubscription } = useSubscription()
  const carouselRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const dbRef = ref(database, "carousel")

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }))
        items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        setCarouselItems(items)
      } else {
        setCarouselItems([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (carouselItems.length > 1 && !playingVideo) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [carouselItems.length, playingVideo])

  useEffect(() => {
    if (playingVideo && carouselRef.current) {
      carouselRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [playingVideo])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1))
  }

  const handleWatchNow = async () => {
    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription()
      return
    }

    const item = carouselItems[currentIndex]
    if (item?.contentId) {
      try {
        const type = item.contentType || "movie"
        const dbPath = `${type === "series" ? "series" : type === "original" ? "originals" : "movies"}/${item.contentId}`

        const snapshot = await get(ref(database, dbPath))
        if (snapshot.exists()) {
          const content = snapshot.val()
          const videoUrl =
            type === "series" && content.episodes?.[0]?.streamlink ? content.episodes[0].streamlink : content.streamlink

          if (videoUrl) {
            onPlayVideo({
              url: convertToEmbedUrl(videoUrl),
              title: item.title,
              contentId: item.contentId,
              contentType: type,
            })

            if (user?.uid) {
              try {
                await set(ref(database, `users/${user.uid}/continueWatching/${item.contentId}`), {
                  id: item.contentId,
                  title: item.title,
                  image: item.image,
                  progress: 0,
                  contentType: type,
                  contentId: item.contentId,
                  streamlink: videoUrl,
                  lastWatched: Date.now(),
                })
              } catch (error) {
                console.error("Error saving to watch history:", error)
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading video:", error)
      }
    }
  }

  const handleDownload = async () => {
    if (!playingVideo) {
      console.log("[v0] Cannot download - no video is currently playing")
      return
    }

    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription()
      return
    }

    if (!playingVideo.url || !playingVideo.contentId) {
      console.log("[v0] Missing video data for download")
      return
    }

    try {
      setIsDownloading(true)
      console.log("[v0] Starting secure download from carousel...")

      const result = await requestSecureDownload(
        user.uid,
        playingVideo.contentId,
        playingVideo.contentType || "movie",
        playingVideo.url,
        playingVideo.title,
      )

      if (!result.success) {
        if (result.error === "subscription_expired") {
          console.log("[v0] Subscription expired, showing modal")
          setShowSubscriptionExpired(true)
        } else {
          console.error("[v0] Download failed:", result.error)
        }
      } else {
        console.log("[v0] Download started successfully")
      }
    } catch (error) {
      console.error("[v0] Download error:", error)
    } finally {
      setTimeout(() => setIsDownloading(false), 1000)
    }
  }

  const handlePosterClick = async () => {
    if (!user) {
      onRequireAuth?.()
      return
    }

    if (!hasActiveSubscription && !isAdmin) {
      onShowSubscription()
      return
    }

    await handleWatchNow()
  }

  if (loading || carouselItems.length === 0) {
    return (
      <div className="relative h-[280px] bg-[#1f2230] rounded-lg flex items-center justify-center">
        <p className="text-[#6b7280]">Loading...</p>
      </div>
    )
  }

  const currentItem = carouselItems[currentIndex]

  if (playingVideo) {
    const isDirectVideo =
      playingVideo.url.endsWith(".mp4") ||
      playingVideo.url.endsWith(".webm") ||
      playingVideo.url.endsWith(".ogg") ||
      playingVideo.url.includes("twakpatt")

    return (
      <div ref={carouselRef} className="relative h-[280px] rounded-lg overflow-hidden bg-black">
        {showSubscriptionExpired && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md mx-4 text-center">
              <h2 className="text-xl font-bold text-white mb-3">Subscription Expired</h2>
              <p className="text-slate-300 mb-6">
                Your subscription has expired. Subscribe to continue downloading content.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubscriptionExpired(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => router.push("/subscribe")}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-semibold transition"
                >
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>
        )}

        {isDirectVideo ? (
          <NexPlayer
            src={playingVideo.url}
            title={playingVideo.title}
            onClose={() => onPlayVideo(null)}
            onDownload={handleDownload}
          />
        ) : (
          <>
            <iframe
              key={playingVideo.url}
              src={playingVideo.url}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <button
              onClick={() => onPlayVideo(null)}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/80 to-purple-600/80 hover:from-blue-600/90 hover:to-purple-700/90 flex items-center justify-center transition z-10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="absolute top-2 left-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center gap-1.5 transition z-10 disabled:opacity-50"
              title="Download"
            >
              <Download className={`w-3.5 h-3.5 md:w-4 md:h-4 text-white ${isDownloading ? "animate-bounce" : ""}`} />
              <span className="text-white text-[10px] md:text-xs font-semibold">
                {isDownloading ? "..." : "Download"}
              </span>
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      ref={carouselRef}
      className="relative h-[280px] rounded-lg overflow-hidden group cursor-pointer"
      onClick={handlePosterClick}
    >
      {/* Background Image */}
      <img
        src={currentItem.image || "/placeholder.svg"}
        alt={currentItem.title}
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ objectFit: "cover" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-blue-900/40 to-transparent" />

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handlePrev()
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/60 to-purple-600/60 hover:from-blue-500/80 hover:to-purple-600/80 flex items-center justify-center transition z-10"
      >
        <ChevronLeft className="w-4 h-4 text-white" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleNext()
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/60 to-purple-600/60 hover:from-blue-500/80 hover:to-purple-600/80 flex items-center justify-center transition z-10"
      >
        <ChevronRight className="w-4 h-4 text-white" />
      </button>

      {/* Content */}
      <div className="absolute left-3 md:left-6 bottom-3 md:bottom-6 max-w-xl z-10">
        <h1 className="text-lg md:text-3xl font-bold text-white mb-1 md:mb-2">{currentItem.title}</h1>
        {currentItem.subtitle && (
          <p className="text-xs md:text-sm text-white/90 mb-2 md:mb-3 line-clamp-2">{currentItem.subtitle}</p>
        )}
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleWatchNow()
            }}
            className="px-3 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white text-xs md:text-sm font-bold transition"
          >
            Watch Now
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
        {carouselItems.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              setCurrentIndex(index)
            }}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex ? "w-4 bg-gradient-to-r from-blue-400 to-purple-500" : "w-1 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
