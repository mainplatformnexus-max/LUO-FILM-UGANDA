"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import TopHeader from "@/components/top-header"
import { database } from "@/lib/firebase"
import { ref as dbRef, get } from "firebase/database"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import CustomVideoPlayer from "@/components/custom-video-player"

interface LiveChannel {
  id: string
  name: string
  poster: string
  streamUrl: string
  description?: string
}

export default function WatchLiveChannelPage() {
  const params = useParams()
  const router = useRouter()
  const channelId = params.id as string
  const [channel, setChannel] = useState<LiveChannel | null>(null)
  const [loading, setLoading] = useState(true)
  const [videoError, setVideoError] = useState("")

  useEffect(() => {
    loadChannel()
  }, [channelId])

  const loadChannel = async () => {
    try {
      const channelRef = dbRef(database, `liveTV/${channelId}`)
      const snapshot = await get(channelRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        setChannel({
          id: channelId,
          ...data,
        })
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading channel:", error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Channel not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopHeader />

      <main className="flex-1 pt-24 md:pt-32 pb-12 px-3 md:px-6 flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 w-fit text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex-1 bg-black rounded-lg overflow-hidden mb-6">
            {videoError && (
              <div className="w-full h-96 md:h-[600px] flex items-center justify-center bg-muted">
                <p className="text-red-500">{videoError}</p>
              </div>
            )}
            {channel && (
              <CustomVideoPlayer src={channel.streamUrl} title={channel.name} poster={channel.poster} autoPlay={true} />
            )}
          </div>

          <Card className="bg-card border-border p-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{channel.name}</h1>
            {channel.description && <p className="text-muted-foreground mb-4">{channel.description}</p>}
            <p className="text-sm text-muted-foreground">
              Now streaming from: <span className="text-cyan-400">{channel.streamUrl}</span>
            </p>
          </Card>
        </div>
      </main>
    </div>
  )
}
