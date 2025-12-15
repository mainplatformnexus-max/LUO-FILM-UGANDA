"use client"

import { useState } from "react"
import { Flame, Swords, Heart, Sparkles, Ghost, Star, Moon } from "lucide-react"

const genres = [
  { id: "Trending", name: "Trending", icon: Flame },
  { id: "Action", name: "Action", icon: Swords },
  { id: "Romance", name: "Romance", icon: Heart },
  { id: "Animation", name: "Animation", icon: Sparkles },
  { id: "Horror", name: "Horror", icon: Ghost },
  { id: "Special", name: "Special", icon: Star },
  { id: "Drabor", name: "Drabor", icon: Moon },
]

interface GenreFiltersProps {
  onCategoryChange?: (category: string) => void
}

export default function GenreFilters({ onCategoryChange }: GenreFiltersProps) {
  const [activeGenre, setActiveGenre] = useState("Trending")

  const handleGenreClick = (genreId: string) => {
    setActiveGenre(genreId)
    onCategoryChange?.(genreId)
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 px-4 sm:px-6 scrollbar-hide">
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {genres.map((genre) => {
        const Icon = genre.icon
        const isActive = activeGenre === genre.id
        return (
          <button
            key={genre.id}
            onClick={() => handleGenreClick(genre.id)}
            className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full whitespace-nowrap transition text-xs sm:text-sm font-medium flex-shrink-0 ${
              isActive ? "bg-slate-400 text-slate-900" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{genre.name}</span>
            <span className="sm:hidden">{genre.name.slice(0, 3)}</span>
          </button>
        )
      })}
    </div>
  )
}
