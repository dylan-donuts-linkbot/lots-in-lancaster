'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'lots-favorites'

/** Get favorite lot IDs from localStorage */
export function getFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Save favorite lot IDs to localStorage */
function saveFavorites(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

/** Toggle a lot ID in favorites. Returns new state. */
export function toggleFavorite(id: string): boolean {
  const current = getFavorites()
  const index = current.indexOf(id)
  if (index >= 0) {
    current.splice(index, 1)
    saveFavorites(current)
    return false
  } else {
    current.push(id)
    saveFavorites(current)
    return true
  }
}

/** Check if a lot ID is favorited */
export function isFavorite(id: string): boolean {
  return getFavorites().includes(id)
}

/** React hook for favorites state */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    setFavorites(getFavorites())

    const handler = () => setFavorites(getFavorites())
    window.addEventListener('favorites-changed', handler)
    return () => window.removeEventListener('favorites-changed', handler)
  }, [])

  const toggle = useCallback((id: string) => {
    toggleFavorite(id)
    setFavorites(getFavorites())
    window.dispatchEvent(new Event('favorites-changed'))
  }, [])

  const isLiked = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  )

  return { favorites, count: favorites.length, toggle, isLiked }
}
