<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  HeroDef,
  Lineup,
  OptimizationResult,
  NodeKey,
  OwnedHero
} from "../models/types";
import { HERO_MAP } from "../models/heroes";
import { LEVELS } from "../models/types";
import { avatarUrl } from "../utils/avatar";
import {
  NODE_TREE_LAYOUT,
  nodeKeyId,
  formatNodeLabel,
  getNodeStatuses
} from "../models/nodeConfig";

const props = defineProps<{
  result: OptimizationResult;
  lineup: Lineup;
  heroes: HeroDef[];
  owned: OwnedHero[];
  nightmareLevel: number;
}>();

function formatPercent(val: number | undefined) {
  if (!val || val <= 0) return "0.00%";
  const formatted = `${(val * 100).toFixed(2)}%`;
  return val > 0 ? `+${formatted}` : formatted;
}

function getOwned(heroId: string) {
  return props.owned.find((o) => o.heroId === heroId);
}

function getLevel(heroId: string) {
  const owned = getOwned(heroId);
  if (!owned || owned.levelIndex == null || owned.levelIndex < 0) return null;
  return LEVELS[owned.levelIndex] ?? null;
}

function getBasePercent(heroId: string) {
  const hero = HERO_MAP.get(heroId);
  const level = getLevel(heroId);
  if (!hero || !level) return 0;
  const val = hero.percents[level];
  return val ? val / 100 : 0;
}

const avatarLoadFailures = ref<Record<string, boolean>>({});

function heroAvatar(heroId: string) {
  const hero = HERO_MAP.get(heroId);
  return avatarUrl(heroId, hero?.name ?? heroId);
}

function canShowAvatar(heroId: string) {
  return !avatarLoadFailures.value[heroId];
}

function onAvatarError(heroId: string) {
  avatarLoadFailures.value = {
    ...avatarLoadFailures.value,
    [heroId]: true
  };
}

function avatarFallback(heroId: string) {
  const hero = HERO_MAP.get(heroId);
  return hero?.id ?? heroId;
}

function matchBonus(base: number) {
  return base * 3;
}

function otherBonus(base: number) {
  return base;
}

function levelLabel(heroId: string) {
  const level = getLevel(heroId);
  if (!level) return "Not Owned";
  if (level === "RD") return "Rainbow Diamond";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") return `${count} ${count === 1 ? "Star" : "Stars"}`;
  if (suffix === "M") return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  if (suffix === "D") return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  return level;
}

interface NodeSummary {
  node: NodeKey;
  heroes: Array<{
    heroId: string;
    matchBonus: number;
    otherBonus: number;
  }>;
  matchTotal: number;
  otherTotal: number;
}

function createEmptySummary(node: NodeKey): NodeSummary {
  return {
    node,
    heroes: [],
    matchTotal: 0,
    otherTotal: 0
  };
}

const nodeSummaries = computed(() => {
  const summaryMap = new Map<string, NodeSummary>();
  NODE_TREE_LAYOUT.flat().forEach((node) => {
    summaryMap.set(nodeKeyId(node), createEmptySummary(node));
  });

  for (const assign of props.result.assignments) {
    const key = nodeKeyId(assign.node);
    if (!summaryMap.has(key)) {
      summaryMap.set(key, createEmptySummary(assign.node));
    }
    const entry = summaryMap.get(key)!;
    const base = getBasePercent(assign.heroId);
    const match = matchBonus(base);
    const other = otherBonus(base);
    entry.heroes.push({
      heroId: assign.heroId,
      matchBonus: match,
      otherBonus: other
    });
    entry.matchTotal += match;
    entry.otherTotal += other;
  }

  return summaryMap;
});

function getNodeSummary(node: NodeKey): NodeSummary {
  return nodeSummaries.value.get(nodeKeyId(node)) ?? createEmptySummary(node);
}

const nodeStatusMap = computed(() => {
  const map = new Map<string, ReturnType<typeof getNodeStatuses>[number]>();
  getNodeStatuses(props.nightmareLevel).forEach((status) => {
    map.set(nodeKeyId(status.key), status);
  });
  return map;
});

function getNodeStatus(node: NodeKey) {
  return nodeStatusMap.value.get(nodeKeyId(node));
}

function heroName(heroId: string) {
  return HERO_MAP.get(heroId)?.name ?? heroId;
}

function lineupBuff(heroId: string) {
  return formatPercent(props.result.buffPerHero[heroId] ?? 0);
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: "#ef4444",
  Ice: "#60a5fa",
  Electric: "#facc15",
  Wind: "#34d399",
  Xeno: "linear-gradient(135deg, #22d3ee, #c084fc)"
};

const ROLE_COLORS: Record<string, string> = {
  Fighter: "#fbbf24",
  Mage: "#c084fc",
  Ranger: "#38bdf8",
  Support: "#22c55e"
};

function nodeColor(node: NodeKey) {
  if (node.type === "Element") {
    return ELEMENT_COLORS[node.value] ?? "#94a3b8";
  }
  return ROLE_COLORS[node.value] ?? "#94a3b8";
}

function nodeStyle(node: NodeKey) {
  const color = nodeColor(node);
  if (color.includes("gradient")) {
    return {
      borderColor: "transparent",
      borderWidth: "2px",
      backgroundImage: `linear-gradient(150deg, #0b1220, #050816), ${color}`,
      backgroundOrigin: "border-box",
      backgroundClip: "padding-box, border-box",
      boxShadow: "0 0 14px rgba(34, 211, 238, 0.35)"
    };
  }
  return {
    borderColor: color,
    borderWidth: "2px",
    boxShadow: `0 0 12px ${color}40`
  };
}

