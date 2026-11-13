import type { DependencyGraph } from '../core/dependency-graph';
import type {
  CascadeActionItem,
  CharacterCascadeOptions,
  CleanableItem,
  DryRunPlan,
  ItemBadge,
} from '../types/cleaner';

export interface CharacterItemMeta {
  avatarId: string;
  creator: string;
  tags: string[];
  worldbooks: string[];
  personaIds: string[];
  groupIds: string[];
  chatFileName: string;
  createDate: string;
}

export function scanCharacterItems(graph: DependencyGraph): CleanableItem<CharacterItemMeta>[] {
  const rawChars = Array.isArray(SillyTavern.characters) ? SillyTavern.characters : [];
  const items: CleanableItem<CharacterItemMeta>[] = [];

  for (const rawChar of rawChars) {
    const avatarId = rawChar?.avatar;
    if (!avatarId) continue;

    const rel = graph.characters.get(avatarId);
    const worldbooks = rel?.allWorldbooks ?? [];
    const personaIds = rel?.linkedPersonaIds ?? [];
    const groupIds = rel?.groupIds ?? [];
    const isFav = rel?.isFavorite ?? false;
    const isCurrent = rel?.isCurrent ?? false;

    const badges: ItemBadge[] = [];
    if (isCurrent) badges.push({ label: '当前聊天中', tone: 'emerald', icon: 'chat' });
    if (isFav) badges.push({ label: '已收藏', tone: 'amber', icon: 'star' });
    if (worldbooks.length > 0) {
      badges.push({
        label: `${worldbooks.length} 本世界书`,
        tone: 'primary',
        icon: 'worldbook',
        tooltip: worldbooks.join('、'),
      });
    }
    if (personaIds.length > 0) {
      const personaNames = personaIds.map(id => graph.personas.get(id)?.name ?? id);
      badges.push({
        label: `${personaIds.length} 个面具`,
        tone: 'amber',
        icon: 'persona',
        tooltip: personaNames.join('、'),
      });
    }
    if (rawChar.chat) {
      badges.push({ label: '含聊天文件', tone: 'neutral', icon: 'chat', tooltip: rawChar.chat });
    }

    let avatarUrl: string | null = null;
    try {
      avatarUrl = getCharAvatarPath(avatarId) || SillyTavern.getThumbnailUrl('avatar', avatarId);
    } catch {
      avatarUrl = `/characters/${encodeURIComponent(avatarId)}`;
    }

    const creator = rawChar?.data?.creator || '';
    const subtitleParts = [avatarId];
    if (creator) subtitleParts.push(`作者: ${creator}`);

    items.push({
      id: avatarId,
      name: rawChar.name || avatarId.replace(/\.png$/i, ''),
      subtitle: subtitleParts.join(' · '),
      avatarUrl,
      isFavorite: isFav,
      isActive: isCurrent,
      isSystemProtected: false,
      isOrphan: worldbooks.length === 0 && personaIds.length === 0,
      badges,
      meta: {
        avatarId,
        creator,
        tags: Array.isArray(rawChar.tags) ? rawChar.tags : [],
        worldbooks,
        personaIds,
        groupIds,
        chatFileName: rawChar.chat || '',
        createDate: rawChar.create_date || '',
      },
    });
  }

  return items;
}


