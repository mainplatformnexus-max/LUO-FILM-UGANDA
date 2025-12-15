"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

const logos = [
  "/images/logo-1.png",
  "/images/logo-2.png",
  "/images/logo-3.jpeg",
  "/images/logo-4.jpeg",
  "/images/logo-5.jpeg",
  "/images/logo-6.png",
  "/images/logo-7.jpeg",
  "/images/logo-8.jpeg",
  "/images/logo-9.jpeg",
  "/images/logo-10.jpeg",
]

interface SlidingLogoProps {
  className?: string
}

export default function SlidingLogo({ className = "" }: SlidingLogoProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % logos.length)
    }, 3000) // Change logo every 3 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`relative ${className}`}>
      {logos.map((logo, index) => (
        <Image
          key={logo}
          src={logo || "/placeholder.svg"}
          alt="LUO FILM logo"
          width={40}
          height={40}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  )
}
