"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
} from "lucide-react"
import Link from "next/link"

interface CustomVideoPlayerProps {
  src: string
  title?: string
  poster?: string
  autoPlay?: boolean
}

export default function CustomVideoPlayer({ src, title, poster, autoPlay = true }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      setIsLoading(false)
    }
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }
    const handleWaiting = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("progress", handleProgress)

    // Auto play
    if (autoPlay) {
      video.play().catch(() => {
        // Autoplay blocked, user needs to interact
        setIsPlaying(false)
      })
    }

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("progress", handleProgress)
    }
  }, [autoPlay])

  // Prevent right-click and developer tools
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault()
      }
    }

    // Disable drag
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault()
    }

    container.addEventListener("contextmenu", handleContextMenu)
    container.addEventListener("dragstart", handleDragStart)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      container.removeEventListener("contextmenu", handleContextMenu)
      container.removeEventListener("dragstart", handleDragStart)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setIsMuted(newVolume === 0)
    }
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleSkip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds))
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
      setShowSettings(false)
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setShowSettings(false)
      }, 3000)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const playbackRates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black overflow-hidden group relative select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false)
          setShowSettings(false)
        }
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        onClick={handlePlayPause}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
      />

      <Link
        href="https://nexusplatform.site"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-4 right-4 z-50 opacity-70 hover:opacity-100 transition-opacity"
      >
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-3 py-1.5 rounded-lg shadow-lg">
          <span className="text-white font-bold text-sm tracking-wider">NEX PLAYER</span>
        </div>
      </Link>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-40">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            <span className="text-white text-sm font-medium">Loading...</span>
          </div>
        </div>
      )}

      {/* Center Play Button (when paused) */}
      {!isPlaying && !isLoading && (
        <button onClick={handlePlayPause} className="absolute inset-0 flex items-center justify-center z-30">
          <div className="w-20 h-20 bg-red-600/90 hover:bg-red-500 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 transition-opacity duration-300 z-20 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Title Overlay */}
        {title && (
          <div className="absolute top-4 left-4 right-20">
            <h2 className="text-white font-bold text-lg md:text-xl drop-shadow-lg truncate">{title}</h2>
          </div>
        )}

        {/* Progress Bar */}
        <div className="absolute bottom-16 md:bottom-14 left-0 right-0 px-4">
          <div
            className="relative h-1.5 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
              style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full transition-all"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/80 text-xs font-medium">{formatTime(currentTime)}</span>
            <span className="text-white/80 text-xs font-medium">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="absolute bottom-2 left-0 right-0 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={handlePlayPause}
              className="p-2 md:p-2.5 hover:bg-white/20 rounded-full transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
              )}
            </button>

            <button
              onClick={() => handleSkip(-10)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={() => handleSkip(10)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors hidden sm:block"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-1 pl-1 md:pl-2">
              <button
                onClick={handleMuteToggle}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 md:w-24 h-1 bg-white/30 rounded-full cursor-pointer appearance-none hidden sm:block"
                style={{
                  background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${
                    (isMuted ? 0 : volume) * 100
                  }%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Settings (Playback Speed) */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
              {showSettings && (
                <div className="absolute bottom-12 right-0 bg-black/95 rounded-lg shadow-xl border border-white/10 py-2 min-w-[120px]">
                  <p className="text-white/60 text-xs px-3 pb-1 border-b border-white/10 mb-1">Speed</p>
                  {playbackRates.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${
                        playbackRate === rate ? "text-red-500 font-semibold" : "text-white"
                      }`}
                    >
                      {rate === 1 ? "Normal" : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
