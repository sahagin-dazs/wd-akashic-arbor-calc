<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { HeroDef, Lineup, OwnedHero, Level } from "../models/types";
import { HERO_MAP } from "../models/heroes";
import { LEVELS } from "../models/types";
import { avatarKey, avatarUrl } from "../utils/avatar";

const props = defineProps<{
  heroes: HeroDef[];
  lineup: Lineup;
  owned: OwnedHero[];
  untrackedCount?: number;
}>();

const emit = defineEmits<{
  "set-rank": [slotIndex: number, rank: number | null];
  "clear-slot": [slotIndex: number];
  "clear-all": [];
  "set-hero": [slotIndex: number, heroId: string];
}>();

const ELEMENT_BACKGROUNDS: Record<
  string,
  { background: string; border: string }
> = {
  Fire: {
    background: "linear-gradient(145deg, rgba(239,68,68,0.85), rgba(185,28,28,0.9))",
    border: "rgba(248,113,113,0.5)"
  },
  Ice: {
    background: "linear-gradient(145deg, rgba(96,165,250,0.85), rgba(37,99,235,0.9))",
    border: "rgba(147,197,253,0.5)"
  },
  Wind: {
    background: "linear-gradient(145deg, rgba(52,211,153,0.85), rgba(16,185,129,0.9))",
    border: "rgba(134,239,172,0.5)"
  },
  Electro: {
    background: "linear-gradient(145deg, rgba(250,204,21,0.85), rgba(202,138,4,0.9))",
    border: "rgba(253,224,71,0.6)"
  },
  Xeno: {
    background: "linear-gradient(145deg, rgba(34,211,238,0.9), rgba(192,132,252,0.9))",
    border: "rgba(125,211,252,0.6)"
  }
};

const ROLE_META = {
  Ranger: { icon: "fa-solid fa-person-rifle", color: "#38bdf8" },
  Fighter: { icon: "fa-solid fa-hand-fist", color: "#fcd34d" },
  Support: { icon: "fa-solid fa-heart", color: "#22c55e" },
  Mage: { icon: "fa-solid fa-wand-magic-sparkles", color: "#c084fc" }
} as const;

const ELEMENT_META = {
  Fire: { icon: "fa-solid fa-fire", color: "#fff" },
  Ice: { icon: "fa-solid fa-snowflake", color: "#fff" },
  Wind: { icon: "fa-solid fa-wind", color: "#fff" },
  Electro: { icon: "fa-solid fa-bolt", color: "#fff" },
  Xeno: { icon: "fa-solid fa-star-of-david", color: "#0f172a" }
} as const;

const avatarLoadFailures = ref<Record<string, boolean>>({});
const RANK_OPTIONS = [1, 2, 3, 4, 5];
const activeSlotPopover = ref<number | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const ALLOWED_HERO_RARITIES = new Set(["Sublime", "Mythic", "Legendary"]);
const BASE_URL =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;

type LevelIconType = "star" | "moon" | "diamond" | "sublime";

const LEVEL_ICON_SRC_MAP: Record<LevelIconType, string> = {
  star: `${NORMALIZED_BASE}images/star.png`,
  moon: `${NORMALIZED_BASE}images/moon.png`,
  diamond: `${NORMALIZED_BASE}images/diamond.png`,
  sublime: `${NORMALIZED_BASE}images/sublime.png`
};

function getHero(heroId: string | null) {
  if (!heroId) return null;
  return HERO_MAP.get(heroId) ?? null;
}

function getHeroName(heroId: string | null) {
  return getHero(heroId)?.name ?? "Unknown";
}

function getHeroRole(heroId: string | null) {
  return getHero(heroId)?.role ?? null;
}

function getHeroElement(heroId: string | null) {
  return getHero(heroId)?.element ?? null;
}

function getOwnedEntry(heroId: string | null) {
  if (!heroId) return undefined;
  return props.owned.find((o) => o.heroId === heroId);
}

function getLevelIndex(heroId: string | null) {
  const owned = getOwnedEntry(heroId);
  return owned?.levelIndex ?? null;
}

function tokenizeLevel(level: Level): { type: LevelIconType; count: number }[] {
  if (level === "RD") return [{ type: "sublime", count: 1 }];
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (count <= 0) return [];
  if (suffix === "S") return [{ type: "star", count }];
  if (suffix === "M") return [{ type: "moon", count }];
  if (suffix === "D") return [{ type: "diamond", count }];
  return [];
}

function getLevelTokens(heroId: string | null) {
  const index = getLevelIndex(heroId);
  if (typeof index !== "number" || index < 0) return [];
  const level = LEVELS[index];
  if (!level) return [];
  return tokenizeLevel(level);
}

