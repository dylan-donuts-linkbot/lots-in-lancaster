'use client'

import {
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  Paper,
  Chip,
  Typography,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface FilterBarProps {
  onFilter: (filters: {
    status: string
    minAcres: string
    maxAcres: string
    township: string
    minPrice: string
    maxPrice: string
    hasBuilding: boolean
  }) => void
  onClear: () => void
}

interface Preset {
  label: string
  key: string
  apply: (f: Filters) => Filters
}

interface Filters {
  status: string
  minAcres: string
  maxAcres: string
  township: string
  minPrice: string
  maxPrice: string
  hasBuilding: boolean
}

const pricePresets: Preset[] = [
  {
    label: 'Under $50k',
    key: 'price_50k',
    apply: (f) => ({ ...f, minPrice: '', maxPrice: '50000' }),
  },
  {
    label: 'Under $100k',
    key: 'price_100k',
    apply: (f) => ({ ...f, minPrice: '', maxPrice: '100000' }),
  },
  {
    label: 'Under $150k',
    key: 'price_150k',
    apply: (f) => ({ ...f, minPrice: '', maxPrice: '150000' }),
  },
]

const acrePresets: Preset[] = [
  {
    label: '1+ Acres',
    key: 'acres_1',
    apply: (f) => ({ ...f, minAcres: '1', maxAcres: '' }),
  },
  {
    label: '5+ Acres',
    key: 'acres_5',
    apply: (f) => ({ ...f, minAcres: '5', maxAcres: '' }),
  },
  {
    label: '10+ Acres',
    key: 'acres_10',
    apply: (f) => ({ ...f, minAcres: '10', maxAcres: '' }),
  },
]

const defaultFilters: Filters = {
  status: '',
  minAcres: '',
  maxAcres: '',
  township: '',
  minPrice: '',
  maxPrice: '',
  hasBuilding: false,
}

export default function FilterBar({ onFilter, onClear }: FilterBarProps) {
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [activePresets, setActivePresets] = useState<Set<string>>(new Set())

  // Hydrate from URL on mount
  useEffect(() => {
    const f: Filters = {
      status: searchParams.get('status') || '',
      minAcres: searchParams.get('minAcres') || '',
      maxAcres: searchParams.get('maxAcres') || '',
      township: searchParams.get('township') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      hasBuilding: searchParams.get('hasBuilding') === 'true',
    }
    setFilters(f)

    // Restore active presets from URL param
    const presetParam = searchParams.get('presets')
    if (presetParam) {
      setActivePresets(new Set(presetParam.split(',')))
    }
  }, [searchParams])

  const togglePreset = (preset: Preset) => {
    const next = new Set(activePresets)
    let nextFilters = { ...filters }

    if (next.has(preset.key)) {
      // Deactivate: remove this preset and clear its applied values
      next.delete(preset.key)
      // Reset the fields this preset would have set
      if (preset.key.startsWith('price_')) {
        nextFilters.minPrice = ''
        nextFilters.maxPrice = ''
      } else if (preset.key.startsWith('acres_')) {
        nextFilters.minAcres = ''
        nextFilters.maxAcres = ''
      }
      // Re-apply remaining presets of same type
      const remaining = [...next]
      for (const k of remaining) {
        const all = [...pricePresets, ...acrePresets]
        const p = all.find((pp) => pp.key === k)
        if (p) nextFilters = p.apply(nextFilters)
      }
    } else {
      // Deselect other presets in same group
      const group = preset.key.startsWith('price_') ? pricePresets : acrePresets
      for (const gp of group) {
        next.delete(gp.key)
      }
      next.add(preset.key)
      nextFilters = preset.apply(nextFilters)
    }

    setActivePresets(next)
    setFilters(nextFilters)
    onFilter(nextFilters)
  }

  const handleApply = () => {
    onFilter(filters)
  }

  const handleClear = () => {
    setFilters(defaultFilters)
    setActivePresets(new Set())
    onClear()
  }

  const updateField = (field: keyof Filters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
      <Stack spacing={2}>
        {/* Preset Price Pills */}
        <Box>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: '#555', fontSize: '0.95rem' }}
          >
            Price Range
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ flexWrap: 'wrap' }}
          >
            {pricePresets.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                onClick={() => togglePreset(p)}
                color={activePresets.has(p.key) ? 'primary' : 'default'}
                variant={activePresets.has(p.key) ? 'filled' : 'outlined'}
                sx={{
                  minHeight: 48,
                  minWidth: 120,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  px: 2,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Preset Acreage Pills */}
        <Box>
          <Typography
            variant="body2"
            sx={{ mb: 1, fontWeight: 600, color: '#555', fontSize: '0.95rem' }}
          >
            Lot Size
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ flexWrap: 'wrap' }}
          >
            {acrePresets.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                onClick={() => togglePreset(p)}
                color={activePresets.has(p.key) ? 'primary' : 'default'}
                variant={activePresets.has(p.key) ? 'filled' : 'outlined'}
                sx={{
                  minHeight: 48,
                  minWidth: 120,
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  px: 2,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* Township + Status row */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Township"
            value={filters.township}
            onChange={(e) => updateField('township', e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
          <TextField
            select
            label="Status"
            value={filters.status}
            onChange={(e) => updateField('status', e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
            SelectProps={{ native: true }}
          >
            <option value="">All</option>
            <option value="for_sale">For Sale</option>
            <option value="sold">Sold</option>
            <option value="unknown">Unknown</option>
          </TextField>
        </Stack>

        <FormControlLabel
          control={
            <Checkbox
              checked={filters.hasBuilding}
              onChange={(e) => updateField('hasBuilding', e.target.checked)}
              sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
            />
          }
          label="Has Building"
          sx={{ '& .MuiFormControlLabel-label': { fontSize: '1rem' } }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApply}
            sx={{
              backgroundColor: '#1976d2',
              minHeight: 48,
              fontSize: '1.05rem',
              fontWeight: 600,
            }}
            fullWidth
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleClear}
            sx={{ minHeight: 48, fontSize: '1.05rem', fontWeight: 600 }}
            fullWidth
          >
            Clear All
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
