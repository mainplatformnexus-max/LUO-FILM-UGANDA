"use client"

import { useState } from "react"

export default function Logo() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="flex items-center gap-2 sm:gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-9 h-9 md:w-11 md:h-11">
        <svg viewBox="0 0 44 44" className="w-full h-full">
          {/* Animated background glow */}
          <defs>
            <linearGradient id="dimpozGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer ring with animation */}
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            stroke="url(#dimpozGradient)"
            strokeWidth="2"
            className="transition-all duration-300"
            style={{
              strokeDasharray: isHovered ? "126" : "0 126",
              transform: isHovered ? "rotate(360deg)" : "rotate(0deg)",
              transformOrigin: "center",
              transition: "all 0.6s ease-in-out",
            }}
          />

          {/* Inner animated circle */}
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="url(#dimpozGradient)"
            opacity={isHovered ? "0.2" : "0.15"}
            className="transition-opacity duration-300"
          />

          {/* Play button with animation */}
          <g
            className="transition-transform duration-300"
            style={{ transform: isHovered ? "scale(1.1)" : "scale(1)", transformOrigin: "center" }}
          >
            <path
              d="M 16 13 L 16 31 L 31 22 Z"
              fill="currentColor"
              className="text-cyan-400 transition-colors duration-300"
              filter={isHovered ? "url(#glow)" : ""}
            />
          </g>

          {/* Film strip decorations */}
          <g opacity={isHovered ? "1" : "0.7"} className="transition-opacity duration-300">
            <rect x="10" y="10" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-blue-400" />
            <rect x="10" y="20.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-purple-400" />
            <rect x="10" y="31" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-violet-400" />

            <rect x="31.5" y="10" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-blue-400" />
            <rect x="31.5" y="20.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-purple-400" />
            <rect x="31.5" y="31" width="2.5" height="2.5" rx="0.5" fill="currentColor" className="text-violet-400" />
          </g>
        </svg>
      </div>

      <div className="hidden sm:block">
        <div className="flex flex-col leading-none">
          <span
            className="font-black text-base md:text-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent transition-all duration-300"
            style={{
              backgroundSize: isHovered ? "200% 100%" : "100% 100%",
              backgroundPosition: isHovered ? "right center" : "left center",
            }}
          >
            DIMPOZ
          </span>
          <span className="text-[10px] md:text-xs font-bold tracking-wider text-slate-400 uppercase">Movies</span>
        </div>
      </div>

      {/* Mobile version - shorter text */}
      <span className="sm:hidden font-black text-sm bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
        DIMPOZ
      </span>
    </div>
  )
}
