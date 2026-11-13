import type { BackupBundle, BackupRecord, DryRunPlan } from '../types/cleaner';

const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 16));

/**
 * 根据 DryRun 计划提取所有即将被删除的数据（包含主删除项及级联删除的世界书、面具）
 * 并触发浏览器下载 JSON 备份包。
 * 支持分片让出主线程与紧凑 JSON 序列化，防止 iOS Safari 与云酒馆大批量备份时内存峰值闪退。
 */
export async function createAndDownloadBackup(
  plan: DryRunPlan,
  onProgress?: (label: string) => void,
  compact = true,
): Promise<{ filename: string; recordCount: number }> {
  const records: BackupRecord[] = [];
  const nowIso = new Date().toISOString();

  // 收集所有要物理删除的目标集合
  const charIdsToBackup = new Set<string>();
  const worldbooksToBackup = new Set<string>();
  const personaIdsToBackup = new Set<string>();

  for (const item of plan.primaryDeletes) {
    if (plan.moduleId === 'character') charIdsToBackup.add(item.id);
    if (plan.moduleId === 'worldbook') worldbooksToBackup.add(item.id);
    if (plan.moduleId === 'persona') personaIdsToBackup.add(item.id);
  }

  for (const cascade of plan.cascadeItems) {
    if (cascade.action !== 'delete') continue;
    if (cascade.moduleId === 'worldbook') worldbooksToBackup.add(cascade.id);
    if (cascade.moduleId === 'persona') personaIdsToBackup.add(cascade.id);
  }

  let processedCount = 0;

  // 1. 备份角色卡元数据与世界书绑定配置
  for (const charId of charIdsToBackup) {
    onProgress?.(`正在备份角色卡: ${charId}`);
    try {
      const rawChar = SillyTavern.characters.find(c => c.avatar === charId) ?? getCharData(charId);
      let worldbookBindings: CharWorldbooks = { primary: null, additional: [] };
      try {
        worldbookBindings = getCharWorldbookNames(charId);
      } catch {
        // ignore
      }
      records.push({
        moduleId: 'character',
        id: charId,
        name: rawChar?.name ?? charId,
        exportedAt: nowIso,
        data: {
          card: klona(rawChar),
          worldbookBindings,
        },
      });
    } catch (err) {
      console.warn(`[st-batch-cleaner] 备份角色卡 ${charId} 警告:`, err);
    }

    processedCount++;
    if (processedCount % 5 === 0) await yieldToMain();
  }

  // 2. 备份世界书完整条目
  for (const wbName of worldbooksToBackup) {
    onProgress?.(`正在备份世界书: ${wbName}`);
    try {
      const entries = await getWorldbook(wbName);
      records.push({
        moduleId: 'worldbook',
        id: wbName,
        name: wbName,
        exportedAt: nowIso,
        data: {
          name: wbName,
          entries: klona(entries),
        },
      });
    } catch (err) {
      console.warn(`[st-batch-cleaner] 备份世界书 ${wbName} 警告:`, err);
    }

    processedCount++;
    if (processedCount % 4 === 0) await yieldToMain();
  }

  // 3. 备份面具数据
  for (const personaId of personaIdsToBackup) {
    onProgress?.(`正在备份面具: ${personaId}`);
    try {
      const persona = getPersona(personaId);
      records.push({
        moduleId: 'persona',
        id: personaId,
        name: persona.name || personaId,
        exportedAt: nowIso,
        data: {
          ...klona(persona),
          // Blob 对象无法直接序列化，保留头像 ID
          avatar: typeof persona.avatar === 'string' ? persona.avatar : persona.avatar_id,
        },
      });
    } catch (err) {
      console.warn(`[st-batch-cleaner] 备份面具 ${personaId} 警告:`, err);
    }

    processedCount++;
    if (processedCount % 5 === 0) await yieldToMain();
  }

  const bundle: BackupBundle = {
    schemaVersion: '1.0.0',
    generator: 'st-batch-cleaner',
    createdAt: nowIso,
    moduleId: plan.moduleId,
    summary: {
      primaryCount: plan.primaryDeletes.length,
      cascadeDeleteCount: plan.cascadeItems.filter(c => c.action === 'delete').length,
    },
    records,
  };

  const timestamp = formatTimestampForFile(new Date());
  const filename = `st-batch-cleaner-backup-${plan.moduleId}-${timestamp}.json`;
  triggerJsonDownload(filename, bundle, compact);

  return {
    filename,
    recordCount: records.length,
  };
}

function formatTimestampForFile(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function triggerJsonDownload(filename: string, payload: unknown, compact = true): void {
  const jsonText = compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const parentDoc = window.parent?.document ?? document;
  const anchor = parentDoc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  parentDoc.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 3500);
}

