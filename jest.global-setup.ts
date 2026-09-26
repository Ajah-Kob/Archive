/**
 * Runs once in the main Jest process before any worker is forked, so the value
 * is inherited by every test environment.
 *
 * Tests must not depend on the developer's own timezone. This repo's defense
 * scheduling stores bare "HH:mm" wall-clock strings that the calendar feed
 * interprets as Asia/Manila (UTC+8, no DST). On a Manila machine a *server
 * local* parse of those strings happens to produce the correct instant, so a
 * regression that drops the explicit +08:00 offset is invisible — it only
 * shows up on a UTC host such as Vercel or CI. Pinning the suite to UTC makes
 * that entire regression class fail everywhere.
 */
export default async function globalSetup() {
  process.env.TZ = 'UTC'
}
