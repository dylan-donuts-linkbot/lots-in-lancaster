'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
  Box,
  Grid,
  Alert,
  Typography,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Badge,
  IconButton,
} from '@mui/material'
import { Star as StarIcon } from '@mui/icons-material'
import Link from 'next/link'
import PropertyCard from './components/PropertyCard'
import FilterBar from './components/FilterBar'
import MapView from './components/MapView'
import DualViewToggle from './components/DualViewToggle'
import type { LotSummary } from '@/lib/types'
import { useFavorites } from '@/lib/favorites'

// Elderly-friendly light theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#424242' },
    background: { default: '#fafafa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 18, // Bumped from default 14 for readability
    h6: { fontSize: '1.5rem' },
    body1: { fontSize: '1.125rem', lineHeight: 1.6 },
    body2: { fontSize: '1rem', lineHeight: 1.6 },
    button: { fontSize: '1.125rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '12px 24px',
          fontSize: '1.125rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            fontSize: '1rem',
            padding: '14px',
          },
          '& .MuiInputLabel-root': {
            fontSize: '1rem',
          },
        },
      },
    },
  },
})

interface HomeClientProps {
  initialLots: LotSummary[]
}

export default function HomeClient({ initialLots }: HomeClientProps) {
  const [lots, setLots] = useState<LotSummary[]>(initialLots)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { count: favCount } = useFavorites()

  const handleFilter = useCallback(
    async (filters: {
      status: string
      minAcres: string
      maxAcres: string
      township: string
      minPrice: string
      maxPrice: string
      hasBuilding: boolean
    }) => {
      // Update URL with query params (SSR-friendly)
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.minAcres) params.set('minAcres', filters.minAcres)
      if (filters.maxAcres) params.set('maxAcres', filters.maxAcres)
      if (filters.township) params.set('township', filters.township)
      if (filters.minPrice) params.set('minPrice', filters.minPrice)
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
      if (filters.hasBuilding) params.set('hasBuilding', 'true')

      const qs = params.toString()
      router.push(qs ? `/?${qs}` : '/')

      // Also fetch client-side for instant update
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/lots?${qs}`)
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setLots(Array.isArray(data) ? data : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [router]
  )

  const handleClear = useCallback(() => {
    router.push('/')
    setLots(initialLots)
  }, [router, initialLots])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" sx={{ backgroundColor: '#fff', color: '#000', boxShadow: 1 }}>
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600, color: '#1976d2' }}>
              🌾 Lots in Lancaster
            </Typography>
            <Typography variant="body2" sx={{ marginLeft: 2, color: '#666' }}>
              Land listings for Lancaster County, PA
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Link href="/saved" style={{ textDecoration: 'none' }}>
              <IconButton color="primary" aria-label="Saved lots">
                <Badge badgeContent={favCount} color="warning">
                  <StarIcon sx={{ fontSize: 28 }} />
                </Badge>
              </IconButton>
            </Link>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
          <FilterBar onFilter={handleFilter} onClear={handleClear} />

          <DualViewToggle view={view} onChange={setView} />

          {error && (
            <Alert severity="error" sx={{ mb: 2, fontSize: '1rem' }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Loading...
              </Typography>
            </Box>
          ) : view === 'list' ? (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
                Found {lots.length} properties
              </Typography>
              {lots.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: '1rem' }}>
                  No properties found. Try adjusting your filters.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {lots.map((lot) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={lot.id}>
                      <PropertyCard lot={lot} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
                Map view — Showing {lots.length} properties
              </Typography>
              {lots.length === 0 ? (
                <Alert severity="info" sx={{ fontSize: '1rem' }}>
                  No properties with location data available.
                </Alert>
              ) : (
                <MapView lots={lots} />
              )}
            </>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  )
}
