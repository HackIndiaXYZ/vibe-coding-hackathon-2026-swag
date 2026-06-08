import { INTERVIEW_STATES } from '../constants/interviewStates'

function UserTranscript({ transcript, transcriptHistory, state, isRecording }) {
  const isUserTurn = state === INTERVIEW_STATES.USER_SPEAKING
  const isAnalyzing = state === INTERVIEW_STATES.AI_ANALYZING

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
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
        )}

        {isUserTurn && !transcript && !isRecording && (
          <p className="font-mono text-sm text-mirror-muted">
            Press the record button when you are ready to respond...
          </p>
        )}

        {isRecording && (
          <p className="font-mono text-sm text-mirror-accent transcript-typing">
            Listening...
            <span className="typing-cursor">|</span>
          </p>
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
