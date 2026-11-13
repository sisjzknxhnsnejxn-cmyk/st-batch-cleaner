import type {
  CharacterCascadeOptions,
  CloudThrottlePresetId,
  DryRunPlan,
  ExecutionProgress,
} from '../types/cleaner';
import { createAndDownloadBackup } from './backup';
import { getCloudThrottleProfile } from './throttle';

export interface ExecutePlanOptions {
  enableBackupBeforeDelete: boolean;
  compactBackupJson?: boolean;
  throttlePreset?: CloudThrottlePresetId;
  cascadeOptions: CharacterCascadeOptions;
  /** 用户是否点击了中途安全停止 */
  shouldAbort?: () => boolean;
  /** 用户是否点击了暂停 */
  shouldPause?: () => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 指数退避重试包装器（应对云酒馆偶发 502/504/429 网关抖动）
 */
async function executeWithRetry(
  fn: () => Promise<boolean>,
  maxRetries: number,
  onWarn: (attempt: number, err: unknown) => void,
): Promise<boolean> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      attempt++;
      onWarn(attempt, err);
      await sleep(700 * Math.pow(2, attempt - 1));
    }
  }
}

export async function executeDryRunPlan(
  plan: DryRunPlan,
  options: ExecutePlanOptions,
  onProgressUpdate: (updater: (progress: ExecutionProgress) => void) => void,
): Promise<{
  successCount: number;
  failCount: number;
  aborted: boolean;
  backupFilename: string | null;
}> {
  const profile = getCloudThrottleProfile(options.throttlePreset ?? 'cloud_safe');

  const appendLog = (level: 'info' | 'success' | 'warn' | 'error', message: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    onProgressUpdate(p => {
      p.logs.push({ time, level, message });
    });
  };

  const cascadeDeletes = plan.cascadeItems.filter(
    c => c.action === 'delete' && c.moduleId !== 'chat',
  );
  const cascadeUnbinds = plan.cascadeItems.filter(c => c.action === 'unbind_only');
  const totalSteps =
    (options.enableBackupBeforeDelete ? 1 : 0) +
    cascadeUnbinds.length +
    plan.primaryDeletes.length +
    cascadeDeletes.length +
    1;

  let currentStep = 0;
  const stepAdvance = (label: string, phase?: ExecutionProgress['phase']) => {
    currentStep = Math.min(totalSteps, currentStep + 1);
    onProgressUpdate(p => {
      p.currentStep = currentStep;
      p.totalSteps = totalSteps;
      p.currentLabel = label;
      if (phase) p.phase = phase;
    });
  };

  onProgressUpdate(p => {
    p.running = true;
    p.paused = false;
    p.abortRequested = false;
    p.phase = 'backing_up';
    p.currentStep = 0;
    p.totalSteps = totalSteps;
    p.currentLabel = '准备开始清理任务...';
    p.logs = [];
  });

  appendLog(
    'info',
    `已启用「${profile.name}」：单步间隔 ${profile.stepDelayMs}ms，每 ${profile.batchSize} 项喘息冷却 ${(profile.batchCooldownMs / 1000).toFixed(1)}s`,
  );

  let backupFilename: string | null = null;
  let successCount = 0;
  let failCount = 0;
  let writeOpsCounter = 0;

  const isAborted = (): boolean => Boolean(options.shouldAbort?.());
  const isPaused = (): boolean => Boolean(options.shouldPause?.());

  const waitWhilePaused = async () => {
    if (!isPaused() || isAborted()) return;
    appendLog('info', '⏸ 任务已暂停，等待继续...');
    onProgressUpdate(p => {
      p.paused = true;
    });
    while (isPaused() && !isAborted()) {
      await sleep(160);
    }
    onProgressUpdate(p => {
      p.paused = false;
    });
    if (!isAborted()) {
      appendLog('info', '▶ 任务已继续执行');
    }
  };

  const applyThrottleAndCooldown = async () => {
    await waitWhilePaused();
    if (isAborted()) return;
    writeOpsCounter++;
    if (writeOpsCounter % profile.batchSize === 0) {
      onProgressUpdate(p => {
        p.phase = 'cooling_down';
        p.currentLabel = `☁️ 云酒馆防崩喘息冷却中 (${(profile.batchCooldownMs / 1000).toFixed(1)}s)...`;
      });
      appendLog(
        'info',
        `已连续处理 ${writeOpsCounter} 项，自动冷却 ${(profile.batchCooldownMs / 1000).toFixed(1)} 秒释放云端 I/O 与内存...`,
      );
      await sleep(profile.batchCooldownMs);
      onProgressUpdate(p => {
        p.phase = 'deleting';
      });
    } else {
      await sleep(profile.stepDelayMs);
    }
  };


  try {
    if (options.enableBackupBeforeDelete) {
      stepAdvance('正在生成并下载删前备份包...', 'backing_up');
      const res = await createAndDownloadBackup(
        plan,
        label => {
          onProgressUpdate(p => {
            p.currentLabel = label;
          });
        },
        options.compactBackupJson ?? true,
      );
      backupFilename = res.filename;
      appendLog('success', `已下载备份: ${res.filename} (${res.recordCount} 条记录)`);
      await sleep(220);
    }

    if (isAborted()) {
      appendLog('warn', '收到停止指令，在物理删除开始前已安全中止。');
      onProgressUpdate(p => {
        p.running = false;
        p.abortRequested = true;
        p.phase = 'aborted';
        p.currentLabel = '已在删除开始前安全中止';
      });
      return { successCount: 0, failCount: 0, aborted: true, backupFilename };
    }

    const deletingWbSet = new Set<string>();
    if (plan.moduleId === 'worldbook') plan.primaryDeletes.forEach(i => deletingWbSet.add(i.id));
    cascadeDeletes.forEach(c => {
      if (c.moduleId === 'worldbook') deletingWbSet.add(c.id);
    });

    if (deletingWbSet.size > 0) {
      const curGlobal = getGlobalWorldbookNames();
      const nextGlobal = curGlobal.filter(name => !deletingWbSet.has(name));
      if (nextGlobal.length !== curGlobal.length) {
        await rebindGlobalWorldbooks(nextGlobal);
        appendLog('info', `已从全局启用列表中解绑 ${curGlobal.length - nextGlobal.length} 本世界书`);
      }
    }

    const delCharIds = new Set(
      plan.moduleId === 'character' ? plan.primaryDeletes.map(i => i.id) : [],
    );
    const delCharNames = new Set(
      plan.moduleId === 'character' ? plan.primaryDeletes.map(i => i.name) : [],
    );

    for (const unbind of cascadeUnbinds) {
      await waitWhilePaused();
      if (isAborted()) break;
      stepAdvance(`解绑面具关联: ${unbind.name}`, 'unbinding');
      if (unbind.moduleId === 'persona') {
        try {
          await updatePersonaWith(
            unbind.id,
            persona => {
              if (Array.isArray(persona.connections)) {
                persona.connections = persona.connections.filter(conn => {
                  if (conn.type !== 'character') return true;
                  const cid = conn.id;
                  const cidPng = cid.endsWith('.png') ? cid : `${cid}.png`;
                  return !delCharIds.has(cid) && !delCharIds.has(cidPng) && !delCharNames.has(cid);
                });
              }
              return persona;
            },
            { render: 'none' },
          );
          appendLog('info', `已清理面具「${unbind.name}」的角色绑定记录`);
        } catch (err) {
          appendLog('warn', `解绑面具「${unbind.name}」警告: ${String(err)}`);
        }
      }
      await sleep(120);
    }

    for (const item of plan.primaryDeletes) {
      await waitWhilePaused();
      if (isAborted()) {
        appendLog('warn', '用户点击了安全停止，已跳过剩余未删除的主项目。');
        break;
      }

      stepAdvance(`正在删除: ${item.name}`, 'deleting');
      try {
        const ok = await executeWithRetry(
          () =>
            plan.moduleId === 'character'
              ? deleteCharacter(item.id, { delete_chats: options.cascadeOptions.deleteChats })
              : plan.moduleId === 'worldbook'
                ? deleteWorldbook(item.id)
                : deletePersona(item.id),
          profile.maxRetries,
          (attempt, err) => {
            appendLog(
              'warn',
              `删除「${item.name}」遇到网络波动，正在进行第 ${attempt} 次重试 (${String(err)})`,
            );
          },
        );
        if (ok) {
          successCount++;
          appendLog('success', `已删除 [${plan.moduleId}] ${item.name}`);
        } else {
          failCount++;
          appendLog('warn', `未删除 [${plan.moduleId}] ${item.name}`);
        }
      } catch (err) {
        failCount++;
        appendLog('error', `删除失败 [${plan.moduleId}] ${item.name}: ${String(err)}`);
      }
      await applyThrottleAndCooldown();
    }

    if (!isAborted()) {
      for (const cascade of cascadeDeletes) {
        await waitWhilePaused();
        if (isAborted()) {
          appendLog('warn', '用户点击了安全停止，已跳过剩余附属资产。');
          break;
        }
        stepAdvance(`连带删除: ${cascade.name}`, 'deleting');
        try {
          const ok = await executeWithRetry(
            () =>
              cascade.moduleId === 'worldbook'
                ? deleteWorldbook(cascade.id)
                : deletePersona(cascade.id),
            profile.maxRetries,
            attempt => {
              appendLog('warn', `连带清理「${cascade.name}」第 ${attempt} 次重试中...`);
            },
          );
          if (ok) {
            successCount++;
            appendLog('success', `已连带清理 [${cascade.moduleId}] ${cascade.name}`);
          } else {
            failCount++;
            appendLog('warn', `连带清理未生效 [${cascade.moduleId}] ${cascade.name}`);
          }
        } catch (err) {
          failCount++;
          appendLog('error', `连带清理失败 [${cascade.moduleId}] ${cascade.name}: ${String(err)}`);
        }
        await applyThrottleAndCooldown();
      }
    }

    stepAdvance('正在统一同步酒馆界面状态...', 'refreshing');
    try {
      if (plan.moduleId === 'character') await SillyTavern.getCharacters();
      if (deletingWbSet.size > 0) await SillyTavern.updateWorldInfoList();
      await SillyTavern.saveSettingsDebounced();
    } catch (err) {
      console.warn('[st-batch-cleaner] 刷新酒馆 UI 警告:', err);
    }

    const abortedNow = isAborted();
    onProgressUpdate(p => {
      p.running = false;
      p.abortRequested = abortedNow;
      p.phase = abortedNow ? 'aborted' : 'completed';
      p.currentStep = totalSteps;
      p.currentLabel = abortedNow
        ? `已安全停止：已完成 ${successCount} 项，失败 ${failCount} 项`
        : `清理完成：成功 ${successCount} 项，失败 ${failCount} 项`;
    });

    return { successCount, failCount, aborted: abortedNow, backupFilename };
  } catch (err) {
    appendLog('error', `清理异常中止: ${String(err)}`);
    onProgressUpdate(p => {
      p.running = false;
      p.phase = 'failed';
      p.currentLabel = `清理异常中止: ${String(err)}`;
    });
    throw err;
  }
}

