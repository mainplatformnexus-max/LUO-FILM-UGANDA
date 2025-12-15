"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { usePlayer } from "@/lib/player-context"

interface ContentItem {
  id: string
  title: string
  year: number
  rating: number
  image: string
  category?: string
  isTrending?: boolean
  type: "movie" | "series" | "original"
  createdAt?: string
}

interface ContentGridProps {
  contentType: "movie" | "series" | "original"
  title: string
  selectedCategory?: string
}

export default function ContentGrid({ contentType, title, selectedCategory = "All" }: ContentGridProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const { setContentToPlay, setIsPlayerActive } = usePlayer()

  useEffect(() => {
    const dbPath = contentType === "movie" ? "movies" : contentType === "series" ? "series" : "originals"

    const dbRef = ref(database, dbPath)

    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const items = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          type: contentType,
          ...value,
        }))
        items.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        setContent(items)
      } else {
        setContent([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [contentType])

  useEffect(() => {
    if (selectedCategory === "Trending") {
      setFilteredContent(content.filter((item) => item.isTrending))
    } else if (selectedCategory === "All") {
      setFilteredContent(content)
    } else {
      setFilteredContent(content.filter((item) => item.category === selectedCategory))
    }
  }, [selectedCategory, content])

  const handleContentClick = (item: ContentItem) => {
    setContentToPlay({
      id: item.id,
      type: contentType,
      title: item.title,
    })
    setIsPlayerActive(true)
    // Scroll to top to see the player
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (filteredContent.length === 0) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="glass-card rounded-lg p-8 text-center">
          <p className="text-slate-300">No {contentType}s in this category yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold text-white mb-6 text-left">{title}</h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-5">
        {filteredContent.map((item) => (
          <div key={item.id} onClick={() => handleContentClick(item)} className="cursor-pointer">
            <div className="flex flex-col items-center w-full">
              <div
                className="relative w-full bg-slate-800 overflow-hidden transition-transform duration-300 hover:scale-105"
                style={{ aspectRatio: "2/3" }}
              >
                <img src={item.image || "/placeholder.svg"} alt={item.title} className="w-full h-full object-cover" />
              </div>

              <h3 className="mt-2 text-white text-xs sm:text-sm font-medium text-center line-clamp-2 w-full">
                {item.title}
              </h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
