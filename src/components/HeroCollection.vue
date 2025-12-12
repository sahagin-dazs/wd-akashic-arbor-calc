<script setup lang="ts">
import { computed, ref } from "vue";
import type { HeroDef, OwnedHero, Level, Rarity } from "../models/types";
import { NOT_OWNED_LEVEL_INDEX } from "../models/types";
import { avatarKey, avatarUrl } from "../utils/avatar";

type OwnershipFilter = "all" | "owned" | "not-owned" | "untracked" | "lineup";

const props = defineProps<{
  heroes: HeroDef[];
  owned: OwnedHero[];
  lineupHeroIds: Set<string>;
  levels: readonly Level[];
  lineupSize: number;
  searchValue: string;
  totalCount: number;
  shownCount: number;
  hasActiveFilters: boolean;
  hasSearch: boolean;
  ownershipFilter: OwnershipFilter;
}>();

const emit = defineEmits<{
  "update-owned": [heroId: string, levelIndex: number | null];
  "toggle-lineup": [heroId: string, shouldAdd: boolean];
  search: [value: string];
  "clear-search": [];
  "clear-filters": [];
  "update:ownershipFilter": [OwnershipFilter];
}>();

type LevelIconType = "star" | "moon" | "diamond" | "rainbow";

interface LevelToken {
  type: LevelIconType;
  count: number;
}

interface LevelOption {
  value: number;
  label: string;
  shorthand: string;
  tokens: LevelToken[];
}

const ICON_CLASS_MAP: Record<LevelIconType, string> = {
  star: "fa-solid fa-star level-icon-star",
  moon: "fa-solid fa-moon level-icon-moon",
  diamond: "fa-solid fa-gem level-icon-diamond",
  rainbow: "fa-solid fa-gem level-icon-rainbow"
};

const ROLE_META = {
  Ranger: { icon: "fa-solid fa-person-rifle", color: "#38bdf8" },
  Fighter: { icon: "fa-solid fa-hand-fist", color: "#fcd34d" },
  Support: { icon: "fa-solid fa-heart", color: "#22c55e" },
  Mage: { icon: "fa-solid fa-wand-magic-sparkles", color: "#c084fc" }
} as const;

const ELEMENT_META = {
  Fire: { icon: "fa-solid fa-fire", color: "#ef4444" },
  Ice: { icon: "fa-solid fa-snowflake", color: "#60a5fa" },
  Wind: { icon: "fa-solid fa-wind", color: "#34d399" },
  Electro: { icon: "fa-solid fa-bolt", color: "#facc15" },
  Xeno: { icon: "fa-solid fa-star-of-david", color: "#22d3ee" }
} as const;

const avatarLoadFailures = ref<Record<string, boolean>>({});

const levelOptions = computed<LevelOption[]>(() =>
  props.levels.map((level, idx) => buildLevelOption(level, idx))
);

const levelOptionMap = computed(() => {
  const map = new Map<number, LevelOption>();
  levelOptions.value.forEach((option) => {
    map.set(option.value, option);
  });
  return map;
});

const zeroStarIndex = computed(() =>
  props.levels.findIndex((level) => level === "0S")
);

const completedCount = computed(() =>
  props.owned.filter((owned) => owned.levelIndex !== null).length
);

const untrackedCount = computed(() =>
  props.owned.filter((owned) => owned.levelIndex === null).length
);

const hasUntracked = computed(() => untrackedCount.value > 0);

function buildLevelOption(level: Level, index: number): LevelOption {
  return {
    value: index,
    label: describeLevel(level),
    shorthand: buildShorthand(level),
    tokens: tokenizeLevel(level)
  };
}

function describeLevel(level: Level) {
  if (level === "RD") return "Rainbow Diamond";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") {
    if (count === 0) return "No Stars";
    return `${count} ${count === 1 ? "Star" : "Stars"}`;
  }
  if (suffix === "M") {
    return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  }
  if (suffix === "D") {
    return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  }
  return level;
}

function buildShorthand(level: Level) {
  if (level === "RD") return "Rainbow Diamond";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") {
    return count > 0 ? "*".repeat(count) : "No Stars";
  }
  if (suffix === "M") {
    return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  }
  if (suffix === "D") {
    return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  }
  return level;
}

