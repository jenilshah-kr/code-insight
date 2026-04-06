interface Props {
  has_compaction?: boolean
  uses_task_agent?: boolean
  uses_mcp?: boolean
  uses_web_search?: boolean
  uses_web_fetch?: boolean
  has_thinking?: boolean
}

export function FeatureBadges({ has_compaction, uses_task_agent, uses_mcp, uses_web_search, uses_web_fetch, has_thinking }: Props) {
  return (
    <span className="flex flex-wrap gap-1">
      {has_compaction && <span title="Compacted" className="text-[11px]">⚡</span>}
      {uses_task_agent && <span title="Task agent" className="text-[11px]">🤖</span>}
      {uses_mcp && <span title="MCP" className="text-[11px]">🔌</span>}
      {uses_web_search && <span title="Web search" className="text-[11px]">🔍</span>}
      {uses_web_fetch && <span title="Web fetch" className="text-[11px]">🌐</span>}
      {has_thinking && <span title="Extended thinking" className="text-[11px]">🧠</span>}
    </span>
  )
}
