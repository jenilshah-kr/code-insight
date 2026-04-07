import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { CommandRecord, SessionInfo } from '@/common/types/models'
import type {
  MemoryRecord,
  PlanRecord,
  PluginInfo,
  SkillInfo,
  TodoRecord,
} from '@/common/helpers/data-reader'
import { workspaceDisplayName } from '@/common/helpers/formatters'

const COPILOT_DIR = path.join(os.homedir(), '.copilot')

type EventRecord = {
  type?: string
  data?: Record<string, unknown>
  id?: string
  timestamp?: string
  parentId?: string | null
}

function copilotPath(...segments: string[]) {
  return path.join(COPILOT_DIR, ...segments)
}

function cleanPrompt(text: string): string {
  return text
    .replace(/<current_datetime>[\s\S]*?<\/current_datetime>/g, '')
    .replace(/<reminder>[\s\S]*?<\/reminder>/g, '')
    .trim()
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readEventsJsonl(filePath: string): Promise<EventRecord[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as EventRecord]
        } catch {
          return []
        }
      })
  } catch {
    return []
  }
}

async function listCopilotSessionDirs(): Promise<string[]> {
  try {
    const entries = await fs.readdir(copilotPath('session-state'), { withFileTypes: true })
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(copilotPath('session-state'), entry.name))
  } catch {
    return []
  }
}

function getToolName(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  return value
}

function isTaskLikeTool(toolName: string): boolean {
  return ['task', 'task_complete', 'read_agent', 'list_agents', 'write_agent'].includes(toolName)
}

function isMcpLikeTool(toolName: string): boolean {
  const normalized = toolName.toLowerCase()
  return normalized.startsWith('mcp__') || normalized.includes('-mcp-server-')
}

function isWebSearchTool(toolName: string): boolean {
  return toolName === 'web_search' || toolName === 'WebSearch'
}

function isWebFetchTool(toolName: string): boolean {
  return toolName === 'web_fetch' || toolName === 'WebFetch'
}

function extractOutputTokenCount(data: Record<string, unknown> | undefined): number {
  if (!data) return 0
  const outputTokens = data.outputTokens
  return typeof outputTokens === 'number' ? outputTokens : 0
}

