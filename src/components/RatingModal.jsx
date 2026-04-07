import { useState } from 'react'
import { Star, X } from 'lucide-react'

export default function RatingModal({ opponent, onSubmit, onSkip }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="glass w-full max-w-md rounded-t-[2.5rem] p-8 border border-white/10 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold uppercase italic text-white">
            Rate your opponent
          </h2>
          <button onClick={onSkip} className="p-2 text-ink-500 hover:text-ink-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {opponent && (
          <p className="text-ink-400 text-sm mb-6">
            How was playing against{' '}
            <span className="text-accent font-bold">@{opponent}</span>?
          </p>
        )}

        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                size={40}
                className={`transition-colors ${
                  star <= (hovered || rating)
                    ? 'fill-accent text-accent'
                    : 'text-ink-700'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-4 glass rounded-2xl text-ink-500 font-bold text-xs uppercase tracking-widest border border-white/10 hover:text-ink-200 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={() => rating > 0 && onSubmit(rating)}
            disabled={rating === 0}
            className="flex-1 py-4 bg-accent text-ink-900 rounded-2xl font-display font-bold uppercase italic tracking-tight glow-accent disabled:opacity-40 disabled:grayscale transition-all"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
