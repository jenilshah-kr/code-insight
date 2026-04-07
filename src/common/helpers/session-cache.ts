/**
 * Server-side in-memory cache for session and facet data.
 *
 * Strategy — always-fresh:
 *  • fs.watch on ~/.claude/projects/ detects any JSONL change and immediately
 *    kicks off a background refresh so the next request gets current data.
 *  • TTL (30 s) ensures the cache never drifts if the watcher misses an event.
 *  • ensureFresh() always waits for an in-progress refresh rather than
 *    returning stale data, so callers never see outdated metrics.
 *  • Cold start (first request): waits for the initial load.
 *  • Subsequent requests with a warm, fresh cache: instant return.
 */

import fs from 'fs'
import { loadSessionsForSource, loadFacetsForSource, getWatchPathForSource } from './analytics-reader'
import type { AnalyticsSource } from './analytics-source'
import type { SessionInfo, Facet } from '@/common/types/models'

const CACHE_TTL_MS = 30_000  // 30 seconds

interface CacheState {
  sessions: SessionInfo[]
  facets: Facet[]
  timestamp: number
}

const cacheStore = new Map<AnalyticsSource, CacheState>()
// Single shared promise for any in-flight refresh — concurrent callers share it.
const refreshPromises = new Map<AnalyticsSource, Promise<CacheState>>()
const watchers = new Map<AnalyticsSource, fs.FSWatcher | null>()

// Derived data cache: computed aggregations keyed by string.
// Invalidated whenever the raw session cache is refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivedStore = new Map<string, { value: any; sessionTs: number }>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivedInFlight = new Map<string, Promise<any>>()

function keyForSource(source: AnalyticsSource, key: string) {
  return `${source}:${key}`
}

async function doRefresh(source: AnalyticsSource): Promise<CacheState> {
  const [sessions, facets] = await Promise.all([
    loadSessionsForSource(source),
    loadFacetsForSource(source),
  ])
  const newState: CacheState = { sessions, facets, timestamp: Date.now() }
  cacheStore.set(source, newState)
  for (const key of [...derivedStore.keys()]) {
    if (key.startsWith(`${source}:`)) derivedStore.delete(key)
  }
  for (const key of [...derivedInFlight.keys()]) {
    if (key.startsWith(`${source}:`)) derivedInFlight.delete(key)
  }
  refreshPromises.delete(source)
  return newState
}

/** Start a refresh if none is already running. Returns the shared promise. */
function triggerRefresh(source: AnalyticsSource): Promise<CacheState> {
  const existing = refreshPromises.get(source)
  if (existing) return existing

  const promise = doRefresh(source).catch(err => {
      refreshPromises.delete(source)
      throw err
    })
  refreshPromises.set(source, promise)
  return promise
}

function startWatcher(source: AnalyticsSource): void {
  if (watchers.get(source)) return
  try {
    const watcher = fs.watch(
      getWatchPathForSource(source),
      { recursive: true },
      (_event, filename) => {
        if (!filename?.endsWith('.jsonl')) return
        // Immediately start a background refresh so the next request gets
        // fresh data rather than the stale copy.
        triggerRefresh(source).catch(() => { /* ignore — doRefresh clears promise */ })
      }
    )
    watchers.set(source, watcher)
    watcher.on('error', () => { watchers.delete(source) })
  } catch {
    // fs.watch with recursive may not be available on all platforms
  }
}

/**
 * Returns a fresh CacheState, waiting for any in-progress refresh.
 * Never serves stale data: if TTL has expired or a refresh is running,
 * this awaits the refresh completion.
 */
function ensureFresh(source: AnalyticsSource): Promise<CacheState> {
  // If a refresh is already running (triggered by file watch or TTL), wait for it.
  const inFlight = refreshPromises.get(source)
  if (inFlight) return inFlight

  const cache = cacheStore.get(source)
  const isStale = !cache || (Date.now() - cache.timestamp) >= CACHE_TTL_MS
  if (!isStale) return Promise.resolve(cache!)

  // Cache is stale or cold — start a refresh and wait for it.
  return triggerRefresh(source)
}

export async function getCachedSessions(source: AnalyticsSource = 'claude'): Promise<SessionInfo[]> {
  startWatcher(source)
  return (await ensureFresh(source)).sessions
}

export async function getCachedFacets(source: AnalyticsSource = 'claude'): Promise<Facet[]> {
  startWatcher(source)
  return (await ensureFresh(source)).facets
}

/**
 * Returns a cached result of computeFn, keyed by `key`.
 * The cached result is invalidated automatically whenever the underlying
 * session data is refreshed. Concurrent callers for the same key share one
 * in-flight computation (no thundering herd).
 */
export async function getCachedDerived<T>(key: string, computeFn: () => Promise<T>, source: AnalyticsSource = 'claude'): Promise<T> {
  const fresh = await ensureFresh(source)
  const scopedKey = keyForSource(source, key)
  const hit = derivedStore.get(scopedKey)
  if (hit && hit.sessionTs === fresh.timestamp) return hit.value as T

  const existing = derivedInFlight.get(scopedKey) as Promise<T> | undefined
  if (existing) return existing

  const p = computeFn().then(value => {
    derivedStore.set(scopedKey, { value, sessionTs: fresh.timestamp })
    derivedInFlight.delete(scopedKey)
    return value
  }).catch(err => {
    derivedInFlight.delete(scopedKey)
    throw err
  })
  derivedInFlight.set(scopedKey, p)
  return p
}

/**
 * Force a cache refresh immediately (e.g. after an import).
 * Returns a promise that resolves when the fresh data is ready.
 */
export function invalidateCache(source: AnalyticsSource = 'claude'): Promise<void> {
  return triggerRefresh(source).then(() => undefined).catch(() => undefined)
}

export interface CacheStatus {
  warm: boolean
  ageMs: number | null
  sessionCount: number
  refreshing: boolean
  ttlMs: number
}

export function getCacheStatus(source: AnalyticsSource = 'claude'): CacheStatus {
  const cache = cacheStore.get(source)
  return {
    warm: cache !== undefined,
    ageMs: cache ? Date.now() - cache.timestamp : null,
    sessionCount: cache?.sessions.length ?? 0,
    refreshing: refreshPromises.has(source),
    ttlMs: CACHE_TTL_MS,
  }
}
