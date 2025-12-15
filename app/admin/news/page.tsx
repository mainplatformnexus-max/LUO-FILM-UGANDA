"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import AdminNav from "@/components/admin-nav"
import AdminMobileNav from "@/components/admin-mobile-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { database } from "@/lib/firebase"
import { ref as dbRef, push, get, remove, update } from "firebase/database"
import { Plus, Trash2, Edit, Eye, ChevronUp, ChevronDown, ImageIcon, Video, Link2, Film } from "lucide-react"

interface NewsArticle {
  id: string
  title: string
  content: ContentBlock[]
  featuredImage?: string
  category?: string
  published: boolean
  createdAt: string
  views?: number
}

interface ContentBlock {
  id: string
  type: "header" | "text" | "image" | "video" | "link" | "movie"
  content: string
  order: number
  metadata?: {
    alt?: string
    caption?: string
    url?: string
    movieId?: string
    movieTitle?: string
  }
}

interface Movie {
  id: string
  title: string
  image: string
  streamlink: string
}

export default function NewsManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [editing, setEditing] = useState(false)
  const [currentArticle, setCurrentArticle] = useState<NewsArticle | null>(null)
  const [title, setTitle] = useState("")
  const [featuredImage, setFeaturedImage] = useState("")
  const [category, setCategory] = useState("")
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([])
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadArticles()
      loadMovies()
    }
  }, [isAdmin])

  const loadArticles = async () => {
    try {
      const newsRef = dbRef(database, "news")
      const snapshot = await get(newsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const articlesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setArticles(articlesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      }
    } catch (error) {
      console.error("Error loading articles:", error)
    }
  }

  const loadMovies = async () => {
    try {
      const moviesRef = dbRef(database, "movies")
      const snapshot = await get(moviesRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const moviesList = Object.entries(data).map(([id, value]: any) => ({
          id,
          title: value.title,
          image: value.image,
          streamlink: value.streamlink,
        }))
        setMovies(moviesList)
      }
    } catch (error) {
      console.error("Error loading movies:", error)
    }
  }

  const addContentBlock = (type: ContentBlock["type"]) => {
    const newBlock: ContentBlock = {
      id: Date.now().toString(),
      type,
      content: "",
      order: contentBlocks.length,
      metadata: {},
    }
    setContentBlocks([...contentBlocks, newBlock])
  }

  const updateContentBlock = (id: string, field: string, value: any) => {
    setContentBlocks(
      contentBlocks.map((block) => {
        if (block.id === id) {
          if (field.startsWith("metadata.")) {
            const metadataField = field.split(".")[1]
            return {
              ...block,
              metadata: { ...block.metadata, [metadataField]: value },
            }
          }
          return { ...block, [field]: value }
        }
        return block
      }),
    )
  }

  const deleteContentBlock = (id: string) => {
    setContentBlocks(contentBlocks.filter((block) => block.id !== id))
  }

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = contentBlocks.findIndex((block) => block.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === contentBlocks.length - 1)) {
      return
    }
    const newBlocks = [...contentBlocks]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]]
    setContentBlocks(newBlocks.map((block, i) => ({ ...block, order: i })))
  }

  const handleSaveArticle = async () => {
    if (!title.trim()) {
      alert("Please enter a title")
      return
    }

    setUploading(true)
    try {
      const articleData = {
        title,
        featuredImage: featuredImage || null,
        category: category || "General",
        content: contentBlocks,
        published: true,
        createdAt: currentArticle?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: currentArticle?.views || 0,
      }

      if (currentArticle) {
        await update(dbRef(database, `news/${currentArticle.id}`), articleData)
        setSuccessMessage("Article updated successfully!")
      } else {
        await push(dbRef(database, "news"), articleData)
        setSuccessMessage("Article published successfully!")
      }

      setTimeout(() => setSuccessMessage(""), 3000)
      resetForm()
      loadArticles()
    } catch (error) {
      console.error("Error saving article:", error)
      alert("Error saving article")
    } finally {
      setUploading(false)
    }
  }

  const handleEditArticle = (article: NewsArticle) => {
    setCurrentArticle(article)
    setTitle(article.title)
    setFeaturedImage(article.featuredImage || "")
    setCategory(article.category || "")
    setContentBlocks(article.content || [])
    setEditing(true)
  }

  const handleDeleteArticle = async (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
      try {
        await remove(dbRef(database, `news/${id}`))
        setSuccessMessage("Article deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadArticles()
      } catch (error) {
        console.error("Error deleting article:", error)
      }
    }
  }

  const resetForm = () => {
    setEditing(false)
    setCurrentArticle(null)
    setTitle("")
    setFeaturedImage("")
    setCategory("")
    setContentBlocks([])
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <div className="hidden md:block">
        <Sidebar onFilterChange={handleFilterChange} activeFilter="settings" />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader />
        <div className="hidden md:block">
          <AdminNav />
        </div>

        <main className="flex-1 pt-12 md:pt-24 overflow-y-auto p-3 md:p-6 pb-24 md:pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl md:text-4xl font-bold text-foreground">News & Blog Management</h1>
              {!editing && (
                <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Button>
              )}
            </div>

            {successMessage && (
              <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
                {successMessage}
              </div>
            )}

            {editing ? (
              <div className="space-y-6">
                <Card className="bg-card border-border p-6">
                  <h2 className="text-xl font-bold text-foreground mb-4">
                    {currentArticle ? "Edit Article" : "Create New Article"}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Title *</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter article title"
                        className="text-lg font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Featured Image URL</label>
                        <Input
                          value={featuredImage}
                          onChange={(e) => setFeaturedImage(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                        <Input
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="News, Updates, etc."
                        />
                      </div>
                    </div>

                    {featuredImage && (
                      <div className="w-full h-48 bg-muted rounded overflow-hidden">
                        <img
                          src={featuredImage || "/placeholder.svg"}
                          alt="Featured"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="bg-card border-border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-foreground">Content Blocks</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={() => addContentBlock("header")} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" /> Header
                      </Button>
                      <Button onClick={() => addContentBlock("text")} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" /> Text
                      </Button>
                      <Button onClick={() => addContentBlock("image")} size="sm" variant="outline">
                        <ImageIcon className="w-4 h-4 mr-1" /> Image
                      </Button>
                      <Button onClick={() => addContentBlock("video")} size="sm" variant="outline">
                        <Video className="w-4 h-4 mr-1" /> Video
                      </Button>
                      <Button onClick={() => addContentBlock("link")} size="sm" variant="outline">
                        <Link2 className="w-4 h-4 mr-1" /> Link
                      </Button>
                      <Button onClick={() => addContentBlock("movie")} size="sm" variant="outline">
                        <Film className="w-4 h-4 mr-1" /> Movie
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {contentBlocks.map((block, index) => (
                      <Card key={block.id} className="bg-muted/50 border-border p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-muted-foreground uppercase">{block.type}</span>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => moveBlock(block.id, "up")}
                              size="sm"
                              variant="ghost"
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => moveBlock(block.id, "down")}
                              size="sm"
                              variant="ghost"
                              disabled={index === contentBlocks.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => deleteContentBlock(block.id)} size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {block.type === "header" && (
                          <Input
                            value={block.content}
                            onChange={(e) => updateContentBlock(block.id, "content", e.target.value)}
                            placeholder="Enter header text"
                            className="text-xl font-bold"
                          />
                        )}

                        {block.type === "text" && (
                          <textarea
                            value={block.content}
                            onChange={(e) => updateContentBlock(block.id, "content", e.target.value)}
                            placeholder="Enter paragraph text..."
                            className="w-full min-h-[100px] p-3 bg-background border border-border rounded-md resize-y"
                          />
                        )}

                        {block.type === "image" && (
                          <div className="space-y-2">
                            <Input
                              value={block.content}
                              onChange={(e) => updateContentBlock(block.id, "content", e.target.value)}
                              placeholder="Image URL"
                            />
                            <Input
                              value={block.metadata?.caption || ""}
                              onChange={(e) => updateContentBlock(block.id, "metadata.caption", e.target.value)}
                              placeholder="Caption (optional)"
                            />
                            {block.content && (
                              <img
                                src={block.content || "/placeholder.svg"}
                                alt="Preview"
                                className="w-full max-h-64 object-cover rounded"
                              />
                            )}
                          </div>
                        )}

                        {block.type === "video" && (
                          <Input
                            value={block.content}
                            onChange={(e) => updateContentBlock(block.id, "content", e.target.value)}
                            placeholder="Video URL (MP4, YouTube, etc.)"
                          />
                        )}

                        {block.type === "link" && (
                          <div className="space-y-2">
                            <Input
                              value={block.content}
                              onChange={(e) => updateContentBlock(block.id, "content", e.target.value)}
                              placeholder="Link text"
                            />
                            <Input
                              value={block.metadata?.url || ""}
                              onChange={(e) => updateContentBlock(block.id, "metadata.url", e.target.value)}
                              placeholder="URL"
                            />
                          </div>
                        )}

                        {block.type === "movie" && (
                          <div className="space-y-2">
                            <select
                              value={block.metadata?.movieId || ""}
                              onChange={(e) => {
                                const movie = movies.find((m) => m.id === e.target.value)
                                updateContentBlock(block.id, "metadata.movieId", e.target.value)
                                updateContentBlock(block.id, "metadata.movieTitle", movie?.title || "")
                                updateContentBlock(block.id, "content", movie?.streamlink || "")
                              }}
                              className="w-full bg-background border border-border rounded-md px-3 py-2"
                            >
                              <option value="">Select a movie to embed</option>
                              {movies.map((movie) => (
                                <option key={movie.id} value={movie.id}>
                                  {movie.title}
                                </option>
                              ))}
                            </select>
                            {block.metadata?.movieTitle && (
                              <p className="text-sm text-muted-foreground">Selected: {block.metadata.movieTitle}</p>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}

                    {contentBlocks.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No content blocks yet. Click the buttons above to add content.
                      </p>
                    )}
                  </div>
                </Card>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveArticle}
                    disabled={uploading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {uploading ? "Saving..." : currentArticle ? "Update Article" : "Publish Article"}
                  </Button>
                  <Button onClick={resetForm} variant="outline" className="flex-1 bg-transparent">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <Card
                    key={article.id}
                    className="bg-card border-border overflow-hidden hover:border-primary/50 transition"
                  >
                    {article.featuredImage && (
                      <div className="h-48 bg-muted overflow-hidden">
                        <img
                          src={article.featuredImage || "/placeholder.svg"}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-foreground mb-2 line-clamp-2">{article.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        {article.category && (
                          <span className="px-2 py-1 bg-primary/20 rounded">{article.category}</span>
                        )}
                        {article.views && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {article.views}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditArticle(article)}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteArticle(article.id)}
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {articles.length === 0 && (
                  <Card className="bg-card border-border p-12 col-span-full text-center">
                    <p className="text-muted-foreground mb-4">No articles yet. Create your first article!</p>
                    <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Article
                    </Button>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>

        <AdminMobileNav />
      </div>
    </div>
  )
}
