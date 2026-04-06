'use client'

import { useState } from 'react'
import { classifyTool, GROUP_COLORS, LIGHT_GROUP_COLORS, parseMcpInstrument, isMcpInstrument } from '@/common/helpers/tool-groups'
import { useAppearance } from '@/common/components/appearance-provider'
import type { ToolInvocation } from '@/common/types/models'

function truncate(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function getToolArg(tool: ToolInvocation): string {
  const inp = tool.input ?? {}
  if (inp.command) return String(inp.command).slice(0, 60)
  if (inp.file_path) { const parts = String(inp.file_path).split(/[\\/]/).filter(Boolean); return parts.slice(-2).join('/') }
  if (inp.path) { const parts = String(inp.path).split(/[\\/]/).filter(Boolean); return parts.slice(-2).join('/') }
  if (inp.pattern) return String(inp.pattern).slice(0, 60)
  if (inp.query) return String(inp.query).slice(0, 60)
  if (inp.url) return String(inp.url).slice(0, 60)
  if (inp.description) return String(inp.description).slice(0, 60)
  const keys = Object.keys(inp)
  if (keys.length > 0) return truncate(String(inp[keys[0]]))
  return ''
}

function getToolIcon(name: string): string {
  if (name === 'Task') return '🤖'
  if (name === 'WebSearch') return '🔍'
  if (name === 'WebFetch') return '🌐'
  if (name === 'EnterPlanMode') return '📋'
  if (name === 'ExitPlanMode') return '✅'
  if (name === 'TodoWrite') return '📝'
  if (isMcpInstrument(name)) return '🔌'
  return '🔧'
}

export function InvocationBadge({ tool, result }: { tool: ToolInvocation; result?: { content: string; is_error: boolean } }) {
  const [expanded, setExpanded] = useState(false)
  const { theme } = useAppearance()
  const cat = classifyTool(tool.name)
  const color = (theme === 'dark' ? GROUP_COLORS : LIGHT_GROUP_COLORS)[cat]
  const mcp = parseMcpInstrument(tool.name)
  const icon = getToolIcon(tool.name)
  const arg = getToolArg(tool)
  const displayName = mcp ? `${mcp.server} · ${mcp.tool}` : tool.name

  return (
    <div
      className="rounded border text-sm font-mono overflow-hidden"
      style={{ borderColor: color + '40', backgroundColor: color + '10' }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left hover:opacity-80 transition-opacity"
      >
        <span>{icon}</span>
        <span style={{ color }} className="font-bold">{displayName}</span>
        {arg && <span className="text-muted-foreground ml-1 truncate">{arg}</span>}
        {result?.is_error && <span className="ml-auto text-[#dc2626] dark:text-[#f87171]">✗ error</span>}
        <span className="ml-auto text-muted-foreground/50 flex-shrink-0">{expanded ? '▲' : '▾'}</span>
      </button>
      {expanded && (
        <div className="border-t px-2.5 py-2 space-y-1.5" style={{ borderColor: color + '30' }}>
          <div>
            <p className="text-muted-foreground/50 mb-0.5 text-sm">input</p>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-auto">
              {truncate(JSON.stringify(tool.input, null, 2), 500)}
            </pre>
          </div>
          {result && (
            <div>
              <p className={`mb-0.5 ${result.is_error ? 'text-[#dc2626] dark:text-[#f87171]' : 'text-muted-foreground/50'}`}>
                {result.is_error ? 'error' : 'result'}
              </p>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap break-all max-h-32 overflow-auto">
                {truncate(result.content, 500)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
