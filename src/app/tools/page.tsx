'use client'

import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'
import { InstrumentRankingChart } from '@/modules/instruments/components/instrument-ranking-chart'
import { ServerPanel } from '@/modules/instruments/components/server-panel'
import { AdoptionTable } from '@/modules/instruments/components/adoption-table'
import { ReleaseHistoryTable } from '@/modules/instruments/components/release-history-table'
import { GROUP_COLORS, GROUP_LABELS } from '@/common/helpers/tool-groups'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts'
import type { InstrumentAnalytics } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded bg-card p-4">
      <h2 className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function ToolsPage() {
  const { data, error, isLoading } = useSWR<InstrumentAnalytics>('/api/tools', fetcher, { refreshInterval: 5_000 })

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · tools & features" subtitle="every tool call, MCP server, and feature" />
      <div className="p-6 space-y-6">
        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && (
          <>
            {/* Hero */}
            <div className="flex flex-wrap gap-6 py-3 border-b border-border text-[13px]">
              <span className="text-muted-foreground">
                total tool calls: <span className="text-[#d97706] font-bold text-lg">{data.total_tool_calls.toLocaleString()}</span>
              </span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">
                unique tools: <span className="text-foreground font-bold">{data.tools.length}</span>
              </span>
              <span className="text-border">·</span>
              <span className="text-muted-foreground">
                mcp servers: <span className="text-[#047857] dark:text-[#34d399] font-bold">{data.mcp_servers.length}</span>
              </span>
              {data.total_errors > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-muted-foreground">
                    errors: <span className="text-[#dc2626] dark:text-[#f87171] font-bold">{data.total_errors}</span>
                  </span>
                </>
              )}
            </div>

            {/* Category legend */}
            <div className="flex flex-wrap gap-3 text-[12px]">
              {Object.entries(GROUP_COLORS).map(([cat, color]) => (
                <span key={cat} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{GROUP_LABELS[cat as keyof typeof GROUP_LABELS]}</span>
                </span>
              ))}
            </div>

            {/* Tool ranking */}
            <Card title="All Tools — Ranked by Total Calls">
              <InstrumentRankingChart tools={data.tools} />
            </Card>

            {/* MCP server details */}
            {data.mcp_servers.length > 0 && (
              <Card title="MCP Server Details">
                <ServerPanel servers={data.mcp_servers} />
              </Card>
            )}

            {/* Feature adoption */}
            <Card title="Feature Adoption">
              <AdoptionTable
                adoption={data.feature_adoption}
                totalSessions={(() => {
                  const first = Object.values(data.feature_adoption ?? {})[0]
                  return first ? Math.round(first.sessions / Math.max(0.001, first.pct)) : 0
                })()}
              />
            </Card>

            {/* Error analysis */}
            {data.total_errors > 0 && (
              <Card title="Tool Error Analysis">
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-muted-foreground">Total errors:</span>
                    <span className="text-[#dc2626] dark:text-[#f87171] font-bold">{data.total_errors}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      Error rate: <span className="text-[#dc2626] dark:text-[#f87171]">
                        {data.total_tool_calls > 0
                          ? ((data.total_errors / data.total_tool_calls) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </span>
                  </div>
                  {Object.entries(data.error_categories).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                    const max = Math.max(...Object.values(data.error_categories))
                    const width = Math.round((count / max) * 100)
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <span className="text-muted-foreground/70 w-32">{cat}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#f87171]/50" style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-[#dc2626] dark:text-[#f87171] w-8 text-right text-[12px]">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Version history */}
            {data.versions.length > 0 && (
              <Card title="Claude Code Version History">
                <ReleaseHistoryTable versions={data.versions} />
              </Card>
            )}

            {/* Git branch analytics */}
            {data.branches.length > 0 && (
              <Card title="Git Branch Analytics">
                <div className="space-y-1.5 text-[13px]">
                  {data.branches.map(({ branch, turns }) => {
                    const max = data.branches[0]?.turns ?? 1
                    const width = Math.max(4, Math.round((turns / max) * 100))
                    return (
                      <div key={branch} className="flex items-center gap-2">
                        <span className="text-muted-foreground/70 w-28 truncate font-mono text-[12px]">{branch}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#34d399]/50" style={{ width: `${width}%` }} />
                        </div>
                        <span className="text-muted-foreground/50 text-[12px] w-20 text-right">{turns.toLocaleString()} turns</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
