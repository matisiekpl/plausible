import React, { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import dayjs from 'dayjs'
import { RecentEvent } from '../../../api'
import { COUNTRIES_BY_TWO_LETTER_CODE } from '../countries'
import { Coordinates, loadCitiesCoords, lookupCoordinates } from './coords'
import { visitorAvatar, visitorOffset } from './visitor'

type VisitorMarker = {
  coordinates: Coordinates
  count: number
  newest: string
  latestEvent: RecentEvent
}

const secondsPerRevolution = 120
const maxSpinZoom = 5
const flyPauseMilliseconds = 5000
const interactionPauseMilliseconds = 3000

function buildMarkerElement(visitorKey: string, fresh: boolean) {
  const element = document.createElement('div')
  element.className = 'cursor-pointer'
  element.style.width = '40px'
  element.style.height = '40px'
  const avatar = document.createElement('img')
  avatar.src = visitorAvatar(visitorKey)
  avatar.className =
    'h-full w-full rounded-full border-2 border-gray-700 bg-gray-800 shadow-lg'
  element.appendChild(avatar)
  if (fresh) {
    const dot = document.createElement('span')
    dot.className =
      'absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-gray-900 bg-orange-400'
    element.appendChild(dot)
  }
  return element
}

function buildPopupContent(visitorKey: string, marker: VisitorMarker) {
  const { latestEvent } = marker
  const flag =
    COUNTRIES_BY_TWO_LETTER_CODE[latestEvent.country_code]?.flag ?? ''
  const location = latestEvent.city_name
    ? `${latestEvent.city_name}, ${latestEvent.country_name}`
    : latestEvent.country_name
  const content = document.createElement('div')
  content.className = 'flex gap-3 text-sm text-gray-100'
  const avatar = document.createElement('img')
  avatar.src = visitorAvatar(visitorKey)
  avatar.className = 'h-12 w-12 rounded-full bg-gray-800'
  content.appendChild(avatar)
  const details = document.createElement('div')
  details.className = 'flex flex-col gap-0.5'
  const rows = [
    ['font-semibold', `${flag} ${location}`.trim()],
    ['font-mono text-indigo-300', latestEvent.pathname],
    [
      'text-xs text-gray-400',
      `${marker.count} ${marker.count === 1 ? 'pageview' : 'pageviews'} \u00b7 ${dayjs.utc(marker.newest).fromNow()}`
    ]
  ]
  for (const [className, text] of rows) {
    const row = document.createElement('div')
    row.className = className
    row.textContent = text
    details.appendChild(row)
  }
  content.appendChild(details)
  return content
}

function aggregateByVisitor(
  events: RecentEvent[],
  citiesCoords: Awaited<ReturnType<typeof loadCitiesCoords>>
) {
  const markers = new Map<string, VisitorMarker>()
  for (const event of events) {
    const existing = markers.get(event.visitor_key)
    if (existing) {
      existing.count += 1
      if (event.timestamp > existing.newest) {
        existing.newest = event.timestamp
        existing.latestEvent = event
      }
      continue
    }
    const coordinates = lookupCoordinates(
      citiesCoords,
      event.city_geoname_id,
      event.country_code
    )
    if (!coordinates) {
      continue
    }
    const [longitudeOffset, latitudeOffset] = visitorOffset(event.visitor_key)
    markers.set(event.visitor_key, {
      coordinates: [
        coordinates[0] + longitudeOffset,
        coordinates[1] + latitudeOffset
      ],
      count: 1,
      newest: event.timestamp,
      latestEvent: event
    })
  }
  return markers
}

export const GlobeMap = React.memo(function GlobeMap({
  token,
  events,
  spinning
}: {
  token: string
  events: RecentEvent[]
  spinning: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef(new Map<string, mapboxgl.Marker>())
  const spinPausedUntilRef = useRef(0)
  const previousNewestRef = useRef<string>('')
  const spinningRef = useRef(spinning)
  const spinGlobeRef = useRef<() => void>(() => {})
  const popupOpenRef = useRef(false)

  useEffect(() => {
    const markers = markersRef.current
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      zoom: 1.4,
      center: [0, 20],
      attributionControl: false
    })
    mapRef.current = map

    map.on('style.load', () => {
      map.setFog({
        color: 'rgb(11, 11, 25)',
        'high-color': 'rgb(36, 92, 223)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(5, 5, 20)',
        'star-intensity': 0.6
      })
    })

    let userInteracting = false

    let resumeTimeout: ReturnType<typeof setTimeout> | undefined

    const spinGlobe = () => {
      clearTimeout(resumeTimeout)
      const pauseRemaining = spinPausedUntilRef.current - Date.now()
      if (pauseRemaining > 0) {
        resumeTimeout = setTimeout(spinGlobe, pauseRemaining)
        return
      }
      if (
        !spinningRef.current ||
        popupOpenRef.current ||
        userInteracting ||
        map.getZoom() >= maxSpinZoom
      ) {
        return
      }
      const center = map.getCenter()
      center.lng -= 360 / secondsPerRevolution
      map.easeTo({ center, duration: 1000, easing: (n) => n })
    }

    const stopInteracting = () => {
      userInteracting = false
      spinGlobe()
    }

    const pauseSpin = () => {
      spinPausedUntilRef.current = Date.now() + interactionPauseMilliseconds
    }

    map.on('mousedown', () => {
      userInteracting = true
    })
    map.on('wheel', pauseSpin)
    map.on('zoomstart', pauseSpin)
    map.on('touchstart', pauseSpin)
    map.on('mouseup', stopInteracting)
    map.on('dragend', stopInteracting)
    map.on('pitchend', stopInteracting)
    map.on('rotateend', stopInteracting)
    map.on('moveend', spinGlobe)
    map.on('load', spinGlobe)
    spinGlobeRef.current = spinGlobe

    return () => {
      clearTimeout(resumeTimeout)
      markers.clear()
      map.remove()
      mapRef.current = null
    }
  }, [token])

  useEffect(() => {
    spinningRef.current = spinning
    if (spinning) {
      spinGlobeRef.current()
    } else {
      mapRef.current?.stop()
    }
  }, [spinning])

  useEffect(() => {
    let cancelled = false
    loadCitiesCoords().then((citiesCoords) => {
      const map = mapRef.current
      if (cancelled || !map) {
        return
      }
      const visitorMarkers = aggregateByVisitor(events, citiesCoords)
      const previousNewest = previousNewestRef.current
      let newest: VisitorMarker | null = null

      for (const [key, marker] of markersRef.current) {
        if (!visitorMarkers.has(key)) {
          marker.remove()
          markersRef.current.delete(key)
        }
      }

      for (const [key, visitorMarker] of visitorMarkers) {
        const fresh = visitorMarker.newest > previousNewest
        const popup = new mapboxgl.Popup({
          offset: 24,
          closeButton: false,
          className: 'globe-popup'
        }).setDOMContent(buildPopupContent(key, visitorMarker))
        popup.on('open', () => {
          popupOpenRef.current = true
          map.stop()
        })
        popup.on('close', () => {
          popupOpenRef.current = false
          spinGlobeRef.current()
        })
        const existing = markersRef.current.get(key)
        if (existing) {
          existing.setLngLat(visitorMarker.coordinates).setPopup(popup)
          existing
            .getElement()
            .replaceChildren(...buildMarkerElement(key, fresh).childNodes)
        } else {
          markersRef.current.set(
            key,
            new mapboxgl.Marker({
              element: buildMarkerElement(key, fresh),
              occludedOpacity: 0
            })
              .setLngLat(visitorMarker.coordinates)
              .setPopup(popup)
              .addTo(map)
          )
        }
        if (fresh && (!newest || visitorMarker.newest > newest.newest)) {
          newest = visitorMarker
        }
      }

      if (newest && previousNewest) {
        spinPausedUntilRef.current = Date.now() + flyPauseMilliseconds
        map.flyTo({ center: newest.coordinates, zoom: 2.2, duration: 2500 })
      }
      if (newest) {
        previousNewestRef.current = newest.newest
      }
    })
    return () => {
      cancelled = true
    }
  }, [events])

  return <div ref={containerRef} className="absolute inset-0" />
})
