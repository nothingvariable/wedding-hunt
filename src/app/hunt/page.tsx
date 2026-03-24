'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS, TeamKey } from '@/data/teams'
import { CATEGORY_NAMES, CATEGORY_ORDER } from '@/lib/scores'

interface HuntItem {
  key: string
  title: string
  description: string
  category: string
  points: number
  bonusPoints?: number
  bonusCondition?: string
  proofType: 'photo' | 'self-check'
}

interface Completion {
  id: number
  participant_id: number
  item_key: string
  photo_filename: string | null
  bonus_awarded: boolean
  completed_at: string
}

interface MeData {
  participant: { id: number; name: string; team: string }
  completions: Completion[]
  myScore: number
  teamScore: number
}

function formatDate(ts: string) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ItemCard({
  item,
  completion,
  token,
  onCompleted,
  onDeleted,
}: {
  item: HuntItem
  completion: Completion | undefined
  token: string
  onCompleted: (c: Completion) => void
  onDeleted: (key: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [bonusLoading, setBonusLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const isCompleted = !!completion

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setError('')
  }

  const handlePhotoSubmit = async () => {
    if (!selectedFile) return
    setUploading(true)
    setError('')

    let step = 'start'
    try {
      step = 'creating-object-url'
      const objectUrl = URL.createObjectURL(selectedFile)

      step = 'loading-image'
      const base64 = await new Promise<string>((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => {
          URL.revokeObjectURL(objectUrl)
          step = 'drawing-canvas'
          const MAX = 2048
          let w = img.naturalWidth
          let h = img.naturalHeight
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round(h * MAX / w); w = MAX }
            else { w = Math.round(w * MAX / h); h = MAX }
          }
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) { reject(new Error('Canvas unavailable')); return }
          ctx.drawImage(img, 0, 0, w, h)
          step = 'exporting-jpeg'
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = (e) => { URL.revokeObjectURL(objectUrl); reject(new Error('Image load failed: ' + String(e))) }
        img.src = objectUrl
      })

      step = 'sending-request'
      const res = await fetch(`/api/complete/${item.key}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo: base64, mimeType: 'image/jpeg' }),
      })

      step = 'reading-response'
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status} ${res.statusText}`
        try {
          const text = await res.text()
          const trimmed = text.slice(0, 200).replace(/<[^>]+>/g, '').trim()
          if (trimmed) errorMsg += ': ' + trimmed
        } catch { /* ignore */ }
        setError(errorMsg)
        setUploading(false)
        return
      }

      step = 'parsing-response'
      const data = await res.json()
      onCompleted(data.completion)
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(`[${step}] ${err instanceof Error ? err.message : String(err)}`)
    }
    setUploading(false)
  }

  const handleSelfCheck = async () => {
    setUploading(true)
    setError('')
    try {
      const res = await fetch(`/api/complete/${item.key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to mark complete')
        setUploading(false)
        return
      }

      const data = await res.json()
      onCompleted(data.completion)
    } catch {
      setError('Network error. Try again.')
    }
    setUploading(false)
  }

  const handleUndo = async () => {
    setUploading(true)
    setError('')
    try {
      const res = await fetch(`/api/complete/${item.key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to undo')
        setUploading(false)
        return
      }

      onDeleted(item.key)
    } catch {
      setError('Network error. Try again.')
    }
    setUploading(false)
  }

  const handleBonusToggle = async () => {
    if (!completion) return
    setBonusLoading(true)
    const newBonus = !completion.bonus_awarded

    try {
      const formData = new FormData()
      const res = await fetch(`/api/complete/${item.key}?bonus=${newBonus}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: item.proofType === 'photo' ? formData : JSON.stringify({}),
        ...(item.proofType !== 'photo' && {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onCompleted(data.completion)
      }
    } catch {
      // silently fail
    }
    setBonusLoading(false)
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        isCompleted
          ? 'border-emerald-600 bg-emerald-950/40'
          : 'border-gray-700 bg-gray-900'
      }`}
    >
      {/* Card header */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Proof type icon */}
        <span className="text-xl flex-shrink-0">
          {isCompleted ? '✅' : item.proofType === 'photo' ? '📷' : '🎥'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
              {item.title}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-900 text-fuchsia-300 font-medium flex-shrink-0">
              {item.points}pts
              {item.bonusPoints ? ` +${item.bonusPoints}` : ''}
            </span>
          </div>
          {isCompleted && (
            <p className="text-xs text-emerald-500 mt-0.5">
              Completed at {formatDate(completion.completed_at)}
              {completion.bonus_awarded && item.bonusPoints ? ` · +${item.bonusPoints} bonus!` : ''}
            </p>
          )}
        </div>

        <span className="text-gray-500 flex-shrink-0 text-sm">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-3">
          <p className="text-sm text-gray-300 leading-relaxed">{item.description}</p>

          {/* Photo thumbnail if completed */}
          {isCompleted && completion.photo_filename && (
            <div className="rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${completion.photo_filename}`}
                alt="Completion photo"
                className="w-full max-h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Bonus claim if completed and item has bonus */}
          {isCompleted && item.bonusPoints && item.bonusCondition && (
            <div className="rounded-lg bg-yellow-900/30 border border-yellow-700/50 p-3">
              <p className="text-xs text-yellow-300 font-medium mb-2">
                Bonus +{item.bonusPoints}pts: {item.bonusCondition}
              </p>
              <button
                onClick={handleBonusToggle}
                disabled={bonusLoading}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  completion.bonus_awarded
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-yellow-800'
                }`}
              >
                {bonusLoading
                  ? '…'
                  : completion.bonus_awarded
                  ? '✓ Bonus Claimed'
                  : 'Claim Bonus'}
              </button>
            </div>
          )}

          {/* Action area */}
          {!isCompleted && item.proofType === 'photo' && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id={`file-${item.key}`}
              />
              <label
                htmlFor={`file-${item.key}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer text-sm font-medium transition-all"
              >
                📷 {selectedFile ? selectedFile.name : 'Choose Photo'}
              </label>

              {previewUrl && (
                <div className="rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-40 object-cover rounded-lg"
                  />
                </div>
              )}

              <button
                onClick={handlePhotoSubmit}
                disabled={!selectedFile || uploading}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  !selectedFile || uploading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white active:scale-95'
                }`}
              >
                {uploading ? 'Uploading…' : 'Submit Photo'}
              </button>
            </div>
          )}

          {!isCompleted && item.proofType === 'self-check' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 italic">
                Share the video in the group chat, then check this off.
              </p>
              <button
                onClick={handleSelfCheck}
                disabled={uploading}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  uploading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white active:scale-95'
                }`}
              >
                {uploading ? '…' : '✓ Mark Complete'}
              </button>
            </div>
          )}

          {/* Undo button if completed */}
          {isCompleted && (
            <button
              onClick={handleUndo}
              disabled={uploading}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              {uploading ? '…' : 'Undo completion'}
            </button>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  )
}

function CategorySection({
  category,
  items,
  completionMap,
  token,
  onCompleted,
  onDeleted,
}: {
  category: string
  items: HuntItem[]
  completionMap: Map<string, Completion>
  token: string
  onCompleted: (c: Completion) => void
  onDeleted: (key: string) => void
}) {
  const [open, setOpen] = useState(true)
  const completedCount = items.filter((i) => completionMap.has(i.key)).length

  return (
    <div className="mb-4">
      <button
        className="w-full flex items-center justify-between py-2 px-1 mb-2"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-fuchsia-300 uppercase tracking-wider">
            {CATEGORY_NAMES[category] ?? category}
          </h2>
          <span className="text-xs text-gray-500">
            {completedCount}/{items.length}
          </span>
        </div>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemCard
              key={item.key}
              item={item}
              completion={completionMap.get(item.key)}
              token={token}
              onCompleted={onCompleted}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function HuntPage() {
  const router = useRouter()
  const [meData, setMeData] = useState<MeData | null>(null)
  const [items, setItems] = useState<HuntItem[]>([])
  const [loading, setLoading] = useState(true)
  const [completionMap, setCompletionMap] = useState<Map<string, Completion>>(new Map())
  const tokenRef = useRef<string>('')

  const refreshMe = useCallback(async (token: string) => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data: MeData = await res.json()
      setMeData(data)
      const map = new Map<string, Completion>()
      for (const c of data.completions) map.set(c.item_key, c)
      setCompletionMap(map)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('hunt_token')
    if (!token) {
      router.replace('/')
      return
    }
    tokenRef.current = token

    Promise.all([
      fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/items'),
    ]).then(async ([meRes, itemsRes]) => {
      if (!meRes.ok) {
        localStorage.removeItem('hunt_token')
        router.replace('/')
        return
      }
      const meJson: MeData = await meRes.json()
      const itemsJson: HuntItem[] = await itemsRes.json()

      setMeData(meJson)
      setItems(itemsJson)
      const map = new Map<string, Completion>()
      for (const c of meJson.completions) map.set(c.item_key, c)
      setCompletionMap(map)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [router])

  const handleCompleted = useCallback((c: Completion) => {
    setCompletionMap((prev) => {
      const next = new Map(prev)
      next.set(c.item_key, c)
      return next
    })
    // Refresh full me data for score update
    if (tokenRef.current) {
      refreshMe(tokenRef.current)
    }
  }, [refreshMe])

  const handleDeleted = useCallback((key: string) => {
    setCompletionMap((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
    if (tokenRef.current) {
      refreshMe(tokenRef.current)
    }
  }, [refreshMe])

  const handleLogout = () => {
    localStorage.removeItem('hunt_token')
    router.replace('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500"></div>
      </div>
    )
  }

  if (!meData) return null

  const team = TEAMS[meData.participant.team as TeamKey]
  const totalItems = items.length
  const completedItems = completionMap.size
  const myScore = meData.myScore ?? 0
  const progressPct = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Group items by category
  const grouped = new Map<string, HuntItem[]>()
  for (const item of items) {
    if (!grouped.has(item.category)) grouped.set(item.category, [])
    grouped.get(item.category)!.push(item)
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-24">
      {/* Team banner */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{team?.emoji}</span>
            <div>
              <p className="font-bold text-white text-sm leading-tight">{team?.name}</p>
              <p className="text-xs text-gray-400">{meData.participant.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-fuchsia-400">{meData.teamScore} pts</p>
            <p className="text-xs text-gray-500">team score</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completedItems} / {totalItems} items</span>
            <span>{myScore} pts (you)</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-600 to-purple-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {CATEGORY_ORDER.map((cat) => {
          const catItems = grouped.get(cat)
          if (!catItems?.length) return null
          return (
            <CategorySection
              key={cat}
              category={cat}
              items={catItems}
              completionMap={completionMap}
              token={tokenRef.current}
              onCompleted={handleCompleted}
              onDeleted={handleDeleted}
            />
          )
        })}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <span className="text-sm font-semibold text-fuchsia-400">Hunt</span>
          <a
            href="/leaderboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            🏆 Leaderboard
          </a>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>
    </main>
  )
}
