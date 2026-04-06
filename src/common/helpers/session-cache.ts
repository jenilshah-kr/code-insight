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
import { loadSessionsFromJSONL, loadAllFacets, dataPath } from './data-reader'
import type { SessionInfo, Facet } from '@/common/types/models'

const CACHE_TTL_MS = 30_000  // 30 seconds

interface CacheState {
  sessions: SessionInfo[]
  facets: Facet[]
  timestamp: number
}

let cache: CacheState | null = null
// Single shared promise for any in-flight refresh — concurrent callers share it.
let refreshPromise: Promise<CacheState> | null = null
let watcher: fs.FSWatcher | null = null

// Derived data cache: computed aggregations keyed by string.
// Invalidated whenever the raw session cache is refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivedStore = new Map<string, { value: any; sessionTs: number }>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const derivedInFlight = new Map<string, Promise<any>>()

async function doRefresh(): Promise<CacheState> {
  const [sessions, facets] = await Promise.all([
    loadSessionsFromJSONL(),
    loadAllFacets(),
  ])
  const newState: CacheState = { sessions, facets, timestamp: Date.now() }
  cache = newState
  derivedStore.clear()
  derivedInFlight.clear()
  refreshPromise = null
  return newState
}

/** Start a refresh if none is already running. Returns the shared promise. */
function triggerRefresh(): Promise<CacheState> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().catch(err => {
      refreshPromise = null
      throw err
    })
  }
  return refreshPromise
}

function startWatcher(): void {
  if (watcher) return
  try {
    watcher = fs.watch(
      dataPath('projects'),
      { recursive: true },
      (_event, filename) => {
        if (!filename?.endsWith('.jsonl')) return
        // Immediately start a background refresh so the next request gets
        // fresh data rather than the stale copy.
        triggerRefresh().catch(() => { /* ignore — doRefresh sets refreshPromise=null */ })
      }
    )
    watcher.on('error', () => { watcher = null })
  } catch {
    // fs.watch with recursive may not be available on all platforms
  }
}

/**
 * Returns a fresh CacheState, waiting for any in-progress refresh.
 * Never serves stale data: if TTL has expired or a refresh is running,
 * this awaits the refresh completion.
 */
function ensureFresh(): Promise<CacheState> {
  // If a refresh is already running (triggered by file watch or TTL), wait for it.
  if (refreshPromise) return refreshPromise

  const isStale = !cache || (Date.now() - cache.timestamp) >= CACHE_TTL_MS
  if (!isStale) return Promise.resolve(cache!)

  // Cache is stale or cold — start a refresh and wait for it.
  return triggerRefresh()
}

export async function getCachedSessions(): Promise<SessionInfo[]> {
  startWatcher()
  return (await ensureFresh()).sessions
}

export async function getCachedFacets(): Promise<Facet[]> {
  startWatcher()
  return (await ensureFresh()).facets
}

/**
 * Returns a cached result of computeFn, keyed by `key`.
 * The cached result is invalidated automatically whenever the underlying
 * session data is refreshed. Concurrent callers for the same key share one
 * in-flight computation (no thundering herd).
 */
export async function getCachedDerived<T>(key: string, computeFn: () => Promise<T>): Promise<T> {
  const fresh = await ensureFresh()
  const hit = derivedStore.get(key)
  if (hit && hit.sessionTs === fresh.timestamp) return hit.value as T

  const existing = derivedInFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const p = computeFn().then(value => {
    derivedStore.set(key, { value, sessionTs: fresh.timestamp })
    derivedInFlight.delete(key)
    return value
  }).catch(err => {
    derivedInFlight.delete(key)
    throw err
  })
  derivedInFlight.set(key, p)
  return p
}

/**
 * Force a cache refresh immediately (e.g. after an import).
 * Returns a promise that resolves when the fresh data is ready.
 */
export function invalidateCache(): Promise<void> {
  return triggerRefresh().then(() => undefined).catch(() => undefined)
}

export interface CacheStatus {
  warm: boolean
  ageMs: number | null
  sessionCount: number
  refreshing: boolean
  ttlMs: number
}

export function getCacheStatus(): CacheStatus {
  return {
    warm: cache !== null,
    ageMs: cache ? Date.now() - cache.timestamp : null,
    sessionCount: cache?.sessions.length ?? 0,
    refreshing: refreshPromise !== null,
    ttlMs: CACHE_TTL_MS,
  }
}
