import path from 'path'
import {
  listWorkspaceSlugs,
  listWorkspaceJSONLFiles,
  streamJSONLLines,
  resolveWorkspacePath,
} from '@/common/helpers/data-reader'
import { getCachedSessions, getCachedDerived } from '@/common/helpers/session-cache'
import { calcCostFromUsage } from '@/common/helpers/rates'
import { workspaceDisplayName, encodeSlug } from '@/common/helpers/formatters'
import type { WorkspaceSummary, ConversationWithFacet } from '@/common/types/models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLine = Record<string, any>

export function compileWorkspaceList() {
  return getCachedDerived('workspace-list', _compileWorkspaceList)
}

async function _compileWorkspaceList() {
  const [sessions, slugDirs] = await Promise.all([getCachedSessions(), listWorkspaceSlugs()])

  const pathToSlugMap = new Map<string, string>()
  await Promise.all(
    slugDirs.map(async (slug) => {
      const resolved = await resolveWorkspacePath(slug)
      pathToSlugMap.set(resolved, slug)
    })
  )

  const byPath = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const pp = s.project_path ?? ''
    if (!byPath.has(pp)) byPath.set(pp, [])
    byPath.get(pp)!.push(s)
  }

  const slugBranches = new Map<string, Set<string>>()
  await Promise.all(
    slugDirs.map(async (slug) => {
      const files = await listWorkspaceJSONLFiles(slug)
      const branches = new Set<string>()
      await Promise.all(
        files.map(async (f) => {
          await streamJSONLLines(f, (line: AnyLine) => {
            if (line.gitBranch && line.gitBranch !== 'HEAD') {
              branches.add(line.gitBranch)
            }
          })
        })
      )
      slugBranches.set(slug, branches)
    })
  )

  const projects: WorkspaceSummary[] = []

  for (const [projectPath, sessionList] of byPath.entries()) {
    const slug = pathToSlugMap.get(projectPath) ?? encodeSlug(projectPath)

    const totalMessages = sessionList.reduce(
      (s, m) => s + (m.user_message_count ?? 0) + (m.assistant_message_count ?? 0), 0
    )
    const totalDuration = sessionList.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
    const totalLinesAdded = sessionList.reduce((s, m) => s + (m.lines_added ?? 0), 0)
    const totalLinesRemoved = sessionList.reduce((s, m) => s + (m.lines_removed ?? 0), 0)
    const totalFilesModified = sessionList.reduce((s, m) => s + (m.files_modified ?? 0), 0)
    const gitCommits = sessionList.reduce((s, m) => s + (m.git_commits ?? 0), 0)
    const gitPushes = sessionList.reduce((s, m) => s + (m.git_pushes ?? 0), 0)
    const inputTokens = sessionList.reduce((s, m) => s + (m.input_tokens ?? 0), 0)
    const outputTokens = sessionList.reduce((s, m) => s + (m.output_tokens ?? 0), 0)

    const estimatedCost = sessionList.reduce((sum, s) => {
      return sum + calcCostFromUsage(s.model ?? 'claude-opus-4-6', {
        input_tokens: s.input_tokens ?? 0,
        output_tokens: s.output_tokens ?? 0,
        cache_creation_input_tokens: s.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: s.cache_read_input_tokens ?? 0,
      })
    }, 0)

    const languages: Record<string, number> = {}
    for (const s of sessionList) {
      for (const [lang, count] of Object.entries(s.languages ?? {})) {
        languages[lang] = (languages[lang] ?? 0) + count
      }
    }

    const toolCounts: Record<string, number> = {}
    for (const s of sessionList) {
      for (const [tool, count] of Object.entries(s.tool_counts ?? {})) {
        toolCounts[tool] = (toolCounts[tool] ?? 0) + count
      }
    }

    const sortedDates = sessionList.map(s => s.start_time).sort()

    projects.push({
      slug,
      project_path: projectPath,
      display_name: workspaceDisplayName(projectPath),
      session_count: sessionList.length,
      total_messages: totalMessages,
      total_duration_minutes: totalDuration,
      total_lines_added: totalLinesAdded,
      total_lines_removed: totalLinesRemoved,
      total_files_modified: totalFilesModified,
      git_commits: gitCommits,
      git_pushes: gitPushes,
      estimated_cost: estimatedCost,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      languages,
      tool_counts: toolCounts,
      last_active: sortedDates[sortedDates.length - 1] ?? '',
      first_active: sortedDates[0] ?? '',
      uses_mcp: sessionList.some(s => s.uses_mcp),
      uses_task_agent: sessionList.some(s => s.uses_task_agent),
      branches: [...(slugBranches.get(slug) ?? new Set())].slice(0, 10),
    })
  }

  // Include slug dirs that have no parseable sessions (e.g. empty or timestamp-less JSONL files)
  const coveredSlugs = new Set(projects.map(p => p.slug))
  for (const [resolvedPath, slug] of pathToSlugMap.entries()) {
    if (coveredSlugs.has(slug)) continue
    projects.push({
      slug,
      project_path: resolvedPath,
      display_name: workspaceDisplayName(resolvedPath),
      session_count: 0,
      total_messages: 0,
      total_duration_minutes: 0,
      total_lines_added: 0,
      total_lines_removed: 0,
      total_files_modified: 0,
      git_commits: 0,
      git_pushes: 0,
      estimated_cost: 0,
      input_tokens: 0,
      output_tokens: 0,
      languages: {},
      tool_counts: {},
      last_active: '',
      first_active: '',
      uses_mcp: false,
      uses_task_agent: false,
      branches: [...(slugBranches.get(slug) ?? new Set())].slice(0, 10),
    })
  }

  return { projects: projects.sort((a, b) => b.last_active.localeCompare(a.last_active)) }
}

