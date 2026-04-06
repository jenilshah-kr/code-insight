import type { ModelSpendBreakdown } from '@/common/types/models'
import { formatCost, formatTokens } from '@/common/helpers/formatters'

interface Props {
  models: ModelSpendBreakdown[]
}

export function ModelUsageTable({ models }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px] font-mono">
        <thead>
          <tr className="border-b border-border">
            {['Model', 'Input', 'Output', 'Cache Write', 'Cache Read', 'Cost'].map(h => (
              <th key={h} className={`py-2 text-[12px] font-bold text-muted-foreground uppercase tracking-wider ${h === 'Model' ? 'text-left' : 'text-right'}`}>{h}</th>
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
