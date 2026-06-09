import { INTERVIEW_STATES } from '../constants/interviewStates'

function AIMessage({ message, state, questionIndex, totalQuestions, isVoiceSpeaking = false }) {
  const isSpeaking = state === INTERVIEW_STATES.AI_SPEAKING
  const isAnalyzing = state === INTERVIEW_STATES.AI_ANALYZING

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12">
      <div className="relative mb-10">
        <div
          className={[
            'absolute inset-0 rounded-full bg-mirror-accent/20 blur-2xl',
            isSpeaking ? 'ai-orb-glow' : 'opacity-40',
          ].join(' ')}
        />
        <div
          className={[
            'relative flex h-40 w-40 items-center justify-center rounded-full border-2 border-mirror-accent/40 bg-mirror-surface',
            isSpeaking ? 'ai-orb-pulse' : '',
          ].join(' ')}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-3xl text-mirror-accent">◇</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-mirror-accent/70">
              mirror
            </span>
          </div>

          {isSpeaking && (
            <>
              <span className="ai-ring ai-ring-1" />
              <span className="ai-ring ai-ring-2" />
              <span className="ai-ring ai-ring-3" />
            </>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <span
          className={[
            'inline-block h-2 w-2 rounded-full',
            isSpeaking
              ? 'bg-mirror-accent ai-speaking-dot'
              : isAnalyzing
                ? 'bg-amber-400 animate-pulse'
                : 'bg-mirror-muted',
          ].join(' ')}
        />
        <span className="font-mono text-xs uppercase tracking-[0.25em] text-mirror-accent/80">
          {isSpeaking
            ? 'ai speaking'
            : isAnalyzing
              ? 'analyzing response'
              : 'standby'}
        </span>
        {isVoiceSpeaking && (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-accent/70 ai-speaking-dot">
            AI Speaking...
          </span>
        )}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-muted">
        question {Math.min(questionIndex + 1, totalQuestions)} / {totalQuestions}
      </p>

      <div className="mt-8 max-w-lg rounded-xl border border-mirror-border bg-mirror-bg/60 p-6 backdrop-blur-sm">
        <p
          className={[
            'font-heading text-lg leading-relaxed text-white sm:text-xl',
            isSpeaking ? 'ai-text-reveal' : '',
          ].join(' ')}
        >
          {message || 'Initializing interview session...'}
        </p>
      </div>
    </div>
  )
}

export default AIMessage
