import React, { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { GlobeAltIcon, PauseIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '../../modals/modal'
import { useSiteContext } from '../../../site-context'
import { useCurrentVisitorsContext } from '../../../current-visitors-context'
import { useAppNavigate } from '../../../navigation/use-app-navigate'
import { rootRoute } from '../../../router'
import * as storage from '../../../util/storage'
import { fetchRecentEvents, RecentEvent } from '../../../api'
import { FlagEmoji } from '../flag-emoji'
import { GlobeMap } from './globe-map'
import { GlobeInterval, IntervalSelect } from './interval-select'

export const GLOBE_PATH = 'globe'

const refetchIntervalMilliseconds = 10_000
const liveRefetchIntervalMilliseconds = 3_000

function parseInterval(value: string | null): GlobeInterval {
  const parsed = Number(value)
  return Object.values(GlobeInterval).includes(parsed)
    ? (parsed as GlobeInterval)
    : GlobeInterval.FiveMinutes
}

function topCountries(events: RecentEvent[]) {
  const counts = new Map<string, { name: string; count: number }>()
  for (const event of events) {
    const existing = counts.get(event.country_code)
    if (existing) {
      existing.count += 1
    } else {
      counts.set(event.country_code, { name: event.country_name, count: 1 })
    }
  }
  return [...counts.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
}

export function GlobeView() {
  const site = useSiteContext()
  const navigate = useAppNavigate()
  const currentVisitors = useCurrentVisitorsContext()
  const intervalKey = `globeInterval__${site.domain}`
  const [interval, setInterval] = useState<GlobeInterval>(
    parseInterval(storage.getItem(intervalKey))
  )

  const [spinning, setSpinning] = useState(true)

  useEffect(() => {
    storage.setItem(intervalKey, String(interval))
  }, [intervalKey, interval])

  const { data: events = [] } = useQuery({
    queryKey: ['recent-events', site.domain, interval],
    queryFn: () => fetchRecentEvents(site, interval),
    refetchInterval:
      interval === GlobeInterval.Live
        ? liveRefetchIntervalMilliseconds
        : refetchIntervalMilliseconds,
    placeholderData: keepPreviousData,
    enabled: !site.isDbip && !!site.mapboxToken
  })

  const countries = useMemo(() => topCountries(events), [events])

  if (site.isDbip || !site.mapboxToken) {
    return null
  }

  return (
    <Modal fullScreen>
      <div className="relative h-full w-full text-gray-100">
        <GlobeMap
          token={site.mapboxToken}
          events={events}
          spinning={spinning}
        />
        <div className="pointer-events-none absolute inset-0 p-4">
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="pointer-events-auto rounded-xl bg-gray-900/70 p-3 backdrop-blur sm:max-w-sm sm:p-4">
              <div className="flex flex-wrap items-center gap-x-2 text-sm sm:text-base">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-semibold">{currentVisitors ?? '–'}</span>
                <span className="whitespace-nowrap text-gray-400">
                  current visitors on
                </span>
                <span className="font-semibold">{site.domain}</span>
              </div>
              {countries.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {countries.map(([countryCode, { name, count }]) => (
                    <span
                      key={countryCode}
                      className="rounded-md bg-gray-800 px-2 py-1 text-xs"
                    >
                      <FlagEmoji countryCode={countryCode} />
                      {name} <span className="text-gray-400">({count})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="pointer-events-auto flex items-center justify-end gap-2 sm:gap-3">
              <IntervalSelect value={interval} onChange={setInterval} />
              <button
                type="button"
                title={spinning ? 'Stop rotation' : 'Start rotation'}
                onClick={() => setSpinning(!spinning)}
                className="rounded-xl border border-gray-700 bg-gray-900/70 p-2 backdrop-blur hover:bg-gray-800"
              >
                {spinning ? (
                  <PauseIcon className="size-5" />
                ) : (
                  <GlobeAltIcon className="size-5" />
                )}
              </button>
              <button
                type="button"
                title="Close"
                onClick={() =>
                  navigate({ path: rootRoute.path, search: (search) => search })
                }
                className="rounded-xl border border-gray-700 bg-gray-900/70 p-2 backdrop-blur hover:bg-gray-800"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
