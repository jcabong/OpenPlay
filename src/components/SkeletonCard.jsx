// Reusable skeleton shimmer animation
function Shimmer({ className = '' }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

// Feed post skeleton
export function PostSkeleton() {
  return (
    <div
      className="rounded-[2.5rem] p-5 border border-white/5"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Shimmer className="w-10 h-10 rounded-[0.75rem] shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Shimmer className="h-3 w-28 rounded-lg" />
          <Shimmer className="h-2 w-20 rounded-lg" />
        </div>
        <Shimmer className="h-5 w-16 rounded-lg" />
      </div>

      {/* Content lines */}
      <div className="space-y-2 mb-4">
        <Shimmer className="h-3 w-full rounded-lg" />
        <Shimmer className="h-3 w-4/5 rounded-lg" />
        <Shimmer className="h-3 w-3/5 rounded-lg" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-3 border-t border-white/5">
        <Shimmer className="h-8 w-20 rounded-xl" />
        <Shimmer className="h-8 w-28 rounded-xl" />
        <Shimmer className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  )
}

// Leaderboard row skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-2 px-4">
      {/* Podium skeleton */}
      <div className="flex items-end gap-2 mb-6 px-2">
        <div className="flex-1 flex flex-col items-center gap-2">
          <Shimmer className="w-12 h-12 rounded-2xl" />
          <Shimmer className="h-14 w-full rounded-t-xl" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <Shimmer className="w-14 h-14 rounded-2xl" />
          <Shimmer className="h-20 w-full rounded-t-xl" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-2">
          <Shimmer className="w-12 h-12 rounded-2xl" />
          <Shimmer className="h-10 w-full rounded-t-xl" />
        </div>
      </div>

      {/* List rows */}
      <div
        className="rounded-[1.5rem] border border-white/10 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4 border-b border-white/5 last:border-none">
            <Shimmer className="w-7 h-7 rounded-lg" />
            <Shimmer className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="h-3 w-24 rounded-lg" />
              <Shimmer className="h-2 w-16 rounded-lg" />
            </div>
            <div className="space-y-1 text-right">
              <Shimmer className="h-5 w-10 rounded-lg ml-auto" />
              <Shimmer className="h-2 w-14 rounded-lg ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Profile stats skeleton
export function ProfileSkeleton() {
  return (
    <div className="px-5 pt-14 pb-2">
      <div className="flex items-start gap-4 mb-6">
        <Shimmer className="w-20 h-20 rounded-[1.5rem] shrink-0" />
        <div className="flex-1 space-y-2 pt-2">
          <Shimmer className="h-6 w-36 rounded-xl" />
          <Shimmer className="h-3 w-24 rounded-lg" />
          <Shimmer className="h-3 w-20 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[...Array(3)].map((_, i) => (
          <Shimmer key={i} className="h-20 rounded-[1.25rem]" />
        ))}
      </div>
      <Shimmer className="h-10 w-full rounded-2xl mb-4" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Shimmer key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
