"use client"

import { X, Download } from "lucide-react"
import { useState } from "react"
import { requestSecureDownload } from "@/lib/download-utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

interface VideoPlayerModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
  title: string
  poster?: string
  contentId?: string
  contentType?: string
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  poster,
  contentId,
  contentType,
}: VideoPlayerModalProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false)

  if (!isOpen || !videoUrl) return null

  const getEmbedUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
      }
    }
    return url
  }

  const getDownloadUrl = (url: string) => {
    if (url.includes("drive.google.com")) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`
      }
    }
    return url
  }

  const handleDownload = async () => {
    if (!user || !contentId || !videoUrl) {
      console.log("[v0] Missing required data for download")
      return
    }

    try {
      setIsDownloading(true)
      console.log("[v0] Starting secure download from modal...")

      const result = await requestSecureDownload(user.uid, contentId, contentType || "movie", videoUrl, title)

      if (!result.success) {
        if (result.error === "subscription_expired") {
          console.log("[v0] Subscription expired, showing modal")
          setShowSubscriptionExpired(true)
        } else {
          console.error("[v0] Download failed:", result.error)
          alert("Download failed: " + result.error)
        }
      } else {
        console.log("[v0] Download started successfully")
      }
    } catch (error) {
      console.error("[v0] Download error:", error)
      alert("An error occurred while downloading")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {showSubscriptionExpired && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
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

      <div className="relative w-full max-w-6xl mx-4">
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-red-500 transition">
          <X className="w-6 h-6" />
        </button>

        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={getEmbedUrl(videoUrl!)}
            className="absolute top-0 left-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ border: "none" }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-1 px-2 py-1 bg-[#e50914] hover:bg-[#f6121d] rounded text-white text-[10px] font-semibold transition disabled:opacity-50"
          >
            <Download className={`w-3 h-3 ${isDownloading ? "animate-bounce" : ""}`} />
            {isDownloading ? "Downloading..." : "Download"}
          </button>
        </div>
      </div>
    </div>
  )
}