function getLevelLabel(heroId: string | null) {
  const index = getLevelIndex(heroId);
  if (index === null) return "Select star level";
  if (index < 0) return "Not Owned";
  const level = LEVELS[index];
  if (level === "RD") return "Sublime";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") return `${count} ${count === 1 ? "Star" : "Stars"}`;
  if (suffix === "M") return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  if (suffix === "D") return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  return level;
}

function levelIconClass(type: LevelIconType) {
  return `level-icon-${type}`;
}

function levelIconSrc(type: LevelIconType) {
  return LEVEL_ICON_SRC_MAP[type];
}

function getAvatarLetters(heroId: string | null) {
  const hero = getHero(heroId);
  if (!hero) return "?";
  return hero.id;
}

function heroAvatarKey(heroId: string | null) {
  if (!heroId) return "";
  const hero = getHero(heroId);
  return avatarKey(hero?.id ?? heroId, hero?.name);
}

function heroAvatarUrl(heroId: string | null) {
  const hero = getHero(heroId);
  return avatarUrl(hero?.id ?? heroId ?? undefined, hero?.name);
}

function showAvatarImage(heroId: string | null) {
  const key = heroAvatarKey(heroId);
  if (!key) return false;
  return !avatarLoadFailures.value[key];
}

function onAvatarError(heroId: string | null) {
  const key = heroAvatarKey(heroId);
  if (!key) return;
  avatarLoadFailures.value = {
    ...avatarLoadFailures.value,
    [key]: true
  };
}

function slotStyle(heroId: string | null) {
  if (!heroId) return {};
  const hero = getHero(heroId);
  if (!hero) return {};
  if (hero.rarity === "Sublime") {
    return {
      background:
        "linear-gradient(135deg, #90d4fe 0%, #cd95f3 19%, #ff72fa 36%, #fcfcff 56%, #eee9ff 76%, #82acff 100%)",
      borderColor: "rgba(125, 211, 252, 0.7)",
      color: "#0f172a"
    };
  }
  const element = hero.element;
  const colors = ELEMENT_BACKGROUNDS[element];
  if (!colors) return {};
  return {
    background: colors.background,
    borderColor: colors.border
  };
}

function isSublime(heroId: string | null) {
  const hero = getHero(heroId);
  return hero?.rarity === "Sublime";
}

function isSTier(heroId: string | null) {
  const hero = getHero(heroId);
  return hero?.isSTier === true;
}

function clearSlot(idx: number) {
  emit("clear-slot", idx);
}

function clearAll() {
  emit("clear-all");
}

const lineupHeroIds = computed(
  () => new Set(props.lineup.slots.map((slot) => slot.heroId).filter(Boolean) as string[])
);

const availableHeroes = computed(() =>
  props.heroes.filter(
    (hero) => !lineupHeroIds.value.has(hero.id) && ALLOWED_HERO_RARITIES.has(hero.rarity)
  )
);

const hasAssignedHeroes = computed(() =>
  props.lineup.slots.some((slot) => Boolean(slot.heroId))
);

function setSlotHero(slotIndex: number, heroId: string) {
  if (!heroId) return;
  if (lineupHeroIds.value.has(heroId)) return;
  emit("set-hero", slotIndex, heroId);
  activeSlotPopover.value = null;
}

function toggleSlotPopover(slotIndex: number) {
  activeSlotPopover.value = activeSlotPopover.value === slotIndex ? null : slotIndex;
}

function closePopovers(event: MouseEvent) {
  const root = rootRef.value;
  if (!root) return;
  if (!root.contains(event.target as Node)) {
    activeSlotPopover.value = null;
  }
}

onMounted(() => {
  if (typeof document === "undefined") return;
  document.addEventListener("click", closePopovers);
});

onBeforeUnmount(() => {
  if (typeof document === "undefined") return;
  document.removeEventListener("click", closePopovers);
});

function toggleRank(slotIndex: number, rank: number) {
  const slot = props.lineup.slots[slotIndex];
  if (!slot?.heroId) return;
  const next = slot.priorityRank === rank ? null : rank;
  emit("set-rank", slotIndex, next);
}

function clearRank(slotIndex: number) {
  emit("set-rank", slotIndex, null);
}

function roleMeta(heroId: string | null) {
  const role = getHeroRole(heroId);
  if (!role) return ROLE_META.Ranger;
  return ROLE_META[role];
}

function elementMeta(heroId: string | null) {
  const element = getHeroElement(heroId);
  if (!element) return ELEMENT_META.Fire;
  return ELEMENT_META[element];
}
</script>

