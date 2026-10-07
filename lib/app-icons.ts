// macOS renders transparent web-app pixels as black. Give manifest/browser icons
// the same deep app surface as the iPhone dark appearance while keeping the
// dedicated Apple touch icon untouched for iOS.
export const appIcons = [
  { src: '/icon-macos-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-macos-512.png', sizes: '512x512', type: 'image/png' },
]

export const appleAppIcon = {
  url: '/icon-restored-180.png',
  sizes: '180x180',
  type: 'image/png',
}
