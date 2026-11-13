<template>
  <div class="sbc-surface-muted rounded-xl border px-3.5 py-2.5 text-xs">
    <!-- 顶部折叠/展开头：在手机端可收起以节省纵向视口空间 -->
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button
        type="button"
        class="flex items-center gap-1.5 font-bold"
        style="color: var(--sbc-accent)"
        @click="isExpanded = !isExpanded"
      >
        <SvgIcon name="link" :size="15" />
        <span>角色卡专属联动清理策略（三角依赖防护）</span>
        <span class="sbc-badge-primary ml-1 rounded px-1.5 py-0.5 text-[10px]">
          {{ isExpanded ? '点击收起' : '点击展开配置' }}
        </span>
      </button>

      <label
        class="sbc-badge-amber flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition"
      >
        <input
          v-model="settingsStore.settings.protectFavoriteCharacters"
          type="checkbox"
          class="size-3.5 accent-amber-500"
        />
        <SvgIcon name="star" :size="13" filled />
        <span>保护已收藏角色</span>
      </label>
    </div>

    <div v-if="isExpanded" class="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-3">
      <!-- 联动世界书 -->
      <div class="sbc-surface-elevated flex flex-col gap-1.5 rounded-lg border p-2.5">
        <label class="flex cursor-pointer items-center gap-2 font-bold">
          <input
            v-model="settingsStore.settings.characterCascade.deleteLinkedWorldbooks"
            type="checkbox"
            class="size-3.5 accent-indigo-600"
          />
          <SvgIcon name="worldbook" :size="15" style="color: var(--sbc-accent)" />
          <span>连带删除绑定世界书</span>
        </label>
        <label
          v-if="settingsStore.settings.characterCascade.deleteLinkedWorldbooks"
          class="ml-5 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium"
          style="color: var(--sbc-emerald-text)"
        >
          <input
            v-model="settingsStore.settings.characterCascade.protectSharedWorldbooks"
            type="checkbox"
            class="size-3 accent-emerald-600"
          />
          <SvgIcon name="shield" :size="12" />
          <span>智能保护被其他存活角色/全局共用的世界书</span>
        </label>
        <p v-else class="ml-5 text-[11px]" style="color: var(--sbc-text-muted)">
          不勾选时仅删除角色卡本体，保留主世界书与附加世界书
        </p>
      </div>

      <!-- 联动面具 -->
      <div class="sbc-surface-elevated flex flex-col gap-1.5 rounded-lg border p-2.5">
        <label class="flex cursor-pointer items-center gap-2 font-bold">
          <input
            v-model="settingsStore.settings.characterCascade.deleteLinkedPersonas"
            type="checkbox"
            class="size-3.5 accent-indigo-600"
          />
          <SvgIcon name="persona" :size="15" style="color: var(--sbc-amber-text)" />
          <span>连带删除专属用户面具</span>
        </label>
        <label
          v-if="settingsStore.settings.characterCascade.deleteLinkedPersonas"
          class="ml-5 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium"
          style="color: var(--sbc-emerald-text)"
        >
          <input
            v-model="settingsStore.settings.characterCascade.protectSharedPersonas"
            type="checkbox"
            class="size-3 accent-emerald-600"
          />
          <SvgIcon name="shield" :size="12" />
          <span>保护默认/多角色共用面具（仅解绑不删）</span>
        </label>
        <p v-else class="ml-5 text-[11px]" style="color: var(--sbc-text-muted)">
          不删面具，但会自动清理面具内指向已删角色的残留死链
        </p>
      </div>

      <!-- 联动聊天记录 -->
      <div class="sbc-surface-elevated flex flex-col gap-1.5 rounded-lg border p-2.5">
        <label class="flex cursor-pointer items-center gap-2 font-bold">
          <input
            v-model="settingsStore.settings.characterCascade.deleteChats"
            type="checkbox"
            class="size-3.5 accent-indigo-600"
          />
          <SvgIcon name="chat" :size="15" style="color: var(--sbc-accent)" />
          <span>连带清理全部聊天历史文件</span>
        </label>
        <p class="ml-5 text-[11px]" style="color: var(--sbc-text-muted)">
          {{
            settingsStore.settings.characterCascade.deleteChats
              ? '彻底删除该角色卡名下的所有历史聊天记录 (.jsonl)'
              : '保留磁盘上的历史聊天记录文件，仅移除角色卡'
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { detectPlatform } from '../../core/platform';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const settingsStore = useSettingsStore();
const platform = detectPlatform();
// 手机端默认收起二级联动详情以留出更大卡片列表视野，点击可随时展开
const isExpanded = ref(!platform.isMobileViewport);
</script>

