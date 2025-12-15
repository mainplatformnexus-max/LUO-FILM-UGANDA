"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react"
import Image from "next/image"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"

interface GenresProps {
  onFilterChange: (filter: string) => void
}

export default function GenresSection({ onFilterChange }: GenresProps) {
  const [genres, setGenres] = useState<{ id: string; name: string; image: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const genreMap = new Map<string, { image: string; count: number }>()

    const fetchGenres = async () => {
      const paths = ["movies", "series", "originals", "animation", "music"]

      const unsubscribers = paths.map((path) => {
        const contentRef = ref(database, path)
        return onValue(contentRef, (snapshot) => {
          const data = snapshot.val()
          if (data) {
            Object.values(data).forEach((item: any) => {
              if (item.category) {
                const existing = genreMap.get(item.category)
                if (existing) {
                  existing.count++
                } else {
                  genreMap.set(item.category, {
                    image: item.poster || item.image || "/placeholder.svg",
                    count: 1,
                  })
                }
              }
            })
          }

          const genresArray = Array.from(genreMap.entries()).map(([name, data]) => ({
            id: name.toLowerCase(),
            name,
            image: data.image,
            count: data.count,
          }))
          genresArray.sort((a, b) => b.count - a.count)
          setGenres(genresArray.slice(0, 6))
          setLoading(false)
        })
      })

      return () => unsubscribers.forEach((unsub) => unsub())
    }

    fetchGenres()
  }, [])

  if (loading) {
    return (
      <div className="flex-shrink-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent rounded-2xl p-4 border border-green-500/10 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Grid3x3 className="w-4 h-4 text-green-500" />
          <h2 className="text-sm font-bold text-foreground">Genres</h2>
        </div>
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-shrink-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent rounded-2xl p-4 border border-green-500/10 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 shadow-lg shadow-green-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-4 h-4 text-green-500" />
          <h2 className="text-sm font-bold text-foreground">Genres</h2>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-green-500/20 rounded-lg transition">
            <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
          </button>
          <button className="p-1.5 hover:bg-green-500/20 rounded-lg transition">
            <ChevronRight className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {genres.map((genre) => (
          <button
            key={genre.id}
            onClick={() => onFilterChange(genre.name.toLowerCase())}
            className="relative h-14 rounded-xl overflow-hidden group hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl border border-border/30 hover:border-green-500/50"
          >
            <Image
              src={genre.image || "/placeholder.svg"}
              alt={genre.name}
              fill
              className="object-cover brightness-75 group-hover:brightness-100 transition-all duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

            <div className="absolute inset-0 bg-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="absolute bottom-1.5 left-2 right-2">
              <span className="text-white font-bold text-[10px] drop-shadow-lg block">{genre.name}</span>
              <span className="text-white/70 text-[8px]">({genre.count})</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
