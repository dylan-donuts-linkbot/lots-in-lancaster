'use client'

import { Card, CardContent, Box, Stack } from '@mui/material'

const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`

const shimmerSx = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s infinite linear',
  borderRadius: 1,
}

export default function PropertyCardSkeleton() {
  return (
    <>
      <style>{shimmerKeyframes}</style>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Image placeholder — matches PropertyCard's 200px image */}
        <Box sx={{ ...shimmerSx, height: 200, borderRadius: 0 }} />

        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Address line */}
          <Box sx={{ ...shimmerSx, height: 24, width: '75%' }} />

          {/* Price + acres chips */}
          <Stack direction="row" spacing={1}>
            <Box sx={{ ...shimmerSx, height: 24, width: 80, borderRadius: 12 }} />
            <Box sx={{ ...shimmerSx, height: 24, width: 90, borderRadius: 12 }} />
          </Stack>

          {/* Has building line */}
          <Box sx={{ ...shimmerSx, height: 18, width: '40%' }} />

          {/* Status chip */}
          <Box sx={{ marginTop: 'auto' }}>
            <Box sx={{ ...shimmerSx, height: 24, width: 70, borderRadius: 12 }} />
          </Box>
        </CardContent>
      </Card>
    </>
  )
}
