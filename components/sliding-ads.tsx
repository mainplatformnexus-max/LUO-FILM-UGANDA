"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref as dbRef, get } from "firebase/database"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Ad {
  id: string
  image: string
  title: string
  link?: string
}

export default function SlidingAds() {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    loadAds()
  }, [])

  useEffect(() => {
    if (ads.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % ads.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [ads.length])

  const loadAds = async () => {
    try {
      const adsRef = dbRef(database, "ads")
      const snapshot = await get(adsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const adsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setAds(adsList)
      }
    } catch (error) {
      console.error("Error loading ads:", error)
    }
  }

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length)
  }

  const prevAd = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length)
  }

  if (ads.length === 0) return null

  const visibleAds = []
  for (let i = 0; i < Math.min(4, ads.length); i++) {
    visibleAds.push(ads[(currentIndex + i) % ads.length])
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm border-y border-white/10 py-4 px-3 md:px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm md:text-base font-bold text-white/90">Featured Ads</h3>
          <div className="flex gap-2">
            <button onClick={prevAd} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextAd} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {visibleAds.map((ad, index) => (
            <a
              key={ad.id}
              href={ad.link || "#"}
              target={ad.link ? "_blank" : "_self"}
              rel="noopener noreferrer"
              className="group relative bg-white/5 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
              style={{
                animation: `slideIn 0.5s ease-out ${index * 0.1}s backwards`,
              }}
            >
              <div className="aspect-square relative overflow-hidden">
                <img
                  src={ad.image || "/placeholder.svg"}
                  alt={ad.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-white text-xs md:text-sm font-semibold truncate">{ad.title}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
