<template>
  <section class="sbc-cascade-bar">
    <!-- 紧凑单行策略概览：点击芯片即可直接切换开关，也可展开高级保护细项 -->
    <div class="sbc-cascade-summary">
      <div class="sbc-cascade-chips">
        <span style="display: inline-flex; align-items: center; gap: 5px; font-weight: 700; color: var(--sbc-text-primary); margin-right: 4px">
          <SvgIcon name="shield" :size="14" style="color: var(--sbc-accent)" />
          <span>角色清理联动策略:</span>
        </span>

        <!-- 收藏保护开关芯片 -->
        <button
          type="button"
          class="sbc-policy-chip"
          :class="{ 'is-gold': settingsStore.settings.protectFavoriteCharacters }"
          title="点击切换：是否锁定并跳过已收藏角色卡"
          @click="
            settingsStore.settings.protectFavoriteCharacters =
              !settingsStore.settings.protectFavoriteCharacters
          "
        >
          <SvgIcon
            name="star"
            :size="12"
            :filled="settingsStore.settings.protectFavoriteCharacters"
          />
          <span>
            收藏防误删: {{ settingsStore.settings.protectFavoriteCharacters ? '已开启' : '已关闭' }}
          </span>
        </button>

        <!-- 连带删除世界书开关芯片 -->
        <button
          type="button"
          class="sbc-policy-chip"
          :class="{ 'is-on': cascade.deleteLinkedWorldbooks }"
          title="点击切换：删除角色卡时是否连带删除专属世界书"
          @click="cascade.deleteLinkedWorldbooks = !cascade.deleteLinkedWorldbooks"
        >
          <SvgIcon name="worldbook" :size="12" />
          <span>连带删世界书: {{ cascade.deleteLinkedWorldbooks ? '开启' : '关闭' }}</span>
        </button>

        <!-- 连带删除面具开关芯片 -->
        <button
          type="button"
          class="sbc-policy-chip"
          :class="{ 'is-on': cascade.deleteLinkedPersonas }"
          title="点击切换：删除角色卡时是否连带处理关联面具"
          @click="cascade.deleteLinkedPersonas = !cascade.deleteLinkedPersonas"
        >
          <SvgIcon name="persona" :size="12" />
          <span>连带删面具: {{ cascade.deleteLinkedPersonas ? '开启' : '仅解绑' }}</span>
        </button>

        <!-- 连带删除聊天记录开关芯片 -->
        <button
          type="button"
          class="sbc-policy-chip"
          :class="{ 'is-on': cascade.deleteChats }"
          title="点击切换：删除角色卡时是否连带清除历史聊天文件"
          @click="cascade.deleteChats = !cascade.deleteChats"
        >
          <SvgIcon name="chat" :size="12" />
          <span>连带删聊天: {{ cascade.deleteChats ? '开启' : '保留' }}</span>
        </button>
      </div>

      <button
        type="button"
        class="sbc-btn sbc-btn-secondary"
        style="padding: 4px 10px; font-size: 11.5px"
        @click="expanded = !expanded"
      >
        <span>{{ expanded ? '收起细项' : '展开智能保护设置' }}</span>
        <SvgIcon :name="expanded ? 'chevron_up' : 'chevron_down'" :size="13" />
      </button>
    </div>

    <!-- 展开后的三列智能保护详情卡片 -->
    <div v-if="expanded" class="sbc-cascade-grid">
      <div class="sbc-cascade-card">
        <label class="sbc-check-label">
          <input v-model="cascade.deleteLinkedWorldbooks" type="checkbox" />
          <div>
            <div style="font-weight: 700">连带删除绑定的主/附加世界书</div>
            <div style="font-size: 11px; color: var(--sbc-text-muted)">
              自动扫描角色卡绑定的 Primary 与 Additional Lorebooks
            </div>
          </div>
        </label>
        <label
          v-if="cascade.deleteLinkedWorldbooks"
          class="sbc-check-label"
          style="padding-left: 22px; color: var(--sbc-emerald-text)"
        >
          <input v-model="cascade.protectSharedWorldbooks" type="checkbox" />
          <span>智能保护：被其他未删角色、全局或面具共用的世界书自动跳过不删</span>
        </label>
      </div>

      <div class="sbc-cascade-card">
        <label class="sbc-check-label">
          <input v-model="cascade.deleteLinkedPersonas" type="checkbox" />
          <div>
            <div style="font-weight: 700">连带删除专属关联面具 (Persona)</div>
            <div style="font-size: 11px; color: var(--sbc-text-muted)">
              未开启时也会自动清理存活面具里的失效角色绑定记录
            </div>
          </div>
        </label>
        <label
          v-if="cascade.deleteLinkedPersonas"
          class="sbc-check-label"
          style="padding-left: 22px; color: var(--sbc-emerald-text)"
        >
          <input v-model="cascade.protectSharedPersonas" type="checkbox" />
          <span>智能保护：默认面具、当前佩戴面具或多角色共用面具仅解绑不删除</span>
        </label>
      </div>

      <div class="sbc-cascade-card">
        <label class="sbc-check-label">
          <input v-model="cascade.deleteChats" type="checkbox" />
          <div>
            <div style="font-weight: 700">同时彻底删除历史聊天记录文件</div>
            <div style="font-size: 11px; color: var(--sbc-text-muted)">
              一并清理该角色卡名下的全部 .jsonl 聊天存档，释放云端存储空间
            </div>
          </div>
        </label>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useSettingsStore } from '../../stores/settings.store';
import SvgIcon from '../icons/SvgIcon.vue';

const settingsStore = useSettingsStore();
const cascade = toRef(settingsStore.settings, 'characterCascade');

// 默认折叠，最大化下方资产列表可视面积
const expanded = ref(false);
</script>
