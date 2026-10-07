const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8')

test('Apple uses the conventional cache-busted touch icon while manifest and browser icons use the restored family', () => {
  const icons = read('lib/app-icons.ts')
  const manifest = read('app/manifest.ts')
  const layout = read('app/layout.tsx')
  assert.match(manifest, /icons: appIcons/)
  assert.match(layout, /icon: appIcons\.map/)
  assert.match(layout, /apple: \[appleAppIcon\]/)
  assert.ok(icons.includes("url: '/apple-touch-icon.png?v=35'"))
  const applePng = fs.readFileSync(path.join(root, 'public/apple-touch-icon.png'))
  assert.equal(applePng.readUInt32BE(16), 180)
  assert.equal(applePng.readUInt32BE(20), 180)
  for (const size of [192, 512]) {
    const name = `icon-restored-${size}.png`
    assert.ok(icons.includes(name))
    const png = fs.readFileSync(path.join(root, 'public', name))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), size)
    assert.equal(png.readUInt32BE(20), size)
    assert.equal(png[25], 6, 'PNG must retain its RGBA transparency')
  }
  assert.doesNotMatch(manifest + layout, /\/icon-(192|512)\.png|apple-touch-icon-small\.png/)
})

test('offline and notification icons use the updated family without changing the in-app logo', () => {
  const worker = read('public/sw.js')
  assert.match(worker, /icon: '\/icon-restored-192\.png'/)
  assert.match(worker, /badge: '\/icon-restored-192\.png'/)
  for (const size of [192, 512]) assert.ok(worker.includes(`icon-restored-${size}.png`))
  assert.ok(worker.includes('/apple-touch-icon.png?v=35'))
  assert.ok(read('components/birthday-app.tsx').includes('/icon1.png'))
})

test('iPhone icon uses the original working Apple touch artwork', () => {
  const png = fs.readFileSync(path.join(root, 'public/apple-touch-icon.png'))
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'),
    '33091f60961dac8b011d0508f333798957ee04ddcdc78b0d8d0285bf546427ce')
})
