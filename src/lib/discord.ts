const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

type DiscordEmbed = {
  title?: string
  description?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  timestamp?: string
  footer?: { text: string }
  thumbnail?: { url: string }
}

export async function sendDiscordNotification(embed: DiscordEmbed) {
  if (!DISCORD_WEBHOOK_URL) return

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          ...embed,
          timestamp: new Date().toISOString(),
          footer: { text: 'GrayDocket Operational Intelligence' }
        }]
      })
    })

    if (!response.ok) {
      console.error('Discord notification failed:', await response.text())
    }
  } catch (err) {
    console.error('Discord utility error:', err)
  }
}

// Helper presets
export const DiscordColors = {
  SUCCESS: 0x10b981, // Green
  INFO: 0x3b82f6,    // Blue
  WARNING: 0xf59e0b, // Orange
  DANGER: 0xef4444,  // Red
  GOLD: 0xd97706,    // Gold
  PURPLE: 0x8b5cf6   // Purple
}