export function buildCharacterDryRunPlan(
  allItems: CleanableItem<CharacterItemMeta>[],
  selectedIds: Set<string>,
  cascadeOptions: CharacterCascadeOptions,
  protectFavorites: boolean,
  graph: DependencyGraph,
): DryRunPlan {
  const primaryDeletes: CleanableItem<CharacterItemMeta>[] = [];
  const skippedPrimary: Array<{ item: CleanableItem; reason: string }> = [];
  const cascadeItems: CascadeActionItem[] = [];
  const warnings: string[] = [];

  for (const item of allItems) {
    if (!selectedIds.has(item.id)) continue;
    if (protectFavorites && item.isFavorite) {
      skippedPrimary.push({ item, reason: '已开启「收藏角色防误删保护」' });
      continue;
    }
    primaryDeletes.push(item);
  }

  const deletingCharIdSet = new Set(primaryDeletes.map(i => i.id));
  const activeChar = primaryDeletes.find(i => i.isActive);
  if (activeChar) {
    warnings.push(`包含当前正在打开的角色卡「${activeChar.name}」，执行时将自动处理会话状态。`);
  }

  if (cascadeOptions.deleteChats) {
    for (const charItem of primaryDeletes) {
      if (charItem.meta.chatFileName) {
        cascadeItems.push({
          id: `${charItem.id}::chats`,
          name: `${charItem.name} 的全部聊天记录`,
          moduleId: 'chat',
          action: 'delete',
          reason: `随角色卡「${charItem.name}」一并清理聊天文件`,
        });
      }
    }
  }

  const candidateWorldbooks = new Set<string>();
  for (const charItem of primaryDeletes) {
    charItem.meta.worldbooks.forEach(wb => candidateWorldbooks.add(wb));
  }

  if (cascadeOptions.deleteLinkedWorldbooks) {
    for (const wbName of candidateWorldbooks) {
      const wbNode = graph.worldbooks.get(wbName);
      if (!wbNode) continue;

      const survivingChars = wbNode.boundCharacterIds.filter(cid => !deletingCharIdSet.has(cid));
      const externalReasons: string[] = [];
      if (wbNode.isGlobalActive) externalReasons.push('处于全局启用状态');
      if (survivingChars.length > 0) {
        const names = survivingChars
          .slice(0, 2)
          .map(cid => graph.characters.get(cid)?.name ?? cid)
          .join('、');
        externalReasons.push(`仍被未删角色「${names}${survivingChars.length > 2 ? ' 等' : ''}」引用`);
      }
      if (wbNode.boundPersonaIds.length > 0) {
        externalReasons.push(`被 ${wbNode.boundPersonaIds.length} 个面具引用`);
      }

      if (externalReasons.length > 0 && cascadeOptions.protectSharedWorldbooks) {
        cascadeItems.push({
          id: wbName,
          name: wbName,
          moduleId: 'worldbook',
          action: 'skip_protected',
          reason: `智能保护保留：${externalReasons.join('；')}`,
        });
      } else {
        cascadeItems.push({
          id: wbName,
          name: wbName,
          moduleId: 'worldbook',
          action: 'delete',
          reason:
            externalReasons.length > 0
              ? `强制连带删除（忽略：${externalReasons.join('；')}）`
              : '仅被本次待删角色卡使用，可安全连带清理',
        });
      }
    }
  }

  const candidatePersonas = new Set<string>();
  for (const charItem of primaryDeletes) {
    charItem.meta.personaIds.forEach(pid => candidatePersonas.add(pid));
  }

  for (const personaId of candidatePersonas) {
    const pNode = graph.personas.get(personaId);
    if (!pNode) continue;

    if (!cascadeOptions.deleteLinkedPersonas) {
      cascadeItems.push({
        id: personaId,
        name: pNode.name,
        moduleId: 'persona',
        action: 'unbind_only',
        reason: '保留面具，自动解绑已删角色的连接记录以防死链',
      });
      continue;
    }

    const survivingChars = pNode.boundCharacterIds.filter(cid => !deletingCharIdSet.has(cid));
    const protectReasons: string[] = [];
    if (pNode.isDefault) protectReasons.push('默认面具');
    if (pNode.isCurrent) protectReasons.push('当前正在佩戴');
    if (survivingChars.length > 0) {
      const names = survivingChars
        .slice(0, 2)
        .map(cid => graph.characters.get(cid)?.name ?? cid)
        .join('、');
      protectReasons.push(`还绑定了角色「${names}」`);
    }
    if (pNode.boundGroupIds.length > 0) {
      protectReasons.push(`还绑定了 ${pNode.boundGroupIds.length} 个群聊`);
    }

    if (pNode.isDefault || (protectReasons.length > 0 && cascadeOptions.protectSharedPersonas)) {
      cascadeItems.push({
        id: personaId,
        name: pNode.name,
        moduleId: 'persona',
        action: 'unbind_only',
        reason: `智能保护保留（${protectReasons.join('、')}），仅清理死链绑定`,
      });
    } else {
      cascadeItems.push({
        id: personaId,
        name: pNode.name,
        moduleId: 'persona',
        action: 'delete',
        reason: '专属绑定本次待删角色卡，连带删除该面具',
      });
    }
  }

  return {
    moduleId: 'character',
    primaryDeletes,
    skippedPrimary,
    cascadeItems,
    warnings,
  };
}
