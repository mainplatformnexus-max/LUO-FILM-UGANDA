"use client"

import { useEffect, useState } from "react"
import { database } from "@/lib/firebase"
import { ref, onValue } from "firebase/database"
import { Star } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Movie {
  id: string
  title: string
  year: number
  rating: number
  image: string
  category?: string
  isTrending?: boolean
  createdAt?: string
}

interface TrendingGridProps {
  selectedCategory?: string
}

export default function TrendingGrid({ selectedCategory = "Trending" }: TrendingGridProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const dbRef = ref(database, "movies")

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
        setMovies(items)
      } else {
        setMovies([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (selectedCategory === "Trending") {
      setFilteredMovies(movies.filter((movie) => movie.isTrending))
    } else {
      setFilteredMovies(movies.filter((movie) => movie.category === selectedCategory))
    }
  }, [selectedCategory, movies])

  if (loading) {
    return (
      <div className="px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
          {selectedCategory === "Trending" ? "Trending Movies" : selectedCategory}
        </h2>
        <div className="text-white">Loading movies...</div>
      </div>
    )
  }

  if (filteredMovies.length === 0) {
    return (
      <div className="px-4 sm:px-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
          {selectedCategory === "Trending" ? "Trending Movies" : selectedCategory}
        </h2>
        <div className="bg-slate-800 rounded-lg p-8 text-center">
          <p className="text-slate-400">No movies in this category yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
        {selectedCategory === "Trending" ? "Trending Movies" : selectedCategory}
      </h2>
      <div className="w-full">
        <style>{`
          .trending-grid {
            display: grid;
            gap: 0.75rem;
            width: 100%;
          }
          @media (max-width: 639px) {
            .trending-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
          @media (min-width: 640px) and (max-width: 1023px) {
            .trending-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
          @media (min-width: 1024px) {
            .trending-grid {
              grid-template-columns: repeat(6, minmax(0, 1fr));
            }
          }
        `}</style>
        <div className="trending-grid">
          {filteredMovies.map((movie) => (
            <Link key={movie.id} href={`/watch/${movie.id}`}>
              <div className="group relative rounded-lg overflow-hidden cursor-pointer" style={{ aspectRatio: "2/3" }}>
                <Image
                  src={movie.image || "/placeholder.svg"}
                  alt={movie.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  priority={false}
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 sm:p-3">
                  <h3 className="text-xs sm:text-sm font-bold text-white mb-1 line-clamp-2">{movie.title}</h3>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {movie.rating}
                      </span>
                      <span>{movie.year}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center z-20">
                  <button className="bg-white text-black px-4 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-sm hover:bg-slate-200 transition">
                    Play
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
