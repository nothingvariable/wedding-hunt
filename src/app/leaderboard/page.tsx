'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS, TeamKey } from '@/data/teams'

interface TeamScore {
  score: number
  itemCount: number
}

interface Individual {
  id: number
  name: string
  team: string
  score: number
  itemCount: number
}

interface LeaderboardData {
  teams: Record<string, TeamScore>
  individuals: Individual[]
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [currentParticipantId, setCurrentParticipantId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const json: LeaderboardData = await res.json()
        setData(json)
      }
    } catch {
      // silently fail on poll
    }
  }

  useEffect(() => {
    // Get current user id
    const token = localStorage.getItem('hunt_token')
    if (token) {
      fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d) setCurrentParticipantId(d.participant.id)
        })
        .catch(() => {})
    }

    fetchData().finally(() => setLoading(false))
    intervalRef.current = setInterval(fetchData, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const teams = ['bride', 'groom'] as TeamKey[]
  const brideScore = data?.teams?.bride?.score ?? 0
  const groomScore = data?.teams?.groom?.score ?? 0
  const winningTeam: TeamKey | null =
    brideScore > groomScore ? 'bride' : groomScore > brideScore ? 'groom' : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/hunt')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold text-white">Leaderboard</h1>
        <div className="ml-auto flex items-center gap-3">
          <a href="/gallery" className="text-xs text-gray-400 hover:text-white transition-colors">
            📷 Gallery
          </a>
          <span className="text-xs text-gray-600">Updates every 30s</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-8">
        {/* Team score cards */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Team Scores
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {teams.map((teamKey) => {
              const team = TEAMS[teamKey]
              const score = data?.teams?.[teamKey]?.score ?? 0
              const itemCount = data?.teams?.[teamKey]?.itemCount ?? 0
              const isWinning = winningTeam === teamKey
              const isTied = winningTeam === null && (brideScore > 0 || groomScore > 0)

              return (
                <div
                  key={teamKey}
                  className={`rounded-2xl p-4 border-2 flex flex-col items-center text-center transition-all ${
                    isWinning
                      ? 'border-yellow-500 bg-yellow-900/20'
                      : isTied
                      ? 'border-fuchsia-600 bg-fuchsia-900/20'
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  {isWinning && (
                    <span className="text-xs font-bold text-yellow-400 mb-1">WINNING 👑</span>
                  )}
                  {isTied && (
                    <span className="text-xs font-bold text-fuchsia-400 mb-1">TIED</span>
                  )}
                  <span className="text-3xl mb-1">{team.emoji}</span>
                  <p className="text-sm font-semibold text-white mb-1">{team.name}</p>
                  <p className="text-3xl font-bold text-fuchsia-400">{score}</p>
                  <p className="text-xs text-gray-500 mt-1">pts · {itemCount} items</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Individual rankings per team */}
        {teams.map((teamKey) => {
          const team = TEAMS[teamKey]
          const members = data?.individuals?.filter((i) => i.team === teamKey) ?? []

          if (members.length === 0) return null

          return (
            <div key={teamKey}>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>{team.emoji}</span>
                <span>{team.name}</span>
              </h2>
              <div className="space-y-2">
                {members.map((person, idx) => {
                  const isMe = person.id === currentParticipantId
                  return (
                    <div
                      key={person.id}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        isMe
                          ? 'border-fuchsia-500 bg-fuchsia-900/20'
                          : 'border-gray-800 bg-gray-900'
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-500 w-6 text-center">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {person.name}
                          {isMe && (
                            <span className="ml-2 text-xs text-fuchsia-400">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{person.itemCount} items</p>
                      </div>
                      <p className="text-lg font-bold text-fuchsia-400">{person.score}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {(!data || (data.individuals?.length ?? 0) === 0) && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎯</div>
            <p className="text-gray-500 text-sm">No scores yet. Get hunting!</p>
          </div>
        )}
      </div>
    </main>
  )
}
