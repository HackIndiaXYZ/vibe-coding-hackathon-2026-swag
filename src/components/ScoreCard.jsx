import { useEffect, useState } from 'react'

function useCountUp(target, durationMs, delayMs = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frameId = null
    let startTime = null
    let delayTimer = null

    delayTimer = setTimeout(() => {
      const animate = (timestamp) => {
        if (startTime === null) startTime = timestamp
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / durationMs, 1)
        const eased = 1 - (1 - progress) ** 3

        setValue(Math.round(target * eased))

        if (progress < 1) {
          frameId = requestAnimationFrame(animate)
        }
      }

      frameId = requestAnimationFrame(animate)
    }, delayMs)

    return () => {
      clearTimeout(delayTimer)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [target, durationMs, delayMs])

  return value
}

function ScoreCard({ label, score, delay = 0, accent = 'cyan' }) {
  const animatedScore = useCountUp(score, 1400, delay)
  const accentClass =
    accent === 'amber'
      ? 'from-amber-400 to-amber-600'
      : accent === 'violet'
        ? 'from-violet-400 to-violet-600'
        : 'from-mirror-accent to-cyan-300'

  return (
    <div
      className="feedback-card-glow rounded-xl border border-mirror-border bg-mirror-surface/80 p-5 backdrop-blur-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-muted">
          {label}
        </span>
        <span className={`font-heading text-3xl font-bold tabular-nums text-transparent bg-clip-text bg-gradient-to-r ${accentClass}`}>
          {animatedScore}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-mirror-border">
        <div
          className={`feedback-bar-fill h-full rounded-full bg-gradient-to-r ${accentClass}`}
          style={{
            width: `${animatedScore}%`,
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  )
}

export default ScoreCard
