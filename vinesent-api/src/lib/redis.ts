let client: any | null = null

export async function getRedis() {
  if (client) return client
  const url = process.env.REDIS_URL
  // Edge runtime cannot use ioredis; disable in middleware
  if (!url || process.env.NEXT_RUNTIME === 'edge') return null
  const { default: IORedis } = await import('ioredis')
  client = new IORedis(url, { maxRetriesPerRequest: 2, enableAutoPipelining: true })
  client.on('error', () => { /* swallow */ })
  return client
}

export async function rateLimit(ip: string, key: string, limitPerMinute: number) {
  const r = await getRedis()
  const bucketKey = `rl:${key}:${ip}`
  if (!r) {
    return true // no redis -> allow (fallback to external WAF/CDN)
  }
  const ttl = 60
  const count = await r.incr(bucketKey)
  if (count === 1) await r.expire(bucketKey, ttl)
  return count <= limitPerMinute
}
