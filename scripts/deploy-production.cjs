const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

function nextRelease(release) {
  if (!/^\d+\.\d+\.\d+$/.test(release.version) || !Number.isSafeInteger(release.revision) || release.revision < 0) {
    throw new Error('Invalid numeric app version')
  }
  return { ...release, revision: release.revision + 1 }
}

function deployProduction() {
  const root = path.resolve(__dirname, '..')
  const releasePath = path.join(root, 'app-release.json')
  const previous = fs.readFileSync(releasePath, 'utf8')
  const next = { ...nextRelease(JSON.parse(previous)), publishedAt: new Date().toISOString() }
  fs.writeFileSync(releasePath, JSON.stringify(next, null, 2) + '\n')
  const appVersion = `v.${next.version}.${next.revision}`
  console.log(`Publishing ${appVersion}`)
  const deployment = spawnSync('vercel', ['--prod', '--yes', '--meta', `appVersion=${appVersion}`], { cwd: root, stdio: 'inherit', env: process.env })
  if (deployment.error || deployment.status !== 0) {
    // Failed deploys must restore all metadata from the last publication.
    fs.writeFileSync(releasePath, previous)
    if (deployment.error) console.error(deployment.error.message)
    process.exitCode = deployment.status || 1
  }
}

if (require.main === module) deployProduction()
module.exports = { nextRelease, deployProduction }
