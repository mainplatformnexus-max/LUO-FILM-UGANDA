import { type NextRequest, NextResponse } from "next/server"
import { database } from "@/lib/firebase"
import { ref, get, set, remove } from "firebase/database"
import crypto from "crypto"

interface DownloadRequest {
  userId: string
  contentId: string
  contentType: string
  streamUrl: string
  title: string
}

const activeTokens = new Map<
  string,
  {
    userId: string
    contentId: string
    streamUrl: string
    title: string
    expiresAt: number
    used: boolean
  }
>()

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json()
    const { userId, contentId, contentType, streamUrl, title } = body

    console.log("[v0] Download API received:", { userId, contentId, contentType, title, hasUrl: !!streamUrl })

    // Validate required fields
    if (!userId || !contentId || !streamUrl || !title) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user is admin first
    const userRef = ref(database, `users/${userId}`)
    const userSnapshot = await get(userRef)
    const userData = userSnapshot.val()
    const isAdmin = userSnapshot.exists() && userData?.isAdmin === true

    console.log("[v0] User data:", { exists: userSnapshot.exists(), isAdmin })

    // Admin bypass subscription check
    if (isAdmin) {
      console.log("[v0] Admin user - bypassing subscription check")
      const token = generateSecureToken()
      const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

      await set(ref(database, `downloadTokens/${token}`), {
        userId,
        contentId,
        streamUrl,
        title,
        expiresAt,
        used: false,
      })

      const downloadUrl = `/api/download/stream?token=${token}`
      return NextResponse.json({
        success: true,
        downloadUrl,
        token,
        expiresAt: new Date(expiresAt).toISOString(),
        message: "Download authorized (Admin)",
      })
    }

    const subscriptionRef = ref(database, `subscriptions/${userId}`)
    const subscriptionSnapshot = await get(subscriptionRef)

    console.log("[v0] Subscription check:", { exists: subscriptionSnapshot.exists() })

    if (!subscriptionSnapshot.exists()) {
      return NextResponse.json(
        {
          error: "Subscription expired. Subscribe to continue download.",
          requiresSubscription: true,
        },
        { status: 403 },
      )
    }

    const subscription = subscriptionSnapshot.val()
    const endDate = new Date(subscription.endDate)
    const now = new Date()

    console.log("[v0] Subscription status:", {
      endDate: endDate.toISOString(),
      now: now.toISOString(),
      active: subscription.active,
      isExpired: endDate < now,
    })

    // Verify subscription is still active
    if (endDate < now || !subscription.active) {
      return NextResponse.json(
        {
          error: "Subscription expired. Subscribe to continue download.",
          requiresSubscription: true,
        },
        { status: 403 },
      )
    }

    const token = generateSecureToken()
    const expiresAt = Date.now() + 60 * 60 * 1000 // 1 hour

    await set(ref(database, `downloadTokens/${token}`), {
      userId,
      contentId,
      streamUrl,
      title,
      expiresAt,
      used: false,
    })

    console.log("[v0] Download authorized, token stored in Firebase")

    const downloadUrl = `/api/download/stream?token=${token}`

    return NextResponse.json({
      success: true,
      downloadUrl,
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      message: "Download authorized",
    })
  } catch (error) {
    console.error("[v0] Download API error:", error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    const tokenRef = ref(database, `downloadTokens/${token}`)
    const tokenSnapshot = await get(tokenRef)

    if (!tokenSnapshot.exists()) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const tokenData = tokenSnapshot.val()
    const now = Date.now()

    if (tokenData.expiresAt < now) {
      await remove(tokenRef)
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    if (tokenData.used) {
      await remove(tokenRef)
      return NextResponse.json({ error: "Token already used" }, { status: 401 })
    }

    // Mark token as used
    await set(tokenRef, { ...tokenData, used: true })

    return NextResponse.json({ valid: true, message: "Token is valid" })
  } catch (error) {
    console.error("[v0] Token validation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

// Cleanup expired tokens periodically
setInterval(
  async () => {
    const now = Date.now()
    const downloadTokensRef = ref(database, `downloadTokens`)
    const downloadTokensSnapshot = await get(downloadTokensRef)
    const downloadTokens = downloadTokensSnapshot.val()

    if (downloadTokens) {
      for (const token in downloadTokens) {
        const data = downloadTokens[token]
        if (data.expiresAt < now || data.used) {
          await remove(ref(database, `downloadTokens/${token}`))
        }
      }
    }
  },
  5 * 60 * 1000,
) // Clean up every 5 minutes