async function parseCopilotSession(sessionDir: string): Promise<SessionInfo | null> {
  const sessionId = path.basename(sessionDir)
  const eventsPath = path.join(sessionDir, 'events.jsonl')
  const events = await readEventsJsonl(eventsPath)
  if (events.length === 0) return null

  let projectPath = ''
  let startTime = ''
  let lastTime = ''
  let firstPrompt = ''
  let assistantCount = 0
  let userCount = 0
  let version: string | undefined
  let gitBranch: string | undefined
  let currentModel: string | undefined
  let premiumRequests = 0
  let inputTokens = 0
  let outputTokens = 0
  let cacheRead = 0
  let cacheWrite = 0
  let linesAdded = 0
  let linesRemoved = 0
  let filesModified = 0
  let currentContextTokens = 0
  let systemContextTokens = 0
  let conversationContextTokens = 0
  let toolDefinitionTokens = 0
  let hasThinking = false
  let hasCompaction = false
  let usesPlanMode = false

  const toolCounts: Record<string, number> = {}
  const toolErrorCategories: Record<string, number> = {}
  const modelOutputTokens: Record<string, number> = {}
  const userMessageTimestamps: string[] = []
  const messageHours: number[] = []

  for (const event of events) {
    const ts = typeof event.timestamp === 'string' ? event.timestamp : ''
    if (ts) {
      if (!startTime || ts < startTime) startTime = ts
      if (!lastTime || ts > lastTime) lastTime = ts
    }

    const data = event.data ?? {}

    switch (event.type) {
      case 'session.start': {
        const sessionStart = typeof data.startTime === 'string' ? data.startTime : ts
        if (sessionStart) startTime = sessionStart
        const context = (data.context ?? {}) as Record<string, unknown>
        const gitRoot = typeof context.gitRoot === 'string' ? context.gitRoot : ''
        const cwd = typeof context.cwd === 'string' ? context.cwd : ''
        projectPath = gitRoot || cwd || projectPath
        gitBranch = typeof context.branch === 'string' ? context.branch : gitBranch
        version = typeof data.copilotVersion === 'string' ? data.copilotVersion : version
        break
      }
      case 'session.model_change': {
        currentModel = typeof data.newModel === 'string' ? data.newModel : currentModel
        break
      }
      case 'user.message': {
        userCount++
        if (ts) {
          userMessageTimestamps.push(ts)
          messageHours.push(new Date(ts).getHours())
        }
        const content = typeof data.content === 'string'
          ? data.content
          : typeof data.transformedContent === 'string'
            ? data.transformedContent
            : ''
        if (content && !firstPrompt) {
          firstPrompt = cleanPrompt(content).slice(0, 500)
        }
        break
      }
      case 'assistant.message': {
        assistantCount++
        if (typeof data.reasoningText === 'string' || typeof data.reasoningOpaque === 'string') {
          hasThinking = true
        }
        if (currentModel) {
          modelOutputTokens[currentModel] = (modelOutputTokens[currentModel] ?? 0) + extractOutputTokenCount(data)
        }
        break
      }
      case 'session.mode_changed': {
        if (data.newMode === 'plan' || data.previousMode === 'plan') {
          usesPlanMode = true
        }
        break
      }
      case 'session.plan_changed':
      case 'session.compaction_start':
      case 'session.compaction_complete': {
        if (event.type === 'session.plan_changed') usesPlanMode = true
        if (event.type !== 'session.plan_changed') hasCompaction = true
        break
      }
      case 'tool.execution_start': {
        const toolName = getToolName(data.toolName)
        if (toolName) {
          toolCounts[toolName] = (toolCounts[toolName] ?? 0) + 1
        }
        break
      }
      case 'tool.execution_complete': {
        const toolName = getToolName(data.toolName)
        if (toolName && data.success === false) {
          toolErrorCategories[toolName] = (toolErrorCategories[toolName] ?? 0) + 1
        }
        break
      }
      case 'session.shutdown': {
        premiumRequests = typeof data.totalPremiumRequests === 'number' ? data.totalPremiumRequests : premiumRequests
        currentModel = typeof data.currentModel === 'string' ? data.currentModel : currentModel
        currentContextTokens = typeof data.currentTokens === 'number' ? data.currentTokens : currentContextTokens
        systemContextTokens = typeof data.systemTokens === 'number' ? data.systemTokens : systemContextTokens
        conversationContextTokens = typeof data.conversationTokens === 'number' ? data.conversationTokens : conversationContextTokens
        toolDefinitionTokens = typeof data.toolDefinitionsTokens === 'number' ? data.toolDefinitionsTokens : toolDefinitionTokens

        const codeChanges = (data.codeChanges ?? {}) as Record<string, unknown>
        linesAdded = typeof codeChanges.linesAdded === 'number' ? codeChanges.linesAdded : linesAdded
        linesRemoved = typeof codeChanges.linesRemoved === 'number' ? codeChanges.linesRemoved : linesRemoved
        filesModified = Array.isArray(codeChanges.filesModified) ? codeChanges.filesModified.length : filesModified

        const modelMetrics = (data.modelMetrics ?? {}) as Record<string, unknown>
        for (const [modelName, metrics] of Object.entries(modelMetrics)) {
          const usage = ((metrics as { usage?: Record<string, unknown> }).usage ?? {}) as Record<string, unknown>
          const modelInput = typeof usage.inputTokens === 'number' ? usage.inputTokens : 0
          const modelOutput = typeof usage.outputTokens === 'number' ? usage.outputTokens : 0
          const modelCacheRead = typeof usage.cacheReadTokens === 'number' ? usage.cacheReadTokens : 0
          const modelCacheWrite = typeof usage.cacheWriteTokens === 'number' ? usage.cacheWriteTokens : 0
          inputTokens += modelInput
          outputTokens += modelOutput
          cacheRead += modelCacheRead
          cacheWrite += modelCacheWrite
          modelOutputTokens[modelName] = (modelOutputTokens[modelName] ?? 0) + modelOutput
        }
        break
      }
      default:
        break
    }
  }

  if (!projectPath) {
    const workspacePath = path.join(sessionDir, 'workspace.yaml')
    try {
      const raw = await fs.readFile(workspacePath, 'utf-8')
      const cwdLine = raw.split(/\r?\n/).find(line => line.startsWith('cwd:'))
      if (cwdLine) projectPath = cwdLine.replace(/^cwd:\s*/, '').trim()
    } catch {
      projectPath = ''
    }
  }

  if (!startTime) return null

  const model = Object.entries(modelOutputTokens).sort((a, b) => b[1] - a[1])[0]?.[0] ?? currentModel
  const start = new Date(startTime).getTime()
  const end = lastTime ? new Date(lastTime).getTime() : start
  const toolErrors = Object.values(toolErrorCategories).reduce((sum, count) => sum + count, 0)

  return {
    session_id: sessionId,
    source: 'copilot',
    model,
    primary_model: model,
    project_path: projectPath || workspaceDisplayName(sessionDir),
    start_time: startTime,
    duration_minutes: Math.max(0, (end - start) / 60_000),
    user_message_count: userCount,
    assistant_message_count: assistantCount,
    tool_counts: toolCounts,
    languages: {},
    git_commits: 0,
    git_pushes: 0,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_input_tokens: cacheWrite,
    cache_read_input_tokens: cacheRead,
    premium_requests: premiumRequests,
    current_context_tokens: currentContextTokens,
    system_context_tokens: systemContextTokens,
    conversation_context_tokens: conversationContextTokens,
    tool_definition_tokens: toolDefinitionTokens,
    first_prompt: firstPrompt,
    user_interruptions: 0,
    user_response_times: [],
    tool_errors: toolErrors,
    tool_error_categories: toolErrorCategories,
    uses_task_agent: Object.keys(toolCounts).some(isTaskLikeTool),
    uses_plan_mode: usesPlanMode || undefined,
    uses_mcp: Object.keys(toolCounts).some(isMcpLikeTool),
    uses_web_search: Object.keys(toolCounts).some(isWebSearchTool),
    uses_web_fetch: Object.keys(toolCounts).some(isWebFetchTool),
    lines_added: linesAdded,
    lines_removed: linesRemoved,
    files_modified: filesModified,
    message_hours: messageHours,
    user_message_timestamps: userMessageTimestamps,
    slug: projectPath ? workspaceDisplayName(projectPath) : undefined,
    version,
    git_branch: gitBranch,
    has_compaction: hasCompaction || undefined,
    has_thinking: hasThinking || undefined,
  }
}

