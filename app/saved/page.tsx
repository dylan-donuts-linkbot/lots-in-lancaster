'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Container, Box, Typography, Alert, Grid } from '@mui/material'
import { useFavorites } from '@/lib/favorites'
import PropertyCard from '../components/PropertyCard'
import type { LotSummary } from '@/lib/types'

export default function SavedPage() {
  const { favorites, count } = useFavorites()
  const [lots, setLots] = useState<LotSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (favorites.length === 0) {
      setLots([])
      setLoading(false)
      return
    }

    async function fetchSaved() {
      setLoading(true)
      try {
        const res = await fetch('/api/lots?limit=1000')
        if (!res.ok) throw new Error('Failed to fetch')
        const all: LotSummary[] = await res.json()
        setLots(all.filter((l) => favorites.includes(l.id)))
      } catch {
        setLots([])
      } finally {
        setLoading(false)
      }
    }
    fetchSaved()
  }, [favorites])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <Box sx={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', py: 2 }}>
        <Container maxWidth="lg">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Typography
              variant="body2"
              sx={{ color: '#666', mb: 1, cursor: 'pointer', '&:hover': { color: '#1976d2' } }}
            >
              ← Back to listings
            </Typography>
          </Link>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#1976d2' }}>
            ⭐ Saved Lots
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', mt: 0.5 }}>
            {count} lot{count !== 1 ? 's' : ''} saved
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Loading saved lots...
            </Typography>
          </Box>
        ) : lots.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h5" sx={{ color: '#999', mb: 2 }}>
              📌 No saved lots yet
            </Typography>
            <Typography variant="body1" sx={{ color: '#bbb', mb: 3 }}>
              Click the ⭐ icon on any lot to save it here
            </Typography>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Box
                component="button"
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 1,
                  px: 3,
                  py: 1.5,
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#1565c0' },
                }}
              >
                Browse Lots
              </Box>
            </Link>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {lots.map((lot) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={lot.id}>
                <PropertyCard lot={lot} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  )
}
