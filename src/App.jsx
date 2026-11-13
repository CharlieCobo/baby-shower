import FirebaseStatus from './components/FirebaseStatus'
import { useAppStore } from './store/useAppStore'

function App() {
  const { count, increment } = useAppStore()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Baby Shower</h1>
      <button
        onClick={increment}
        className="rounded-lg bg-pink-500 px-4 py-2 text-white hover:bg-pink-600"
      >
        count is {count}
      </button>
      <FirebaseStatus />
    </main>
  )
}

export default App
