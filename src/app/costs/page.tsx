'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { ClaudeCostHint, ClaudeCostNote } from '@/common/components/claude-cost-disclosure'
import { SourceUnsupportedState } from '@/common/components/source-unsupported-state'
import { SpendOverTimeChart } from '@/modules/spending/components/spend-over-time-chart'
import { SpendByWorkspaceChart } from '@/modules/spending/components/spend-by-workspace-chart'
import { ModelUsageTable } from '@/modules/spending/components/model-usage-table'
import { CacheSavingsPanel } from '@/modules/spending/components/cache-savings-panel'
import { formatCost, formatTokens } from '@/common/helpers/formatters'
import { RATES } from '@/common/helpers/rates'
import type { SpendAnalytics } from '@/common/types/models'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(`API error ${r.status}`); return r.json() })

function Card({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="data-card">
      <div className="section-label mb-3">{title}</div>
      {children}
    </div>
  )
}

export default function CostsPage() {
  const { capabilities } = useAnalyticsSource()
  const { data, error, isLoading } = useSWR<SpendAnalytics>(
    capabilities.costs ? '/api/costs' : null,
    fetcher,
    { refreshInterval: 5_000 }
  )
  const [explainerOpen, setExplainerOpen] = useState(false)

  if (!capabilities.costs) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="claude-code-analytics · costs" subtitle="estimated Claude API spend by source" />
        <div className="p-6">
          <SourceUnsupportedState
            feature="Cost analytics"
            detail="Copilot exposes premium-request and token usage data, but this view still assumes Claude-style dollar cost semantics."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="claude-code-analytics · costs" subtitle="estimated Claude API spend from ~/.claude/" />
      <div className="p-6 space-y-6">
        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}
        {data && (
          <>
            <ClaudeCostNote />

            {/* Hero row */}
            <div className="flex flex-wrap gap-x-10 gap-y-6 py-4 border-b border-border/60 items-end">
              <div className="space-y-1">
                <div className="section-label">
                  <ClaudeCostHint label={<span>total est. API cost</span>} align="left" />
                </div>
                <div className="font-mono font-bold tabular-nums stat-amber leading-none" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em' }}>{formatCost(data.total_cost)}</div>
              </div>
              <div className="space-y-1">
                <div className="section-label">cache savings</div>
                <div className="font-mono font-bold tabular-nums stat-green leading-none" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em' }}>{formatCost(data.total_savings)}</div>
              </div>
              <div className="space-y-1">
                <div className="section-label">without cache</div>
                <div className="font-mono font-bold tabular-nums leading-none text-destructive" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em' }}>{formatCost(data.total_cost + data.total_savings)}</div>
              </div>
              <div className="space-y-1 ml-auto text-right">
                <div className="section-label">cache efficiency</div>
                <div className="font-mono font-bold tabular-nums stat-blue leading-none" style={{ fontSize: '2.4rem', letterSpacing: '-0.02em' }}>
                  {data.total_cost + data.total_savings > 0
                    ? `${Math.round((data.total_savings / (data.total_cost + data.total_savings)) * 100)}%`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* Prompt caching explainer — collapsible */}
            {(() => {
              const mono = { fontFamily: 'var(--font-geist-mono), monospace', fontSize: 13 } as React.CSSProperties
              const totalCacheRead  = data.models.reduce((s, m) => s + (m.cache_read_tokens  ?? 0), 0)
              const totalCacheWrite = data.models.reduce((s, m) => s + (m.cache_write_tokens ?? 0), 0)
              const totalInput      = data.models.reduce((s, m) => s + (m.input_tokens       ?? 0), 0)
              const withoutCache    = data.total_cost + data.total_savings
              const hitRate         = totalCacheRead + totalInput > 0 ? totalCacheRead / (totalCacheRead + totalInput) : 0
              const savingsPct      = withoutCache > 0 ? (data.total_savings / withoutCache * 100).toFixed(1) : '0'
              // break-even: write costs +0.25× extra; each read saves 0.9×; break-even at 0.25/0.9 reads
              const breakevenReads  = (0.25 / 0.9).toFixed(2)
              // reads-per-write: how many times was each written token read on average
              const readsPerWrite   = totalCacheWrite > 0 ? (totalCacheRead / totalCacheWrite).toFixed(1) : '—'

              return (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setExplainerOpen(o => !o)}
                    style={{
                      ...mono,
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted-foreground)',
                      opacity: 0.65,
                    }}
                  >
                    <span>how does prompt caching work?</span>
                    <span style={{ fontSize: 11 }}>{explainerOpen ? '▴' : '▾'}</span>
                  </button>

                  {explainerOpen && (
                    <div style={{ ...mono, color: 'var(--muted-foreground)', lineHeight: 1.7, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* --- What it is --- */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>what it is</span>
                        <p style={{ margin: 0 }}>
                          Prompt caching lets Claude store a processed snapshot of a prompt prefix — system instructions, tool definitions, conversation history, large documents — so subsequent requests can reuse it without re-processing.
                          The cache key is the exact token sequence up to the cache breakpoint. Any change to that prefix invalidates the entry.
                        </p>
                        <p style={{ margin: 0 }}>
                          In Claude Code, the system prompt (~30k tokens of tool schemas, skills, and instructions) is the primary cache target.
                          It is written once at session start and read on every subsequent turn, which is why Claude Code sessions tend to have high hit rates.
                          Older conversation turns also get cached as the context window grows.
                        </p>
                        <p style={{ margin: 0 }}>
                          Cache entries expire after <span style={{ color: 'var(--label-amber)', fontWeight: 600 }}>5 minutes of inactivity</span>.
                          An active session keeps extending the TTL on each read. If you pause for more than 5 minutes, the next turn pays the write cost again.
                        </p>
                      </div>

                      {/* --- Rates --- */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>rates</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, rowGap: 4 }}>
                          <span style={{ color: 'var(--label-blue)' }}>input (no cache)</span>
                          <span>1.00× — baseline, paid every request</span>
                          <span style={{ color: 'var(--label-violet)' }}>cache write</span>
                          <span>1.25× — upfront investment to store the prefix</span>
                          <span style={{ color: 'var(--label-emerald)' }}>cache read</span>
                          <span>0.10× — 10× cheaper than re-sending as input</span>
                        </div>
                      </div>

                      {/* --- Break-even & effective cost --- */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>break-even & effective cost</span>
                        <p style={{ margin: 0 }}>
                          The write premium is +0.25× per token. Each read saves 0.9× vs re-sending as input.
                          You recover the write cost after just <span style={{ color: 'var(--label-amber)', fontWeight: 700 }}>0.25 ÷ 0.9 ≈ {breakevenReads} reads</span> — less than one full read.
                          Any read beyond that is pure discount.
                        </p>
                        <p style={{ margin: 0 }}>
                          Effective cost per token over N reads:{' '}
                          <span style={{ color: 'var(--foreground)' }}>(1.25 + N × 0.1) ÷ (N + 1)</span> × input rate
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr', columnGap: 20, rowGap: 3, marginTop: 2 }}>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>reads (N)</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>formula</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>effective rate</span>
                          <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>vs no cache</span>
                          {[1, 2, 5, 10].map(n => {
                            const eff = ((1.25 + n * 0.1) / (n + 1))
                            const saving = ((1 - eff) * 100).toFixed(0)
                            const isYours = totalCacheWrite > 0 && Math.abs(Number(readsPerWrite) - n) < 0.5
                            return [
                              <span key={`n${n}`} style={{ color: isYours ? 'var(--label-amber)' : undefined }}>{n}</span>,
                              <span key={`f${n}`} style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>(1.25 + {n}×0.1) ÷ {n + 1}</span>,
                              <span key={`e${n}`} style={{ color: 'var(--label-emerald)', fontWeight: isYours ? 700 : 400 }}>{eff.toFixed(3)}×</span>,
                              <span key={`s${n}`} style={{ color: 'var(--label-emerald)' }}>−{saving}%{isYours ? ' ← you' : ''}</span>,
                            ]
                          })}
                        </div>
                      </div>

                      {/* --- Your numbers --- */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>your numbers</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, rowGap: 4 }}>
                          <span style={{ color: 'var(--muted-foreground)' }}>hit rate</span>
                          <span>
                            <span style={{ color: 'var(--label-emerald)' }}>{formatTokens(totalCacheRead)}</span>
                            {' '}÷ ({formatTokens(totalCacheRead)} + {formatTokens(totalInput)})
                            {' '}= <span style={{ color: 'var(--label-emerald)', fontWeight: 700 }}>{(hitRate * 100).toFixed(1)}%</span>
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>reads / write</span>
                          <span>
                            <span style={{ color: 'var(--label-emerald)' }}>{formatTokens(totalCacheRead)}</span>
                            {' '}÷ <span style={{ color: 'var(--label-violet)' }}>{formatTokens(totalCacheWrite)}</span>
                            {' '}= <span style={{ color: 'var(--foreground)', fontWeight: 700 }}>{readsPerWrite}×</span>
                            {totalCacheWrite > 0 && Number(readsPerWrite) >= Number(breakevenReads)
                              ? <span style={{ color: 'var(--label-emerald)' }}> · above break-even ✓</span>
                              : totalCacheWrite > 0
                                ? <span style={{ color: 'var(--label-red)' }}> · below break-even</span>
                                : null}
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>gross savings</span>
                          <span>
                            <span style={{ color: 'var(--label-emerald)' }}>{formatTokens(totalCacheRead)}</span>
                            {' '}× 0.9 × input rate
                            {' '}= <span style={{ color: 'var(--label-emerald)', fontWeight: 700 }}>{formatCost(data.total_savings)}</span>
                            <span style={{ opacity: 0.5 }}> (read savings only; does not net write premium)</span>
                          </span>
                          <span style={{ color: 'var(--muted-foreground)' }}>effective discount</span>
                          <span>
                            {formatCost(withoutCache)} → {formatCost(data.total_cost)}
                            {' '}= <span style={{ color: 'var(--label-emerald)', fontWeight: 700 }}>{savingsPct}% off</span>
                          </span>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )
            })()}

            {/* Cost over time — full width, primary chart */}
            {data.daily.length > 0 && (
              <Card title="Estimated API Cost Over Time">
                <SpendOverTimeChart daily={data.daily} />
              </Card>
            )}

            {/* Cost by project — full width */}
            {data.by_project.length > 0 && (
              <Card title="Estimated API Cost by Project">
                <SpendByWorkspaceChart projects={data.by_project} />
              </Card>
            )}

            {/* Cache efficiency — full width */}
            <Card title="Cache Efficiency">
              <CacheSavingsPanel models={data.models} totalSavings={data.total_savings} />
            </Card>

            {/* Per-model table — full width */}
            <Card title="Per-Model Token Breakdown">
              <ModelUsageTable models={data.models} />
            </Card>

            {/* Pricing reference */}
            <Card title="Claude API Pricing Reference">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] font-mono">
                  <thead>
                    <tr className="border-b border-border">
                      {['Model', 'Input /MTok', 'Output /MTok', 'Cache Write /MTok', 'Cache Read /MTok'].map(h => (
                        <th key={h} className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${h === 'Model' ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(RATES).map(([model, p]) => (
                      <tr key={model} className="border-b border-border/30">
                        <td className="py-2 text-foreground/80">{model}</td>
                        <td className="py-2 text-right text-[#1d4ed8] dark:text-[#60a5fa]">${(p.input * 1_000_000).toFixed(2)}</td>
                        <td className="py-2 text-right text-[#b45309] dark:text-[#d97706]">${(p.output * 1_000_000).toFixed(2)}</td>
                        <td className="py-2 text-right text-[#6d28d9] dark:text-[#a78bfa]">${(p.cacheWrite * 1_000_000).toFixed(2)}</td>
                        <td className="py-2 text-right text-[#047857] dark:text-[#34d399]">${(p.cacheRead * 1_000_000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[12px] text-muted-foreground/50 mt-2">
                  These rates drive the app&apos;s Claude API estimates, not Claude Code subscription pricing. Update pricing in <code className="text-muted-foreground">src/common/helpers/rates.ts</code>
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
