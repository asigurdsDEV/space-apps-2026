// Mints short-lived Cloudflare TURN credentials. The TURN key stays on the server.
// Vercel env: CLOUDFLARE_TURN_KEY_ID, CLOUDFLARE_TURN_API_TOKEN
// https://developers.cloudflare.com/realtime/turn/generate-credentials/

const TTL_SECONDS = 4 * 60 * 60

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'GET only' })
    return
  }
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !token) {
    res.status(503).json({ error: 'Cloudflare TURN is not configured' })
    return
  }
  const response = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: TTL_SECONDS }),
    },
  )
  if (!response.ok) {
    res.status(502).json({ error: 'Cloudflare TURN refused the request' })
    return
  }
  const body = await response.json()
  if (!Array.isArray(body.iceServers)) {
    res.status(502).json({ error: 'Cloudflare TURN returned no iceServers' })
    return
  }
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ iceServers: body.iceServers })
}