function tokenizeLevel(level: Level): LevelToken[] {
  if (level === "RD") {
    return [{ type: "rainbow", count: 1 }];
  }
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (count <= 0) return [];
  if (suffix === "S") return [{ type: "star", count }];
  if (suffix === "M") return [{ type: "moon", count }];
  if (suffix === "D") return [{ type: "diamond", count }];
  return [];
}

function optionText(option: LevelOption) {
  return option.label;
}

function getOwned(heroId: string): OwnedHero | undefined {
  return props.owned.find((o) => o.heroId === heroId);
}

function getLevelIndex(heroId: string) {
  return getOwned(heroId)?.levelIndex ?? null;
}

function getLevelOptionByIndex(levelIndex: number): LevelOption | null {
  return levelOptionMap.value.get(levelIndex) ?? null;
}

function getLevelVisual(heroId: string) {
  const levelIndex = getLevelIndex(heroId);
  if (levelIndex == null) {
    return { label: "Level not tracked", tokens: [] as LevelToken[] };
  }
  if (levelIndex === NOT_OWNED_LEVEL_INDEX) {
    return { label: "Not Owned", tokens: [] as LevelToken[] };
  }
  const option = getLevelOptionByIndex(levelIndex);
  if (!option) {
    return { label: "Select star level", tokens: [] as LevelToken[] };
  }
  return option;
}

function getSelectValue(heroId: string) {
  const levelIndex = getLevelIndex(heroId);
  if (levelIndex == null) return "";
  return String(levelIndex);
}

function isBaseHero(hero: HeroDef) {
  return hero.rarity === "Epic" || hero.rarity === "Common";
}

function heroLevelOptions(hero: HeroDef): LevelOption[] {
  if (isBaseHero(hero)) {
    const idx = zeroStarIndex.value;
    if (idx >= 0) {
      const option = levelOptionMap.value.get(idx);
      return option ? [option] : [];
    }
    return [];
  }
  return levelOptions.value;
}

function firstLevelValue(hero: HeroDef) {
  const options = heroLevelOptions(hero);
  return options.length ? options[0].value : null;
}

function lastLevelValue(hero: HeroDef) {
  const options = heroLevelOptions(hero);
  return options.length ? options[options.length - 1].value : null;
}

function onLevelSelect(heroId: string, value: string) {
  if (value === "") {
    emit("update-owned", heroId, null);
    return;
  }
  const parsed = Number(value);
  emit("update-owned", heroId, Number.isNaN(parsed) ? null : parsed);
}

function nextLevelIndex(
  hero: HeroDef,
  currentIndex: number | null,
  delta: number
) {
  const options = heroLevelOptions(hero);
  if (!options.length) return currentIndex;
  const indexes = options.map((opt) => opt.value);
  const currentPos = currentIndex != null ? indexes.indexOf(currentIndex) : -1;
  const nextPos = Math.min(
    indexes.length - 1,
    Math.max(0, currentPos + delta)
  );
  return indexes[nextPos];
}

function adjustLevel(hero: HeroDef, delta: number) {
  const current = getLevelIndex(hero.id);
  const nextIndex = nextLevelIndex(hero, current, delta);
  if (typeof nextIndex === "number") {
    emit("update-owned", hero.id, nextIndex);
  }
}

function onLineupToggle(heroId: string, checked: boolean) {
  emit("toggle-lineup", heroId, checked);
}

function rarityClass(rarity: Rarity) {
  if (rarity === "Sublime") return "badge badge-sublime";
  if (rarity === "Mythic") return "badge badge-mythic";
  if (rarity === "Legendary") return "badge badge-legendary";
  if (rarity === "Epic") return "badge badge-rare";
  return "badge";
}

function iconClass(type: LevelIconType) {
  return ICON_CLASS_MAP[type];
}

function isHeroInLineup(heroId: string) {
  return props.lineupHeroIds.has(heroId);
}

function isLineupFull() {
  return props.lineupHeroIds.size >= props.lineupSize;
}

function lineupToggleDisabled(heroId: string) {
  const status = getOwnershipStatus(heroId);
  if (status !== "owned") return true;
  if (isHeroInLineup(heroId)) return false;
  return isLineupFull();
}

type OwnershipStatus = "owned" | "not-owned" | "unassigned";

