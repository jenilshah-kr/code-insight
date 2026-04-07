import type { Facet } from '@/common/types/models'
import {
  getStorageBytes,
  loadAllFacets,
  loadHistory,
  loadMemories,
  loadPlans,
  loadPlugins,
  loadSessionsFromJSONL,
  loadSettings,
  loadSkills,
  loadTodos,
  type MemoryRecord,
  type PlanRecord,
  type PluginInfo,
  type SkillInfo,
  type TodoRecord,
} from '@/common/helpers/data-reader'
import {
  getCopilotStorageBytes,
  getCopilotWatchPath,
  loadCopilotHistory,
  loadCopilotMemories,
  loadCopilotPlans,
  loadCopilotPlugins,
  loadCopilotSessions,
  loadCopilotSettings,
  loadCopilotSkills,
  loadCopilotTodos,
} from '@/common/helpers/copilot-reader'
import {
  dataPath,
} from '@/common/helpers/data-reader'
import type { AnalyticsSource } from '@/common/helpers/analytics-source'
import type { CommandRecord, SessionInfo } from '@/common/types/models'

export async function loadSessionsForSource(source: AnalyticsSource): Promise<SessionInfo[]> {
  return source === 'copilot' ? loadCopilotSessions() : loadSessionsFromJSONL()
}

export async function loadFacetsForSource(source: AnalyticsSource): Promise<Facet[]> {
  return source === 'copilot' ? [] : loadAllFacets()
}

export async function loadHistoryForSource(source: AnalyticsSource, limit = 200): Promise<CommandRecord[]> {
  return source === 'copilot' ? loadCopilotHistory(limit) : loadHistory(limit)
}

export async function loadSettingsForSource(source: AnalyticsSource): Promise<Record<string, unknown>> {
  return source === 'copilot' ? loadCopilotSettings() : loadSettings()
}

export async function loadSkillsForSource(source: AnalyticsSource): Promise<SkillInfo[]> {
  return source === 'copilot' ? loadCopilotSkills() : loadSkills()
}

export async function loadPluginsForSource(source: AnalyticsSource): Promise<PluginInfo[]> {
  return source === 'copilot' ? loadCopilotPlugins() : loadPlugins()
}

export async function loadPlansForSource(source: AnalyticsSource): Promise<PlanRecord[]> {
  return source === 'copilot' ? loadCopilotPlans() : loadPlans()
}

export async function loadTodosForSource(source: AnalyticsSource): Promise<TodoRecord[]> {
  return source === 'copilot' ? loadCopilotTodos() : loadTodos()
}

export async function loadMemoriesForSource(source: AnalyticsSource): Promise<MemoryRecord[]> {
  return source === 'copilot' ? loadCopilotMemories() : loadMemories()
}

export async function getStorageBytesForSource(source: AnalyticsSource): Promise<number> {
  return source === 'copilot' ? getCopilotStorageBytes() : getStorageBytes()
}

export function getWatchPathForSource(source: AnalyticsSource): string {
  return source === 'copilot' ? getCopilotWatchPath() : dataPath('projects')
}
