import RoleSelector from './components/RoleSelector'

function App() {
  const handleStartInterview = (role) => {
    // Phase 2: navigate to InterviewRoom with selected role
    console.log('Starting interview for:', role.title)
  }

  return (
    <main className="min-h-svh bg-mirror-bg">
      <RoleSelector onStart={handleStartInterview} />
    </main>
  )
}

export default App
