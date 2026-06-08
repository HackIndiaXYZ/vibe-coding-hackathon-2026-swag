import { INTERVIEW_STATES } from '../constants/interviewStates'

const FILLER_LABELS = {
  um: 'um',
  uh: 'uh',
  like: 'like',
  'you know': 'you know',
  basically: 'basically',
  literally: 'literally',
}

function FillerCounts({ fillerCounts }) {
  const activeFillers = Object.entries(fillerCounts).filter(([, count]) => count > 0)
  if (activeFillers.length === 0) return null

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {activeFillers.map(([key, count]) => (
        <span
          key={key}
          className="font-mono rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-400"
        >
          {FILLER_LABELS[key]}: {count}
        </span>
      ))}
    </div>
  )
}

function UserTranscript({
  transcript,
  interimTranscript,
  fillerCounts,
  transcriptHistory,
  state,
  isRecording,
}) {
  const isUserTurn = state === INTERVIEW_STATES.USER_SPEAKING
  const isAnalyzing = state === INTERVIEW_STATES.AI_ANALYZING
  const hasLiveText = Boolean(transcript || interimTranscript)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-accent/70">
          live_transcript
        </span>
        {isRecording && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-red-400 recording-pulse">
            ● recording
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-mirror-border bg-mirror-bg/40 p-4">
        {transcriptHistory.length > 0 && (
          <div className="mb-4 space-y-4 border-b border-mirror-border pb-4">
            {transcriptHistory.map((entry, index) => (
              <div key={index} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-mirror-muted">
                  Q{index + 1}
                </p>
                <p className="text-sm text-mirror-muted">{entry.question}</p>
                <p className="font-mono text-sm leading-relaxed text-white/90">
                  {entry.answer || '(no response captured)'}
                </p>
              </div>
            ))}
          </div>
        )}

        {isUserTurn && !hasLiveText && !isRecording && (
          <p className="font-mono text-sm text-mirror-muted">
            Press the record button when you are ready to respond...
          </p>
        )}

        {isRecording && (
          <>
            <FillerCounts fillerCounts={fillerCounts} />
            {hasLiveText ? (
              <p className="font-mono text-sm leading-relaxed text-white/90 transcript-typing">
                {transcript}
                {interimTranscript && (
                  <span className="text-mirror-accent/70">{transcript ? ' ' : ''}{interimTranscript}</span>
                )}
                <span className="typing-cursor text-mirror-accent">|</span>
              </p>
            ) : (
              <p className="font-mono text-sm text-mirror-accent transcript-typing">
                Listening...
                <span className="typing-cursor">|</span>
              </p>
            )}
          </>
        )}

        {transcript && !isRecording && (
          <p className="font-mono text-sm leading-relaxed text-white/90">
            {transcript}
          </p>
        )}

        {isAnalyzing && !transcript && (
          <p className="font-mono text-sm text-mirror-muted animate-pulse">
            Processing your response...
          </p>
        )}
      </div>
    </div>
  )
}

export default UserTranscript
