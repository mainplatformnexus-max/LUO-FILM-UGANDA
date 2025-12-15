"use client"

import { useEffect, useState } from "react"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import { database } from "@/lib/firebase"
import { ref as dbRef, get } from "firebase/database"
import { Play } from "lucide-react"
import { useRouter } from "next/navigation"

interface LiveChannel {
  id: string
  name: string
  poster: string
  streamUrl: string
  description?: string
}

export default function LiveTVPage() {
  const [channels, setChannels] = useState<LiveChannel[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      const channelsRef = dbRef(database, "liveTV")
      const snapshot = await get(channelsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const channelsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setChannels(channelsList)
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading channels:", error)
      setLoading(false)
    }
  }

  const handleChannelClick = (channelId: string) => {
    router.push(`/live-tv/${channelId}`)
  }

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopHeader />

        <main className="flex-1 overflow-y-auto pt-24 md:pt-32 pb-24 md:pb-12 px-3 md:px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Live TV Channels</h1>
            <p className="text-muted-foreground mb-8">Watch live television channels</p>

            {loading ? (
              <div className="flex items-center justify-center min-h-96">
                <p className="text-muted-foreground">Loading channels...</p>
              </div>
            ) : channels.length === 0 ? (
              <div className="flex items-center justify-center min-h-96">
                <p className="text-muted-foreground">No live TV channels available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className="group relative h-48 md:h-56 rounded-lg overflow-hidden bg-muted/30 hover:ring-2 hover:ring-primary transition-all duration-300 cursor-pointer"
                  >
                    <img
                      src={channel.poster || "/placeholder.svg"}
                      alt={channel.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center">
                      <Play className="w-12 h-12 text-white mb-2 fill-white" />
                      <p className="text-white font-semibold text-center px-2">{channel.name}</p>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                      <p className="text-white text-sm font-semibold truncate">{channel.name}</p>
                      {channel.description && <p className="text-white/70 text-xs truncate">{channel.description}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
