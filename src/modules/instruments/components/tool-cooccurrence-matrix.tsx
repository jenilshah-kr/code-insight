'use client'

import { useMemo } from 'react'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import type { ConversationWithFacet } from '@/common/types/models'

const TOP_N = 12

export function ToolCooccurrenceMatrix() {
  const { data, isLoading } = useAnalyticsSWR<{ sessions: ConversationWithFacet[] }>(
    '/api/sessions',
    { refreshInterval: 30_000 }
  )

  const { tools, matrix } = useMemo(() => {
    if (!data?.sessions) return { tools: [], matrix: {} }

    const sessionCounts: Record<string, number> = {}
    const cooccurrence: Record<string, Record<string, number>> = {}

    for (const session of data.sessions) {
      const used = Object.entries(session.tool_counts ?? {})
        .filter(([, c]) => c > 0)
        .map(([t]) => t)

      const deduped = [...new Set(used)]

      for (const tool of deduped) {
        sessionCounts[tool] = (sessionCounts[tool] ?? 0) + 1
        if (!cooccurrence[tool]) cooccurrence[tool] = {}
        for (const other of deduped) {
          if (other !== tool) {
            cooccurrence[tool][other] = (cooccurrence[tool][other] ?? 0) + 1
          }
        }
      }
    }

    const topTools = Object.entries(sessionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N)
      .map(([tool]) => tool)

    // P(col | row) = sessions using both / sessions using row
    const matrix: Record<string, Record<string, number>> = {}
    for (const row of topTools) {
      matrix[row] = {}
      for (const col of topTools) {
        if (row === col) { matrix[row][col] = 1; continue }
        const total = sessionCounts[row] ?? 0
        const together = cooccurrence[row]?.[col] ?? 0
        matrix[row][col] = total > 0 ? together / total : 0
      }
    }

    return { tools: topTools, matrix }
  }, [data])

  if (isLoading && !data) {
    return <div className="h-48 bg-muted rounded animate-pulse" />
  }

  if (tools.length < 3) return null

  // Abbreviate tool names for column headers
  function abbrev(name: string) {
    return name.length > 6 ? name.slice(0, 6) : name
  }

  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="flex" style={{ paddingLeft: 100 }}>
        {tools.map(tool => (
          <div
            key={tool}
            title={tool}
            style={{
              width: 28,
              minWidth: 28,
              fontSize: 9,
              fontFamily: 'var(--font-geist-mono), monospace',
              color: 'var(--muted-foreground)',
              opacity: 0.6,
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              height: 60,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {abbrev(tool)}
          </div>
        ))}
      </div>

      {/* Matrix rows */}
      <div className="space-y-0.5">
        {tools.map(rowTool => (
          <div key={rowTool} className="flex items-center gap-0.5">
            {/* Row label */}
            <div
              style={{
                width: 96,
                minWidth: 96,
                fontSize: 11,
                fontFamily: 'var(--font-geist-mono), monospace',
                color: 'var(--muted-foreground)',
                opacity: 0.7,
                textAlign: 'right',
                paddingRight: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={rowTool}
            >
              {rowTool}
            </div>

            {/* Cells */}
            {tools.map(colTool => {
              const rate = matrix[rowTool]?.[colTool] ?? 0
              const isSelf = rowTool === colTool
              const pct = Math.round(rate * 100)

              return (
                <div
                  key={colTool}
                  title={isSelf ? rowTool : `${Math.round(rate * 100)}% of "${rowTool}" sessions also use "${colTool}"`}
                  style={{
                    width: 26,
                    height: 26,
                    minWidth: 26,
                    borderRadius: 3,
                    backgroundColor: isSelf
                      ? 'var(--muted)'
                      : rate > 0
                        ? `rgba(217, 119, 6, ${0.08 + rate * 0.92})`
                        : 'var(--muted)',
                    opacity: isSelf ? 0.3 : rate === 0 ? 0.2 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontFamily: 'var(--font-geist-mono), monospace',
                    color: rate > 0.5 ? 'rgba(0,0,0,0.7)' : 'var(--muted-foreground)',
                    cursor: 'default',
                  }}
                >
                  {!isSelf && pct > 0 ? pct : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground/50">
        <span>Row → Col: % of row-tool sessions that also used col-tool</span>
        <div className="flex items-center gap-1 ml-auto">
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(217,119,6,0.1)' }} />
          <span>0%</span>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(217,119,6,0.5)' }} />
          <span>50%</span>
          <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'rgba(217,119,6,1)' }} />
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
