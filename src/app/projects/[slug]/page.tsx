'use client'

import { useParams } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { formatCost, formatDuration, formatDate } from '@/common/helpers/formatters'
import { GROUP_COLORS, classifyTool } from '@/common/helpers/tool-groups'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { ConversationWithFacet } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

interface ProjectDetail {
  project_path: string
  display_name: string
  sessions: ConversationWithFacet[]
  tool_counts: Record<string, number>
  cost_by_session: Array<{ session_id: string; start_time: string; cost: number; messages: number }>
  branches: Array<{ branch: string; turns: number }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const workspaceId = params?.slug as string
  const { source, capabilities } = useAnalyticsSource()

  const { data, error, isLoading } = useSWR<ProjectDetail>(
    workspaceId ? `/api/projects/${workspaceId}` : null,
    fetcher
  )

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="project detail" subtitle="error" />
        <div className="p-6 text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="project detail" subtitle="loading..." />
        <div className="p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const topTools = Object.entries(data.tool_counts ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  const maxToolCount = topTools[0]?.[1] ?? 1

  const totalCost = (data.sessions ?? []).reduce((s, x) => s + (x.estimated_cost ?? 0), 0)
  const totalPremiumRequests = (data.sessions ?? []).reduce((sum, x) => sum + (x.premium_requests ?? 0), 0)
  const totalMsgs = (data.sessions ?? []).reduce((s, x) => s + (x.user_message_count ?? 0) + (x.assistant_message_count ?? 0), 0)
  const totalDuration = (data.sessions ?? []).reduce((s, x) => s + (x.duration_minutes ?? 0), 0)

  // Language aggregation
  const langMap: Record<string, number> = {}
  for (const s of (data.sessions ?? [])) {
    for (const [lang, count] of Object.entries(s.languages ?? {})) {
      langMap[lang] = (langMap[lang] ?? 0) + count
    }
  }
  const topLangs = Object.entries(langMap).sort(([, a], [, b]) => b - a).slice(0, 6)
  const LANG_PALETTE = ['#d97706', '#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171']

  const branches = data.branches ?? []
  const sessions = data.sessions ?? []
  const costBySessions = data.cost_by_session ?? []
  const maxBranchTurns = branches[0]?.turns ?? 1

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={`${data.display_name}`}
        subtitle={source === 'claude'
          ? `${sessions.length} sessions · ${formatCost(totalCost)} · ${formatDuration(totalDuration)}`
          : `${sessions.length} sessions · ${totalPremiumRequests.toLocaleString()} premium reqs · ${formatDuration(totalDuration)}`}
      />

      <div className="p-6 space-y-6">
        <Link href="/projects" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
          ← back to projects
        </Link>

        <div className="text-[12px] text-muted-foreground/50 font-mono">{data.project_path}</div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6 py-3 border-y border-border text-[13px]">
          <span className="text-muted-foreground">sessions: <span className="text-foreground font-bold">{sessions.length}</span></span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">messages: <span className="text-foreground font-bold">{totalMsgs.toLocaleString()}</span></span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">
            {source === 'claude' ? 'cost' : 'premium reqs'}:{' '}
            <span className="text-[#d97706] font-bold">
              {source === 'claude' ? formatCost(totalCost) : totalPremiumRequests.toLocaleString()}
            </span>
          </span>
          <span className="text-border">·</span>
          <span className="text-muted-foreground">duration: <span className="text-foreground font-bold">{formatDuration(totalDuration)}</span></span>
        </div>

        <div className="grid grid-cols-[1fr_260px] gap-6">
          {/* Sessions list */}
          <div>
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Sessions</h2>
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted">
                    {['Date', 'Slug', 'Msgs', source === 'claude' ? 'Cost' : 'Premium'].map(h => (
                      <th key={h} className={`px-3 py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${h === 'Date' || h === 'Slug' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, i) => {
                    const msgs = (s.user_message_count ?? 0) + (s.assistant_message_count ?? 0)
                    return (
                      <tr key={s.session_id} className={`border-b border-border/30 hover:bg-muted/50 transition-colors ${i % 2 ? 'bg-muted/20' : ''}`}>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(s.start_time)}</td>
                        <td className="px-3 py-2">
                          {capabilities.sessionDetail ? (
                            <Link href={`/sessions/${s.session_id}`} className="text-foreground hover:text-primary transition-colors">
                              {s.slug ?? s.session_id.slice(0, 8)}
                            </Link>
                          ) : (
                            <span
                              className="text-foreground"
                              title="Session detail is not available in Copilot mode"
                            >
                              {s.slug ?? s.session_id.slice(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{msgs}</td>
                        <td className="px-3 py-2 text-right text-[#d97706] font-mono">
                          {source === 'claude' ? formatCost(s.estimated_cost) : (s.premium_requests ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tools sidebar */}
          <div>
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Most-Used Tools</h2>
            <div className="space-y-1.5 text-[13px]">
              {topTools.map(([tool, count]) => {
                const cat = classifyTool(tool)
                const color = GROUP_COLORS[cat]
                const width = Math.max(4, Math.round((count / maxToolCount) * 100))
                return (
                  <div key={tool} className="flex items-center gap-2">
                    <span className="text-muted-foreground/70 w-24 truncate text-[12px]">{tool}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color + '90' }} />
                    </div>
                    <span className="text-muted-foreground/50 text-[12px] w-8 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Cost over time chart */}
        {source === 'claude' && costBySessions.length > 1 && (
          <div className="border border-border rounded bg-card p-4 overflow-visible">
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Cost Per Session</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={costBySessions.map(s => ({
                  date: s.start_time.slice(0, 10),
                  cost: s.cost,
                }))}
                margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  height={36}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v.toFixed(2)}`}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCost(v ?? 0), 'Cost']}
                />
                <Line type="monotone" dataKey="cost" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {source === 'copilot' && sessions.some(s => (s.premium_requests ?? 0) > 0) && (
          <div className="border border-border rounded bg-card p-4 overflow-visible">
            <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Premium Requests Per Session</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={sessions.map(s => ({
                  date: s.start_time.slice(0, 10),
                  premium: s.premium_requests ?? 0,
                }))}
                margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  height={36}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [v ?? 0, 'Premium requests']}
                />
                <Line type="monotone" dataKey="premium" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: '#d97706' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Language + Branch row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Language donut */}
          {topLangs.length > 0 && (
            <div className="border border-border rounded bg-card p-4">
              <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Languages</h2>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={topLangs.map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0}>
                      {topLangs.map((_, i) => <Cell key={i} fill={LANG_PALETTE[i % LANG_PALETTE.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 text-[12px]">
                  {topLangs.map(([lang], i) => (
                    <div key={lang} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: LANG_PALETTE[i % LANG_PALETTE.length] }} />
                      <span className="text-muted-foreground">{lang}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Git branches */}
          {branches.length > 0 && (
            <div className="border border-border rounded bg-card p-4">
              <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Git Branches</h2>
              <div className="space-y-1.5 text-[13px]">
                {branches.map(({ branch, turns }) => {
                  const width = Math.max(4, Math.round((turns / maxBranchTurns) * 100))
                  return (
                    <div key={branch} className="flex items-center gap-2">
                      <span className="text-muted-foreground/70 w-24 truncate text-[12px] font-mono">{branch}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#34d399]/50" style={{ width: `${width}%` }} />
                      </div>
                      <span className="text-muted-foreground/50 text-[12px] w-12 text-right">{turns} turns</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
