'use client'

import { Card, CardContent, CardMedia, Box, Typography, Chip, Stack } from '@mui/material'
import Link from 'next/link'
import { BuildCircle } from '@mui/icons-material'
import { SaveButton } from '@/components/SaveButton'

interface Lot {
  id: string
  address: string | null
  list_price: number | null
  lot_size_acres: number | null
  has_building: boolean | null
  status: string | null
  images: Array<{ url: string; source: string }> | null
  satellite_image_url?: string | null
}

export default function PropertyCard({ lot }: { lot: Lot }) {
  const statusColorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
    for_sale: 'success',
    sold: 'default',
    unknown: 'warning',
  }

  const imageUrl = lot.images?.[0]?.url || lot.satellite_image_url || '/placeholder-lot.svg'

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-4px)',
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Link href={`/lots/${lot.id}`} style={{ textDecoration: 'none' }}>
          <CardMedia
            component="img"
            height="200"
            image={imageUrl}
            alt={lot.address || 'Property image'}
            sx={{ objectFit: 'cover', backgroundColor: '#f0f0f0' }}
          />
        </Link>
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          <SaveButton lotId={lot.id} className="bg-white shadow-md" />
        </Box>
      </Box>
      <Link href={`/lots/${lot.id}`} style={{ textDecoration: 'none', flexGrow: 1, display: 'flex' }}>
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1976d2', fontSize: '1.1rem' }}>
            {lot.address || 'Address TBA'}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label={`$${lot.list_price?.toLocaleString() || 'N/A'}`}
              size="small"
              sx={{ backgroundColor: '#e8f5e9', color: '#2e7d32', fontSize: '0.9rem' }}
            />
            <Chip
              label={`${lot.lot_size_acres?.toFixed(2) || 'N/A'} acres`}
              size="small"
              sx={{ backgroundColor: '#e3f2fd', color: '#1565c0', fontSize: '0.9rem' }}
            />
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {lot.has_building && (
              <>
                <BuildCircle sx={{ fontSize: 18, color: '#ff9800' }} />
                <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 500 }}>
                  Has Building
                </Typography>
              </>
            )}
          </Stack>

          <Box sx={{ marginTop: 'auto' }}>
            <Chip
              label={lot.status || 'unknown'}
              size="small"
              color={statusColorMap[lot.status || ''] || 'default'}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Link>
    </Card>
  )
}
