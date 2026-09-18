import { createAvatar } from '@dicebear/core'
import * as avataaars from '@dicebear/avataaars'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(relativeTime)

function hash(value: string, salt: number) {
  let result = salt
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0
  }
  return result
}

export function visitorAvatar(visitorKey: string) {
  return createAvatar(avataaars, { seed: visitorKey, size: 48 }).toDataUri()
}

export function visitorOffset(visitorKey: string): [number, number] {
  return [
    (hash(visitorKey, 3) % 1000) / 1000 - 0.5,
    (hash(visitorKey, 5) % 1000) / 1000 - 0.5
  ]
}
