import type { McpServerSummary } from '@/common/types/models'

interface Props {
  servers: McpServerSummary[]
}

export function ServerPanel({ servers }: Props) {
  return (
    <div className="space-y-4">
      {servers.map(srv => (
        <div key={srv.server_name} className="border border-border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-[#047857] dark:text-[#34d399] text-[13px]">🔌 {srv.server_name}</span>
            <span className="text-muted-foreground text-[12px]">
              {srv.total_calls.toLocaleString()} calls · {srv.session_count} sessions
            </span>
          </div>
          <div className="space-y-1">
            {srv.tools.map(t => {
              const max = srv.tools[0]?.calls ?? 1
              const width = Math.max(2, Math.round((t.calls / max) * 100))
              return (
                <div key={t.name} className="flex items-center gap-2 text-[12px]">
                  <span className="text-muted-foreground/70 w-40 truncate font-mono">{t.name}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#34d399]/50" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-muted-foreground w-12 text-right">{t.calls.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
