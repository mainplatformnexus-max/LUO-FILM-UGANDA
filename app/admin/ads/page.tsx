"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AdminNav from "@/components/admin-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { database } from "@/lib/firebase"
import { ref as dbRef, push, get, remove } from "firebase/database"

interface Ad {
  id: string
  image: string
  title: string
  link?: string
}

export default function AdsManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [ads, setAds] = useState<Ad[]>([])
  const [newAd, setNewAd] = useState({
    image: "",
    title: "",
    link: "",
  })
  const [uploading, setUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadAds()
    }
  }, [isAdmin])

  const loadAds = async () => {
    try {
      const adsRef = dbRef(database, "ads")
      const snapshot = await get(adsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        const adsList = Object.entries(data).map(([id, value]: any) => ({
          id,
          ...value,
        }))
        setAds(adsList)
      }
    } catch (error) {
      console.error("Error loading ads:", error)
    }
  }

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newAd.image.trim()) {
      alert("Please enter an image URL")
      return
    }

    if (!newAd.title.trim()) {
      alert("Please enter a title")
      return
    }

    setUploading(true)
    try {
      const adsRef = dbRef(database, "ads")
      await push(adsRef, {
        image: newAd.image,
        title: newAd.title,
        link: newAd.link || null,
        createdAt: new Date().toISOString(),
      })

      setSuccessMessage("Ad added successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
      setNewAd({
        image: "",
        title: "",
        link: "",
      })
      loadAds()
    } catch (error) {
      console.error("Error adding ad:", error)
      alert("Error adding ad")
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAd = async (id: string) => {
    if (confirm("Are you sure you want to delete this ad?")) {
      try {
        await remove(dbRef(database, `ads/${id}`))
        setSuccessMessage("Ad deleted successfully!")
        setTimeout(() => setSuccessMessage(""), 3000)
        loadAds()
      } catch (error) {
        console.error("Error deleting ad:", error)
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white mb-8">Manage Advertisements</h1>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-400/50 rounded text-green-100">
            {successMessage}
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Add Advertisement</h2>
          <form onSubmit={handleAddAd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title *</label>
                <Input
                  value={newAd.title}
                  onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="Enter ad title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Image URL *</label>
                <Input
                  type="url"
                  value={newAd.image}
                  onChange={(e) => setNewAd({ ...newAd, image: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">Link (Optional)</label>
                <Input
                  type="url"
                  value={newAd.link}
                  onChange={(e) => setNewAd({ ...newAd, link: e.target.value })}
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <Button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {uploading ? "Adding..." : "Add Advertisement"}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-4">Current Advertisements</h2>
          {ads.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-6">
              <p className="text-white/70">No advertisements yet. Add one to get started!</p>
            </Card>
          ) : (
            ads.map((ad) => (
              <Card
                key={ad.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-4 hover:border-white/40 transition"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-white/5 rounded overflow-hidden flex-shrink-0">
                    <img src={ad.image || "/placeholder.svg"} alt={ad.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">{ad.title}</h3>
                    {ad.link && (
                      <p className="text-cyan-400 text-sm mb-2 truncate">
                        Link:{" "}
                        <a href={ad.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {ad.link}
                        </a>
                      </p>
                    )}
                    <Button onClick={() => handleDeleteAd(ad.id)} variant="destructive">
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
