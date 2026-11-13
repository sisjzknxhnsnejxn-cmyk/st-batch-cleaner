import type { DependencyGraph } from '../core/dependency-graph';
import type { CleanableItem, DryRunPlan, ItemBadge } from '../types/cleaner';

export interface WorldbookItemMeta {
  isGlobalActive: boolean;
  isCurrentChatBound: boolean;
  boundCharacterIds: string[];
  boundCharacterNames: string[];
  boundPersonaIds: string[];
  boundPersonaNames: string[];
  totalRefCount: number;
}

export function scanWorldbookItems(graph: DependencyGraph): CleanableItem<WorldbookItemMeta>[] {
  const names = getWorldbookNames();
  const items: CleanableItem<WorldbookItemMeta>[] = [];

  for (const wbName of names) {
    const node = graph.worldbooks.get(wbName);
    const isGlobalActive = node?.isGlobalActive ?? false;
    const isCurrentChatBound = node?.isCurrentChatBound ?? false;
    const boundCharIds = node?.boundCharacterIds ?? [];
    const boundPersonaIds = node?.boundPersonaIds ?? [];

    const boundCharNames = boundCharIds.map(id => graph.characters.get(id)?.name ?? id);
    const boundPersonaNames = boundPersonaIds.map(id => graph.personas.get(id)?.name ?? id);
    const totalRefCount =
      boundCharIds.length + boundPersonaIds.length + (isGlobalActive ? 1 : 0) + (isCurrentChatBound ? 1 : 0);

    const badges: ItemBadge[] = [];
    if (isGlobalActive) {
      badges.push({ label: '全局启用中', tone: 'emerald', icon: 'worldbook' });
    }
    if (isCurrentChatBound) {
      badges.push({ label: '当前聊天绑定', tone: 'emerald', icon: 'chat' });
    }
    if (boundCharIds.length > 0) {
      badges.push({
        label: `角色引用 (${boundCharIds.length})`,
        tone: 'primary',
        icon: 'character',
        tooltip: `绑定角色：${boundCharNames.join('、')}`,
      });
    }
    if (boundPersonaIds.length > 0) {
      badges.push({
        label: `面具引用 (${boundPersonaIds.length})`,
        tone: 'amber',
        icon: 'persona',
        tooltip: `绑定面具：${boundPersonaNames.join('、')}`,
      });
    }
    if (totalRefCount === 0) {
      badges.push({
        label: '闲置未绑定',
        tone: 'rose',
        icon: 'unlink',
        tooltip: '没有任何角色卡、面具、全局或当前聊天绑定此世界书',
      });
    }

    const subtitle =
      totalRefCount === 0
        ? '孤儿/闲置世界书 · 无任何绑定引用'
        : [
            boundCharNames.length ? `角色: ${boundCharNames.slice(0, 3).join(', ')}${boundCharNames.length > 3 ? '...' : ''}` : '',
            boundPersonaNames.length ? `面具: ${boundPersonaNames.join(', ')}` : '',
            isGlobalActive ? '全局开启' : '',
          ]
            .filter(Boolean)
            .join(' · ');

    items.push({
      id: wbName,
      name: wbName,
      subtitle,
      avatarUrl: null,
      isFavorite: false,
      isActive: isGlobalActive || isCurrentChatBound,
      isSystemProtected: false,
      isOrphan: totalRefCount === 0,
      badges,
      meta: {
        isGlobalActive,
        isCurrentChatBound,
        boundCharacterIds: boundCharIds,
        boundCharacterNames: boundCharNames,
        boundPersonaIds,
        boundPersonaNames,
        totalRefCount,
      },
    });
  }

  return items;
}

export function buildWorldbookDryRunPlan(
  allItems: CleanableItem<WorldbookItemMeta>[],
  selectedIds: Set<string>,
  _graph: DependencyGraph,
): DryRunPlan {
  const primaryDeletes = allItems.filter(i => selectedIds.has(i.id));
  const warnings: string[] = [];

  const activeCount = primaryDeletes.filter(i => i.meta.isGlobalActive).length;
  if (activeCount > 0) {
    warnings.push(`有 ${activeCount} 本世界书正处于「全局启用」状态，清理前将自动从全局启用列表中解绑。`);
  }

  const charBoundItems = primaryDeletes.filter(i => i.meta.boundCharacterIds.length > 0);
  if (charBoundItems.length > 0) {
    warnings.push(
      `有 ${charBoundItems.length} 本世界书仍被角色卡绑定（如 ${charBoundItems
        .slice(0, 2)
        .map(i => i.name)
        .join('、')}），删除后对应角色卡将失去世界书设定。`,
    );
  }

  return {
    moduleId: 'worldbook',
    primaryDeletes,
    skippedPrimary: [],
    cascadeItems: [],
    warnings,
  };
}
