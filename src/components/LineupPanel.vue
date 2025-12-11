<script setup lang="ts">
import { ref } from "vue";
import type { HeroDef, Lineup, OwnedHero, Level } from "../models/types";
import { HERO_MAP } from "../models/heroes";
import { LEVELS } from "../models/types";
import { avatarKey, avatarUrl } from "../utils/avatar";

const props = defineProps<{
  heroes: HeroDef[];
  lineup: Lineup;
  owned: OwnedHero[];
}>();

const emit = defineEmits<{
  "toggle-priority": [slotIndex: number];
  "clear-slot": [slotIndex: number];
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
  Electric: {
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
  Electric: { icon: "fa-solid fa-bolt", color: "#fff" },
  Xeno: { icon: "fa-solid fa-star-of-david", color: "#0f172a" }
} as const;

const avatarLoadFailures = ref<Record<string, boolean>>({});

type LevelIconType = "star" | "moon" | "diamond" | "rainbow";

const ICON_CLASS_MAP: Record<LevelIconType, string> = {
  star: "fa-solid fa-star level-icon-star",
  moon: "fa-solid fa-moon level-icon-moon",
  diamond: "fa-solid fa-gem level-icon-diamond",
  rainbow: "fa-solid fa-gem level-icon-rainbow"
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
  if (level === "RD") return [{ type: "rainbow", count: 1 }];
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
  if (level === "RD") return "Rainbow Diamond";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") return `${count} ${count === 1 ? "Star" : "Stars"}`;
  if (suffix === "M") return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  if (suffix === "D") return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  return level;
}

function iconClass(type: LevelIconType) {
  return ICON_CLASS_MAP[type];
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
  const element = getHeroElement(heroId);
  if (!element) return {};
  const colors = ELEMENT_BACKGROUNDS[element];
  if (!colors) return {};
  return {
    background: colors.background,
    borderColor: colors.border
  };
}

function clearSlot(idx: number) {
  emit("clear-slot", idx);
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
  <div>
    <div class="panel-header">
      <div class="panel-title">Lineup</div>
    </div>
    <p class="lineup-hint">
      Select heroes below to fill your lineup. You can adjust priorities or remove
      heroes here.
    </p>
    <div class="lineup-row">
      <div
        v-for="(slot, idx) in lineup.slots"
        :key="idx"
        class="lineup-slot"
        :class="{ filled: !!slot.heroId }"
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
          <div class="lineup-avatar">
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
                  <i
                    v-for="countIndex in token.count"
                    :key="`${slot.heroId}-${token.type}-${countIndex}`"
                    class="level-icon"
                    :class="iconClass(token.type)"
                    aria-hidden="true"
                  ></i>
                </template>
              </template>
            </div>
            <span class="lineup-level-text">
              {{ getLevelLabel(slot.heroId) }}
            </span>
          </div>
          <label class="priority-toggle lineup-priority">
            <input
              type="checkbox"
              :checked="slot.isPriority"
              @change="emit('toggle-priority', idx)"
            />
            Priority Target
          </label>
        </template>
        <div v-else class="lineup-slot-empty">
          Select a hero from the collection to fill this slot.
        </div>
      </div>
    </div>
  </div>
</template>
