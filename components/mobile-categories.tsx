"use client"

import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MobileCategoriesProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
}

export default function MobileCategories({ activeFilter, onFilterChange }: MobileCategoriesProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const categories = [
    { label: 'Home', value: 'home' },
    { label: 'Movies', value: 'movies' },
    { label: 'Series', value: 'series' },
    { label: 'Anime', value: 'anime' },
    { label: 'Nigerian', value: 'nigerian' },
    { label: 'Music', value: 'music' },
    { label: 'Top Rated', value: 'top-rated' },
    { label: 'Originals', value: 'originals' },
  ]

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0)
      setCanScrollRight(
        scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
      )
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 150
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 300)
    }
  }

  return (
    <div className="relative bg-[#141620] border-b border-[#2a2d3a] md:hidden sticky top-0 z-30">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-gradient-to-r from-[#141620] to-transparent"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide p-3"
        onScroll={checkScroll}
      >
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onFilterChange(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
              activeFilter === cat.value
                ? 'bg-[#e50914] text-white'
                : 'bg-[#2a2d3a] text-[#9ca3af] hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-gradient-to-l from-[#141620] to-transparent"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      )}
    </div>
  )
}
