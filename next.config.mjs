import { readFileSync } from 'node:fs'

const release = JSON.parse(readFileSync(new URL('./app-release.json', import.meta.url), 'utf8'))
const appVersion = `v.${release.version}.${release.revision}`

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.loca.lt'],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
}

export default nextConfig
