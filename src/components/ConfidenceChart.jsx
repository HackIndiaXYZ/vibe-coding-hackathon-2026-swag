import { useEffect, useState } from 'react'

function ConfidenceChart({ data, delay = 0 }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!data.length) {
    return (
      <div className="feedback-card-glow rounded-xl border border-mirror-border bg-mirror-surface/80 p-5 backdrop-blur-sm">
        <p className="font-mono text-sm text-mirror-muted">No confidence data available.</p>
      </div>
    )
  }

  const maxValue = Math.max(...data, 100)

  return (
    <div
      className="feedback-card-glow rounded-xl border border-mirror-border bg-mirror-surface/80 p-5 backdrop-blur-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-muted">
          confidence_by_question
        </span>
        <span className="font-mono text-[10px] text-mirror-accent/70">0–100 scale</span>
      </div>

      <div className="flex h-40 items-end justify-between gap-2 sm:gap-3">
        {data.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            <span className="font-mono text-[10px] tabular-nums text-mirror-accent">
              {value}
            </span>
            <div className="relative flex h-28 w-full items-end justify-center">
              <div
                className="feedback-chart-bar w-full max-w-10 rounded-t-md bg-gradient-to-t from-mirror-accent/20 to-mirror-accent"
                style={{
                  height: animated ? `${(value / maxValue) * 100}%` : '0%',
                  transitionDelay: `${delay + index * 120}ms`,
                }}
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-mirror-muted">
              Q{index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ConfidenceChart
