"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { database } from "@/lib/firebase"
import { ref as dbRef, get, update } from "firebase/database"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Eye, Calendar, ArrowLeft, MessageCircle } from "lucide-react"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import NexPlayer from "@/components/nex-player"
import { useAuth } from "@/lib/auth-context"
import { useSubscription } from "@/lib/subscription-context"

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

interface NewsArticle {
  id: string
  title: string
  featuredImage?: string
  category?: string
  createdAt: string
  views?: number
  content: ContentBlock[]
  comments?: { [key: string]: Comment }
}

interface Comment {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: string
}

export default function NewsDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const { hasActiveSubscription } = useSubscription()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [playingVideo, setPlayingVideo] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadArticle(params.id as string)
    }
  }, [params.id])

  const loadArticle = async (id: string) => {
    try {
      const articleRef = dbRef(database, `news/${id}`)
      const snapshot = await get(articleRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        setArticle({ id, ...data })

        // Increment views
        await update(articleRef, {
          views: (data.views || 0) + 1,
        })
      }
    } catch (error) {
      console.error("Error loading article:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      alert("Please login to comment")
      return
    }

    if (!commentText.trim()) {
      alert("Please enter a comment")
      return
    }

    setSubmittingComment(true)
    try {
      const commentRef = dbRef(database, `news/${params.id}/comments`)
      const newComment = {
        userId: user.uid,
        userName: user.displayName || user.email || "Anonymous",
        text: commentText,
        createdAt: new Date().toISOString(),
      }

      await update(commentRef, {
        [Date.now()]: newComment,
      })

      setCommentText("")
      loadArticle(params.id as string)
    } catch (error) {
      console.error("Error submitting comment:", error)
      alert("Error submitting comment")
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleFilterChange = (filter: string) => {
    if (filter === "settings") {
      router.push("/settings")
    } else {
      router.push(`/?filter=${filter}`)
    }
  }

  const renderContentBlock = (block: ContentBlock) => {
    switch (block.type) {
      case "header":
        return (
          <h2 key={block.id} className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            {block.content}
          </h2>
        )

      case "text":
        return (
          <p key={block.id} className="text-foreground/90 leading-relaxed mb-6 whitespace-pre-wrap">
            {block.content}
          </p>
        )

      case "image":
        return (
          <div key={block.id} className="mb-6">
            <img
              src={block.content || "/placeholder.svg"}
              alt={block.metadata?.caption || ""}
              className="w-full rounded-lg"
            />
            {block.metadata?.caption && (
              <p className="text-sm text-muted-foreground mt-2 text-center italic">{block.metadata.caption}</p>
            )}
          </div>
        )

      case "video":
        return (
          <div key={block.id} className="mb-6">
            <video src={block.content} controls className="w-full rounded-lg" />
          </div>
        )

      case "link":
        return (
          <a
            key={block.id}
            href={block.metadata?.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline mb-4 block"
          >
            {block.content} →
          </a>
        )

      case "movie":
        if (!hasActiveSubscription) {
          return (
            <Card key={block.id} className="bg-muted/50 border-border p-6 mb-6 text-center">
              <p className="text-foreground mb-4">🔒 Subscribe to watch: {block.metadata?.movieTitle}</p>
              <Button onClick={() => router.push("/subscribe")} className="bg-blue-600 hover:bg-blue-700">
                Subscribe Now
              </Button>
            </Card>
          )
        }

        return (
          <div key={block.id} className="mb-6">
            <div className="bg-muted/50 rounded-lg p-4 mb-2">
              <p className="text-sm text-muted-foreground mb-2">🎬 Embedded Movie: {block.metadata?.movieTitle}</p>
            </div>
            <NexPlayer
              src={block.content}
              poster=""
              onPlayVideo={() => setPlayingVideo(block.content)}
              onShowSubscription={() => router.push("/subscribe")}
              onRequireAuth={() => router.push("/login")}
            />
          </div>
        )

      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-4">Article not found</p>
          <Button onClick={() => router.push("/news")}>Back to News</Button>
        </div>
      </div>
    )
  }

  const comments = article.comments ? Object.entries(article.comments).map(([id, comment]) => ({ id, ...comment })) : []

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <div className="hidden md:block">
        <Sidebar onFilterChange={handleFilterChange} activeFilter="home" />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader />

        <main className="flex-1 pt-12 md:pt-16 overflow-y-auto p-3 md:p-6">
          <div className="max-w-4xl mx-auto">
            <Button onClick={() => router.push("/news")} variant="ghost" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to News
            </Button>

            <article>
              {article.featuredImage && (
                <div className="w-full h-64 md:h-96 bg-muted rounded-lg overflow-hidden mb-6">
                  <img
                    src={article.featuredImage || "/placeholder.svg"}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                {article.category && (
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded">{article.category}</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(article.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" /> {article.views || 0} views
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-8">{article.title}</h1>

              <div className="prose prose-invert max-w-none">
                {article.content?.sort((a, b) => a.order - b.order).map(renderContentBlock)}
              </div>
            </article>

            <Card className="bg-card border-border p-6 mt-12">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Comments ({comments.length})
              </h3>

              {user ? (
                <div className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full min-h-[100px] p-3 bg-background border border-border rounded-md resize-y mb-3"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={submittingComment}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {submittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-muted rounded-lg text-center">
                  <p className="text-muted-foreground mb-3">Please login to leave a comment</p>
                  <Button onClick={() => router.push("/login")} className="bg-blue-600 hover:bg-blue-700">
                    Login
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {comments
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-foreground/90">{comment.text}</p>
                    </div>
                  ))}

                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
