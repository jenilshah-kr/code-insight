import path from 'path'

// ─── Slug / Path helpers ─────────────────────────────────────────────────────

/**
 * Decode a project directory slug back to a native filesystem path.
 *
 * Unix slugs:    "-Users-foo-myproject"    →  "/Users/foo/myproject"
 * Windows slugs: "-C--Users-foo-myproject" →  "C:\Users\foo\myproject"
 */
export function decodeSlug(slug: string): string {
  if (process.platform === 'win32') {
    // Windows slug format: leading dash + drive letter + double-dash + rest
    // e.g. "-C--Users-foo-bar" comes from "C:\Users\foo\bar"
    const winMatch = slug.match(/^-([A-Za-z])--(.*)$/)
    if (winMatch) {
      return `${winMatch[1].toUpperCase()}:\\${winMatch[2].replace(/-/g, '\\')}`
    }
    return slug.replace(/-/g, '\\')
  }
  // Unix: leading dash represents root '/', all dashes become '/'
  return slug.replace(/-/g, '/')
}

/**
 * Encode a native filesystem path to the slug format used by Claude Code.
 *
 * "/Users/foo/myproject"   →  "-Users-foo-myproject"
 * "C:\Users\foo\myproject" →  "-C--Users-foo-myproject"
 */
export function encodeSlug(filePath: string): string {
  if (process.platform === 'win32') {
    return '-' + filePath.replace(/\\/g, '-').replace(/:/g, '-')
  }
  return filePath.replace(/\//g, '-')
}

/**
 * Get a human-readable display name from a project path.
 * "/Users/foo/Developer/JavaScript/studio1" → "studio1"
 */
export function workspaceDisplayName(projectPath: string): string {
  if (!projectPath) return 'Unknown'
  const parts = projectPath.split(/[\\/]/)
  return parts[parts.length - 1] || parts[parts.length - 2] || projectPath
}

/**
 * Get a short display name (last 2 path segments) for longer context.
 */
export function workspaceShortPath(projectPath: string): string {
  if (!projectPath) return 'Unknown'
  const parts = projectPath.split(/[\\/]/).filter(Boolean)
  if (parts.length <= 2) return projectPath
  return `...${path.sep}${parts.slice(-2).join(path.sep)}`
}

// ─── Number formatters ───────────────────────────────────────────────────────

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function formatTokensExact(n: number): string {
  return n.toLocaleString()
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1)    return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(2)} MB`
  if (bytes >= 1_024)         return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

// ─── Duration formatters ─────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return formatDuration(ms / 60_000)
}

// ─── Date formatters ─────────────────────────────────────────────────────────

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffMinutes = Math.floor(diffMs / 60_000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimestamp(ts: number): string {
  return formatDateTime(new Date(ts).toISOString())
}

// ─── Percentage ──────────────────────────────────────────────────────────────

export function formatPct(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}
