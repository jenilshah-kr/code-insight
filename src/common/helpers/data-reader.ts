import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import type {
  SessionInfo,
  Facet,
  CommandRecord,
} from '@/common/types/models'
import { decodeSlug } from '@/common/helpers/formatters'
function removeXmlTags(text: string): string {
  return text.replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '').replace(/<[^>]+\/>/g, '').replace(/<[^>]+>/g, '').trim()
}

/** Resolve the real filesystem path for a project slug by reading `cwd` from its JSONL files */
export async function resolveWorkspacePath(slug: string): Promise<string> {
  const files = await listWorkspaceJSONLFiles(slug)
  for (const f of files) {
    try {
      const raw = await fs.readFile(f, 'utf-8')
      const lines = raw.split(/\r?\n/)
      for (const line of lines.slice(0, 50)) {
        if (!line.trim()) continue
        try {
          const obj = JSON.parse(line)
          if (obj.cwd && typeof obj.cwd === 'string') return obj.cwd
        } catch { /* skip malformed line */ }
      }
    } catch { /* try next file */ }
  }
  return decodeSlug(slug)
}

export const DATA_DIR = path.join(os.homedir(), '.claude')

export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments)
}

// ─── Sessions from Project JSONL (primary source) ──────────────────────────────

/** Derive session metadata directly from ~/.claude/projects/<project>/<session>.jsonl (or new dir format) */
export async function loadSessionsFromJSONL(): Promise<SessionInfo[]> {
  const results: SessionInfo[] = []
  try {
    const slugs = await listWorkspaceSlugs()
    for (const slug of slugs) {
      const projectPath = await resolveWorkspacePath(slug)
      const sessions = await listWorkspaceSessions(slug)
      for (const { sessionId, files } of sessions) {
        const meta = await parseSessionFromFiles(files, sessionId, projectPath, slug)
        if (meta) results.push(meta)
      }
    }
    return results.sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )
  } catch {
    return []
  }
}

type ModelAttribution = {
  outputTokens: number
  messageCount: number
}

function recordModelAttribution(
  attributions: Record<string, ModelAttribution>,
  model: string,
  outputTokens: number
) {
  const existing = attributions[model] ?? { outputTokens: 0, messageCount: 0 }
  existing.outputTokens += outputTokens
  existing.messageCount += 1
  attributions[model] = existing
}

function pickDominantModel(attributions: Record<string, ModelAttribution>): string | undefined {
  return Object.entries(attributions)
    .sort((a, b) => (
      b[1].outputTokens - a[1].outputTokens
      || b[1].messageCount - a[1].messageCount
    ))[0]?.[0]
}

