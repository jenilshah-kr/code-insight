import type { ModelSpendBreakdown } from '@/common/types/models'
import { ClaudeCostHint } from '@/common/components/claude-cost-disclosure'
import { formatCost, formatTokens } from '@/common/helpers/formatters'

interface Props {
  models: ModelSpendBreakdown[]
}

export function ModelUsageTable({ models }: Props) {
  const headers: Array<{ key: string; label: React.ReactNode; align: 'left' | 'right' }> = [
    { key: 'model', label: 'Model', align: 'left' },
    { key: 'input', label: 'Input', align: 'right' },
    { key: 'output', label: 'Output', align: 'right' },
    { key: 'cache-write', label: 'Cache Write', align: 'right' },
    { key: 'cache-read', label: 'Cache Read', align: 'right' },
    {
      key: 'estimated-cost',
      label: (
        <span className="inline-flex items-center justify-end gap-1">
          <span>Est. API Cost</span>
          <ClaudeCostHint align="right" />
        </span>
      ),
      align: 'right',
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] font-mono">
        <thead>
          <tr className="border-b border-border">
            {headers.map(({ key, label, align }) => (
              <th key={key} className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${align === 'left' ? 'text-left' : 'text-right'}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map(m => (
            <tr key={m.model} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
              <td className="py-2 text-foreground/80 text-[12px]">{m.model}</td>
              <td className="py-2 text-right text-[#1d4ed8] dark:text-[#60a5fa]">{formatTokens(m.input_tokens)}</td>
              <td className="py-2 text-right text-[#b45309] dark:text-[#d97706]">{formatTokens(m.output_tokens)}</td>
              <td className="py-2 text-right text-[#6d28d9] dark:text-[#a78bfa]">{formatTokens(m.cache_write_tokens)}</td>
              <td className="py-2 text-right text-[#047857] dark:text-[#34d399]">{formatTokens(m.cache_read_tokens)}</td>
              <td className="py-2 text-right text-primary font-bold">{formatCost(m.estimated_cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
