export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-ink-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-accent/10 flex items-center justify-center">
            <span className="text-2xl">🏸</span>
          </div>
        </div>
        <p className="font-display text-ink-300 tracking-widest text-xs uppercase animate-pulse">
          Loading
        </p>
      </div>
    </div>
  )
}