function getOwnershipStatus(heroId: string): OwnershipStatus {
  const levelIndex = getLevelIndex(heroId);
  if (levelIndex == null) return "unassigned";
  return levelIndex >= 0 ? "owned" : "not-owned";
}

function heroCardClasses(hero: HeroDef) {
  const status = getOwnershipStatus(hero.id);
  return [
    "hero-card",
    `rarity-${hero.rarity.toLowerCase()}`,
    {
      "is-not-owned": status === "not-owned",
      "is-unassigned": status === "unassigned"
    }
  ];
}

function lineupHint(heroId: string) {
  const status = getOwnershipStatus(heroId);
  if (status === "unassigned") return "Select a level first";
  if (status === "not-owned") return "Not owned";
  return "Lineup full";
}

function roleMeta(role: HeroDef["role"]) {
  return ROLE_META[role];
}

function elementMeta(element: HeroDef["element"]) {
  return ELEMENT_META[element];
}

function heroAvatarKey(hero: HeroDef) {
  return avatarKey(hero.id, hero.name);
}

function heroAvatarUrl(hero: HeroDef) {
  return avatarUrl(hero.id, hero.name);
}

function isHeroUntracked(heroId: string) {
  return getLevelIndex(heroId) === null;
}

function showAvatarImage(hero: HeroDef) {
  const key = heroAvatarKey(hero);
  if (!key) return false;
  return !avatarLoadFailures.value[key];
}

function onAvatarError(hero: HeroDef) {
  const key = heroAvatarKey(hero);
  if (!key) return;
  avatarLoadFailures.value = {
    ...avatarLoadFailures.value,
    [key]: true
  };
}

function onOwnershipFilterChange(filter: OwnershipFilter) {
  emit("update:ownershipFilter", filter);
}
</script>

