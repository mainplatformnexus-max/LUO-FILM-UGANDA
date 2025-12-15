"use client"

import type React from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  X,
  Settings,
  Loader2,
  Download,
} from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { usePlayer } from "@/lib/player-context"

interface CarouselItem {
  id: string
  title: string
  subtitle: string
  image: string
  contentType?: string
  contentId?: string
  createdAt?: string
}

interface ContentData {
  title: string
  streamLink?: string
  videoUrl?: string
  [key: string]: any
}

export default function FeaturedCarousel() {
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])
  const [loading, setLoading] = useState(true)

  const { contentToPlay, setContentToPlay, isPlayerActive, setIsPlayerActive } = usePlayer()

  // Player state
  const [currentContent, setCurrentContent] = useState<ContentData | null>(null)
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null)
  const [playerLoading, setPlayerLoading] = useState(false)

  // Video controls state
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const [videoPaused, setVideoPaused] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [videoLoading, setVideoLoading] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const carouselRef = ref(database, "carousel")
    const unsubscribe = onValue(carouselRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }))
        items.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        setCarouselItems(items)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (contentToPlay && isPlayerActive) {
      setPlayerLoading(true)
      setVideoLoading(true)

      const type = contentToPlay.type === "movie" ? "movies" : contentToPlay.type === "series" ? "series" : "originals"
      const contentRef = ref(database, `${type}/${contentToPlay.id}`)

      onValue(
        contentRef,
        (snapshot) => {
          const data = snapshot.val()
          if (data) {
            setCurrentContent(data)
            const streamUrl = data.streamLink || data.videoUrl
            setCurrentStreamUrl(streamUrl)
          }
          setPlayerLoading(false)
        },
        { onlyOnce: true },
      )
    }
  }, [contentToPlay, isPlayerActive])

  // Disable right-click and dev tools
  useEffect(() => {
    if (!isPlayerActive) return

    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isPlayerActive])

  // Auto-hide controls
  useEffect(() => {
    if (!isPlayerActive) return

    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      setShowControls(true)
      if (!videoPaused) {
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
      }
    }

    const container = playerContainerRef.current
    if (container) {
      container.addEventListener("mousemove", resetControlsTimeout)
      container.addEventListener("touchstart", resetControlsTimeout)
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", resetControlsTimeout)
        container.removeEventListener("touchstart", resetControlsTimeout)
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [isPlayerActive, videoPaused])

  const handlePlayClick = async (item: CarouselItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!item.contentId) return

    setPlayerLoading(true)
    setIsPlayerActive(true)

    const type = item.contentType || "movie"
    const contentRef = ref(database, `${type}s/${item.contentId}`)

    onValue(
      contentRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          setCurrentContent(data)
          const streamUrl = data.streamLink || data.videoUrl
          setCurrentStreamUrl(streamUrl)
        }
        setPlayerLoading(false)
      },
      { onlyOnce: true },
    )
  }

  const closePlayer = () => {
    setIsPlayerActive(false)
    setContentToPlay(null)
    setCurrentContent(null)
    setCurrentStreamUrl(null)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  // Video control functions
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoPaused) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      if (videoRef.current.buffered.length > 0) {
        setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1))
      }
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      setVideoLoading(false)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      videoRef.current.currentTime = percent * duration
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
    setMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return

    if (!isFullscreen) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const changePlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
    setShowSettings(false)
  }

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const isDirectVideoUrl = (url: string): boolean => {
    if (!url) return false
    const lowercaseUrl = url.toLowerCase()

    // Check for common video file extensions
    const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m3u8", ".mkv", ".avi"]
    const endsWithVideo = videoExtensions.some((ext) => lowercaseUrl.endsWith(ext))

    // Also check if URL contains these anywhere (for URLs with query params)
    const containsVideo = videoExtensions.some((ext) => lowercaseUrl.includes(ext))

    return endsWithVideo || containsVideo
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 h-40 sm:h-44 md:h-48 lg:h-56 flex items-center justify-center">
        <div className="text-white">Loading carousel...</div>
      </div>
    )
  }

  if (carouselItems.length === 0 && !isPlayerActive) {
    return (
      <div className="px-4 sm:px-6 h-40 sm:h-44 md:h-48 lg:h-56 flex items-center justify-center bg-slate-800 rounded-lg">
        <div className="text-slate-400 text-center">
          <p>No carousel content uploaded yet</p>
          <p className="text-sm">Admin can add content from the admin panel</p>
        </div>
      </div>
    )
  }

  if (isPlayerActive) {
    const isDirect = currentStreamUrl ? isDirectVideoUrl(currentStreamUrl) : false

    return (
      <div className="px-4 sm:px-6">
        <div
          ref={playerContainerRef}
          className="relative w-full h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px] bg-black rounded-xl overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Close button */}
          <button
            onClick={closePlayer}
            className="absolute top-4 left-4 z-50 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {isDirect && currentStreamUrl && (
            <a
              href={currentStreamUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-16 left-4 z-50 p-2 bg-green-600/80 hover:bg-green-500 rounded-full transition-all group"
              title="Download video"
            >
              <Download className="w-5 h-5 text-white" />
            </a>
          )}

          {/* NEX PLAYER Watermark */}
          <a
            href="https://nexusplatform.site"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 z-50 px-3 py-1.5 bg-gradient-to-r from-cyan-500/80 to-purple-600/80 hover:from-cyan-400 hover:to-purple-500 rounded-lg transition-all duration-300 hover:scale-105"
          >
            <span className="text-white text-xs sm:text-sm font-bold tracking-wider">NEX PLAYER</span>
          </a>

          {playerLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-white/80 text-sm">Loading...</p>
            </div>
          ) : currentStreamUrl ? (
            isDirect ? (
              <>
                {videoLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
                    <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                    <p className="text-white/80 text-sm">Buffering...</p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  src={currentStreamUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => {
                    setVideoPaused(false)
                    setVideoLoading(false)
                  }}
                  onPause={() => setVideoPaused(true)}
                  onWaiting={() => setVideoLoading(true)}
                  onCanPlay={() => setVideoLoading(false)}
                  playsInline
                  autoPlay
                />

                {/* Center play button when paused */}
                {videoPaused && !videoLoading && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity z-10"
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                    </div>
                  </button>
                )}

                {/* Controls overlay */}
                <div
                  className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-30 ${
                    showControls ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  {/* Gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />

                  {/* Title */}
                  <div className="absolute top-14 left-4 right-20">
                    <h2 className="text-white text-lg sm:text-xl font-bold truncate">
                      {currentContent?.title || contentToPlay?.title || "Now Playing"}
                    </h2>
                  </div>

                  {/* Bottom controls */}
                  <div className="relative z-10 p-3 sm:p-4 space-y-2">
                    {/* Progress bar */}
                    <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group" onClick={handleSeek}>
                      <div
                        className="absolute h-full bg-white/30 rounded-full"
                        style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                      />
                      <div
                        className="absolute h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full"
                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 6px)` }}
                      />
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={togglePlay}
                          className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {videoPaused ? (
                            <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                          ) : (
                            <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                          )}
                        </button>

                        <button
                          onClick={() => skip(-10)}
                          className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </button>

                        <button
                          onClick={() => skip(10)}
                          className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </button>

                        <div className="flex items-center gap-1 sm:gap-2 group/volume">
                          <button
                            onClick={toggleMute}
                            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            {muted || volume === 0 ? (
                              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            ) : (
                              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-300 accent-cyan-500 h-1"
                          />
                        </div>

                        <span className="text-white/80 text-xs sm:text-sm ml-1 sm:ml-2">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        {/* Settings */}
                        <div className="relative">
                          <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </button>
                          {showSettings && (
                            <div className="absolute bottom-full right-0 mb-2 bg-black/95 rounded-lg p-2 min-w-[120px] border border-white/10">
                              <p className="text-white/60 text-xs px-2 mb-1">Speed</p>
                              {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => changePlaybackRate(rate)}
                                  className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 transition-colors ${
                                    playbackRate === rate ? "text-cyan-400" : "text-white"
                                  }`}
                                >
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={toggleFullscreen}
                          className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                          {isFullscreen ? (
                            <Minimize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <Maximize className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <iframe
                  src={currentStreamUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                />
                {/* NEX PLAYER branding overlay for embeds */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none flex items-end justify-center pb-2">
                  <span className="text-white/60 text-xs">Powered by NEX PLAYER</span>
                </div>
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <p className="text-white/80 text-sm">No video source available</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const itemsToDisplay = carouselItems.length === 1 ? Array(6).fill(carouselItems[0]) : carouselItems
  const displayArray = [...itemsToDisplay, ...itemsToDisplay, ...itemsToDisplay]

  return (
    <div className="px-4 sm:px-6 overflow-hidden">
      <style>{`
        @keyframes seamlessScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-${100 / 3}%));
          }
        }
        
        .carousel-track {
          display: flex;
          animation: seamlessScroll ${carouselItems.length === 1 ? "40s" : "120s"} linear infinite;
          width: fit-content;
        }
        
        .carousel-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="carousel-track gap-3 sm:gap-4 lg:gap-6">
        {displayArray.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="flex-shrink-0 w-80 md:w-96 lg:w-[450px] relative h-40 sm:h-44 md:h-48 lg:h-56 rounded-xl sm:rounded-2xl overflow-hidden group"
          >
            <img
              src={item.image || "/placeholder.svg"}
              alt={item.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-end p-3 sm:p-4 pointer-events-none">
              <div className="bg-black/50 backdrop-blur-sm p-2 sm:p-3 rounded-lg max-w-[180px] sm:max-w-[220px] pointer-events-auto">
                <h2 className="text-sm sm:text-base font-bold mb-1 leading-tight line-clamp-2 text-white">
                  {item.title}
                </h2>
                {item.subtitle && <p className="text-xs opacity-90 mb-2 line-clamp-1 text-white/90">{item.subtitle}</p>}
                {item.contentId && (
                  <button
                    onClick={(e) => handlePlayClick(item, e)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-full text-white text-xs font-semibold transition-all duration-300 hover:scale-105 shadow-lg cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