async function parseSessionFromFiles(
  filePaths: string[],
  sessionId: string,
  projectPath: string,
  slug: string
): Promise<SessionInfo | null> {
  let startTime = ''
  let lastTime = ''
  let userCount = 0
  let assistantCount = 0
  const toolCounts: Record<string, number> = {}
  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let cacheWrite = 0
  let firstPrompt = ''
  const modelAttributions: Record<string, ModelAttribution> = {}
  const rootModelAttributions: Record<string, ModelAttribution> = {}
  let hasTaskAgent = false
  let hasMcp = false
  let hasWebSearch = false
  let hasWebFetch = false
  // Enrichment fields — gathered in the same pass, no second JSONL read needed
  let sessionSlug: string | undefined
  let sessionVersion: string | undefined
  let sessionGitBranch: string | undefined
  let hasCompaction = false
  let hasThinking = false
  const rootSessionPath = path.join(dataPath('projects', slug), `${sessionId}.jsonl`)

  for (const filePath of filePaths) {
    const isRootSessionFile = path.normalize(filePath) === path.normalize(rootSessionPath)
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const lines = raw.split(/\r?\n/).filter(Boolean)
      for (const line of lines) {
        try {
          const obj = JSON.parse(line) as Record<string, unknown>
          const ts = obj.timestamp as string
          if (ts) {
            if (!startTime || ts < startTime) startTime = ts
            if (!lastTime || ts > lastTime) lastTime = ts
          }
          // Enrichment: metadata fields present on most lines
          if (!sessionSlug && obj.slug) sessionSlug = obj.slug as string
          if (!sessionVersion && obj.version) sessionVersion = obj.version as string
          if (!sessionGitBranch && obj.gitBranch && obj.gitBranch !== 'HEAD') sessionGitBranch = obj.gitBranch as string
          if (obj.type === 'user') {
            userCount++
            const content = (obj as { message?: { content?: string | unknown[] } }).message?.content
            if (typeof content === 'string' && !firstPrompt) firstPrompt = removeXmlTags(content).slice(0, 500)
            else if (Array.isArray(content)) {
              const text = content.find((c: unknown) => typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text')
              if (text && typeof (text as { text?: string }).text === 'string' && !firstPrompt) {
                firstPrompt = removeXmlTags((text as { text: string }).text).slice(0, 500)
              }
            }
          }
          if (obj.type === 'system' && obj.subtype === 'compact_boundary') {
            hasCompaction = true
          }
          if (obj.type === 'assistant') {
            assistantCount++
            const msg = (obj as { message?: { model?: string; usage?: Record<string, number>; content?: unknown[] } }).message
            if (msg?.model) {
              const out = msg.usage?.output_tokens ?? 0
              recordModelAttribution(modelAttributions, msg.model, out)
              if (isRootSessionFile) recordModelAttribution(rootModelAttributions, msg.model, out)
            }
            if (msg?.usage) {
              inputTokens += msg.usage.input_tokens ?? 0
              outputTokens += msg.usage.output_tokens ?? 0
              cacheRead += msg.usage.cache_read_input_tokens ?? 0
              cacheWrite += msg.usage.cache_creation_input_tokens ?? 0
            }
            const content = msg?.content
            if (Array.isArray(content)) {
              for (const c of content) {
                const item = c as { type?: string; name?: string }
                if (item.type === 'tool_use' && item.name) {
                  toolCounts[item.name] = (toolCounts[item.name] ?? 0) + 1
                  if (item.name.startsWith('Task') || item.name === 'TodoWrite' || item.name === 'Agent') hasTaskAgent = true
                  if (item.name.startsWith('mcp__')) hasMcp = true
                  if (item.name === 'WebSearch') hasWebSearch = true
                  if (item.name === 'WebFetch') hasWebFetch = true
                }
                if ((item as { type?: string }).type === 'thinking') hasThinking = true
              }
            }
          }
        } catch { /* skip malformed line */ }
      }
    } catch { /* skip unreadable file */ }
  }

  if (!startTime) return null

  const model = pickDominantModel(modelAttributions)
  const primaryModel = pickDominantModel(rootModelAttributions) ?? model

  const start = new Date(startTime).getTime()
  const end = lastTime ? new Date(lastTime).getTime() : start
  const durationMinutes = (end - start) / 60_000

  return {
    session_id: sessionId,
    model,
    primary_model: primaryModel,
    project_path: projectPath,
    start_time: startTime,
    duration_minutes: durationMinutes,
    user_message_count: userCount,
    assistant_message_count: assistantCount,
    tool_counts: toolCounts,
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheWrite,
    cache_read_input_tokens: cacheRead,
    first_prompt: firstPrompt,
    user_interruptions: 0,
    user_response_times: [],
    tool_errors: 0,
    tool_error_categories: {},
    uses_task_agent: hasTaskAgent,
    uses_plan_mode: (toolCounts.EnterPlanMode ?? 0) > 0,
    uses_mcp: hasMcp,
    uses_web_search: hasWebSearch,
    uses_web_fetch: hasWebFetch,
    lines_added: 0,
    lines_removed: 0,
    files_modified: 0,
    message_hours: [],
    user_message_timestamps: [],
    // Enrichment — extracted in this same pass
    slug: sessionSlug || undefined,
    version: sessionVersion || undefined,
    git_branch: sessionGitBranch || undefined,
    has_compaction: hasCompaction || undefined,
    has_thinking: hasThinking || undefined,
  }
}

