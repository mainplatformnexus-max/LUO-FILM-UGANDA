import { type NextRequest, NextResponse } from "next/server"
import { database } from "@/lib/firebase"
import { ref, get, set, remove } from "firebase/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get("token")

    if (!token) {
      console.error("[v0] Missing token parameter")
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    console.log("[v0] Stream request for token:", token.substring(0, 8) + "...")

    const tokenRef = ref(database, `downloadTokens/${token}`)
    const tokenSnapshot = await get(tokenRef)

    if (!tokenSnapshot.exists()) {
      console.error("[v0] Token not found in database")
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const tokenData = tokenSnapshot.val()

    console.log("[v0] Token data:", {
      expiresAt: new Date(tokenData.expiresAt).toISOString(),
      used: tokenData.used,
      hasStreamUrl: !!tokenData.streamUrl,
    })

    // Check if token has expired
    if (tokenData.expiresAt < Date.now()) {
      console.error("[v0] Token expired")
      await remove(tokenRef)
      return NextResponse.json({ error: "Token expired" }, { status: 401 })
    }

    // Check if token was already used
    if (tokenData.used) {
      console.error("[v0] Token already used")
      return NextResponse.json({ error: "Token already used" }, { status: 401 })
    }

    const { streamUrl, title } = tokenData

    console.log("[v0] Fetching video from:", streamUrl)

    let downloadUrl = streamUrl
    if (streamUrl.includes("drive.google.com")) {
      const fileIdMatch = streamUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || streamUrl.match(/id=([a-zA-Z0-9_-]+)/)
      if (fileIdMatch && fileIdMatch[1]) {
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}&confirm=t`
      }
    }

    console.log("[v0] Streaming from:", downloadUrl)

    const videoResponse = await fetch(downloadUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    })

    if (!videoResponse.ok) {
      console.error("[v0] Failed to fetch video:", videoResponse.status, videoResponse.statusText)
      return NextResponse.json({ error: `Failed to fetch video: ${videoResponse.statusText}` }, { status: 500 })
    }

    const contentType = videoResponse.headers.get("content-type") || "video/mp4"
    const contentLength = videoResponse.headers.get("content-length")

    console.log("[v0] Video metadata:", { contentType, contentLength })

    await set(tokenRef, { ...tokenData, used: true })

    const safeFilename = title.replace(/[^a-z0-9_\-\s]/gi, "_").replace(/\s+/g, "_")
    const filename = `${safeFilename}.mp4`

    console.log("[v0] Streaming video with filename:", filename)

    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    })

    if (contentLength) {
      headers.set("Content-Length", contentLength)
    }

    return new NextResponse(videoResponse.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("[v0] Stream download error:", error)
    return NextResponse.json(
      { error: `Failed to stream video: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