export async function compileWorkspaceDetail(slug: string) {
  const projectPath = await resolveWorkspacePath(slug)
  const allSessions = await getCachedSessions()
  let sessions = allSessions.filter(s => s.project_path === projectPath)

  if (sessions.length === 0) {
    const lastSegment = path.basename(projectPath)
    sessions = allSessions.filter(s =>
      s.project_path ? path.basename(s.project_path) === lastSegment : false
    )
  }

  const files = await listWorkspaceJSONLFiles(slug)
  const branchTurns = new Map<string, number>()
  const sessionMeta = new Map<string, { slug?: string; version?: string; has_compaction?: boolean }>()

  await Promise.all(
    files.map(async (f) => {
      const sessionId = path.basename(f, '.jsonl')
      const meta: { slug?: string; version?: string; has_compaction?: boolean } = {}

      await streamJSONLLines(f, (line: AnyLine) => {
        if (!meta.slug && line.slug) meta.slug = line.slug
        if (!meta.version && line.version) meta.version = line.version
        if (line.type === 'system' && line.subtype === 'compact_boundary') meta.has_compaction = true
        if (line.gitBranch && line.gitBranch !== 'HEAD') {
          branchTurns.set(line.gitBranch, (branchTurns.get(line.gitBranch) ?? 0) + 1)
        }
      })

      sessionMeta.set(sessionId, meta)
    })
  )

  const enrichedSessions: ConversationWithFacet[] = sessions.map(s => {
    const enrich = sessionMeta.get(s.session_id) ?? {}
    return {
      ...s,
      estimated_cost: calcCostFromUsage(s.model ?? 'claude-opus-4-6', {
        input_tokens: s.input_tokens ?? 0,
        output_tokens: s.output_tokens ?? 0,
        cache_creation_input_tokens: s.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: s.cache_read_input_tokens ?? 0,
      }),
      slug: enrich.slug,
      version: enrich.version,
      has_compaction: enrich.has_compaction,
    }
  })

  const toolCounts: Record<string, number> = {}
  for (const s of sessions) {
    for (const [t, c] of Object.entries(s.tool_counts ?? {})) {
      toolCounts[t] = (toolCounts[t] ?? 0) + c
    }
  }

  const costBySession = enrichedSessions.map(s => ({
    session_id: s.session_id,
    start_time: s.start_time,
    cost: s.estimated_cost,
    messages: (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0),
  }))

  const branches = [...branchTurns.entries()]
    .map(([branch, turns]) => ({ branch, turns }))
    .sort((a, b) => b.turns - a.turns)

  return {
    project_path: projectPath,
    display_name: workspaceDisplayName(projectPath),
    sessions: enrichedSessions.sort((a, b) => b.start_time.localeCompare(a.start_time)),
    tool_counts: toolCounts,
    cost_by_session: costBySession,
    branches,
  }
}
