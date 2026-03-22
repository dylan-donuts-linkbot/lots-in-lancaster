'use client'

import { useCallback, useRef, useState } from 'react'
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
  Button,
} from '@mui/material'
import { Star as StarIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import Link from 'next/link'
import PropertyCard from './components/PropertyCard'
import FilterBar from './components/FilterBar'
import MapView from './components/MapView'
import DualViewToggle from './components/DualViewToggle'
import PropertyCardSkeleton from '@/components/PropertyCardSkeleton'
import type { LotSummary } from '@/lib/types'
import { useFavorites } from '@/lib/favorites'

const PAGE_SIZE = 20

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
    fontSize: 18,
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

type ErrorKind = 'empty' | 'network' | 'server' | null

interface HomeClientProps {
  initialLots: LotSummary[]
}

export default function HomeClient({ initialLots }: HomeClientProps) {
  const [lots, setLots] = useState<LotSummary[]>(initialLots)
  const [loading, setLoading] = useState(false)
  const [errorKind, setErrorKind] = useState<ErrorKind>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { count: favCount } = useFavorites()
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const lastQueryRef = useRef<string>('')

  const fetchLots = useCallback(
    async (qs: string) => {
      setLoading(true)
      setErrorKind(null)
      lastQueryRef.current = qs
      try {
        const res = await fetch(`/api/lots?${qs}`)
        if (!res.ok) {
          // Server error — auto-retry once after 2s
          setErrorKind('server')
          setTimeout(async () => {
            try {
              const retry = await fetch(`/api/lots?${qs}`)
              if (!retry.ok) throw new Error()
              const data = await retry.json()
              setLots(Array.isArray(data) ? data : [])
              setErrorKind(data.length === 0 ? 'empty' : null)
            } catch {
              setErrorKind('server')
            } finally {
              setLoading(false)
            }
          }, 2000)
          return
        }
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setLots(arr)
        if (arr.length === 0) setErrorKind('empty')
      } catch (e) {
        // Network error
        if (
          e instanceof TypeError &&
          (e.message.includes('fetch') || e.message.includes('network'))
        ) {
          setErrorKind('network')
        } else {
          setErrorKind('network')
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

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

      // Reset pagination on filter change
      setVisibleCount(PAGE_SIZE)
      await fetchLots(qs)
    },
    [router, fetchLots]
  )

  const handleClear = useCallback(() => {
    router.push('/')
    setLots(initialLots)
    setVisibleCount(PAGE_SIZE)
    setErrorKind(null)
  }, [router, initialLots])

  const handleRetry = useCallback(() => {
    fetchLots(lastQueryRef.current)
  }, [fetchLots])

  const handleLoadMore = () => {
    setVisibleCount((prev) => {
      const next = prev + PAGE_SIZE
      // Scroll to the new content after render
      setTimeout(() => {
        loadMoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return next
    })
  }

  const visibleLots = lots.slice(0, visibleCount)
  const allLoaded = visibleCount >= lots.length

  const renderError = () => {
    if (!errorKind) return null

    const errorConfig = {
      empty: {
        severity: 'info' as const,
        title: 'No lots found matching your filters',
        message: 'Try removing some filters or broadening your search.',
        showRetry: false,
      },
      network: {
        severity: 'warning' as const,
        title: 'Connection error',
        message: 'Please check your internet connection and try again.',
        showRetry: true,
      },
      server: {
        severity: 'error' as const,
        title: 'Something went wrong',
        message: 'We\'re trying to refresh automatically...',
        showRetry: true,
      },
    }

    const config = errorConfig[errorKind]

    return (
      <Alert
        severity={config.severity}
        sx={{
          mb: 2,
          fontSize: '1.15rem',
          '& .MuiAlert-message': { fontSize: '1.15rem' },
          '& .MuiAlert-icon': { fontSize: 32 },
          border: '2px solid',
          borderColor:
            config.severity === 'error'
              ? '#f44336'
              : config.severity === 'warning'
              ? '#ff9800'
              : '#2196f3',
          p: 2,
        }}
        action={
          config.showRetry ? (
            <Button
              color="inherit"
              size="large"
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
              sx={{
                minHeight: 48,
                minWidth: 100,
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              Retry
            </Button>
          ) : undefined
        }
      >
        <Typography
          variant="body1"
          sx={{ fontWeight: 700, fontSize: '1.2rem', mb: 0.5 }}
        >
          {config.title}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '1.05rem' }}>
          {config.message}
        </Typography>
      </Alert>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" sx={{ backgroundColor: '#fff', color: '#000', boxShadow: 1 }}>
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600, color: '#1976d2' }}>
              🌾 Lots in Lancaster
            </Typography>
            <Typography
              variant="body2"
              sx={{ marginLeft: 2, color: '#666', display: { xs: 'none', sm: 'block' } }}
            >
              Land listings for Lancaster County, PA
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Link href="/saved" style={{ textDecoration: 'none' }}>
              <IconButton color="primary" aria-label="Saved lots" sx={{ minWidth: 48, minHeight: 48 }}>
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

          {renderError()}

          {loading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`skel-${i}`}>
                  <PropertyCardSkeleton />
                </Grid>
              ))}
            </Grid>
          ) : view === 'list' ? (
            <>
              {errorKind !== 'empty' && (
                <Typography variant="body1" sx={{ mb: 2, color: '#666' }}>
                  Showing {Math.min(visibleCount, lots.length)} of {lots.length} properties
                </Typography>
              )}
              {lots.length > 0 && (
                <>
                  <Grid container spacing={2}>
                    {visibleLots.map((lot) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={lot.id}>
                        <PropertyCard lot={lot} />
                      </Grid>
                    ))}
                  </Grid>

                  {/* Scroll anchor for Load More */}
                  <div ref={loadMoreRef} />

                  {!allLoaded && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleLoadMore}
                        sx={{
                          minHeight: 56,
                          minWidth: 200,
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          borderRadius: 3,
                        }}
                      >
                        Load More ({lots.length - visibleCount} remaining)
                      </Button>
                    </Box>
                  )}

                  {allLoaded && lots.length > PAGE_SIZE && (
                    <Typography
                      variant="body2"
                      sx={{ textAlign: 'center', mt: 2, color: '#999' }}
                    >
                      All {lots.length} properties loaded
                    </Typography>
                  )}
                </>
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
