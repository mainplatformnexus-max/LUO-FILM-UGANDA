"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, SkipForward, SkipBack, Download } from "lucide-react"
import { requestSecureDownload } from "@/lib/download-utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface NexPlayerProps {
  src: string
  title: string
  onClose: () => void
  onDownload?: () => void
  contentId?: string
  contentType?: string
}

export default function NexPlayer({ src, title, onClose, onDownload, contentId, contentType }: NexPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const { user } = useAuth()
  const router = useRouter()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [availableQualities, setAvailableQualities] = useState<string[]>([])
  const [selectedQuality, setSelectedQuality] = useState<string>("Auto")
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false)

  const streamUrl = src

  useEffect(() => {
    const disableContext = (e: MouseEvent) => e.preventDefault()
    const disableKeys = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "U")
      ) {
        e.preventDefault()
      }
    }

    document.addEventListener("contextmenu", disableContext)
    document.addEventListener("keydown", disableKeys)

    return () => {
      document.removeEventListener("contextmenu", disableContext)
      document.removeEventListener("keydown", disableKeys)
    }
  }, [])

  useEffect(() => {
    const resetTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      setShowControls(true)
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }

    resetTimeout()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const buffered = video.buffered.end(video.buffered.length - 1)
        setBufferedPercent((buffered / video.duration) * 100)
      }
    }
    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handlePlay = () => {
      setIsPlaying(true)
      setHasStartedPlaying(true)
    }
    const handlePause = () => setIsPlaying(false)

    const handleLoadedMetadata = () => {
      if (video.videoHeight) {
        const qualities = []
        const height = video.videoHeight

        if (height >= 2160) qualities.push("2160p", "1080p", "720p", "480p", "360p")
        else if (height >= 1080) qualities.push("1080p", "720p", "480p", "360p")
        else if (height >= 720) qualities.push("720p", "480p", "360p")
        else if (height >= 480) qualities.push("480p", "360p")
        else qualities.push("360p")

        setAvailableQualities(qualities)
        setSelectedQuality(`${height}p`)
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("progress", handleProgress)
    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("progress", handleProgress)
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault()
        togglePlay()
      } else if (e.key === "ArrowLeft") {
        skip(-10)
      } else if (e.key === "ArrowRight") {
        skip(10)
      } else if (e.key === "f") {
        toggleFullscreen()
      } else if (e.key === "m") {
        toggleMute()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    video.currentTime = percent * video.duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = Number.parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
    setShowSettings(false)
  }

  const handleDownloadClick = () => {
    if (showQualityMenu) {
      setShowQualityMenu(false)
      return
    }
    setShowQualityMenu(true)
  }

  const downloadVideo = async (quality: string) => {
    if (!user || !contentId) {
      console.log("[v0] Missing user or contentId for download")
      if (onDownload) {
        onDownload()
      }
      setShowQualityMenu(false)
      return
    }

    try {
      setIsDownloading(true)
      setShowQualityMenu(false)
      console.log("[v0] Starting secure download from player...")

      const result = await requestSecureDownload(user.uid, contentId, contentType || "movie", src, title)

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
      setIsDownloading(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={() => {
        setShowControls(true)
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current)
        }
        if (isPlaying) {
          controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
        }
      }}
    >
      {showSubscriptionExpired && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80">
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

      <video
        ref={videoRef}
        src={streamUrl}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onContextMenu={(e) => e.preventDefault()}
        preload="auto"
        autoPlay
        playsInline
        crossOrigin="anonymous"
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-[10px] font-medium">Loading...</p>
          </div>
        </div>
      )}

      {!isPlaying && !isLoading && hasStartedPlaying && (
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-2xl"
        >
          <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white ml-0.5" />
        </button>
      )}

      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-1.5 md:p-2 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white text-[10px] md:text-xs font-bold truncate flex-1">{title}</h2>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={handleDownloadClick}
                className="px-1.5 py-0.5 md:px-2 md:py-1 rounded bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center gap-0.5 md:gap-1 transition"
                title="Download"
              >
                <Download className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                <span className="text-white text-[8px] md:text-[9px] font-semibold">Download</span>
              </button>
              {showQualityMenu && (
                <div className="absolute top-full right-0 mt-1 bg-black/95 rounded-lg p-1.5 min-w-[80px] z-50">
                  <p className="text-white text-[8px] font-semibold mb-1 px-1">Select Quality</p>
                  {availableQualities.length > 0 ? (
                    availableQualities.map((qual) => (
                      <button
                        key={qual}
                        onClick={() => downloadVideo(qual)}
                        className="w-full text-left px-1.5 py-1 text-[8px] rounded transition text-white/90 hover:bg-purple-600 hover:text-white"
                      >
                        {qual}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => downloadVideo("Original")}
                      className="w-full text-left px-1.5 py-1 text-[8px] rounded transition text-white/90 hover:bg-purple-600 hover:text-white"
                    >
                      Original
                    </button>
                  )}
                </div>
              )}
            </div>
            <a
              href="https://nexusplatform.site"
              target="_blank"
              rel="noopener noreferrer"
              className="px-1 py-0.5 bg-gradient-to-r from-cyan-500/70 to-purple-600/70 hover:from-cyan-400 hover:to-purple-500 rounded transition-all duration-300 hover:scale-105"
            >
              <span className="text-white text-[6px] md:text-[7px] font-bold tracking-wide">NEX</span>
            </a>
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-500 flex items-center justify-center transition"
            >
              <span className="text-white text-sm font-bold">×</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 md:p-2 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className="w-full h-0.5 md:h-1 bg-white/20 rounded-full cursor-pointer mb-1.5 group/progress relative"
          onClick={handleSeek}
        >
          <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${bufferedPercent}%` }} />
          <div
            className="absolute h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-end"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          >
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <button onClick={togglePlay} className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition">
              {isPlaying ? (
                <Pause className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white" />
              ) : (
                <Play className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white fill-white" />
              )}
            </button>
            <button onClick={() => skip(-10)} className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition">
              <SkipBack className="w-2 h-2 md:w-3 md:h-3 text-white" />
            </button>
            <button onClick={() => skip(10)} className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition">
              <SkipForward className="w-2 h-2 md:w-3 md:h-3 text-white" />
            </button>

            <div className="flex items-center gap-0.5 group/volume">
              <button onClick={toggleMute} className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-2 h-2 md:w-3 md:h-3 text-white" />
                ) : (
                  <Volume2 className="w-2 h-2 md:w-3 md:h-3 text-white" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-10 md:group-hover/volume:w-14 transition-all duration-300 accent-purple-500"
              />
            </div>

            <span className="text-white text-[8px] md:text-[9px] font-medium whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition"
              >
                <Settings className="w-2 h-2 md:w-3 md:h-3 text-white" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-1.5 bg-black/95 rounded-lg p-1.5 min-w-[90px]">
                  <div className="mb-1.5 pb-1.5 border-b border-white/20">
                    <p className="text-white text-[8px] font-semibold mb-0.5">Quality</p>
                    <div className="space-y-0.5">
                      {availableQualities.length > 0 ? (
                        availableQualities.map((qual) => (
                          <div
                            key={qual}
                            className={`px-1.5 py-0.5 text-[8px] rounded ${
                              qual === selectedQuality ? "bg-purple-600 text-white" : "bg-white/10 text-white/70"
                            }`}
                          >
                            {qual}
                          </div>
                        ))
                      ) : (
                        <div className="px-1.5 py-0.5 text-[8px] rounded bg-purple-600 text-white">
                          {selectedQuality}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-white text-[8px] font-semibold mb-0.5">Speed</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`w-full text-left px-1.5 py-0.5 text-[8px] rounded transition ${
                        playbackRate === rate
                          ? "bg-purple-600 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleFullscreen} className="p-0.5 md:p-1 hover:bg-white/10 rounded-full transition">
              <Maximize className="w-2 h-2 md:w-3 md:h-3 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
