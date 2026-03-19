'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Container,
  Box,
  Grid,
  CircularProgress,
  Alert,
  Typography,
  AppBar,
  Toolbar,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material'
import PropertyCard from './components/PropertyCard'
import FilterBar from './components/FilterBar'
import MapView from './components/MapView'
import DualViewToggle from './components/DualViewToggle'

interface Lot {
  id: string
  address: string | null
  township: string | null
  lot_size_acres: number | null
  status: string | null
  list_price: number | null
  source: string | null
  last_scraped_at: string | null
  has_building: boolean | null
  images: Array<{ url: string; source: string }> | null
  enriched_data: Record<string, any> | null
  gis_latitude: number | null
  gis_longitude: number | null
}

// Light theme for Material UI
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#424242',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

export default function Home() {
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')

  const [filters, setFilters] = useState({
    status: '',
    minAcres: '',
    maxAcres: '',
    township: '',
    minPrice: '',
    maxPrice: '',
    hasBuilding: false,
  })

  const fetchLots = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.minAcres) params.set('minAcres', filters.minAcres)
    if (filters.maxAcres) params.set('maxAcres', filters.maxAcres)
    if (filters.township) params.set('township', filters.township)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    if (filters.hasBuilding) params.set('hasBuilding', 'true')

    try {
      const res = await fetch(`/api/lots?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setLots(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchLots()
  }, [fetchLots])

  const handleFilter = (newFilters: typeof filters) => {
    setFilters(newFilters)
  }

  const handleClear = () => {
    setFilters({
      status: '',
      minAcres: '',
      maxAcres: '',
      township: '',
      minPrice: '',
      maxPrice: '',
      hasBuilding: false,
    })
  }

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" sx={{ backgroundColor: '#fff', color: '#000', boxShadow: 1 }}>
          <Toolbar>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Lots in Lancaster
            </Typography>
            <Typography
              variant="body2"
              sx={{ marginLeft: 2, color: '#666' }}
            >
              Land listings for Lancaster County, PA
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
          <FilterBar onFilter={handleFilter} onClear={handleClear} />

          <DualViewToggle view={view} onChange={setView} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : view === 'list' ? (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Found {lots.length} properties
              </Typography>
              {lots.length === 0 ? (
                <Alert severity="info">No properties found. Try adjusting your filters.</Alert>
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
              <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                Map view - Showing {lots.length} properties
              </Typography>
              {lots.length === 0 ? (
                <Alert severity="info">No properties with location data available.</Alert>
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
