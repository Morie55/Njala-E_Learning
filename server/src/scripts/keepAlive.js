import cron from 'node-cron'

export function startKeepAlive() {
  const serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL

  // Schedule self-ping every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    if (!serverUrl) return

    const targetUrl = `${serverUrl.replace(/\/$/, '')}/api/health`
    try {
      const res = await fetch(targetUrl)
      if (res.ok) {
        console.log(`[KEEP-ALIVE] Ping successful to ${targetUrl}`)
      } else {
        console.warn(`[KEEP-ALIVE] Ping returned status ${res.status}`)
      }
    } catch (err) {
      console.error(`[KEEP-ALIVE] Ping error: ${err.message}`)
    }
  })

  if (serverUrl) {
    console.log(`[KEEP-ALIVE] Self-ping scheduled every 10 minutes for: ${serverUrl}`)
  } else {
    console.log(`[KEEP-ALIVE] Keep-alive initialized (Set SERVER_URL or RENDER_EXTERNAL_URL to activate self-ping).`)
  }
}
