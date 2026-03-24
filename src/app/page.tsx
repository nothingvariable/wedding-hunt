'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS, TeamKey } from '@/data/teams'

export default function JoinPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<TeamKey | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('hunt_token')
    if (!token) {
      setCheckingAuth(false)
      return
    }

    fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) {
          router.replace('/hunt')
        } else {
          localStorage.removeItem('hunt_token')
          setCheckingAuth(false)
        }
      })
      .catch(() => {
        setCheckingAuth(false)
      })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedTeam) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), team: selectedTeam }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      const data = await res.json()
      localStorage.setItem('hunt_token', data.sessionToken)
      router.push('/hunt')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-950">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">💒</div>
          <h1 className="text-3xl font-bold text-white">Treefort Hunt</h1>
          <p className="mt-2 text-gray-400 text-sm">
            The official wedding scavenger hunt.
            <br />
            May the best team win.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent text-base"
              autoComplete="off"
            />
          </div>

          {/* Team selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Choose Your Team
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.values(TEAMS) as typeof TEAMS[TeamKey][]).map((team) => (
                <button
                  key={team.key}
                  type="button"
                  onClick={() => setSelectedTeam(team.key as TeamKey)}
                  className={`
                    flex flex-col items-center justify-center py-5 px-3 rounded-xl border-2 transition-all duration-150
                    ${
                      selectedTeam === team.key
                        ? 'border-fuchsia-500 bg-fuchsia-500/20 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }
                  `}
                >
                  <span className="text-4xl mb-2">{team.emoji}</span>
                  <span className="text-sm font-semibold">{team.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || !selectedTeam || loading}
            className={`
              w-full py-4 rounded-xl font-bold text-base transition-all duration-150
              ${
                !name.trim() || !selectedTeam || loading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white active:scale-95'
              }
            `}
          >
            {loading ? 'Joining…' : "Let's Hunt 🎯"}
          </button>
        </form>
      </div>
    </main>
  )
}
