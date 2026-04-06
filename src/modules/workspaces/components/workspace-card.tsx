import Link from 'next/link'
import type { WorkspaceSummary } from '@/common/types/models'
import { formatCost, formatDuration, formatRelativeDate } from '@/common/helpers/formatters'

interface Props {
  project: WorkspaceSummary
}

export function WorkspaceCard({ project: p }: Props) {
  return (
    <Link
      href={`/projects/${p.slug}`}
      className="block border border-border rounded bg-card p-4 hover:border-primary/40 transition-colors space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate">{p.display_name}</p>
          <p className="text-muted-foreground/60 text-[12px] truncate font-mono">{p.project_path}</p>
        </div>
        <span className="text-primary font-mono font-bold text-[15px] shrink-0">{formatCost(p.estimated_cost)}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <p className="text-muted-foreground/60 text-[11px] uppercase tracking-wider">Sessions</p>
          <p className="font-bold text-foreground">{p.session_count}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60 text-[11px] uppercase tracking-wider">Duration</p>
          <p className="font-bold text-foreground">{formatDuration(p.total_duration_minutes)}</p>
        </div>
        <div>
          <p className="text-muted-foreground/60 text-[11px] uppercase tracking-wider">Last Active</p>
          <p className="font-bold text-foreground">{formatRelativeDate(p.last_active)}</p>
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex flex-wrap gap-2 text-[12px]">
        {p.git_commits > 0 && (
          <span className="text-[#047857] dark:text-[#34d399]">🔀 {p.git_commits} commits</span>
        )}
        {p.uses_mcp && <span className="text-[#1d4ed8] dark:text-[#60a5fa]">🔌 MCP</span>}
        {p.uses_task_agent && <span className="text-[#6d28d9] dark:text-[#a78bfa]">🤖 agents</span>}
        {p.branches.length > 0 && (
          <span className="text-muted-foreground/60">{p.branches[0]}</span>
        )}
      </div>
    </Link>
  )
}
