import { useState } from 'react'
import RoleSelector from './components/RoleSelector'
import InterviewRoom from './pages/InterviewRoom'

function App() {
  const [view, setView] = useState('role-select')
  const [selectedRole, setSelectedRole] = useState(null)
  const [interviewSessionKey, setInterviewSessionKey] = useState(0)

  const handleStartInterview = (role) => {
    setSelectedRole(role)
    setInterviewSessionKey((key) => key + 1)
    setView('interview')
  }

  const handleExitInterview = () => {
    setView('role-select')
    setSelectedRole(null)
  }

  const handleRestartInterview = () => {
    setInterviewSessionKey((key) => key + 1)
  }

  return (
    <main className="min-h-svh bg-mirror-bg">
      {view === 'role-select' && (
        <RoleSelector onStart={handleStartInterview} />
      )}
      {view === 'interview' && selectedRole && (
        <InterviewRoom
          key={interviewSessionKey}
          role={selectedRole}
          onExit={handleExitInterview}
          onRestart={handleRestartInterview}
        />
      )}
    </main>
  )
}

export default App
