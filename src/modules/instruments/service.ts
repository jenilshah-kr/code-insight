import path from 'path'
import { listWorkspaceSlugs, listWorkspaceJSONLFiles, streamJSONLLines } from '@/common/helpers/data-reader'
import { classifyTool, isMcpInstrument, parseMcpInstrument } from '@/common/helpers/tool-groups'
import type { SessionInfo, InstrumentSummary, McpServerSummary, VersionRecord } from '@/common/types/models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLine = Record<string, any>

export function aggregateInstrumentCounts(sessions: SessionInfo[], totalSessions: number) {
  const toolTotals = new Map<string, number>()
  const toolSessionCount = new Map<string, Set<string>>()
  const mcpServerCalls = new Map<string, Map<string, number>>()
  const mcpServerSessions = new Map<string, Set<string>>()
  const errorCategories: Record<string, number> = {}
  let totalErrors = 0

  for (const s of sessions) {
    const sid = s.session_id
    for (const [tool, count] of Object.entries(s.tool_counts ?? {})) {
      toolTotals.set(tool, (toolTotals.get(tool) ?? 0) + count)
      if (!toolSessionCount.has(tool)) toolSessionCount.set(tool, new Set())
      toolSessionCount.get(tool)!.add(sid)

      if (isMcpInstrument(tool)) {
        const parsed = parseMcpInstrument(tool)
        if (parsed) {
          if (!mcpServerCalls.has(parsed.server)) mcpServerCalls.set(parsed.server, new Map())
          if (!mcpServerSessions.has(parsed.server)) mcpServerSessions.set(parsed.server, new Set())
          const srv = mcpServerCalls.get(parsed.server)!
          srv.set(parsed.tool, (srv.get(parsed.tool) ?? 0) + count)
          mcpServerSessions.get(parsed.server)!.add(sid)
        }
      }
    }

    for (const [cat, count] of Object.entries(s.tool_error_categories ?? {})) {
      errorCategories[cat] = (errorCategories[cat] ?? 0) + count
      totalErrors += count
    }
  }

  const tools: InstrumentSummary[] = [...toolTotals.entries()]
    .map(([name, total_calls]) => ({
      name,
      category: classifyTool(name),
      total_calls,
      session_count: toolSessionCount.get(name)?.size ?? 0,
      error_count: 0,
    }))
    .sort((a, b) => b.total_calls - a.total_calls)

  const totalToolCalls = tools.reduce((s, t) => s + t.total_calls, 0)

  const mcp_servers: McpServerSummary[] = [...mcpServerCalls.entries()]
    .map(([server_name, toolMap]) => {
      const toolArr = [...toolMap.entries()]
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
      const total_calls = toolArr.reduce((s, t) => s + t.calls, 0)
      return {
        server_name,
        tools: toolArr,
        total_calls,
        session_count: mcpServerSessions.get(server_name)?.size ?? 0,
      }
    })
    .sort((a, b) => b.total_calls - a.total_calls)

  const featureSessions = {
    task_agents: sessions.filter(s => s.uses_task_agent || (s.tool_counts?.Task ?? 0) > 0).length,
    mcp: sessions.filter(s => s.uses_mcp || Object.keys(s.tool_counts ?? {}).some(isMcpInstrument)).length,
    web_search: sessions.filter(s => s.uses_web_search || (s.tool_counts?.WebSearch ?? 0) > 0).length,
    web_fetch: sessions.filter(s => s.uses_web_fetch || (s.tool_counts?.WebFetch ?? 0) > 0).length,
    plan_mode: sessions.filter(s => (s.tool_counts?.EnterPlanMode ?? 0) > 0).length,
    git_commits: sessions.filter(s => (s.git_commits ?? 0) > 0).length,
  }

  const feature_adoption: Record<string, { sessions: number; pct: number }> = {}
  for (const [key, count] of Object.entries(featureSessions)) {
    feature_adoption[key] = { sessions: count, pct: totalSessions > 0 ? count / totalSessions : 0 }
  }

  return { tools, mcp_servers, feature_adoption, totalToolCalls, errorCategories, totalErrors }
}

export async function gatherVersionData(slugs: string[]) {
  const versionData = new Map<string, { sessions: Set<string>; dates: string[] }>()
  const branchTurns = new Map<string, number>()

  await Promise.all(
    slugs.map(async (slug) => {
      const files = await listWorkspaceJSONLFiles(slug)
      await Promise.all(
        files.map(async (f) => {
          const sessionId = path.basename(f, '.jsonl')
          let fileVersion: string | undefined
          let fileDate: string | undefined

          await streamJSONLLines(f, (line: AnyLine) => {
            if (!fileVersion && line.version) {
              fileVersion = line.version
              fileDate = line.timestamp
            }
            if (line.gitBranch && line.gitBranch !== 'HEAD') {
              branchTurns.set(line.gitBranch, (branchTurns.get(line.gitBranch) ?? 0) + 1)
            }
          })

          if (fileVersion) {
            if (!versionData.has(fileVersion)) {
              versionData.set(fileVersion, { sessions: new Set(), dates: [] })
            }
            const vd = versionData.get(fileVersion)!
            vd.sessions.add(sessionId)
            if (fileDate) vd.dates.push(fileDate)
          }
        })
      )
    })
  )

  const versions: VersionRecord[] = [...versionData.entries()]
    .map(([version, data]) => {
      const sortedDates = data.dates.sort()
      return {
        version,
        session_count: data.sessions.size,
        first_seen: sortedDates[0] ?? '',
        last_seen: sortedDates[sortedDates.length - 1] ?? '',
      }
    })
    .sort((a, b) => b.last_seen.localeCompare(a.last_seen))

  const branches = [...branchTurns.entries()]
    .map(([branch, turns]) => ({ branch, turns }))
    .sort((a, b) => b.turns - a.turns)
    .slice(0, 15)

  return { versions, branches }
}

export async function compileInstrumentAnalytics(sessions: SessionInfo[]) {
  const totalSessions = sessions.length
  const { tools, mcp_servers, feature_adoption, totalToolCalls, errorCategories, totalErrors } =
    aggregateInstrumentCounts(sessions, totalSessions)
  const slugs = await listWorkspaceSlugs()
  const { versions, branches } = await gatherVersionData(slugs)
  return { tools, mcp_servers, feature_adoption, versions, branches, error_categories: errorCategories, total_tool_calls: totalToolCalls, total_errors: totalErrors }
}
