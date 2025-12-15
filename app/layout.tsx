import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { SubscriptionProvider } from "@/lib/subscription-context"
import { PlayerProvider } from "@/lib/player-context"
import { ThemeProvider } from "@/components/theme-provider"
import SecurityGuard from "@/components/security-guard"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "LUO FILM - Ugandan Movies, Translated Movies, Northern Uganda Entertainment | Stream & Download",
  description:
    "Watch the best Ugandan movies, translated films in Acholi, Luo, Lango, Alur languages. Stream content from Kamuzu, Eezzy, Bosmic Otim, VJ Piles UG, VJ Confidencial, VJ Dimpoz, VJ Sonny, VJ Rickson. Northern Uganda entertainment hub featuring Gulu, Nwoya, Acholi movies, local artists, live TV, news, and Museveni updates.",
  keywords: [
    "Ugandan movies",
    "translated movies",
    "Northern Uganda movies",
    "Acholi movies",
    "Luo film",
    "Gulu movies",
    "Nwoya entertainment",
    "Kamuzu",
    "Eezzy",
    "Bosmic Otim",
    "VJ Piles UG",
    "VJ Confidencial",
    "VJ Dimpoz",
    "VJ Sonny",
    "VJ Rickson",
    "Museveni news",
    "Uganda live TV",
    "Acholi entertainment",
    "Lango movies",
    "Alur films",
    "local artists Uganda",
    "Northern Uganda entertainment",
    "Ugandan film industry",
    "African movies",
    "East African cinema",
    "stream Ugandan movies",
    "download Ugandan films",
    "Uganda entertainment platform",
  ],
  authors: [{ name: "Luo Films Uganda" }],
  creator: "Luo Films Uganda",
  publisher: "Luo Films Uganda",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LUO FILM",
  },
  applicationName: "LUO FILM",
  formatDetection: {
    telephone: false,
  },
  metadataBase: new URL("https://luofilm.site"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "LUO FILM - Ugandan Movies & Northern Uganda Entertainment",
    description:
      "Stream Ugandan movies, translated films, local artists, and live TV. Featuring Kamuzu, Eezzy, Bosmic, VJ Piles UG, and more Northern Uganda content.",
    url: "https://luofilm.site",
    siteName: "LUO FILM",
    type: "website",
    locale: "en_UG",
  },
  twitter: {
    card: "summary_large_image",
    title: "LUO FILM - Ugandan Movies & Entertainment",
    description: "Stream Ugandan movies, translated films, and Northern Uganda entertainment.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#eab308" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className={`font-sans antialiased`}>
        <ThemeProvider defaultTheme="dark" attribute="class" enableSystem>
          <AuthProvider>
            <SubscriptionProvider>
              <PlayerProvider>
                <SecurityGuard />
                {children}
              </PlayerProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
