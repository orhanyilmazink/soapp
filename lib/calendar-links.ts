import type { SharedCalendarEvent, SharedCustomItem } from '@/lib/shared-app-state'

export const calendarPlaceItemId = (eventId: string) => `calendar-place-${eventId}`

// A single calendar record drives both views; edits cannot leave duplicate/stale tasks.
export function calendarPlaceItems(events: SharedCalendarEvent[]): SharedCustomItem[] {
  return events.filter((event) => event.kind === 'place').map((event) => ({
    id: calendarPlaceItemId(event.id), category: 'places', text: event.title,
  }))
}
