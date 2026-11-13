import type { CloudThrottlePresetId } from '../types/cleaner';

/**
 * 云酒馆防抖与节流执行配置项
 * 用于控制批量删除时的请求频率、分批喘息冷却、错误重试与大批量预警
 */
export interface CloudThrottleProfile {
  id: CloudThrottlePresetId;
  name: string;
  badge: string;
  description: string;
  /** 单次删除请求之间的基础间隔毫秒数 */
  stepDelayMs: number;
  /** 每连续删除多少项后触发一次分批冷却喘息 */
  batchSize: number;
  /** 分批冷却喘息毫秒数（让云端磁盘 I/O 与移动端内存 GC 回收完成） */
  batchCooldownMs: number;
  /** 网络波动或 502/429 时单条目的最大重试次数 */
  maxRetries: number;
  /** 建议单次清理安全上限（超过则在 Dry-Run 给出提示） */
  recommendedMaxItems: number;
}

export const CLOUD_THROTTLE_PROFILES: Record<CloudThrottlePresetId, CloudThrottleProfile> = {
  cloud_safe: {
    id: 'cloud_safe',
    name: '☁️ 云酒馆稳妥模式',
    badge: '默认推荐',
    description:
      '专为云酒馆容器与手机浏览器调优：单项间隔 380ms，每清理 8 项自动暂停 1.5s 释放后端 I/O 与内存，有效防止 502 崩溃与闪退。',
    stepDelayMs: 380,
    batchSize: 8,
    batchCooldownMs: 1500,
    maxRetries: 2,
    recommendedMaxItems: 50,
  },
  ultra_stable: {
    id: 'ultra_stable',
    name: '🛡️ 极限防崩护航模式',
    badge: '低配云端 / iOS 专用',
    description:
      '针对免费/低配云容器或 iOS Safari 大批量清理：单项间隔 700ms，每清理 5 项深度冷却 2.5s，最大程度杜绝闪退与网关限流。',
    stepDelayMs: 700,
    batchSize: 5,
    batchCooldownMs: 2500,
    maxRetries: 3,
    recommendedMaxItems: 30,
  },
  local_fast: {
    id: 'local_fast',
    name: '⚡ 本地 PC 极速模式',
    badge: '仅限本地电脑',
    description:
      '适用于本地部署（127.0.0.1）的高配电脑：单项间隔 120ms，每 15 项短冷却 600ms。云酒馆切勿开启此档位！',
    stepDelayMs: 120,
    batchSize: 15,
    batchCooldownMs: 600,
    maxRetries: 1,
    recommendedMaxItems: 120,
  },
};

export function getCloudThrottleProfile(id: CloudThrottlePresetId): CloudThrottleProfile {
  return CLOUD_THROTTLE_PROFILES[id] ?? CLOUD_THROTTLE_PROFILES.cloud_safe;
}
