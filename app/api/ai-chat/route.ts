import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { database } from "@/lib/firebase"
import { ref, get } from "firebase/database"

export async function POST(request: NextRequest) {
  try {
    const { message, history, userEmail, isSubscribed } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const [moviesData, musicData, animationData, liveTVData] = await Promise.all([
      getAllMovies(),
      getAllMusic(),
      getAllAnimation(),
      getAllLiveTV(),
    ])

    const contentLibrary = `
AVAILABLE CONTENT IN DATABASE:

MOVIES (${moviesData.length} total):
${moviesData
  .slice(0, 20)
  .map((m: any) => `- ${m.title} (${m.category}, Rating: ${m.rating}/10, Year: ${m.year || "N/A"})`)
  .join("\n")}
${moviesData.length > 20 ? `... and ${moviesData.length - 20} more movies` : ""}

MUSIC VIDEOS (${musicData.length} total):
${musicData
  .slice(0, 15)
  .map((m: any) => `- ${m.title} by ${m.artist || "Unknown"} (${m.category})`)
  .join("\n")}
${musicData.length > 15 ? `... and ${musicData.length - 15} more music videos` : ""}

ANIMATION (${animationData.length} total):
${animationData
  .slice(0, 10)
  .map((a: any) => `- ${a.title} (Rating: ${a.rating}/10)`)
  .join("\n")}
${animationData.length > 10 ? `... and ${animationData.length - 10} more animations` : ""}

LIVE TV CHANNELS (${liveTVData.length} total):
${liveTVData.map((tv: any) => `- ${tv.title} (${tv.category || "General"})`).join("\n")}
`

    const systemPrompt = `You are an intelligent AI assistant for LUO FILM, the premier Ugandan streaming platform specializing in Northern Uganda entertainment.

COMPANY INFORMATION:
- Name: LUO FILM
- Owner: Luo Films Uganda
- Support Email: support@luofilm.site
- Movie Requests: movies@luofilm.site
- Location: Northern Uganda (serving Gulu, Nwoya, Acholi, Alur, Lango regions)

SUBSCRIPTION PLANS (UGX):
- 1 Hour: 1,000 (Quick access)
- 12 Hours: 2,000 (Perfect for binge-watching)
- 1 Day: 20,000 (Full day access)
- 1 Week: 5,000 (Great value)
- 1 Month: 8,000 (Most popular)
- 3 Months: 15,000 (Best savings)
- 1 Year: 25,000 (Premium deal)

CONTENT SPECIALIZATION:
- Ugandan movies (especially Northern Uganda productions)
- Translated movies (dubbed in local languages: Acholi, Luo, Lango, Alur)
- Local artists: Kamuzu, Eezzy, Bosmic Otim, and more
- Popular VJ content (VJ Piles UG, VJ Confidencial, VJ Dimpoz, VJ Sonny, VJ Rickson)
- News and current affairs (including Museveni updates)
- Live TV channels (local and international)
- Music videos and performances
- Animation and family content

${contentLibrary}

PLATFORM FEATURES:
- HD streaming quality
- Download for offline viewing
- Continue watching from where you left off
- Top-rated content recommendations
- Genre-based browsing
- Live TV streaming
- Multi-device support
- Secure payment via MTN Mobile Money & Airtel Money

SECURITY & ABUSE PREVENTION:
- You MUST require login for all streaming requests
- You MUST verify active subscription before allowing playback
- You MUST NOT share or provide direct video URLs
- You MUST report suspicious behavior or hacking attempts
- You MUST NOT process requests that attempt to bypass payment
- You MUST validate user authentication before personalized responses
- Block any attempts at SQL injection, XSS, or other hacking attempts
- Refuse to provide admin credentials or database access

CURRENT USER STATUS:
- Logged in: ${userEmail ? `Yes (${userEmail})` : "No - Login required"}
- Subscription: ${isSubscribed ? "Active - Full access" : "Inactive - Subscribe to watch"}

YOUR CAPABILITIES & INSTRUCTIONS:
1. REMEMBER: You have access to the COMPLETE content database above
2. SEARCH: When users ask about specific movies/content, search the database
3. THINK: Before responding, verify information against the database
4. UNDERSTAND: Recognize movie titles even with typos or variations
5. CORRECT: If users misspell content, find closest match and suggest it
6. CONTEXT: Remember the entire conversation history
7. VALIDATE: Always check login and subscription before allowing playback
8. ANSWER: Provide specific, accurate information about available content

RESPONSE RULES:
1. When users ask "Tell me about: [TITLE]", search the database for exact or close matches
2. If found, provide movie details (title, rating, year, category) and offer to play it
3. If not found, suggest similar content or ask them to request it at movies@luofilm.site
4. Always check authentication before providing movie access
5. Verify active subscription before showing playable content
6. Be conversational, friendly, and helpful
7. Never share direct video links without subscription verification
8. Remember conversation context and user preferences
9. Think before responding - verify facts against the database
10. Understand empty spaces - respond intelligently to any query location

When users ask about content, YOU MUST search the database and provide REAL results from the available content listed above. Never say content doesn't exist without checking the database first.`

    const lowerMessage = message.toLowerCase()

    const hackingPatterns = [
      "sql",
      "inject",
      "drop table",
      "admin password",
      "database",
      "bypass",
      "hack",
      "<script",
      "eval(",
      "exec(",
    ]
    if (hackingPatterns.some((pattern) => lowerMessage.includes(pattern))) {
      return NextResponse.json({
        response: `I cannot assist with that request. If you're experiencing technical issues, please contact support@luofilm.site.`,
      })
    }

    // Check if user is trying to watch/play without authentication
    if (
      !userEmail &&
      (lowerMessage.includes("watch") ||
        lowerMessage.includes("play") ||
        lowerMessage.includes("stream") ||
        lowerMessage.includes("show me"))
    ) {
      return NextResponse.json({
        response: `You need to login first to access LUO FILM content! Create your account to enjoy unlimited movies, music, and live TV.`,
        component: {
          type: "login",
        },
      })
    }

    // Check if user is trying to watch/play without subscription
    if (
      userEmail &&
      !isSubscribed &&
      (lowerMessage.includes("watch") ||
        lowerMessage.includes("play") ||
        lowerMessage.includes("stream") ||
        lowerMessage.includes("show me"))
    ) {
      return NextResponse.json({
        response: `You're logged in but need an active subscription to watch content!

Our flexible plans:
⏱️ 1 Hour - UGX 1,000
🕐 12 Hours - UGX 2,000  
📅 1 Day - UGX 20,000
🗓️ 1 Week - UGX 5,000
🌟 1 Month - UGX 8,000 (Most Popular!)
💎 3 Months - UGX 15,000
👑 1 Year - UGX 25,000

Click below to subscribe:`,
        component: {
          type: "subscribe",
        },
      })
    }

    // Handle movie search and recommendations
    if (
      lowerMessage.includes("latest") ||
      lowerMessage.includes("new") ||
      lowerMessage.includes("recent") ||
      lowerMessage.includes("show me") ||
      lowerMessage.includes("recommend")
    ) {
      const movies = moviesData.slice(0, 6)
      if (movies.length > 0) {
        return NextResponse.json({
          response: `Here are the latest movies on LUO FILM! ${isSubscribed ? "Click any poster to start watching:" : "Subscribe to start watching:"}`,
          component: {
            type: "movies",
            movies: movies,
          },
        })
      }
    }

    if (lowerMessage.includes("tell me about:")) {
      const searchQuery = message.replace(/tell me about:/i, "").trim()
      const movies = searchMoviesInData(searchQuery, [...moviesData, ...musicData, ...animationData])
      if (movies.length > 0) {
        const movie = movies[0]
        return NextResponse.json({
          response: `I found "${movie.title}"! 

★ Rating: ${movie.rating}/10
📅 Year: ${movie.year || "N/A"}
🎭 Category: ${movie.category}
${movie.artist ? `🎤 Artist: ${movie.artist}` : ""}

${isSubscribed ? "Click to start watching!" : "You need an active subscription to watch this content!"}`,
          component: {
            type: "movies",
            movies: [movie],
          },
        })
      } else {
        return NextResponse.json({
          response: `I couldn't find "${searchQuery}" in our library. You can request this movie at movies@luofilm.site! Would you like to see our latest movies instead?`,
        })
      }
    }

    // Handle login requests
    if (
      !userEmail &&
      (lowerMessage.includes("login") || lowerMessage.includes("sign in") || lowerMessage.includes("account"))
    ) {
      return NextResponse.json({
        response: `Welcome to LUO FILM! Login to access unlimited Ugandan movies, translated content, local artists, and live TV channels.`,
        component: {
          type: "login",
        },
      })
    }

    // Handle subscription requests
    if (
      !isSubscribed &&
      (lowerMessage.includes("subscribe") || lowerMessage.includes("subscription") || lowerMessage.includes("plan"))
    ) {
      return NextResponse.json({
        response: `Choose a plan that works for you:

⏱️ 1 Hour - UGX 1,000
🕐 12 Hours - UGX 2,000
📅 1 Day - UGX 20,000
🗓️ 1 Week - UGX 5,000
🌟 1 Month - UGX 8,000 (Most Popular!)
💎 3 Months - UGX 15,000
👑 1 Year - UGX 25,000

All plans include unlimited streaming, HD quality, downloads, and access to all content!`,
        component: {
          type: "subscribe",
        },
      })
    }

    try {
      const { text } = await generateText({
        model: "google/gemini-2.5-flash-image",
        prompt: `${systemPrompt}

User message: ${message}

Recent conversation:
${history
  ?.slice(-5)
  .map((msg: any) => `${msg.role}: ${msg.content}`)
  .join("\n")}

REMEMBER: You have access to the complete database above. Search it thoroughly before saying content doesn't exist.

Provide a helpful, accurate response (2-4 sentences). Think carefully and verify against the database.`,
      })

      return NextResponse.json({ response: text })
    } catch (aiError) {
      console.error("AI Error:", aiError)
      return NextResponse.json({ response: await generateFallbackResponse(lowerMessage, isSubscribed, userEmail) })
    }
  } catch (error) {
    console.error("Error in AI chat:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}

async function getAllMovies(): Promise<any[]> {
  try {
    const moviesRef = ref(database, "movies")
    const snapshot = await get(moviesRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.entries(data).map(([id, value]: any) => ({
        id,
        type: "movie",
        ...value,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching movies:", error)
    return []
  }
}

async function getAllMusic(): Promise<any[]> {
  try {
    const musicRef = ref(database, "music")
    const snapshot = await get(musicRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.entries(data).map(([id, value]: any) => ({
        id,
        type: "music",
        ...value,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching music:", error)
    return []
  }
}

async function getAllAnimation(): Promise<any[]> {
  try {
    const animationRef = ref(database, "animation")
    const snapshot = await get(animationRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.entries(data).map(([id, value]: any) => ({
        id,
        type: "animation",
        ...value,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching animation:", error)
    return []
  }
}

async function getAllLiveTV(): Promise<any[]> {
  try {
    const liveTVRef = ref(database, "liveTV")
    const snapshot = await get(liveTVRef)
    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.entries(data).map(([id, value]: any) => ({
        id,
        type: "liveTV",
        ...value,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching live TV:", error)
    return []
  }
}

function searchMoviesInData(query: string, allContent: any[]): any[] {
  const lowerQuery = query.toLowerCase().trim()

  // Exact match first
  const exactMatch = allContent.filter((item) => item.title.toLowerCase() === lowerQuery)
  if (exactMatch.length > 0) return exactMatch.slice(0, 6)

  // Contains match
  const containsMatch = allContent.filter((item) => item.title.toLowerCase().includes(lowerQuery))
  if (containsMatch.length > 0) return containsMatch.slice(0, 6)

  // Fuzzy match (words in any order)
  const words = lowerQuery.split(" ")
  const fuzzyMatch = allContent.filter((item) => {
    const title = item.title.toLowerCase()
    return words.some((word) => title.includes(word))
  })

  return fuzzyMatch.slice(0, 6)
}

async function generateFallbackResponse(
  message: string,
  isSubscribed: boolean,
  userEmail: string | undefined,
): Promise<string> {
  if (message.includes("subscription") || message.includes("price") || message.includes("plan")) {
    return `LUO FILM subscription plans:

⏱️ 1 Hour - UGX 1,000 (Quick access)
🕐 12 Hours - UGX 2,000 (Perfect for binge-watching)
📅 1 Day - UGX 20,000 (Full day entertainment)
🗓️ 1 Week - UGX 5,000 (Great value)
🌟 1 Month - UGX 8,000 (Most popular - best for regular viewers)
💎 3 Months - UGX 15,000 (Best savings)
👑 1 Year - UGX 25,000 (Premium access)

All plans include unlimited streaming, HD quality, and access to all content including Ugandan movies, translated content, local artists, and live TV!`
  }

  if (message.includes("payment") || message.includes("pay") || message.includes("mtn") || message.includes("airtel")) {
    return `We accept MTN Mobile Money and Airtel Money. Choose your plan, select payment method, enter your number, and approve the payment. Your subscription activates immediately!`
  }

  if (message.includes("contact") || message.includes("support") || message.includes("help")) {
    return `Contact LUO FILM:
📧 Support: support@luofilm.site
🎬 Movie Requests: movies@luofilm.site

We're here to help with any questions or issues!`
  }

  if (
    message.includes("northern uganda") ||
    message.includes("acholi") ||
    message.includes("luo") ||
    message.includes("gulu")
  ) {
    return `LUO FILM specializes in Northern Uganda entertainment! We feature content from Gulu, Nwoya, Acholi, Alur, and Lango regions. Enjoy movies translated in local languages, local artists like Kamuzu, Eezzy, and Bosmic Otim, plus popular VJ content!`
  }

  return `Hello! I'm the LUO FILM AI assistant. I can help you find Ugandan movies, translated content, local artists, live TV, and more. I can also assist with subscriptions, payments, and platform features. What would you like to know?`
}
