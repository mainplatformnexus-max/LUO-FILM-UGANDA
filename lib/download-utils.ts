interface SecureDownloadResponse {
  success: boolean
  downloadUrl: string
  token: string
  expiresAt: string
  message: string
  error?: string
  requiresSubscription?: boolean
}

export async function requestSecureDownload(
  userId: string | undefined,
  contentId: string | undefined,
  contentType: string,
  streamUrl: string | undefined,
  title: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !contentId || !streamUrl || !title) {
      console.log("[v0] Missing required parameters:", {
        userId: !!userId,
        contentId: !!contentId,
        streamUrl: !!streamUrl,
        title: !!title,
      })
      return { success: false, error: "Missing required information" }
    }

    console.log("[v0] Requesting secure download for:", { userId, contentId, contentType, title })

    const response = await fetch("/api/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        contentId,
        contentType,
        streamUrl,
        title, // Send title for filename
      }),
    })

    const data: SecureDownloadResponse = await response.json()

    console.log("[v0] Download API response:", data)

    if (!response.ok) {
      if (data.requiresSubscription) {
        return { success: false, error: "subscription_expired" }
      }
      return { success: false, error: data.error || "Download failed" }
    }

    console.log("[v0] Starting download from:", data.downloadUrl)

    const link = document.createElement("a")
    link.href = data.downloadUrl
    link.download = `${title.replace(/[^a-z0-9_\-\s]/gi, "_").replace(/\s+/g, "_")}.mp4`
    link.style.display = "none"
    document.body.appendChild(link)
    link.click()

    setTimeout(() => {
      document.body.removeChild(link)
    }, 100)

    console.log("[v0] Download initiated successfully")

    return { success: true }
  } catch (error) {
    console.error("[v0] Secure download error:", error)
    return { success: false, error: "Network error" }
  }
}

export async function validateDownloadToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/download?token=${encodeURIComponent(token)}`)
    const data = await response.json()

    return response.ok && data.valid
  } catch (error) {
    console.error("[v0] Token validation error:", error)
    return false
  }
}
