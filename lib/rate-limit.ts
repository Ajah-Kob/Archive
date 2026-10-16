// In-memory per-instance rate limiter.
// Vercel is serverless — this is best-effort per isolate, not global.
// For stronger limits, swap to Redis/DB. Keeps the API surface identical.
const buckets = new Map<string, number[]>()

export function checkRateLimit(
  userId: number,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const bucketKey = `${userId}:${key}`
  const now = Date.now()
  const windowStart = now - windowMs
  const stamps = buckets.get(bucketKey) ?? []
  const recent = stamps.filter((t) => t > windowStart)
  if (recent.length >= limit) {
    buckets.set(bucketKey, recent)
    return false
  }
  recent.push(now)
  buckets.set(bucketKey, recent)
  // ponytail: global Map, prunes on check. Redis if cross-instance accuracy matters.
  if (buckets.size > 1000) {
    // prune oldest buckets when large (avoid unbounded growth)
    const first = buckets.keys().next().value
    if (first) buckets.delete(first)
  }
  return true
}
