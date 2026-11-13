import _ from 'lodash';

export interface CharacterRelationNode {
  avatarId: string;
  name: string;
  primaryWorldbook: string | null;
  additionalWorldbooks: string[];
  allWorldbooks: string[];
  linkedPersonaIds: string[];
  groupIds: string[];
  chatFileName: string;
  isFavorite: boolean;
  isCurrent: boolean;
}

export interface WorldbookRelationNode {
  name: string;
  isGlobalActive: boolean;
  isCurrentChatBound: boolean;
  boundCharacterIds: string[];
  boundPersonaIds: string[];
}

export interface PersonaRelationNode {
  avatarId: string;
  name: string;
  title: string;
  lorebook: string | null;
  isDefault: boolean;
  isCurrent: boolean;
  boundCharacterIds: string[];
  boundGroupIds: string[];
  deadCharacterIds: string[];
}

export interface DependencyGraph {
  characters: Map<string, CharacterRelationNode>;
  worldbooks: Map<string, WorldbookRelationNode>;
  personas: Map<string, PersonaRelationNode>;
  globalWorldbooks: Set<string>;
  currentChatWorldbook: string | null;
  currentCharacterId: string | null;
  currentPersonaId: string | null;
}

export function buildDependencyGraph(): DependencyGraph {
  const characters = new Map<string, CharacterRelationNode>();
  const worldbooks = new Map<string, WorldbookRelationNode>();
  const personas = new Map<string, PersonaRelationNode>();

  const currentCharacterId = getCurrentCharacterId();
  const currentPersonaId = getCurrentPersonaId();
  const globalWorldbooks = new Set<string>(getGlobalWorldbookNames());

  let currentChatWorldbook: string | null = null;
  try {
    currentChatWorldbook = getChatWorldbookName('current');
  } catch {
    currentChatWorldbook = null;
  }

  const ensureWb = (wbName: string): WorldbookRelationNode => {
    let node = worldbooks.get(wbName);
    if (!node) {
      node = {
        name: wbName,
        isGlobalActive: globalWorldbooks.has(wbName),
        isCurrentChatBound: currentChatWorldbook === wbName,
        boundCharacterIds: [],
        boundPersonaIds: [],
      };
      worldbooks.set(wbName, node);
    }
    return node;
  };

  getWorldbookNames().forEach(wb => ensureWb(wb));

  const charToGroups = new Map<string, string[]>();
  const rawGroups = Array.isArray(SillyTavern.groups) ? SillyTavern.groups : [];
  for (const grp of rawGroups) {
    const grpId = String(grp?.id ?? '');
    const members: string[] = Array.isArray(grp?.members) ? grp.members : [];
    for (const m of members) {
      if (!charToGroups.has(m)) charToGroups.set(m, []);
      charToGroups.get(m)!.push(grpId);
    }
  }

  const rawChars = Array.isArray(SillyTavern.characters) ? SillyTavern.characters : [];
  // 建立 O(1) 哈希索引，避免面具连接匹配时 O(N*M) 线性遍历卡顿
  const charByName = new Map<string, string>();
  const charByStem = new Map<string, string>();

  // 直接从酒馆内存读取附加世界书映射，避免在循环中对成百上千张角色卡逐个调用高开销的 getCharWorldbookNames()
  const extSettings = (SillyTavern as any)?.extensionSettings;
  const charLoreList: Array<{ name?: string; extraBooks?: string[] }> = Array.isArray(
    extSettings?.character_lore,
  )
    ? extSettings.character_lore
    : [];
  const extraBooksByAvatar = new Map<string, string[]>();
  for (const entry of charLoreList) {
    if (entry?.name && Array.isArray(entry.extraBooks)) {
      extraBooksByAvatar.set(entry.name, entry.extraBooks.filter(Boolean));
    }
  }

  for (const rawChar of rawChars) {
    const avatarId = rawChar?.avatar;
    if (!avatarId) continue;

    const primaryWb: string | null = rawChar?.data?.extensions?.world || null;
    const stem = avatarId.replace(/\.png$/i, '');
    const additionalWbs: string[] =
      extraBooksByAvatar.get(avatarId) ?? extraBooksByAvatar.get(stem) ?? [];

    const allWbs = _.uniq([primaryWb, ...additionalWbs].filter((x): x is string => Boolean(x)));
    const isFav = Boolean(
      rawChar.fav === true || rawChar.fav === 'true' || rawChar?.data?.extensions?.fav === true,
    );
    const charName = rawChar.name || stem;

    if (!charByName.has(charName)) charByName.set(charName, avatarId);
    if (!charByStem.has(stem)) charByStem.set(stem, avatarId);

    characters.set(avatarId, {
      avatarId,
      name: charName,
      primaryWorldbook: primaryWb,
      additionalWorldbooks: additionalWbs,
      allWorldbooks: allWbs,
      linkedPersonaIds: [],
      groupIds: charToGroups.get(avatarId) ?? [],
      chatFileName: rawChar.chat || '',
      isFavorite: isFav,
      isCurrent: currentCharacterId === avatarId,
    });

    for (const wbName of allWbs) {
      const wbNode = ensureWb(wbName);
      if (!wbNode.boundCharacterIds.includes(avatarId)) {
        wbNode.boundCharacterIds.push(avatarId);
      }
    }
  }

  for (const personaId of getPersonaIds()) {
    try {
      const p = getPersona(personaId);
      const connections = Array.isArray(p.connections) ? p.connections : [];
      const boundCharIds: string[] = [];
      const boundGroupIds: string[] = [];
      const deadCharIds: string[] = [];

      for (const conn of connections) {
        if (conn.type === 'character' && conn.id) {
          const matched = resolveCharIdFast(conn.id, characters, charByName, charByStem);
          if (matched) {
            boundCharIds.push(matched);
            const cNode = characters.get(matched);
            if (cNode && !cNode.linkedPersonaIds.includes(p.avatar_id)) {
              cNode.linkedPersonaIds.push(p.avatar_id);
            }
          } else {
            deadCharIds.push(conn.id);
          }
        } else if (conn.type === 'group' && conn.id) {
          boundGroupIds.push(conn.id);
        }
      }

      const lorebook = p.lorebook ? String(p.lorebook).trim() : null;
      if (lorebook) {
        const wbNode = ensureWb(lorebook);
        if (!wbNode.boundPersonaIds.includes(p.avatar_id)) {
          wbNode.boundPersonaIds.push(p.avatar_id);
        }
      }

      personas.set(p.avatar_id, {
        avatarId: p.avatar_id,
        name: p.name || p.avatar_id,
        title: p.title || '',
        lorebook,
        isDefault: Boolean(p.is_default),
        isCurrent: currentPersonaId === p.avatar_id,
        boundCharacterIds: _.uniq(boundCharIds),
        boundGroupIds: _.uniq(boundGroupIds),
        deadCharacterIds: _.uniq(deadCharIds),
      });
    } catch (err) {
      console.warn(`[st-batch-cleaner] 读取面具 ${personaId} 失败:`, err);
    }
  }

  return {
    characters,
    worldbooks,
    personas,
    globalWorldbooks,
    currentChatWorldbook,
    currentCharacterId,
    currentPersonaId,
  };
}

function resolveCharIdFast(
  rawId: string,
  chars: Map<string, CharacterRelationNode>,
  charByName: Map<string, string>,
  charByStem: Map<string, string>,
): string | null {
  if (chars.has(rawId)) return rawId;
  const withPng = rawId.endsWith('.png') ? rawId : `${rawId}.png`;
  if (chars.has(withPng)) return withPng;
  return charByStem.get(rawId) ?? charByName.get(rawId) ?? null;
}