/** Get sessions: prefers JSONL (projects/*.jsonl), falls back to usage-data/session-meta */
export async function loadSessions(): Promise<SessionInfo[]> {
  const [jsonl, meta] = await Promise.all([
    loadSessionsFromJSONL(),
    loadAllSessionInfo(),
  ])
  if (jsonl.length > 0) return jsonl
  return meta
}

// ─── Session Meta (usage-data/session-meta — fallback) ────────────────────────

export async function loadAllSessionInfo(): Promise<SessionInfo[]> {
  const dir = dataPath('usage-data', 'session-meta')
  try {
    const files = await fs.readdir(dir)
    const results: SessionInfo[] = []
    await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          try {
            const raw = await fs.readFile(path.join(dir, f), 'utf-8')
            const parsed = JSON.parse(raw) as SessionInfo
            results.push({
              ...parsed,
              primary_model: parsed.primary_model ?? parsed.model,
            })
          } catch { /* skip malformed */ }
        })
    )
    return results.sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )
  } catch {
    return []
  }
}

export async function loadSessionInfo(sessionId: string): Promise<SessionInfo | null> {
  try {
    const raw = await fs.readFile(
      dataPath('usage-data', 'session-meta', `${sessionId}.json`),
      'utf-8'
    )
    const parsed = JSON.parse(raw) as SessionInfo
    return {
      ...parsed,
      primary_model: parsed.primary_model ?? parsed.model,
    }
  } catch {
    return null
  }
}

// ─── Facets ──────────────────────────────────────────────────────────────────

export async function loadAllFacets(): Promise<Facet[]> {
  const dir = dataPath('usage-data', 'facets')
  try {
    const files = await fs.readdir(dir)
    const results: Facet[] = []
    await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          try {
            const raw = await fs.readFile(path.join(dir, f), 'utf-8')
            results.push(JSON.parse(raw) as Facet)
          } catch { /* skip */ }
        })
    )
    return results
  } catch {
    return []
  }
}

export async function loadFacet(sessionId: string): Promise<Facet | null> {
  try {
    const raw = await fs.readFile(
      dataPath('usage-data', 'facets', `${sessionId}.json`),
      'utf-8'
    )
    return JSON.parse(raw) as Facet
  } catch {
    return null
  }
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listWorkspaceSlugs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(dataPath('projects'), { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
  } catch {
    return []
  }
}


export async function listWorkspaceJSONLFiles(slug: string): Promise<string[]> {
  try {
    const dir = dataPath('projects', slug)
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        // Old format: <slug>/<session-uuid>.jsonl
        files.push(path.join(dir, entry.name))
      } else if (entry.isDirectory() && entry.name !== 'memory') {
        // New format: <slug>/<session-uuid>/subagents/*.jsonl
        const subagentsDir = path.join(dir, entry.name, 'subagents')
        try {
          const subFiles = await fs.readdir(subagentsDir)
          for (const sf of subFiles) {
            if (sf.endsWith('.jsonl')) files.push(path.join(subagentsDir, sf))
          }
        } catch { /* no subagents dir — skip */ }
      }
    }
    return files
  } catch {
    return []
  }
}

/** Returns [{sessionId, files}] grouping files by session for both old and new formats.
 *  When a session has both a flat .jsonl (orchestrator) and a same-named directory
 *  (subagents), they are merged into one entry so the session ID stays unique. */
