'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/common/components/layout/page-header'
import { useAnalyticsSource } from '@/common/components/analytics-source-provider'
import { useAnalyticsSWR } from '@/common/helpers/analytics-swr'
import { WorkspaceCard } from '@/modules/workspaces/components/workspace-card'
import type { WorkspaceSummary } from '@/common/types/models'

type SortField = 'last_active' | 'estimated_cost' | 'premium_requests' | 'session_count' | 'total_duration_minutes'

export default function ProjectsPage() {
  const { source, dataRoot } = useAnalyticsSource()
  const { data, error, isLoading } = useAnalyticsSWR<{ projects: WorkspaceSummary[] }>(
    '/api/projects',
    { refreshInterval: 5_000 }
  )
  const showLoading = isLoading && !data

  const [sort, setSort] = useState<SortField>('last_active')
  const [search, setSearch] = useState('')
  const effectiveSort: SortField =
    source === 'copilot' && sort === 'estimated_cost'
      ? 'premium_requests'
      : source === 'claude' && sort === 'premium_requests'
        ? 'estimated_cost'
        : sort

  const sorted = useMemo(() => {
    if (!data) return []
    let projects = [...data.projects]
    if (search) {
      const q = search.toLowerCase()
      projects = projects.filter(p =>
        p.display_name.toLowerCase().includes(q) ||
        p.project_path.toLowerCase().includes(q)
      )
    }
    return projects.sort((a, b) => {
      if (effectiveSort === 'last_active') return b.last_active.localeCompare(a.last_active)
      return (b[effectiveSort] as number) - (a[effectiveSort] as number)
    })
  }, [data, effectiveSort, search])

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="claude-code-analytics · projects"
        subtitle={data ? `${data.projects.length} projects` : 'loading...'}
      />
      <div className="p-6 space-y-4">
        {error && <p className="text-[#dc2626] dark:text-[#f87171] text-sm font-mono">Error: {String(error)}</p>}

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-muted border border-border rounded px-2 py-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 w-48"
          />
          <div className="flex gap-1 ml-auto">
            {([
              { k: 'last_active', label: 'Recent' },
              ...(source === 'claude'
                ? [{ k: 'estimated_cost', label: 'Cost' }]
                : [{ k: 'premium_requests', label: 'Premium' }]),
              { k: 'session_count', label: 'Sessions' },
              { k: 'total_duration_minutes', label: 'Time' },
            ] as Array<{ k: SortField; label: string }>).map(({ k, label }) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`px-2 py-1 rounded text-[12px] transition-colors ${effectiveSort === k ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-foreground border border-border'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {showLoading && (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded animate-pulse" />
            ))}
          </div>
        )}

        {sorted.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sorted.map(p => <WorkspaceCard key={p.slug} project={p} source={source} />)}
          </div>
        )}

        {!showLoading && sorted.length === 0 && (
          <p className="text-muted-foreground/50 text-sm text-center py-12">
            {search ? 'No projects match your search.' : `No projects found in ${dataRoot}/`}
          </p>
        )}
      </div>
    </div>
  )
}
