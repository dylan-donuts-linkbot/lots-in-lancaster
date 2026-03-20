'use client'

import { useEffect, useRef } from 'react'
import { Box, Paper, CircularProgress } from '@mui/material'

interface Lot {
  id: string
  gis_latitude: number | null
  gis_longitude: number | null
  address: string | null
  list_price: number | null
}

interface MapViewProps {
  lots: Lot[]
  selectedLotId?: string
  onLotClick?: (lotId: string) => void
}

export default function MapView({ lots, selectedLotId, onLotClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    // This is a placeholder implementation
    // In production, you would initialize mapbox-gl or leaflet here
    // For now, showing a simple message that map is loading

    const initMap = async () => {
      // Dynamic import to avoid SSR issues
      const mapboxgl = (await import('mapbox-gl')).default

      // Make sure mapbox token is set
      if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
        console.error('Mapbox token not set')
        return
      }

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

      const validLots = lots.filter((l) => l.gis_latitude && l.gis_longitude)

      if (validLots.length === 0) {
        if (mapContainer.current) {
          mapContainer.current.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">No location data available</div>'
        }
        return
      }

      // Calculate bounds for all lots
      const bounds = validLots.reduce(
        (acc, lot) => {
          if (lot.gis_latitude && lot.gis_longitude) {
            acc.minLat = Math.min(acc.minLat, lot.gis_latitude)
            acc.maxLat = Math.max(acc.maxLat, lot.gis_latitude)
            acc.minLng = Math.min(acc.minLng, lot.gis_longitude)
            acc.maxLng = Math.max(acc.maxLng, lot.gis_longitude)
          }
          return acc
        },
        { minLat: 40.05, maxLat: 40.05, minLng: -76.3, maxLng: -76.3 }
      )

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/light-v11',
      })

      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 50 }
      )

      validLots.forEach((lot) => {
        if (lot.gis_latitude && lot.gis_longitude) {
          const el = document.createElement('div')
          el.style.width = '20px'
          el.style.height = '20px'
          el.style.backgroundImage = lot.id === selectedLotId
            ? 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI5IiBmaWxsPSIjZWExMTAwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=")'
            : 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMCIgY3k9IjEwIiByPSI5IiBmaWxsPSIjMTk3NmQyIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz48L3N2Zz4=")'
          el.style.backgroundSize = '100%'
          el.style.cursor = 'pointer'

          el.addEventListener('click', () => {
            onLotClick?.(lot.id)
          })

          new mapboxgl.Marker({ element: el })
            .setLngLat([lot.gis_longitude, lot.gis_latitude])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<strong>${lot.address}</strong><br/>$${lot.list_price?.toLocaleString() || 'N/A'}`
              )
            )
            .addTo(map)
        }
      })
    }

    initMap()
  }, [lots, selectedLotId, onLotClick])

  return (
    <Paper
      ref={mapContainer}
      sx={{
        width: '100%',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
      }}
    >
      <CircularProgress />
    </Paper>
  )
}
