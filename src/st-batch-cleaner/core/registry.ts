import {
  buildCharacterDryRunPlan,
  scanCharacterItems,
  type CharacterItemMeta,
} from '../adapters/character.adapter';
import {
  buildPersonaDryRunPlan,
  scanPersonaItems,
  type PersonaItemMeta,
} from '../adapters/persona.adapter';
import {
  buildWorldbookDryRunPlan,
  scanWorldbookItems,
  type WorldbookItemMeta,
} from '../adapters/worldbook.adapter';
import type {
  CharacterCascadeOptions,
  CleanableItem,
  CleanerModuleId,
  DryRunPlan,
  IconName,
} from '../types/cleaner';
import type { DependencyGraph } from './dependency-graph';

export interface CleanerModuleDefinition {
  id: CleanerModuleId;
  title: string;
  shortTitle: string;
  description: string;
  icon: IconName;
  supportsGridView: boolean;
  scan: (graph: DependencyGraph) => CleanableItem[];
  buildDryRun: (
    items: CleanableItem[],
    selectedIds: Set<string>,
    cascadeOptions: CharacterCascadeOptions,
    protectFavorites: boolean,
    graph: DependencyGraph,
  ) => DryRunPlan;
}

export const CLEANER_MODULES: CleanerModuleDefinition[] = [
  {
    id: 'character',
    title: '角色卡批量清理',
    shortTitle: '角色卡',
    description: '支持批量清理角色卡，并智能联动删除或解绑关联的世界书、对应面具及聊天历史文件。',
    icon: 'character',
    supportsGridView: true,
    scan: graph => scanCharacterItems(graph),
    buildDryRun: (items, selectedIds, cascadeOptions, protectFavorites, graph) =>
      buildCharacterDryRunPlan(
        items as CleanableItem<CharacterItemMeta>[],
        selectedIds,
        cascadeOptions,
        protectFavorites,
        graph,
      ),
  },
  {
    id: 'worldbook',
    title: '世界书批量清理',
    shortTitle: '世界书',
    description: '扫描全部世界书的引用图谱（角色卡、面具、全局启用），支持一键揪出未绑定的闲置世界书。',
    icon: 'worldbook',
    supportsGridView: false,
    scan: graph => scanWorldbookItems(graph),
    buildDryRun: (items, selectedIds, _cascadeOptions, _protectFavorites, graph) =>
      buildWorldbookDryRunPlan(items as CleanableItem<WorldbookItemMeta>[], selectedIds, graph),
  },
  {
    id: 'persona',
    title: '用户面具批量清理',
    shortTitle: '面具',
    description: '管理全部用户面具（Persona），支持检测失效角色死链、保护默认面具并批量清理闲置面具。',
    icon: 'persona',
    supportsGridView: true,
    scan: graph => scanPersonaItems(graph),
    buildDryRun: (items, selectedIds, _cascadeOptions, _protectFavorites, graph) =>
      buildPersonaDryRunPlan(items as CleanableItem<PersonaItemMeta>[], selectedIds, graph),
  },
];

export function getCleanerModule(id: CleanerModuleId): CleanerModuleDefinition {
  const found = CLEANER_MODULES.find(m => m.id === id);
  if (!found) {
    throw new Error(`未找到清理模块定义: ${id}`);
  }
  return found;
}
