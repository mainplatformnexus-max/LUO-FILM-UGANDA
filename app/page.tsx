"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import Sidebar from "@/components/sidebar"
import TopHeader from "@/components/top-header"
import HeroCarousel from "@/components/hero-carousel"
import ContinueWatching from "@/components/continue-watching"
import TopRatedSection from "@/components/top-rated-section"
import GenresSection from "@/components/genres-section"
import PopularGrid from "@/components/popular-grid"
import MobileCategories from "@/components/mobile-categories"
import SubscriptionModal from "@/components/subscription-modal"
import AuthModal from "@/components/auth-modal"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import MobileHeader from "@/components/mobile-header"
import WelcomeBanner from "@/components/welcome-banner"
import { AIAssistant } from "@/components/ai-assistant"
import AdsCarousel from "@/components/ads-carousel"
import SlidingAds from "@/components/sliding-ads"

export default function Home() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeFilter, setActiveFilter] = useState("home")
  const [activeTab, setActiveTab] = useState<"movies" | "series" | "anime">("series")
  const [playingVideo, setPlayingVideo] = useState<{
    url: string
    title: string
    contentId: string
    contentType: string
  } | null>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [returnUrl, setReturnUrl] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!loading && !user && searchParams.get("requiresAuth")) {
      setShowAuthModal(true)
      setReturnUrl(searchParams.get("from") || "/")
    }
  }, [loading, user, searchParams])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleTabChange = (tab: "movies" | "series" | "anime") => {
    setActiveTab(tab)
    setActiveFilter(tab)
  }

  const handleAuthSuccess = () => {
    setShowAuthModal(false)
    if (returnUrl && returnUrl !== "/") {
      router.push(returnUrl)
    }
  }

  const handleRequireAuth = () => {
    setShowAuthModal(true)
    setReturnUrl(window.location.href)
  }

  const handleFilterChange = (filter: string) => {
    if (filter === "settings") {
      if (!user) {
        setShowAuthModal(true)
        return
      }
      router.push("/settings")
      return
    }
    if (filter === "subscription") {
      setShowSubscriptionModal(true)
      return
    }
    if (filter === "admin") {
      router.push("/admin")
      return
    }
    setActiveFilter(filter)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setActiveFilter("search")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      <WelcomeBanner />

      <div className="hidden md:block">
        <Sidebar onFilterChange={handleFilterChange} activeFilter={activeFilter} />
      </div>

      <div className={`flex-1 ${isMobile ? "" : "md:ml-16"} flex flex-col h-screen overflow-hidden`}>
        <div className="hidden md:block">
          <TopHeader onTabChange={handleTabChange} activeTab={activeTab} onSearch={handleSearch} />
        </div>

        <MobileHeader onSearch={handleSearch} />

        <MobileCategories activeFilter={activeFilter} onFilterChange={handleFilterChange} />

        <main className="flex-1 pt-2 md:pt-12 overflow-hidden flex flex-col md:flex-row pb-16 md:pb-0">
          <div className="flex-1 overflow-y-auto scrollbar-hide p-1 md:p-3">
            <div className="mb-1 md:mb-3">
              <HeroCarousel
                playingVideo={playingVideo}
                onPlayVideo={setPlayingVideo}
                onShowSubscription={() => setShowSubscriptionModal(true)}
                onRequireAuth={handleRequireAuth}
              />
            </div>

            <div className="mb-3 md:mb-4">
              <SlidingAds />
            </div>

            <AdsCarousel />

            <PopularGrid
              activeFilter={activeFilter}
              searchQuery={activeFilter === "search" ? searchQuery : ""}
              onPlayVideo={setPlayingVideo}
              onShowSubscription={() => setShowSubscriptionModal(true)}
              onRequireAuth={handleRequireAuth}
            />
          </div>

          <div
            className="hidden md:flex w-52 flex-col p-2 space-y-2 flex-shrink-0 overflow-y-auto scrollbar-hide"
            style={{ maxHeight: "calc(100vh - 120px)" }}
          >
            <div className="flex-shrink-0">
              <ContinueWatching onPlayVideo={setPlayingVideo} onRequireAuth={handleRequireAuth} />
            </div>
            <div className="flex-shrink-0">
              <TopRatedSection onPlayVideo={setPlayingVideo} onRequireAuth={handleRequireAuth} />
            </div>
            <div className="flex-shrink-0">
              <GenresSection onFilterChange={handleFilterChange} />
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav isMobile={isMobile} activeFilter={activeFilter} onFilterChange={handleFilterChange} />

      <SubscriptionModal isOpen={showSubscriptionModal} onClose={() => setShowSubscriptionModal(false)} />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={handleAuthSuccess} />

      <AIAssistant
        onShowSubscription={() => setShowSubscriptionModal(true)}
        onShowLogin={() => setShowAuthModal(true)}
        onPlayVideo={setPlayingVideo}
      />
    </div>
  )
}