<template>
  <div ref="rootRef">
    <div class="panel-header">
      <div class="panel-title">Lineup</div>
      <div class="panel-actions">
        <button
          class="btn btn-sm btn-ghost"
          type="button"
          :disabled="!hasAssignedHeroes"
          @click="clearAll"
        >
          Clear all
        </button>
      </div>
    </div>
    <div
      v-if="(props.untrackedCount ?? 0) > 0"
      class="collection-warning lineup-warning"
    >
      <div class="warning-text">
        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
        <span>
          {{ props.untrackedCount }} hero<span v-if="(props.untrackedCount ?? 0) !== 1">es</span> still need star levels.
        </span>
      </div>
      <a href="#collection" class="link-btn">Track heroes</a>
    </div>
    <p class="lineup-hint">
      Select heroes below to fill your lineup. Tap the focus chips to rank heroes 1-5 or leave them unranked for a balanced boost.
      <a href="#collection" class="inline-link">Jump to hero collection</a>
    </p>
    <div class="lineup-row">
      <div
        v-for="(slot, idx) in lineup.slots"
        :key="idx"
        class="lineup-slot"
        :class="{ filled: !!slot.heroId, 'slot-empty-shell': !slot.heroId, sublime: isSublime(slot.heroId) }"
        :style="slotStyle(slot.heroId)"
      >
        <template v-if="slot.heroId">
          <button
            class="lineup-remove"
            type="button"
            @click="clearSlot(idx)"
            aria-label="Remove hero from slot"
          >
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
          <div class="lineup-avatar" :class="{ 'stier-badge': isSTier(slot.heroId) }">
            <img
              v-if="showAvatarImage(slot.heroId)"
              class="lineup-avatar-img"
              :src="heroAvatarUrl(slot.heroId)"
              :alt="getHeroName(slot.heroId)"
              width="72"
              height="72"
              @error="onAvatarError(slot.heroId)"
            />
            <span v-else>
              {{ getAvatarLetters(slot.heroId) }}
            </span>
          </div>
          <div class="lineup-name">{{ getHeroName(slot.heroId) }}</div>
          <div class="lineup-meta">
            <span class="meta-pill light">
              <i
                :class="roleMeta(slot.heroId).icon"
                :style="{ color: roleMeta(slot.heroId).color }"
                aria-hidden="true"
              ></i>
              <span>{{ getHeroRole(slot.heroId) ?? "Unknown" }}</span>
            </span>
            <span class="meta-pill light">
              <i
                :class="elementMeta(slot.heroId).icon"
                aria-hidden="true"
              ></i>
              <span>{{ getHeroElement(slot.heroId) ?? "Unknown" }}</span>
            </span>
          </div>
          <div class="lineup-level">
            <div class="lineup-level-icons">
              <template v-if="getLevelTokens(slot.heroId).length">
                <template
                  v-for="token in getLevelTokens(slot.heroId)"
                  :key="`${slot.heroId}-${token.type}`"
                >
                  <img
                    v-for="countIndex in token.count"
                    :key="`${slot.heroId}-${token.type}-${countIndex}`"
                    class="level-icon"
                    :class="levelIconClass(token.type)"
                    :src="levelIconSrc(token.type)"
                    alt=""
                    aria-hidden="true"
                  />
                </template>
              </template>
            </div>
            <span class="lineup-level-text">
              {{ getLevelLabel(slot.heroId) }}
            </span>
          </div>
          <div class="rank-select">
            <div class="rank-select-label">Set rank priority (1 is highest)</div>
            <div class="rank-pill-group">
              <button
                v-for="rank in RANK_OPTIONS"
                :key="rank"
                type="button"
                class="rank-pill"
                :class="{ active: slot.priorityRank === rank }"
                :disabled="!slot.heroId"
                @click="toggleRank(idx, rank)"
              >
                {{ rank }}
              </button>
              <button
                type="button"
                class="rank-pill rank-pill-clear"
                :disabled="!slot.heroId"
                @click="clearRank(idx)"
              >
                Clear
              </button>
            </div>
          </div>
        </template>
        <div v-else class="lineup-slot-empty">
          <button
            class="hero-add"
            type="button"
            @click.stop="toggleSlotPopover(idx)"
            aria-label="Add hero"
          >
            +
          </button>
          <div class="lineup-empty-text">Empty slot</div>
          <div
            v-if="activeSlotPopover === idx"
            class="hero-add-backdrop"
            @click="activeSlotPopover = null"
          ></div>
          <div v-if="activeSlotPopover === idx" class="hero-add-popover" @click.stop>
            <div class="hero-add-grid">
              <button
                v-for="hero in availableHeroes"
                :key="hero.id"
                class="hero-add-card"
                :class="{ 'stier-badge': hero.isSTier }"
                type="button"
                @click="setSlotHero(idx, hero.id)"
              >
                <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" />
                <span>{{ hero.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
