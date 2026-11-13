import type { DependencyGraph } from '../core/dependency-graph';
import type { CleanableItem, DryRunPlan, ItemBadge } from '../types/cleaner';

export interface PersonaItemMeta {
  avatarId: string;
  title: string;
  lorebook: string | null;
  isDefault: boolean;
  boundCharacterIds: string[];
  boundCharacterNames: string[];
  boundGroupIds: string[];
  deadCharacterIds: string[];
}

export function scanPersonaItems(graph: DependencyGraph): CleanableItem<PersonaItemMeta>[] {
  const items: CleanableItem<PersonaItemMeta>[] = [];

  for (const [avatarId, node] of graph.personas.entries()) {
    const boundCharNames = node.boundCharacterIds.map(id => graph.characters.get(id)?.name ?? id);
    const totalBindings = node.boundCharacterIds.length + node.boundGroupIds.length;
    const isOrphan = !node.isDefault && !node.isCurrent && totalBindings === 0;

    const badges: ItemBadge[] = [];
    if (node.isDefault) {
      badges.push({ label: '默认面具', tone: 'amber', icon: 'shield', tooltip: '酒馆默认面具，受系统保护' });
    }
    if (node.isCurrent) {
      badges.push({ label: '当前佩戴中', tone: 'emerald', icon: 'persona' });
    }
    if (node.boundCharacterIds.length > 0) {
      badges.push({
        label: `绑定 ${node.boundCharacterIds.length} 角色`,
        tone: 'primary',
        icon: 'character',
        tooltip: boundCharNames.join('、'),
      });
    }
    if (node.lorebook) {
      badges.push({
        label: `世界书: ${node.lorebook}`,
        tone: 'primary',
        icon: 'worldbook',
      });
    }
    if (node.deadCharacterIds.length > 0) {
      badges.push({
        label: `${node.deadCharacterIds.length} 条残留死链`,
        tone: 'rose',
        icon: 'warning',
        tooltip: `绑定了已不存在的角色: ${node.deadCharacterIds.join(', ')}`,
      });
    }
    if (isOrphan) {
      badges.push({
        label: '闲置未绑定',
        tone: 'neutral',
        icon: 'unlink',
      });
    }

    let avatarUrl: string | null = null;
    try {
      avatarUrl = getPersonaAvatarPath(avatarId);
    } catch {
      avatarUrl = null;
    }

    const subtitleParts = [avatarId];
    if (node.title) subtitleParts.push(node.title);
    if (boundCharNames.length > 0) {
      subtitleParts.push(`关联: ${boundCharNames.slice(0, 2).join('、')}`);
    }

    items.push({
      id: avatarId,
      name: node.name,
      subtitle: subtitleParts.join(' · '),
      avatarUrl,
      isFavorite: false,
      isActive: node.isCurrent,
      isSystemProtected: node.isDefault,
      protectedReason: node.isDefault ? '系统默认面具不可直接删除，请先在酒馆将其他面具设为默认' : undefined,
      isOrphan,
      badges,
      meta: {
        avatarId,
        title: node.title,
        lorebook: node.lorebook,
        isDefault: node.isDefault,
        boundCharacterIds: node.boundCharacterIds,
        boundCharacterNames: boundCharNames,
        boundGroupIds: node.boundGroupIds,
        deadCharacterIds: node.deadCharacterIds,
      },
    });
  }

  return items;
}

export function buildPersonaDryRunPlan(
  allItems: CleanableItem<PersonaItemMeta>[],
  selectedIds: Set<string>,
  _graph: DependencyGraph,
): DryRunPlan {
  const primaryDeletes: CleanableItem<PersonaItemMeta>[] = [];
  const skippedPrimary: Array<{ item: CleanableItem; reason: string }> = [];
  const warnings: string[] = [];

  for (const item of allItems) {
    if (!selectedIds.has(item.id)) continue;
    if (item.isSystemProtected) {
      skippedPrimary.push({
        item,
        reason: item.protectedReason || '系统默认面具受保护不可删除',
      });
      continue;
    }
    primaryDeletes.push(item);
  }

  const activePersona = primaryDeletes.find(i => i.isActive);
  if (activePersona) {
    warnings.push(`包含当前正在佩戴的面具「${activePersona.name}」，删除后将自动回退。`);
  }

  return {
    moduleId: 'persona',
    primaryDeletes,
    skippedPrimary,
    cascadeItems: [],
    warnings,
  };
}
