import type { VersionRecord } from '@/common/types/models'
import { formatDate } from '@/common/helpers/formatters'

interface Props {
  versions: VersionRecord[]
}

export function ReleaseHistoryTable({ versions }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border">
            {['Version', 'Sessions', 'First Seen', 'Last Seen'].map(h => (
              <th key={h} className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${h === 'Version' ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {versions.map(v => (
            <tr key={v.version} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
              <td className="py-2 font-mono text-foreground">{v.version}</td>
              <td className="py-2 text-right text-muted-foreground">{v.session_count}</td>
              <td className="py-2 text-right text-muted-foreground">{v.first_seen ? formatDate(v.first_seen) : '—'}</td>
              <td className="py-2 text-right text-muted-foreground">{v.last_seen ? formatDate(v.last_seen) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
