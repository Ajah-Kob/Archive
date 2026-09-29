import { AuthCardFrame } from '@/components/auth/AuthCardFrame'

const BAR = 'bg-[#e8ebf8]'

// Shimmer placeholder for the auth card. `fields` matches the form's input
// count per route. The surface itself comes from AuthCardFrame so the skeleton
// cannot drift from the real card; the shimmer is the only local addition.
export function AuthCardSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <main className="w-full max-w-[420px] flex flex-col gap-5 items-center relative z-10">
      <AuthCardFrame className="animate-pulse">
        <div className="flex flex-col gap-2">
          <div className={`h-6 w-48 rounded ${BAR}`} />
          <div className={`h-[13px] w-64 rounded ${BAR}`} />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className={`h-3 w-20 rounded ${BAR}`} />
              <div className={`h-[38px] rounded-xl ${BAR}`} />
            </div>
          ))}
          <div className={`h-[38px] rounded-[7px] ${BAR}`} />
        </div>
      </AuthCardFrame>
      <div className={`h-4 w-44 rounded ${BAR} animate-pulse`} />
    </main>
  )
}
