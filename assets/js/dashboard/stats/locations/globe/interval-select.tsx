import React from 'react'
import classNames from 'classnames'

export enum GlobeInterval {
  Live = 1,
  FiveMinutes = 5,
  ThirtyMinutes = 30,
  OneHour = 60,
  SixHours = 360,
  OneDay = 1440
}

const labels: Record<GlobeInterval, string> = {
  [GlobeInterval.Live]: 'Live',
  [GlobeInterval.FiveMinutes]: '5m',
  [GlobeInterval.ThirtyMinutes]: '30m',
  [GlobeInterval.OneHour]: '1h',
  [GlobeInterval.SixHours]: '6h',
  [GlobeInterval.OneDay]: '24h'
}

export function IntervalSelect({
  value,
  onChange
}: {
  value: GlobeInterval
  onChange: (value: GlobeInterval) => void
}) {
  return (
    <div className="flex rounded-full bg-gray-900/70 p-1 backdrop-blur">
      {(Object.keys(labels).map(Number) as GlobeInterval[]).map((interval) => (
        <button
          key={interval}
          type="button"
          onClick={() => onChange(interval)}
          className={classNames(
            'whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors sm:px-3',
            interval === value
              ? 'bg-indigo-500 text-white'
              : 'text-gray-300 hover:text-white'
          )}
        >
          {interval === GlobeInterval.Live && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          )}
          {labels[interval]}
        </button>
      ))}
    </div>
  )
}