export async function loadCopilotSessions(): Promise<SessionInfo[]> {
  const sessionDirs = await listCopilotSessionDirs()
  const sessions = await Promise.all(sessionDirs.map(parseCopilotSession))
  return sessions
    .filter((session): session is SessionInfo => session !== null)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
}

export async function loadCopilotSessionInfo(sessionId: string): Promise<SessionInfo | null> {
  const sessionDir = copilotPath('session-state', sessionId)
  return parseCopilotSession(sessionDir)
}

export async function loadCopilotHistory(limit = 200): Promise<CommandRecord[]> {
  const sessionDirs = await listCopilotSessionDirs()
  const entries: CommandRecord[] = []

  await Promise.all(sessionDirs.map(async (sessionDir) => {
    const sessionId = path.basename(sessionDir)
    const events = await readEventsJsonl(path.join(sessionDir, 'events.jsonl'))
    const startEvent = events.find(event => event.type === 'session.start')
    const context = ((startEvent?.data ?? {}).context ?? {}) as Record<string, unknown>
    const project = typeof context.gitRoot === 'string'
      ? context.gitRoot
      : typeof context.cwd === 'string'
        ? context.cwd
        : ''

    for (const event of events) {
      if (event.type !== 'user.message') continue
      const data = event.data ?? {}
      const display = typeof data.content === 'string'
        ? data.content
        : typeof data.transformedContent === 'string'
          ? cleanPrompt(data.transformedContent)
          : ''
      if (!display) continue
      entries.push({
        display,
        timestamp: event.timestamp ? new Date(event.timestamp).getTime() : 0,
        project,
        sessionId,
      })
    }
  }))

  return entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

export async function loadCopilotSettings(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(copilotPath('config.json'), 'utf-8')
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function loadCopilotSkills(): Promise<SkillInfo[]> {
  return []
}

export async function loadCopilotPlugins(): Promise<PluginInfo[]> {
  return []
}

export async function loadCopilotPlans(): Promise<PlanRecord[]> {
  const results: PlanRecord[] = []
  const sessionDirs = await listCopilotSessionDirs()
  await Promise.all(sessionDirs.map(async (sessionDir) => {
    const planPath = path.join(sessionDir, 'plan.md')
    if (!(await fileExists(planPath))) return
    try {
      const [content, stat] = await Promise.all([
        fs.readFile(planPath, 'utf-8'),
        fs.stat(planPath),
      ])
      results.push({
        path: planPath,
        name: path.basename(sessionDir),
        content,
        mtime: stat.mtime.toISOString(),
        project: null,
      })
    } catch {
      // ignore unreadable plan
    }
  }))
  return results.sort((a, b) => b.mtime.localeCompare(a.mtime))
}

export async function loadCopilotTodos(): Promise<TodoRecord[]> {
  return []
}

export async function loadCopilotMemories(): Promise<MemoryRecord[]> {
  return []
}

export async function getCopilotStorageBytes(): Promise<number> {
  async function dirSize(dirPath: string): Promise<number> {
    let total = 0
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          total += await dirSize(fullPath)
          return
        }
        try {
          const stat = await fs.stat(fullPath)
          total += stat.size
        } catch {
          // ignore unreadable file
        }
      }))
    } catch {
      return total
    }
    return total
  }

  return dirSize(COPILOT_DIR)
}

export function getCopilotWatchPath(): string {
  return copilotPath('session-state')
}
