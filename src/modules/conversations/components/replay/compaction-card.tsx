import type { CompactionEvent } from '@/common/types/models'
import { formatTokens } from '@/common/helpers/formatters'

interface Props {
  event: CompactionEvent
}

export { CompactionCard as CompressionCard }

export function CompactionCard({ event }: Props) {
  return (
    <div className="border border-amber-500/30 bg-amber-500/5 rounded p-3 text-[13px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-amber-400 font-bold">⚡ Context Compaction</span>
        <span className="text-muted-foreground/60 text-[12px]">{event.trigger}</span>
      </div>
      <div className="text-muted-foreground text-[12px]">
        Pre-compaction tokens: <span className="text-foreground font-mono">{formatTokens(event.pre_tokens)}</span>
      </div>
      {event.summary && (
        <p className="text-muted-foreground/70 text-[12px] mt-1 line-clamp-2">{event.summary}</p>
      )}
    </div>
  )
}