function bonusLabel(node: NodeKey) {
  return `${formatNodeLabel(node)} Hero Bonus`;
}

function unlockedPlaceholders(node: NodeKey) {
  const summary = getNodeSummary(node);
  const status = getNodeStatus(node);
  const unlocked = status?.unlocked ?? 0;
  return Math.max(unlocked - summary.heroes.length, 0);
}

function lockedPlaceholders(node: NodeKey) {
  const status = getNodeStatus(node);
  const unlocked = status?.unlocked ?? 0;
  return Math.max(3 - unlocked, 0);
}

function nextUnlockLabel(node: NodeKey) {
  const status = getNodeStatus(node);
  return status?.nextUnlock != null ? `Unlocks at Nightmare ${status.nextUnlock}` : "All slots unlocked";
}
</script>

<template>
  <div class="results-panel">
    <div class="buff-list">
      <div class="panel-title">
        Lineup Buff Summary
      </div>
      <div class="buff-row highlight">
        <span>Total priority buff</span>
        <span class="totals-value totals-large">
          {{ formatPercent(result.totalPriorityBuff) }}
        </span>
      </div>
      <div class="buff-row note">
        All increases apply equally to ATK%, HP%, and DEF%.
      </div>
      <div class="lineup-mini-grid">
        <div
          v-for="(slot, idx) in lineup.slots"
          :key="idx"
          class="lineup-mini-card"
        >
          <template v-if="slot.heroId">
            <div class="lineup-mini-avatar">
              <img
                v-if="canShowAvatar(slot.heroId)"
                :src="heroAvatar(slot.heroId)"
                :alt="heroName(slot.heroId)"
                width="48"
                height="48"
                @error="onAvatarError(slot.heroId)"
              />
              <span v-else>{{ avatarFallback(slot.heroId) }}</span>
            </div>
            <div class="lineup-mini-info">
              <div class="lineup-mini-name">
                {{ heroName(slot.heroId) }}
              </div>
              <div class="lineup-mini-buff">
                {{ lineupBuff(slot.heroId) }}
              </div>
            </div>
            <span v-if="slot.isPriority" class="priority-tag">Priority</span>
          </template>
          <template v-else>
            <div class="lineup-mini-empty">Empty slot</div>
          </template>
        </div>
      </div>
    </div>

    <div class="results-tree-panel">
      <div class="node-tree">
        <div
          v-for="(tier, tierIdx) in NODE_TREE_LAYOUT"
          :key="tierIdx"
          :class="['node-tier', tier.length === 1 ? 'single-tier' : 'dual-tier']"
        >
          <div
            v-for="node in tier"
            :key="nodeKeyId(node)"
            class="node-status-card result-card"
            :style="nodeStyle(node)"
          >
            <div class="node-status-header">
              {{ formatNodeLabel(node) }}
            </div>
            <div class="node-result-totals">
              <div>
                <span class="totals-label">{{ bonusLabel(node) }}</span>
                <span class="totals-value">
                  {{ formatPercent(getNodeSummary(node).matchTotal) }}
                </span>
              </div>
              <div>
                <span class="totals-label">All Heroes Bonus</span>
                <span class="totals-value">
                  {{ formatPercent(getNodeSummary(node).otherTotal) }}
                </span>
              </div>
            </div>
            <div class="node-result-heroes">
              <div
                v-for="hero in getNodeSummary(node).heroes"
                :key="hero.heroId"
                class="node-hero-row"
              >
                <div class="node-hero-avatar">
                  <img
                    v-if="canShowAvatar(hero.heroId)"
                    :src="heroAvatar(hero.heroId)"
                    :alt="heroName(hero.heroId)"
                    width="36"
                    height="36"
                    @error="onAvatarError(hero.heroId)"
                  />
                  <span v-else>{{ avatarFallback(hero.heroId) }}</span>
                </div>
                <div class="node-hero-info">
                  <div class="node-hero-name">
                    {{ heroName(hero.heroId) }}
                  </div>
                  <div class="node-hero-level">
                    {{ levelLabel(hero.heroId) }}
                  </div>
                </div>
                <div class="node-hero-buffs">
                  <span class="buff-chip match">
                    {{ bonusLabel(node) }} {{ formatPercent(hero.matchBonus) }}
                  </span>
                  <span class="buff-chip other">
                    All Heroes {{ formatPercent(hero.otherBonus) }}
                  </span>
                </div>
              </div>
              <div
                v-for="idx in unlockedPlaceholders(node)"
                :key="`empty-${nodeKeyId(node)}-${idx}`"
                class="node-hero-row placeholder"
              >
                <div class="node-hero-avatar placeholder-avatar">
                  <i class="fa-regular fa-circle-user" aria-hidden="true"></i>
                </div>
                <div class="node-hero-info">
                  <div class="node-hero-name">Empty slot</div>
                  <div class="node-hero-level">
                    Assign a hero to boost {{ formatNodeLabel(node) }} bonuses.
                  </div>
                </div>
              </div>
              <div
                v-for="idx in lockedPlaceholders(node)"
                :key="`locked-${nodeKeyId(node)}-${idx}`"
                class="node-hero-row placeholder locked"
              >
                <div class="node-hero-avatar placeholder-avatar">
                  <i class="fa-solid fa-lock" aria-hidden="true"></i>
                </div>
                <div class="node-hero-info">
                  <div class="node-hero-name">Locked slot</div>
                  <div class="node-hero-level">
                    {{ nextUnlockLabel(node) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