async function listWorkspaceSessions(slug: string): Promise<{ sessionId: string; files: string[] }[]> {
  const dir = dataPath('projects', slug)
  const byId = new Map<string, string[]>()
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        // Old format: <session-uuid>.jsonl
        const sessionId = path.basename(entry.name, '.jsonl')
        const existing = byId.get(sessionId) ?? []
        existing.push(path.join(dir, entry.name))
        byId.set(sessionId, existing)
      } else if (entry.isDirectory() && entry.name !== 'memory') {
        // New format (or subagents alongside an existing .jsonl): <session-uuid>/subagents/*.jsonl
        const sessionId = entry.name
        const subagentsDir = path.join(dir, entry.name, 'subagents')
        try {
          const subFiles = await fs.readdir(subagentsDir)
          const jsonlFiles = subFiles.filter(f => f.endsWith('.jsonl')).map(f => path.join(subagentsDir, f))
          if (jsonlFiles.length > 0) {
            const existing = byId.get(sessionId) ?? []
            byId.set(sessionId, existing.concat(jsonlFiles))
          }
        } catch { /* no subagents dir — skip */ }
      }
    }
  } catch { /* ignore */ }
  return Array.from(byId.entries()).map(([sessionId, files]) => ({ sessionId, files }))
}

/** Stream a JSONL file line by line, calling cb for each parsed line */
export async function streamJSONLLines(
  filePath: string,
  cb: (line: Record<string, unknown>) => void
): Promise<void> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue
      try {
        cb(JSON.parse(line))
      } catch { /* skip malformed */ }
    }
  } catch { /* file missing */ }
}

/** Find which project slug contains a given session ID */
export async function resolveSessionSlug(sessionId: string): Promise<string | null> {
  const slugs = await listWorkspaceSlugs()
  for (const slug of slugs) {
    const files = await listWorkspaceJSONLFiles(slug)
    for (const f of files) {
      if (path.basename(f).startsWith(sessionId)) return slug
    }
  }
  return null
}

/** Find the JSONL file path for a given session ID */
export async function resolveSessionJSONL(sessionId: string): Promise<string | null> {
  const slugs = await listWorkspaceSlugs()
  for (const slug of slugs) {
    const files = await listWorkspaceJSONLFiles(slug)
    for (const f of files) {
      if (path.basename(f, '.jsonl') === sessionId) return f
    }
  }
  return null
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export interface PlanRecord {
  path: string
  name: string
  content: string
  mtime: string
  project: string | null
}

async function buildPlanProjectMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const projectsDir = dataPath('projects')
    const slugs = await fs.readdir(projectsDir)
    for (const slug of slugs) {
      const slugDir = path.join(projectsDir, slug)
      let entries: string[]
      try { entries = await fs.readdir(slugDir) } catch { continue }
      for (const f of entries.filter(x => x.endsWith('.jsonl'))) {
        try {
          const raw = await fs.readFile(path.join(slugDir, f), 'utf-8')
          for (const line of raw.split('\n')) {
            if (!line.trim()) continue
            try {
              const msg = JSON.parse(line)
              if (msg.type === 'tool_use' && msg.name === 'Write') {
                const fp: string = msg.input?.file_path ?? ''
                const _plansMarker = path.join('.claude', 'plans')
              if (path.normalize(fp).includes(_plansMarker)) {
                  const planName = path.basename(fp, '.md')
                  if (!map.has(planName)) map.set(planName, slug)
                }
              }
            } catch { /* skip malformed lines */ }
          }
        } catch { /* skip unreadable files */ }
      }
    }
  } catch { /* no projects dir */ }
  return map
}

