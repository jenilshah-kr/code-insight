export type InstrumentCategory =
  | 'file-io'
  | 'shell'
  | 'agent'
  | 'web'
  | 'planning'
  | 'todo'
  | 'skill'
  | 'mcp'
  | 'other'

export const TOOL_GROUPS: Record<string, InstrumentCategory> = {
  Read:           'file-io',
  Write:          'file-io',
  Edit:           'file-io',
  Glob:           'file-io',
  Grep:           'file-io',
  NotebookEdit:   'file-io',

  Bash:           'shell',

  Task:           'agent',
  TaskCreate:     'agent',
  TaskUpdate:     'agent',
  TaskList:       'agent',
  TaskOutput:     'agent',
  TaskStop:       'agent',
  TaskGet:        'agent',

  WebSearch:      'web',
  WebFetch:       'web',

  EnterPlanMode:  'planning',
  ExitPlanMode:   'planning',
  AskUserQuestion:'planning',

  TodoWrite:      'todo',

  Skill:          'skill',
  ToolSearch:     'skill',
  ListMcpResourcesTool: 'skill',
  ReadMcpResourceTool:  'skill',
}

export const GROUP_COLORS: Record<InstrumentCategory, string> = {
  'file-io':  '#60a5fa',   // blue-400
  'shell':    '#d97706',   // amber-600
  'agent':    '#a78bfa',   // violet-400
  'web':      '#22c55e',   // green-500
  'planning': '#fbbf24',   // amber-400
  'todo':     '#fb923c',   // orange-400
  'skill':    '#38bdf8',   // sky-400
  'mcp':      '#34d399',   // emerald-400
  'other':    '#6b7280',   // gray-500
}

export const LIGHT_GROUP_COLORS: Record<InstrumentCategory, string> = {
  'file-io':  '#1d4ed8',   // blue-700:    8.6:1 vs white
  'shell':    '#b45309',   // amber-700:   4.6:1 vs white
  'agent':    '#6d28d9',   // violet-700:  7.0:1 vs white
  'web':      '#15803d',   // green-700:   5.2:1 vs white
  'planning': '#b45309',   // amber-700:   4.6:1 vs white
  'todo':     '#c2410c',   // orange-700:  5.3:1 vs white
  'skill':    '#0369a1',   // sky-700:     6.4:1 vs white
  'mcp':      '#047857',   // emerald-700: 7.0:1 vs white
  'other':    '#374151',   // gray-700:    8.0:1 vs white
}

export const GROUP_LABELS: Record<InstrumentCategory, string> = {
  'file-io':  'File I/O',
  'shell':    'Shell',
  'agent':    'Agents',
  'web':      'Web',
  'planning': 'Planning',
  'todo':     'Todo',
  'skill':    'Skills',
  'mcp':      'MCP',
  'other':    'Other',
}

export function classifyTool(name: string): InstrumentCategory {
  if (name.startsWith('mcp__')) return 'mcp'
  return TOOL_GROUPS[name] ?? 'other'
}

export function isMcpInstrument(name: string): boolean {
  return name.startsWith('mcp__')
}

export function parseMcpInstrument(name: string): { server: string; tool: string } | null {
  if (!name.startsWith('mcp__')) return null
  const parts = name.split('__')
  if (parts.length < 3) return null
  return {
    server: parts[1],
    tool:   parts.slice(2).join('__'),
  }
}

export function instrumentDisplayName(name: string): string {
  const mcp = parseMcpInstrument(name)
  if (mcp) return `${mcp.server} · ${mcp.tool}`
  return name
}

export const GROUP_ICONS: Record<InstrumentCategory, string> = {
  'file-io':  '📄',
  'shell':    '⚡',
  'agent':    '🤖',
  'web':      '🌐',
  'planning': '📋',
  'todo':     '✅',
  'skill':    '🎯',
  'mcp':      '🔌',
  'other':    '🔧',
}
