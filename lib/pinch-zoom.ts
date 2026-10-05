// Safari can ignore viewport zoom limits, so cancel only multi-touch gestures.
export function preventPinchZoom(target: Document) {
  const preventGesture = (event: Event) => {
    if (event.cancelable) event.preventDefault()
  }
  const preventMultiTouch = (event: TouchEvent) => {
    if (event.touches.length > 1 && event.cancelable) event.preventDefault()
  }
  const options = { passive: false }
  target.addEventListener('gesturestart', preventGesture, options)
  target.addEventListener('gesturechange', preventGesture, options)
  target.addEventListener('touchstart', preventMultiTouch, options)
  target.addEventListener('touchmove', preventMultiTouch, options)
  return () => {
    target.removeEventListener('gesturestart', preventGesture)
    target.removeEventListener('gesturechange', preventGesture)
    target.removeEventListener('touchstart', preventMultiTouch)
    target.removeEventListener('touchmove', preventMultiTouch)
  }
}
