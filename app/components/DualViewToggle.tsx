'use client'

import { Box, ToggleButton, ToggleButtonGroup, Paper } from '@mui/material'
import { List as ListIcon, Map as MapIcon } from '@mui/icons-material'

interface DualViewToggleProps {
  view: 'list' | 'map'
  onChange: (view: 'list' | 'map') => void
}

export default function DualViewToggle({ view, onChange }: DualViewToggleProps) {
  return (
    <Paper sx={{ display: 'flex', justifyContent: 'center', p: 1, mb: 2 }}>
      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(event, newView) => {
          if (newView !== null) {
            onChange(newView)
          }
        }}
        aria-label="view mode"
      >
        <ToggleButton value="list" aria-label="list view">
          <ListIcon sx={{ mr: 1 }} />
          List
        </ToggleButton>
        <ToggleButton value="map" aria-label="map view">
          <MapIcon sx={{ mr: 1 }} />
          Map
        </ToggleButton>
      </ToggleButtonGroup>
    </Paper>
  )
}
