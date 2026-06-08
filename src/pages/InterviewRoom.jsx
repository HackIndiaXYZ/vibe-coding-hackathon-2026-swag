import AIMessage from '../components/AIMessage'
import UserTranscript from '../components/UserTranscript'
import WaveformVisualizer from '../components/WaveformVisualizer'
import { INTERVIEW_STATES, STATE_LABELS } from '../constants/interviewStates'
import { useInterviewStateMachine } from '../hooks/useInterviewStateMachine'
import FeedbackDashboard from './FeedbackDashboard'

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function InterviewRoom({ role, onExit, onRestart }) {
  const {
    state,
    questionIndex,
    totalQuestions,
    currentQuestion,
    isRecording,
    transcript,
    interimTranscript,
    fillerCounts,
    isSpeechSupported,
    speechError,
    transcriptHistory,
    elapsedSeconds,
    progress,
    isComplete,
    isAiLoading,
    aiError,
    retryAiAction,
    toggleRecording,
  } = useInterviewStateMachine(role)

  const canRecord = state === INTERVIEW_STATES.USER_SPEAKING && isSpeechSupported

  if (state === INTERVIEW_STATES.INTERVIEW_COMPLETE) {
    return (
      <FeedbackDashboard
        role={role}
        transcriptHistory={transcriptHistory}
        elapsedSeconds={elapsedSeconds}
        onRestart={onRestart}
        onBackToRoles={onExit}
      />
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-mirror-bg">
      <header className="flex items-center justify-between border-b border-mirror-border px-6 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-mirror-accent/70">
            // session.active
          </p>
          <h1 className="font-heading text-lg font-semibold text-white">
            {role?.title} Interview
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-mirror-muted">
              elapsed
            </p>
            <p className="font-mono text-lg tabular-nums text-mirror-accent">
              {formatTime(elapsedSeconds)}
            </p>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="font-mono rounded-lg border border-mirror-border px-4 py-2 text-xs uppercase tracking-wider text-mirror-muted transition-colors hover:border-mirror-accent/50 hover:text-white"
          >
            Exit
          </button>
        </div>
      </header>

      {!isSpeechSupported && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="font-mono text-xs text-amber-300">
            Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the interview experience.
          </p>
        </div>
      )}

      {speechError && (
        <div className="mx-6 mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="font-mono text-xs text-red-300">{speechError.message}</p>
        </div>
      )}

      {aiError && (
        <div className="mx-6 mt-4 flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="font-mono text-xs text-amber-300">{aiError.message}</p>
          {aiError.canRetry && (
            <button
              type="button"
              onClick={retryAiAction}
              disabled={isAiLoading}
              className="btn-glow font-mono shrink-0 rounded-lg border border-mirror-border px-3 py-1.5 text-[10px] uppercase tracking-wider text-mirror-muted hover:border-mirror-accent/50 hover:text-white disabled:opacity-50"
            >
              {isAiLoading ? 'loading...' : 'retry'}
            </button>
          )}
        </div>
      )}

      <div className="px-6 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mirror-muted">
            progress
          </span>
          <span className="font-mono text-[10px] text-mirror-accent">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-mirror-border">
          <div
            className="h-full rounded-full bg-mirror-accent transition-all duration-700 ease-out progress-glow"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="flex flex-1 flex-col border-b border-mirror-border lg:border-b-0 lg:border-r">
          <div className="border-b border-mirror-border px-6 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-muted">
              ai_interviewer
            </span>
          </div>
          <AIMessage
            message={
              isAiLoading && state === INTERVIEW_STATES.AI_ANALYZING
                ? 'Analyzing your response and preparing the next question...'
                : currentQuestion
            }
            state={state}
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
          />
        </section>

        <section className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-mirror-border px-6 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-muted">
              candidate_panel
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-mirror-accent/60">
              state: {STATE_LABELS[state]}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            <UserTranscript
              transcript={transcript}
              interimTranscript={interimTranscript}
              fillerCounts={fillerCounts}
              transcriptHistory={transcriptHistory}
              state={state}
              isRecording={isRecording}
            />

            <div className="mt-6 flex flex-col items-center gap-4 border-t border-mirror-border pt-6">
              <WaveformVisualizer isActive={isRecording} />

              <button
                type="button"
                onClick={toggleRecording}
                disabled={!canRecord}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                className={[
                  'record-btn relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300',
                  canRecord
                    ? 'cursor-pointer border-mirror-accent bg-mirror-surface hover:scale-105'
                    : 'cursor-not-allowed border-mirror-border bg-mirror-surface/50 opacity-40',
                  isRecording ? 'record-btn-active' : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'rounded-full transition-all duration-300',
                    isRecording
                      ? 'h-6 w-6 bg-red-400'
                      : 'h-10 w-10 bg-mirror-accent',
                  ].join(' ')}
                />
              </button>

              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-mirror-muted">
                {isRecording
                  ? 'tap to stop'
                  : !isSpeechSupported
                    ? 'speech not supported'
                    : canRecord
                      ? 'tap to record'
                      : isComplete
                        ? 'interview complete'
                        : 'wait for your turn'}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default InterviewRoom