<template>
  <div class="collection-toolbar">
    <div class="collection-summary">
      <span>Showing <strong>{{ shownCount }}</strong> of {{ totalCount }} heroes</span>
      <span class="collection-progress">
        Tracked <strong>{{ completedCount }}</strong>/{{ totalCount }}
      </span>
      <span v-if="hasUntracked" class="collection-untracked">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        {{ untrackedCount }} untracked
      </span>
      <div class="collection-actions" v-if="hasSearch || hasActiveFilters">
        <button
          class="link-btn"
          type="button"
          v-if="hasSearch"
          @click="emit('clear-search')"
        >
          Clear search
        </button>
        <button
          class="link-btn"
          type="button"
          v-if="hasActiveFilters"
          @click="emit('clear-filters')"
        >
          Clear filters
        </button>
      </div>
    </div>
    <label class="collection-search">
      <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <input
        type="text"
        :value="searchValue"
        placeholder="Search name, abbreviation, role, element, rarity, or level..."
        @input="emit('search', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </div>
  <div v-if="hasUntracked" class="collection-warning">
    <div class="warning-text">
      <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
      <span>
        {{ untrackedCount }} hero<span v-if="untrackedCount !== 1">es</span> still need star levels.
      </span>
    </div>
    <button
      type="button"
      class="link-btn"
      @click="onOwnershipFilterChange('untracked')"
    >
      Show untracked heroes
    </button>
  </div>
  <div class="ownership-filter">
    <span class="ownership-filter-label">Filter Heroes</span>
    <div class="ownership-filter-buttons">
      <button
        type="button"
        :class="['ownership-chip', { active: ownershipFilter === 'all' }]"
        data-rarity="All"
        @click="onOwnershipFilterChange('all')"
      >
        All
      </button>
      <button
        type="button"
        :class="['ownership-chip', { active: ownershipFilter === 'owned' }]"
        data-rarity="Owned"
        @click="onOwnershipFilterChange('owned')"
      >
        Owned
      </button>
      <button
        type="button"
        :class="['ownership-chip', { active: ownershipFilter === 'lineup' }]"
        data-rarity="Lineup"
        @click="onOwnershipFilterChange('lineup')"
      >
        In Lineup
      </button>
      <button
        type="button"
        v-if="hasUntracked"
        :class="['ownership-chip', { active: ownershipFilter === 'untracked' }]"
        data-rarity="Untracked"
        @click="onOwnershipFilterChange('untracked')"
      >
        Untracked
      </button>
      <button
        type="button"
        :class="['ownership-chip', { active: ownershipFilter === 'not-owned' }]"
        data-rarity="NotOwned"
        @click="onOwnershipFilterChange('not-owned')"
      >
        Not Owned
      </button>
    </div>
  </div>
  <div v-if="heroes.length" class="hero-grid">
    <div
      v-for="hero in heroes"
      :key="hero.id"
      :class="heroCardClasses(hero)"
    >
      <div v-if="isHeroUntracked(hero.id)" class="untracked-flag">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
        Level not tracked
      </div>
      <div class="hero-header">
        <div class="hero-avatar-sm">
          <img
            v-if="showAvatarImage(hero)"
            :src="heroAvatarUrl(hero)"
            :alt="hero.name"
            width="50"
            height="50"
            @error="onAvatarError(hero)"
          />
          <span v-else>{{ hero.id }}</span>
        </div>
        <div class="hero-title-row">
          <div class="hero-name">{{ hero.name }}</div>
          <div class="hero-meta-tags">
            <span class="meta-pill">
              <i
                :class="roleMeta(hero.role).icon"
                :style="{ color: roleMeta(hero.role).color }"
                aria-hidden="true"
              ></i>
              <span>{{ hero.role }}</span>
            </span>
            <span class="meta-pill">
              <i
                :class="elementMeta(hero.element).icon"
                :style="{ color: elementMeta(hero.element).color }"
                aria-hidden="true"
              ></i>
              <span>{{ hero.element }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="hero-tags">
        <span :class="rarityClass(hero.rarity)">{{ hero.rarity }}</span>
        <span
          class="badge"
          v-if="lineupHeroIds.has(hero.id)"
        >
          In lineup
        </span>
      </div>
      <label class="lineup-toggle" :class="{ 'in-lineup': isHeroInLineup(hero.id) }">
        <input
          type="checkbox"
          :checked="isHeroInLineup(hero.id)"
          :disabled="lineupToggleDisabled(hero.id)"
          @change="onLineupToggle(hero.id, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ isHeroInLineup(hero.id) ? "In lineup" : "Add to lineup" }}</span>
        <span v-if="lineupToggleDisabled(hero.id) && !isHeroInLineup(hero.id)" class="toggle-hint">
          {{ lineupHint(hero.id) }}
        </span>
      </label>
        <div class="level-control-row">
          <div class="level-adjust-row">
          <button
            type="button"
            class="stepper-btn stepper-btn-sm"
            @click="adjustLevel(hero, -1)"
            :disabled="getLevelIndex(hero.id) === firstLevelValue(hero)"
            aria-label="Decrease hero level"
          >
            <i class="fa-solid fa-minus" aria-hidden="true"></i>
          </button>
          <div class="level-visual-shell">
            <span class="level-status-label">
              {{ isHeroUntracked(hero.id) ? "Level not tracked" : "Star Level" }}
            </span>
            <div
              class="level-visual"
              :aria-label="getLevelVisual(hero.id).label"
            >
            <template v-if="getLevelVisual(hero.id).tokens.length">
              <template
                v-for="token in getLevelVisual(hero.id).tokens"
                :key="`${hero.id}-${token.type}`"
              >
                <i
                  v-for="countIndex in token.count"
                  :key="`${hero.id}-${token.type}-${countIndex}`"
                  class="level-icon"
                  :class="iconClass(token.type)"
                  aria-hidden="true"
                ></i>
              </template>
            </template>
              <span v-else class="level-placeholder">
                {{ getLevelVisual(hero.id).label }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="stepper-btn stepper-btn-sm"
            @click="adjustLevel(hero, 1)"
            :disabled="getLevelIndex(hero.id) === lastLevelValue(hero)"
            aria-label="Increase hero level"
          >
            <i class="fa-solid fa-plus" aria-hidden="true"></i>
          </button>
        </div>
        <select
          class="level-select"
          :value="getSelectValue(hero.id)"
          @change="onLevelSelect(hero.id, ($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled hidden>
            Select star level
          </option>
          <option :value="String(NOT_OWNED_LEVEL_INDEX)">
            Not Owned
          </option>
          <option
            v-for="option in heroLevelOptions(hero)"
            :key="option.value"
            :value="String(option.value)"
          >
            {{ optionText(option) }}
          </option>
        </select>
      </div>
    </div>
  </div>
  <p v-else class="hero-empty">
    No heroes match your current filters.
  </p>
</template>
