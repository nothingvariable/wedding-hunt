'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TEAMS, TeamKey } from '@/data/teams'
import { CATEGORY_NAMES } from '@/lib/scores'

export interface GalleryPhoto {
  filename: string
  itemKey: string
  itemTitle: string
  category: string
  completedAt: string
  participantName: string
  team: string
}

export default function GalleryPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'bride' | 'groom'>('all')
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('hunt_token')
    if (!token) {
      router.replace('/')
      return
    }

    fetch('/api/gallery', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setPhotos(data.photos)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const filtered = filter === 'all' ? photos : photos.filter((p) => p.team === filter)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fuchsia-500" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-white">Gallery</h1>
          <span className="ml-auto text-xs text-gray-600">{filtered.length} photos</span>
        </div>

        {/* Team filter */}
        <div className="flex gap-2 max-w-lg mx-auto mt-3">
          {(['all', 'bride', 'groom'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f === 'all'
                ? 'All Photos'
                : `${TEAMS[f as TeamKey].emoji} ${TEAMS[f as TeamKey].name}`}
            </button>
          ))}
        </div>
      </div>

      {/* Photo grid */}
      <div className="max-w-lg mx-auto px-2 pt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📷</div>
            <p className="text-gray-500 text-sm">No photos yet. Get out there!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {filtered.map((photo) => (
              <button
                key={photo.filename}
                onClick={() => setLightbox(photo)}
                className="relative aspect-square overflow-hidden rounded-md bg-gray-800 group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${photo.filename}`}
                  alt={photo.itemTitle}
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                />
                {/* Name overlay on hover */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] font-medium truncate leading-tight">
                    {photo.participantName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${lightbox.filename}`}
              alt={lightbox.itemTitle}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="px-4 pb-10 pt-3 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-sm">{lightbox.itemTitle}</p>
            <p className="text-gray-400 text-xs mt-1">
              {CATEGORY_NAMES[lightbox.category] ?? lightbox.category}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {lightbox.participantName}
              {' · '}
              {TEAMS[lightbox.team as TeamKey]?.emoji}{' '}
              {TEAMS[lightbox.team as TeamKey]?.name}
            </p>
            <button
              className="mt-4 text-gray-500 text-xs hover:text-white transition-colors"
              onClick={() => setLightbox(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
