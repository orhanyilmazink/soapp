import type { MouseEvent } from 'react'

/** Open the same platform date/time picker from the entire input surface. */
export function openNativePicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    // Some Safari versions only support their default tap-to-open interaction.
  }
}
