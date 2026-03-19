'use client'

import { Box, TextField, Button, FormControlLabel, Checkbox, Stack, Paper } from '@mui/material'
import { useState } from 'react'

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

export default function FilterBar({ onFilter, onClear }: FilterBarProps) {
  const [status, setStatus] = useState('')
  const [minAcres, setMinAcres] = useState('')
  const [maxAcres, setMaxAcres] = useState('')
  const [township, setTownship] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [hasBuilding, setHasBuilding] = useState(false)

  const handleApply = () => {
    onFilter({
      status,
      minAcres,
      maxAcres,
      township,
      minPrice,
      maxPrice,
      hasBuilding,
    })
  }

  const handleClear = () => {
    setStatus('')
    setMinAcres('')
    setMaxAcres('')
    setTownship('')
    setMinPrice('')
    setMaxPrice('')
    setHasBuilding(false)
    onClear()
  }

  return (
    <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Township"
            value={township}
            onChange={(e) => setTownship(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
            SelectProps={{
              native: true,
            }}
          >
            <option value="">All</option>
            <option value="for_sale">For Sale</option>
            <option value="sold">Sold</option>
            <option value="unknown">Unknown</option>
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Min Acres"
            type="number"
            value={minAcres}
            onChange={(e) => setMinAcres(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
          <TextField
            label="Max Acres"
            type="number"
            value={maxAcres}
            onChange={(e) => setMaxAcres(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Min Price ($)"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
          <TextField
            label="Max Price ($)"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            size="small"
            fullWidth
            sx={{ backgroundColor: 'white' }}
          />
        </Stack>

        <FormControlLabel
          control={
            <Checkbox
              checked={hasBuilding}
              onChange={(e) => setHasBuilding(e.target.checked)}
            />
          }
          label="Has Building"
        />

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleApply}
            sx={{ backgroundColor: '#1976d2' }}
          >
            Apply Filters
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleClear}>
            Clear All
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}
