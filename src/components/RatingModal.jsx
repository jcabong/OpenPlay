import { useState } from 'react'
import { Star, X } from 'lucide-react'

const RATING_DIMENSIONS = [
  { key: 'skill',         label: 'Skill Level',     emoji: '🎯', desc: 'How skilled was this player?' },
  { key: 'sportsmanship', label: 'Sportsmanship',   emoji: '🤝', desc: 'Fair play & attitude'        },
  { key: 'reliability',  label: 'Reliability',      emoji: '⏰', desc: 'Showed up on time, committed?' },
]

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={32}
            className="transition-colors"
            style={{
              fill:   star <= (hovered || value) ? '#c8ff00' : 'transparent',
              stroke: star <= (hovered || value) ? '#c8ff00' : 'rgba(255,255,255,0.2)',
            }}
          />
        </button>
      ))}
    </div>
  )
}

export default function RatingModal({ opponent, onSubmit, onSkip }) {
  const [ratings, setRatings] = useState({ skill: 0, sportsmanship: 0, reliability: 0 })
  const [step, setStep]       = useState(0)

  const currentDim = RATING_DIMENSIONS[step]
  const isLastStep = step === RATING_DIMENSIONS.length - 1
  const allRated   = Object.values(ratings).every(v => v > 0)

  function handleNext() {
    if (isLastStep) {
      // Submit averaged rating
      const avg = (ratings.skill + ratings.sportsmanship + ratings.reliability) / 3
      onSubmit(ratings)
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-md rounded-t-[2.5rem] p-8 border border-white/10 animate-slide-up"
        style={{ background: '#0f0f1a' }}>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-6">
          {RATING_DIMENSIONS.map((_, i) => (
            <div key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '8px',
                background: i <= step ? '#c8ff00' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="font-display text-xl font-bold uppercase italic text-white">
            Rate your opponent
          </h2>
          <button onClick={onSkip} className="p-2 text-ink-500 hover:text-ink-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {opponent && (
          <p className="text-ink-400 text-sm mb-6 text-center">
            vs <span className="text-accent font-bold">@{opponent}</span>
          </p>
        )}

        {/* Current dimension */}
        <div className="mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
            style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
            {currentDim.emoji}
          </div>
          <h3 className="font-black text-white text-base mb-1">{currentDim.label}</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {currentDim.desc}
          </p>
        </div>

        <div className="mb-8">
          <StarRating
            value={ratings[currentDim.key]}
            onChange={val => setRatings(r => ({ ...r, [currentDim.key]: val }))}
          />
          {ratings[currentDim.key] > 0 && (
            <p className="text-center text-xs font-black uppercase tracking-widest mt-3"
              style={{ color: '#c8ff00' }}>
              {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][ratings[currentDim.key]]}
            </p>
          )}
        </div>

        {/* Submitted summary */}
        {step > 0 && (
          <div className="flex gap-3 mb-6">
            {RATING_DIMENSIONS.slice(0, step).map(dim => (
              <div key={dim.key} className="flex-1 text-center">
                <p className="text-sm">{dim.emoji}</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={8} style={{
                      fill:   s <= ratings[dim.key] ? '#c8ff00' : 'transparent',
                      stroke: s <= ratings[dim.key] ? '#c8ff00' : 'rgba(255,255,255,0.2)',
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onSkip}
            className="flex-1 py-4 glass rounded-2xl text-ink-500 font-bold text-xs uppercase tracking-widest border border-white/10 hover:text-ink-200 transition-colors">
            Skip
          </button>
          <button
            onClick={handleNext}
            disabled={ratings[currentDim.key] === 0}
            className="flex-1 py-4 bg-accent text-ink-900 rounded-2xl font-display font-bold uppercase italic tracking-tight disabled:opacity-40 disabled:grayscale transition-all">
            {isLastStep ? 'Submit Rating' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
