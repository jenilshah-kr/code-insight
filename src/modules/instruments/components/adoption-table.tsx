const FEATURE_LABELS: Record<string, string> = {
  task_agents: '🤖 Task Agents',
  mcp:         '🔌 MCP',
  web_search:  '🔍 Web Search',
  web_fetch:   '🌐 Web Fetch',
  plan_mode:   '📋 Plan Mode',
  git_commits: '🔀 Git Commits',
}

interface Props {
  adoption: Record<string, { sessions: number; pct: number }>
  totalSessions: number
}

export function AdoptionTable({ adoption, totalSessions }: Props) {
  const entries = Object.entries(adoption).sort(([, a], [, b]) => b.pct - a.pct)

  return (
    <div className="space-y-2">
      {entries.map(([key, { sessions, pct }]) => {
        const label = FEATURE_LABELS[key] ?? key
        const width = Math.max(2, Math.round(pct * 100))
        return (
          <div key={key} className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground w-32 shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${width}%` }} />
            </div>
            <span className="text-primary font-mono w-10 text-right">{Math.round(pct * 100)}%</span>
            <span className="text-muted-foreground/50 text-[12px] w-24 text-right">{sessions.toLocaleString()} / {totalSessions.toLocaleString()}</span>
          </div>
        )
      })}
    </div>
  )
}
