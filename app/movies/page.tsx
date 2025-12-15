"use client"

import { useState } from "react"
import Header from "@/components/header"
import GenreFilters from "@/components/genre-filters"
import ContentGrid from "@/components/content-grid"

export default function MoviesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-600 to-slate-700">
      <Header />
      <div className="px-0 py-6 sm:py-8">
        <GenreFilters onCategoryChange={setSelectedCategory} />
      </div>
      <div className="py-8 sm:py-12">
        <ContentGrid contentType="movie" title="Movies" selectedCategory={selectedCategory} />
      </div>
    </main>
  )
}
