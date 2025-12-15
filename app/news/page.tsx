"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref as dbRef, get } from "firebase/database"
import { Card } from "@/components/ui/card"
import { Eye, Calendar } from "lucide-react"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"

interface NewsArticle {
  id: string
  title: string
  featuredImage?: string
  category?: string
  createdAt: string
  views?: number
  content: any[]
}

export default function NewsPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArticles()
  }, [])

  const loadArticles = async () => {
    try {
      const newsRef = dbRef(database, "news")
      const snapshot = await get(newsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const articlesList = Object.entries(data)
          .map(([id, value]: any) => ({
            id,
            ...value,
          }))
          .filter((article) => article.published)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setArticles(articlesList)
      }
    } catch (error) {
      console.error("Error loading articles:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filter: string) => {
    if (filter === "settings") {
      router.push("/settings")
    } else {
      router.push(`/?filter=${filter}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <div className="hidden md:block">
        <Sidebar onFilterChange={handleFilterChange} activeFilter="home" />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader />

        <main className="flex-1 pt-12 md:pt-16 overflow-y-auto p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-8">News & Updates</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Card
                  key={article.id}
                  onClick={() => router.push(`/news/${article.id}`)}
                  className="bg-card border-border overflow-hidden hover:border-primary/50 transition cursor-pointer"
                >
                  {article.featuredImage && (
                    <div className="h-48 bg-muted overflow-hidden">
                      <img
                        src={article.featuredImage || "/placeholder.svg"}
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h2 className="font-bold text-foreground mb-2 line-clamp-2 hover:text-primary transition">
                      {article.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {article.category && (
                        <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs">{article.category}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                      {article.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {article.views}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {articles.length === 0 && (
              <Card className="bg-card border-border p-12 text-center">
                <p className="text-muted-foreground">No articles available yet. Check back soon!</p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
