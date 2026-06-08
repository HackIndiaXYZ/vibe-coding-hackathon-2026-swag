import { useState } from 'react'
import RoleSelector from './components/RoleSelector'
import InterviewRoom from './pages/InterviewRoom'

function App() {
  const [view, setView] = useState('role-select')
  const [selectedRole, setSelectedRole] = useState(null)

  const handleStartInterview = (role) => {
    setSelectedRole(role)
    setView('interview')
  }

  const handleExitInterview = () => {
    setView('role-select')
    setSelectedRole(null)
  }

  return (
    <main className="min-h-svh bg-mirror-bg">
      {view === 'role-select' && (
        <RoleSelector onStart={handleStartInterview} />
      )}
      {view === 'interview' && selectedRole && (
        <InterviewRoom role={selectedRole} onExit={handleExitInterview} />
      )}
    </main>
  )
}

export default App
