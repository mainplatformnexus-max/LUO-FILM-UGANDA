"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import { X, Sparkles } from "lucide-react"
import Image from "next/image"

interface ContentItem {
  id: string
  title: string
  image: string
  type: string
  createdAt?: string
}

interface CarouselItem {
  id: string
  title: string
  image: string
  createdAt?: string
}

interface WelcomeBannerProps {
  onMovieClick?: (movieId: string, movieType: string) => void
}

const WELCOME_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 hours
const AUTO_CLOSE_TIME = 5000 // 5 seconds

export default function WelcomeBanner({ onMovieClick }: WelcomeBannerProps = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const [latestContent, setLatestContent] = useState<ContentItem[]>([])
  const [latestCarouselImage, setLatestCarouselImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<ContentItem | null>(null)

  useEffect(() => {
    const welcomeDismissedAt = localStorage.getItem("vjpiles_welcome_dismissed_at")

    if (welcomeDismissedAt) {
      const dismissedTime = Number.parseInt(welcomeDismissedAt, 10)
      const currentTime = Date.now()

      if (currentTime - dismissedTime >= WELCOME_EXPIRY_TIME) {
        localStorage.removeItem("vjpiles_welcome_dismissed_at")
        setIsVisible(true)
        fetchLatestContent()
      } else {
        setLoading(false)
      }
    } else {
      setIsVisible(true)
      fetchLatestContent()
    }
  }, [])

  useEffect(() => {
    if (isVisible && !loading) {
      const timer = setTimeout(() => {
        handleClose()
      }, AUTO_CLOSE_TIME)

      return () => clearTimeout(timer)
    }
  }, [isVisible, loading])

  const fetchLatestContent = async () => {
    try {
      const [moviesSnap, seriesSnap, originalsSnap, carouselSnap] = await Promise.all([
        get(ref(database, "movies")),
        get(ref(database, "series")),
        get(ref(database, "originals")),
        get(ref(database, "carousel")),
      ])

      const carouselItems: CarouselItem[] = []
      if (carouselSnap.exists()) {
        Object.entries(carouselSnap.val()).forEach(([id, data]: [string, any]) => {
          carouselItems.push({
            id,
            title: data.title,
            image: data.image,
            createdAt: data.createdAt,
          })
        })
      }

      carouselItems.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
      if (carouselItems.length > 0) {
        setLatestCarouselImage(carouselItems[0].image)
      }

      const allContent: ContentItem[] = []

      const processSnapshot = (snap: any, type: string) => {
        if (snap.exists()) {
          Object.entries(snap.val()).forEach(([id, data]: [string, any]) => {
            allContent.push({
              id,
              title: data.title,
              image: data.image,
              type,
              createdAt: data.createdAt,
            })
          })
        }
      }

      processSnapshot(moviesSnap, "Movies")
      processSnapshot(seriesSnap, "Series")
      processSnapshot(originalsSnap, "Originals")

      allContent.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setLatestContent(allContent.slice(0, 5))
    } catch (error) {
      console.error("Error fetching latest content:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    localStorage.setItem("vjpiles_welcome_dismissed_at", Date.now().toString())
  }

  const handleMovieClick = (movie: ContentItem) => {
    const subscription = localStorage.getItem("vjpiles_subscription_status")

    if (subscription === "active") {
      if (onMovieClick) {
        onMovieClick(movie.id, movie.type.toLowerCase())
      }
      handleClose()
    } else {
      setSelectedMovie(movie)
      setShowSubscriptionModal(true)
    }
  }

  if (!isVisible || loading) {
    return null
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
        <div className="relative w-full max-w-3xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-700 border border-white/10">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 group"
          >
            <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>

          <div className="absolute inset-0">
            {latestCarouselImage ? (
              <Image
                src={latestCarouselImage || "/placeholder.svg"}
                alt="Featured content"
                fill
                className="object-cover object-top scale-105 animate-in zoom-in duration-1000"
                priority
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 animate-shimmer" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-transparent to-transparent" />
          </div>

          <div className="relative h-full flex flex-col justify-end z-10 p-6 md:p-8">
            <div className="mb-auto pt-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-full border border-white/20 mb-3 animate-in slide-in-from-top duration-700">
                <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
                <span
                  className="text-white/90 text-[10px] md:text-xs font-medium tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  What's New
                </span>
              </div>

              <h1
                className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight animate-in slide-in-from-left duration-700 delay-100"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
              >
                Welcome to
                <br />
                <span className="bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
                  LUO FILM
                </span>
              </h1>

              <p
                className="text-white/70 text-xs md:text-sm font-normal leading-relaxed mb-4 max-w-md animate-in slide-in-from-left duration-700 delay-200"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Discover unlimited entertainment with the latest movies, series, and exclusive originals. Start
                streaming now.
              </p>

              <button
                onClick={handleClose}
                className="px-5 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white font-semibold text-xs md:text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/50 animate-in slide-in-from-left duration-700 delay-300"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start Watching Now
              </button>
            </div>

            <div className="w-full">
              <div className="flex items-end justify-center gap-2 md:gap-3 mb-4">
                {latestContent.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleMovieClick(item)}
                    className="relative flex flex-col items-center group animate-in zoom-in duration-500 cursor-pointer"
                    style={{
                      transform: `perspective(1000px) rotateY(${-5 + index * 2.5}deg)`,
                      zIndex: latestContent.length - index,
                      animationDelay: `${400 + index * 100}ms`,
                    }}
                  >
                    <div
                      className="relative rounded-lg overflow-hidden shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-2 border border-white/20 group-hover:border-purple-500/50"
                      style={{
                        width: "clamp(50px, 12vw, 100px)",
                        height: "clamp(75px, 18vw, 150px)",
                      }}
                    >
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/20 transition-colors duration-300" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-8 h-8 rounded-full bg-purple-600/90 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 2v12l10-6L3 2z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 px-2 py-1 bg-white/10 backdrop-blur-md rounded-full text-[7px] md:text-[9px] text-white font-bold uppercase tracking-wider border border-white/20">
                      {item.type}
                    </div>

                    <p className="mt-1 text-[8px] md:text-[10px] text-white/80 text-center max-w-[60px] md:max-w-[90px] line-clamp-1 font-medium">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p
                className="text-white/40 text-[8px] md:text-[10px] font-medium"
                style={{ fontFamily: "var(--font-display)" }}
              >
                © 2025 LUO FILM. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showSubscriptionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-lg p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Subscription Required
              </h3>
              <p className="text-white/70 text-sm" style={{ fontFamily: "var(--font-display)" }}>
                Subscribe now to watch {selectedMovie?.title} and unlock unlimited entertainment
              </p>
            </div>

            <button
              onClick={() => {
                setShowSubscriptionModal(false)
                handleClose()
                const subscribeBtn = document.querySelector("[data-subscribe-trigger]") as HTMLButtonElement
                if (subscribeBtn) subscribeBtn.click()
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Subscribe Now
            </button>

            <button
              onClick={() => setShowSubscriptionModal(false)}
              className="w-full mt-3 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 font-medium text-sm transition-all"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </>
  )
}
