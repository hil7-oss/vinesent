import { z } from 'zod'

const isProd = process.env.NODE_ENV === 'production'

function requireValue(name: string, value: string) {
  if (value.trim()) return value.trim()
  throw new Error(`${name} is required`)
}

function validateInternalUrl(name: string, value: string) {
  const v = value.trim()
  if (!v) return v
  if (!(v.startsWith('http://') || v.startsWith('https://'))) throw new Error(`${name} must start with http:// or https://`)
  if (v.includes('@')) throw new Error(`${name} must not include credentials`)
  if (v.includes('?') || v.includes('#')) throw new Error(`${name} must not include query or fragment`)
  if (isProd && (v.includes('localhost') || v.includes('127.0.0.1'))) throw new Error(`${name} must not point to localhost in production`)
  return v
}

function validatePublicUrl(name: string, value: string) {
  const v = value.trim()
  if (!v) return v
  if (isProd && !v.startsWith('https://')) console.warn(`Warning: ${name} should be https in production`)
  if (v.includes('@')) throw new Error(`${name} must not include credentials`)
  if (v.includes('?') || v.includes('#')) throw new Error(`${name} must not include query or fragment`)
  return v
}

function normalizeApiBase(value: string) {
  const v = value.trim()
  if (!v) return ''
  const withScheme = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`
  try {
    return new URL(withScheme).origin
  } catch {
    return ''
  }
}

const rawRate = (process.env.RATE_LIMIT_PER_MINUTE || '').trim()
const rate = (() => {
  if (!rawRate) return isProd ? NaN : 600
  const n = Number(rawRate)
  return Number.isFinite(n) ? n : NaN
})()

if (isProd) {
  if (!Number.isFinite(rate)) throw new Error('RATE_LIMIT_PER_MINUTE is required in production')
  if (rate < 1) throw new Error('RATE_LIMIT_PER_MINUTE must be >= 1 in production')
}

const rawRedis = (process.env.REDIS_URL || '').trim()
if (isProd && rate >= 1 && !rawRedis) {
  console.warn('REDIS_URL is required in production when rate limiting is enabled')
}

const apiDomain = normalizeApiBase(process.env.API_DOMAIN || process.env.NEXT_PUBLIC_API_DOMAIN || '')
const internalCandidate = normalizeApiBase(process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || apiDomain)
const publicCandidate = normalizeApiBase(process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.FASTAPI_URL || apiDomain)

const rawFastapi = validateInternalUrl('FASTAPI_URL', isProd ? requireValue('FASTAPI_URL', internalCandidate) : (internalCandidate || 'http://localhost:8000'))
const rawPublicFastapi = validatePublicUrl('NEXT_PUBLIC_FASTAPI_URL', isProd ? requireValue('NEXT_PUBLIC_FASTAPI_URL', publicCandidate) : publicCandidate)

z.string().min(1).parse(rawFastapi)
if (isProd) z.string().min(1).parse(rawPublicFastapi)

export const FASTAPI_URL = rawFastapi
export const NEXT_PUBLIC_FASTAPI_URL = rawPublicFastapi
export const RATE_LIMIT_PER_MINUTE = rate
export const REDIS_URL = rawRedis
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
