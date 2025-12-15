"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import { Play } from "lucide-react"
import Image from "next/image"

interface ContentItem {
  id: string
  title: string
  image: string
  type: string
  streamlink: string
  genre?: string
  rating?: number
  episodes?: any[]
}

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get("q") || ""
  const [results, setResults] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const searchContent = async () => {
      if (!query.trim()) {
        setResults([])
        setLoading(false)
        return
      }

      try {
        const [moviesSnap, seriesSnap, originalsSnap] = await Promise.all([
          get(ref(database, "movies")),
          get(ref(database, "series")),
          get(ref(database, "originals")),
        ])

        const allContent: ContentItem[] = []
        const searchLower = query.toLowerCase()

        if (moviesSnap.exists()) {
          Object.entries(moviesSnap.val()).forEach(([id, data]: [string, any]) => {
            if (data.title?.toLowerCase().includes(searchLower) || data.genre?.toLowerCase().includes(searchLower)) {
              allContent.push({ id, ...data, type: "movie" })
            }
          })
        }

        if (seriesSnap.exists()) {
          Object.entries(seriesSnap.val()).forEach(([id, data]: [string, any]) => {
            if (data.title?.toLowerCase().includes(searchLower) || data.genre?.toLowerCase().includes(searchLower)) {
              allContent.push({ id, ...data, type: "series" })
            }
          })
        }

        if (originalsSnap.exists()) {
          Object.entries(originalsSnap.val()).forEach(([id, data]: [string, any]) => {
            if (data.title?.toLowerCase().includes(searchLower) || data.genre?.toLowerCase().includes(searchLower)) {
              allContent.push({ id, ...data, type: "original" })
            }
          })
        }

        setResults(allContent)
      } catch (error) {
        console.error("Error searching:", error)
      } finally {
        setLoading(false)
      }
    }

    searchContent()
  }, [query])

  const handlePlay = (item: ContentItem) => {
    const videoUrl =
      item.type === "series" && item.episodes?.[0]?.streamlink ? item.episodes[0].streamlink : item.streamlink

    router.push(`/watch/${item.id}?type=${item.type}`)
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar onFilterChange={() => {}} activeFilter="home" />

      <div className="flex-1 ml-48">
        <TopHeader />

        <main className="pt-16 px-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Search Results for "{query}"</h1>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {results.map((item) => (
                <div key={item.id} className="group relative">
                  <div className="relative h-48 rounded-lg overflow-hidden">
                    <Image src={item.image || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => handlePlay(item)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="w-12 h-12 rounded-full bg-[#e50914] flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" fill="white" />
                      </div>
                    </button>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-foreground line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.type} {item.rating && `• ⭐ ${item.rating.toFixed(1)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
