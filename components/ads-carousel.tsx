"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import Image from "next/image"

interface Ad {
  id: string
  image: string
  title: string
  link?: string
}

export default function AdsCarousel() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const adsRef = ref(database, "ads")
    const unsubscribe = onValue(adsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const adsList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }))
        setAds(adsList)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading || ads.length === 0) {
    return null
  }

  // Duplicate ads for seamless scrolling
  const displayArray = [...ads, ...ads, ...ads]

  return (
    <div className="px-4 sm:px-6 overflow-hidden mt-2 md:mt-4">
      <style>{`
        @keyframes adScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-${100 / 3}%));
          }
        }
        
        .ads-track {
          display: flex;
          animation: adScroll ${ads.length === 1 ? "30s" : "90s"} linear infinite;
          width: fit-content;
        }
        
        .ads-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ads-track gap-2 md:gap-3">
        {displayArray.map((ad, index) => (
          <a
            key={`${ad.id}-${index}`}
            href={ad.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-20 md:w-24 lg:w-28 h-20 md:h-24 lg:h-28 rounded-lg overflow-hidden group hover:scale-105 transition-transform duration-300 cursor-pointer"
          >
            <div className="relative w-full h-full bg-card border border-border/50">
              <Image
                src={ad.image || "/placeholder.svg"}
                alt={ad.title}
                fill
                className="object-cover group-hover:brightness-110 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
