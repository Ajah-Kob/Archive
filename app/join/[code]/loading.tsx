import { AuthCardSkeleton } from '@/components/auth/AuthCardSkeleton'

/**
 * Streaming fallback for /join/[code].
 *
 * The page settles server-side into either the expired-invite card or a
 * client redirect; the card is the meaningful static shape, so this mirrors
 * it — same tinted full-screen chrome and max-w-[420px] card with title,
 * message, and button blocks. Empty fixed-width blocks only, no text.
 */
export default function JoinCodeLoading() {
  return (
    <div className="bg-[#f4f6ff] min-h-svh flex flex-col items-center justify-center px-5 py-16">
      <AuthCardSkeleton fields={0} />
    </div>
  )
}
