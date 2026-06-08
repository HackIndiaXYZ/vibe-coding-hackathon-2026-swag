import { useState } from 'react'
import { INTERVIEW_ROLES } from '../constants/roles'

function RoleSelector({ onStart }) {
  const [selectedRoleId, setSelectedRoleId] = useState(null)

  const selectedRole = INTERVIEW_ROLES.find((role) => role.id === selectedRoleId)

  const handleStart = () => {
    if (selectedRole && onStart) {
      onStart(selectedRole)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 py-16">
      <header className="mb-12 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-mirror-accent">
          // mirror_ai.init
        </p>
        <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Choose Your
          <span className="block text-mirror-accent">Interview Track</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-mirror-muted sm:text-base">
          Select a role to calibrate your AI interviewer. Each track adapts
          questions to real-world expectations for that position.
        </p>
      </header>

      <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTERVIEW_ROLES.map((role) => {
          const isSelected = selectedRoleId === role.id

          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              aria-pressed={isSelected}
              className={[
                'glow-hover group relative flex flex-col items-start rounded-xl border bg-mirror-surface p-6 text-left',
                'border-mirror-border focus:outline-none focus-visible:ring-2 focus-visible:ring-mirror-accent',
                isSelected ? 'glow-selected' : '',
              ].join(' ')}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-mirror-accent/70">
                {role.label}
              </span>

              <span
                className="mt-3 font-mono text-2xl text-mirror-accent transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              >
                {role.icon}
              </span>

              <h2 className="mt-3 font-heading text-xl font-semibold text-white">
                {role.title}
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-mirror-muted">
                {role.description}
              </p>

              {isSelected && (
                <span className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-widest text-mirror-accent">
                  selected
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-12 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={!selectedRole}
          className={[
            'btn-glow font-mono rounded-lg px-10 py-4 text-sm font-medium uppercase tracking-[0.2em]',
            selectedRole
              ? 'bg-mirror-accent text-mirror-bg cursor-pointer'
              : 'cursor-not-allowed bg-mirror-border text-mirror-muted opacity-50',
          ].join(' ')}
        >
          Start Interview
        </button>

        {selectedRole && (
          <p className="font-mono text-xs text-mirror-muted">
            track:{' '}
            <span className="text-mirror-accent">{selectedRole.label}</span>
          </p>
        )}
      </div>
    </section>
  )
}

export default RoleSelector
