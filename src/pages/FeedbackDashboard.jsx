import { useEffect, useMemo, useState } from 'react'
import ConfidenceChart from '../components/ConfidenceChart'
import ScoreCard from '../components/ScoreCard'
import { generateMockFeedback } from '../constants/mockFeedback'

function useCountUp(target, durationMs = 1600) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frameId = null
    let startTime = null

    const animate = (timestamp) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / durationMs, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => {
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [target, durationMs])

  return value
}

const FILLER_LABELS = {
  um: 'um',
  uh: 'uh',
  like: 'like',
  'you know': 'you know',
  basically: 'basically',
  literally: 'literally',
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function FeedbackSection({ title, items, variant, delay }) {
  const borderClass =
    variant === 'strength'
      ? 'border-emerald-500/30'
      : variant === 'weakness'
        ? 'border-amber-500/30'
        : 'border-mirror-accent/30'

  const dotClass =
    variant === 'strength'
      ? 'bg-emerald-400'
      : variant === 'weakness'
        ? 'bg-amber-400'
        : 'bg-mirror-accent'

  return (
    <div
      className={`feedback-card-glow rounded-xl border bg-mirror-surface/80 p-5 backdrop-blur-sm ${borderClass}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-muted">
        {title}
      </h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-3">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <p className="text-sm leading-relaxed text-white/85">{item}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FeedbackDashboard({
  role,
  transcriptHistory,
  elapsedSeconds,
  onRestart,
  onBackToRoles,
}) {
  const feedback = useMemo(
    () => generateMockFeedback({ role, transcriptHistory, elapsedSeconds }),
    [role, transcriptHistory, elapsedSeconds],
  )

  const { scores, fillerStats, totalFillerCount } = feedback
  const animatedOverall = useCountUp(scores.overall)

  return (
    <div className="min-h-svh bg-mirror-bg">
      <header className="border-b border-mirror-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-mirror-accent/70">
              // session.complete
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-white sm:text-4xl">
              Interview Feedback
            </h1>
            <p className="mt-2 font-mono text-sm text-mirror-muted">
              {feedback.roleTitle} · {feedback.questionsAnswered} questions ·{' '}
              {formatTime(feedback.elapsedSeconds)} elapsed
            </p>
          </div>

          <div className="feedback-card-glow rounded-xl border border-mirror-accent/40 bg-mirror-surface/60 px-6 py-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-muted">
              overall_score
            </p>
            <p className="font-heading text-5xl font-bold tabular-nums text-mirror-accent feedback-score-glow">
              {animatedOverall}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard label="confidence" score={scores.confidence} delay={100} accent="violet" />
          <ScoreCard label="clarity" score={scores.clarity} delay={200} />
          <ScoreCard label="communication" score={scores.communication} delay={300} accent="amber" />
          <ScoreCard label="technical_depth" score={scores.technicalDepth} delay={400} />
        </section>

        <section className="mb-8 grid gap-6 lg:grid-cols-2">
          <ConfidenceChart data={feedback.confidenceByQuestion} delay={500} />

          <div
            className="feedback-card-glow rounded-xl border border-mirror-border bg-mirror-surface/80 p-5 backdrop-blur-sm"
            style={{ animationDelay: '600ms' }}
          >
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-muted">
              filler_word_stats
            </h3>

            <p className="mb-4 font-heading text-2xl text-white">
              {totalFillerCount}
              <span className="ml-2 font-mono text-sm font-normal text-mirror-muted">
                total detected
              </span>
            </p>

            <div className="space-y-3">
              {Object.entries(fillerStats).map(([key, count]) => {
                const maxCount = Math.max(...Object.values(fillerStats), 1)
                const width = (count / maxCount) * 100

                return (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-mirror-muted">
                        {FILLER_LABELS[key]}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-mirror-accent">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-mirror-border">
                      <div
                        className="feedback-bar-fill h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mb-10 grid gap-6 lg:grid-cols-3">
          <FeedbackSection
            title="strengths"
            items={feedback.strengths}
            variant="strength"
            delay={700}
          />
          <FeedbackSection
            title="weaknesses"
            items={feedback.weaknesses}
            variant="weakness"
            delay={800}
          />
          <FeedbackSection
            title="improvement_suggestions"
            items={feedback.suggestions}
            variant="suggestion"
            delay={900}
          />
        </section>

        <section className="flex flex-col items-center justify-center gap-4 border-t border-mirror-border pt-8 sm:flex-row">
          <button
            type="button"
            onClick={onRestart}
            className="btn-glow font-mono rounded-lg bg-mirror-accent px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-mirror-bg"
          >
            Restart Interview
          </button>
          <button
            type="button"
            onClick={onBackToRoles}
            className="btn-glow font-mono rounded-lg border border-mirror-border px-8 py-3 text-sm uppercase tracking-[0.2em] text-mirror-muted transition-colors hover:border-mirror-accent/50 hover:text-white"
          >
            Back to Role Selection
          </button>
        </section>
      </main>
    </div>
  )
}

export default FeedbackDashboard