export async function loadPlans(): Promise<PlanRecord[]> {
  const results: PlanRecord[] = []
  try {
    const planProjectMap = await buildPlanProjectMap()
    const dir = dataPath('plans')
    const files = await fs.readdir(dir)
    for (const f of files.filter((x) => x.endsWith('.md'))) {
      try {
        const fullPath = path.join(dir, f)
        const [raw, stat] = await Promise.all([
          fs.readFile(fullPath, 'utf-8'),
          fs.stat(fullPath),
        ])
        const planName = f.replace(/\.md$/, '')
        const slug = planProjectMap.get(planName) ?? null
        const project = slug ? (path.basename(decodeSlug(slug)) || null) : null
        results.push({
          path: fullPath,
          name: planName,
          content: raw,
          mtime: stat.mtime.toISOString(),
          project,
        })
      } catch { /* skip */ }
    }
    return results.sort((a, b) => b.mtime.localeCompare(a.mtime))
  } catch {
    return []
  }
}

// ─── Todos ───────────────────────────────────────────────────────────────────

export interface TodoRecord {
  path: string
  name: string
  data: unknown
  mtime: string
}

export async function loadTodos(): Promise<TodoRecord[]> {
  const results: TodoRecord[] = []
  try {
    const dir = dataPath('todos')
    const files = await fs.readdir(dir)
    for (const f of files.filter((x) => x.endsWith('.json'))) {
      try {
        const fullPath = path.join(dir, f)
        const [raw, stat] = await Promise.all([
          fs.readFile(fullPath, 'utf-8'),
          fs.stat(fullPath),
        ])
        results.push({
          path: fullPath,
          name: f.replace(/\.json$/, ''),
          data: JSON.parse(raw),
          mtime: stat.mtime.toISOString(),
        })
      } catch { /* skip */ }
    }
    return results.sort((a, b) => b.mtime.localeCompare(a.mtime))
  } catch {
    return []
  }
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function loadHistory(limit = 200): Promise<CommandRecord[]> {
  const entries: CommandRecord[] = []
  try {
    const raw = await fs.readFile(dataPath('history.jsonl'), 'utf-8')
    const lines = raw.split(/\r?\n/).filter(Boolean)
    for (const line of lines.slice(-limit)) {
      try {
        entries.push(JSON.parse(line) as CommandRecord)
      } catch { /* skip */ }
    }
  } catch { /* file missing */ }
  return entries
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export interface SkillInfo {
  name: string
  description: string
  triggers: string
  hasSkillMd: boolean
}

export async function loadSkills(): Promise<SkillInfo[]> {
  const skillsDir = dataPath('skills')
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'nebius-skills-workspace')
    const results: SkillInfo[] = []
    for (const dir of dirs) {
      const skillMdPath = path.join(skillsDir, dir.name, 'SKILL.md')
      let description = ''
      let triggers = ''
      let hasSkillMd = false
      try {
        const raw = await fs.readFile(skillMdPath, 'utf-8')
        hasSkillMd = true
        const descMatch = raw.match(/^#\s+(.+)$/m)
        if (descMatch) description = descMatch[1].trim()
        const triggerMatch = raw.match(/(?:TRIGGER|trigger)[^\n]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\n\*\*DO NOT|$)/m)
        if (triggerMatch) triggers = triggerMatch[1].replace(/\s+/g, ' ').trim().slice(0, 200)
      } catch { /* no SKILL.md */ }
      results.push({ name: dir.name, description, triggers, hasSkillMd })
    }
    return results.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

// ─── Plugins ──────────────────────────────────────────────────────────────────

export interface PluginInfo {
  id: string
  scope: string
  version: string
  installedAt: string
}

export async function loadPlugins(): Promise<PluginInfo[]> {
  try {
    const raw = await fs.readFile(dataPath('plugins', 'installed_plugins.json'), 'utf-8')
    const json = JSON.parse(raw) as { plugins: Record<string, Array<{ scope: string; version: string; installedAt: string }>> }
    return Object.entries(json.plugins).flatMap(([id, installs]) =>
      installs.map(inst => ({ id, scope: inst.scope, version: inst.version, installedAt: inst.installedAt }))
    )
  } catch {
    return []
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(dataPath('settings.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference' | 'index' | 'unknown'

export interface MemoryRecord {
  file: string
  projectSlug: string
  projectPath: string
  name: string
  type: MemoryType
  description: string
  body: string
  mtime: string
  isIndex: boolean
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim()
    if (key) meta[key] = val
  }
  return { meta, body: match[2].trim() }
}

export async function loadMemories(): Promise<MemoryRecord[]> {
  const results: MemoryRecord[] = []
  try {
    const slugs = await listWorkspaceSlugs()
    await Promise.all(
      slugs.map(async slug => {
        const memDir = dataPath('projects', slug, 'memory')
        try {
          const files = await fs.readdir(memDir)
          const mdFiles = files.filter(f => f.endsWith('.md'))
          await Promise.all(
            mdFiles.map(async file => {
              try {
                const fullPath = path.join(memDir, file)
                const [raw, stat] = await Promise.all([
                  fs.readFile(fullPath, 'utf-8'),
                  fs.stat(fullPath),
                ])
                const isIndex = file === 'MEMORY.md'
                const { meta, body } = parseFrontmatter(raw)
                const projectPath = decodeSlug(slug)
                const h1Match = body.match(/^#\s+(.+)$/m)
                const titleFromBody = h1Match ? h1Match[1].trim() : null
                results.push({
                  file,
                  projectSlug: slug,
                  projectPath,
                  name: meta.name ?? titleFromBody ?? (isIndex ? 'Memory Index' : file.replace(/\.md$/, '')),
                  type: (meta.type as MemoryType) ?? (isIndex ? 'index' : 'unknown'),
                  description: meta.description ?? '',
                  body,
                  mtime: stat.mtime.toISOString(),
                  isIndex,
                })
              } catch { /* skip */ }
            })
          )
        } catch { /* no memory dir */ }
      })
    )
  } catch { /* skip */ }
  return results.sort((a, b) => b.mtime.localeCompare(a.mtime))
}

// ─── Stats Snapshot ───────────────────────────────────────────────────────────

export async function loadStatsSnapshot() {
  const sessions = await loadSessions()
  const byDate = new Map<string, { messages: number; sessions: number; tools: number }>()
  const hourCounts: Record<string, number> = {}

  for (const s of sessions) {
    const date = s.start_time?.slice(0, 10)
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const e = byDate.get(date) ?? { messages: 0, sessions: 0, tools: 0 }
      e.messages += (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
      e.sessions += 1
      e.tools += Object.values(s.tool_counts ?? {}).reduce((a, b) => a + b, 0)
      byDate.set(date, e)
    }
    if (s.start_time) {
      const hour = String(new Date(s.start_time).getHours())
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1
    }
  }

  const dailyActivity = Array.from(byDate.entries())
    .map(([date, { messages, sessions: count, tools }]) => ({
      date, messageCount: messages, sessionCount: count, toolCallCount: tools,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    version: 0,
    lastComputedDate: '',
    dailyActivity,
    tokensByDate: [],
    modelUsage: {},
    totalSessions: sessions.length,
    totalMessages: sessions.reduce((s, m) => s + (m.user_message_count ?? 0) + (m.assistant_message_count ?? 0), 0),
    longestSession: { sessionId: '', duration: 0, messageCount: 0, timestamp: '' },
    firstSessionDate: sessions[sessions.length - 1]?.start_time ?? '',
    hourCounts,
    totalSpeculationTimeSavedMs: 0,
  }
}

// ─── Storage size ─────────────────────────────────────────────────────────────

export async function getStorageBytes(): Promise<number> {
  async function dirSize(dirPath: string): Promise<number> {
    let total = 0
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      await Promise.all(
        entries.map(async e => {
          const full = path.join(dirPath, e.name)
          if (e.isDirectory()) {
            total += await dirSize(full)
          } else {
            try {
              const stat = await fs.stat(full)
              total += stat.size
            } catch { /* skip */ }
          }
        })
      )
    } catch { /* skip inaccessible dirs */ }
    return total
  }
  return dirSize(DATA_DIR)
}
