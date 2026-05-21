<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import html2canvas from "html2canvas";
import type { Element, HeroDef, Rarity, Role } from "../models/types";
import {
  buildRuneRecommendation,
  runeForId,
  type RuneId
} from "../models/runes";
import { avatarUrl } from "../utils/avatar";

const props = defineProps<{
  heroes: HeroDef[];
}>();

const HERO_STORAGE_KEY = "wd-tools-rune-recommender-hero";
const ADVANCED_STORAGE_KEY = "wd-tools-rune-recommender-advanced";
const HERO_LIST_COLLAPSED_KEY = "wd-tools-rune-recommender-collapsed";

const ROLE_META: Record<Role, { icon: string; color: string }> = {
  Ranger: { icon: "fa-solid fa-person-rifle", color: "#38bdf8" },
  Fighter: { icon: "fa-solid fa-hand-fist", color: "#facc15" },
  Support: { icon: "fa-solid fa-heart", color: "#22c55e" },
  Mage: { icon: "fa-solid fa-wand-magic-sparkles", color: "#c084fc" }
};

const ELEMENT_META: Record<Element, { icon: string; color: string }> = {
  Fire: { icon: "fa-solid fa-fire", color: "#ef4444" },
  Ice: { icon: "fa-solid fa-snowflake", color: "#60a5fa" },
  Wind: { icon: "fa-solid fa-wind", color: "#34d399" },
  Electro: { icon: "fa-solid fa-bolt", color: "#facc15" },
  Xeno: { icon: "fa-solid fa-star-of-david", color: "#a855f7" }
};

const RARITY_ORDER: Rarity[] = [
  "Sublime",
  "Mythic",
  "Legendary",
  "Epic",
  "Common"
];
const DETAIL_SLOT_ORDER = [1, 6, 2, 5, 3, 4];

function savedHeroId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(HERO_STORAGE_KEY) ?? "";
}

function savedAdvancedPreference() {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(ADVANCED_STORAGE_KEY);
  if (saved === "true" || saved === "false") return saved === "true";
  return true;
}

function savedHeroListCollapsed() {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(HERO_LIST_COLLAPSED_KEY);
  if (saved === "true" || saved === "false") return saved === "true";
  return true;
}

const selectedHeroId = ref(savedHeroId());
const includeAdvancedRunes = ref(savedAdvancedPreference());
const heroListCollapsed = ref(savedHeroListCollapsed());
const heroSearch = ref("");
const missingRuneImages = ref<RuneId[]>([]);
const exportRef = ref<HTMLElement | null>(null);
const runeExporting = ref(false);
const runeExportStatus = ref<string | null>(null);

const selectableHeroes = computed(() =>
  props.heroes.filter((hero) => hero.rarity !== "Epic" && hero.rarity !== "Common")
);

const selectedHero = computed(() => {
  const selected = selectableHeroes.value.find((hero) => hero.id === selectedHeroId.value);
  return selected ?? selectableHeroes.value[0] ?? null;
});

watch(
  selectableHeroes,
  (heroes) => {
    if (!heroes.length) {
      selectedHeroId.value = "";
      return;
    }
    if (!heroes.some((hero) => hero.id === selectedHeroId.value)) {
      selectedHeroId.value = heroes[0].id;
    }
  },
  { immediate: true }
);

watch(selectedHeroId, (value) => {
  runeExportStatus.value = null;
  if (typeof window === "undefined" || !value) return;
  localStorage.setItem(HERO_STORAGE_KEY, value);
});

watch(includeAdvancedRunes, (value) => {
  runeExportStatus.value = null;
  if (typeof window === "undefined") return;
  localStorage.setItem(ADVANCED_STORAGE_KEY, value ? "true" : "false");
});

watch(heroListCollapsed, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HERO_LIST_COLLAPSED_KEY, value ? "true" : "false");
});

const filteredHeroes = computed(() => {
  const query = heroSearch.value.trim().toLowerCase();
  if (!query) return selectableHeroes.value;
  return selectableHeroes.value.filter((hero) => {
    const haystack = `${hero.name} ${hero.id} ${hero.role} ${hero.element} ${hero.rarity}`.toLowerCase();
    return haystack.includes(query);
  });
});

const groupedHeroes = computed(() =>
  RARITY_ORDER.map((rarity) => ({
    rarity,
    heroes: filteredHeroes.value.filter((hero) => hero.rarity === rarity)
  })).filter((group) => group.heroes.length)
);

const selectOptions = computed(() =>
  RARITY_ORDER.map((rarity) => ({
    rarity,
    heroes: selectableHeroes.value.filter((hero) => hero.rarity === rarity)
  })).filter((group) => group.heroes.length)
);

const recommendation = computed(() =>
  selectedHero.value
    ? buildRuneRecommendation(selectedHero.value, includeAdvancedRunes.value)
    : null
);

const setPieces = computed(() =>
  recommendation.value?.setPieces.map((piece) => ({
    ...piece,
    rune: runeForId(piece.runeId)
  })) ?? []
);

const detailSlots = computed(() => {
  const slots = recommendation.value?.slots ?? [];
  return DETAIL_SLOT_ORDER.flatMap((slotNumber) => {
    const slot = slots.find((candidate) => candidate.slot === slotNumber);
    return slot ? [slot] : [];
  });
});

const baseUrl =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

function runeImageSrc(runeId: RuneId) {
  return `${normalizedBase}runes/${runeForId(runeId).abbreviation}.png`;
}

function isRuneImageMissing(runeId: RuneId) {
  return missingRuneImages.value.includes(runeId);
}

function markRuneImageMissing(runeId: RuneId) {
  if (missingRuneImages.value.includes(runeId)) return;
  missingRuneImages.value = [...missingRuneImages.value, runeId];
}

function selectHero(heroId: string) {
  selectedHeroId.value = heroId;
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function openImageInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function copyRuneRecommendationImage() {
  if (!exportRef.value || !selectedHero.value) return;
  runeExportStatus.value = null;
  const exportWidth = 720;
  const prevWidth = exportRef.value.style.width;
  const prevMaxWidth = exportRef.value.style.maxWidth;
  exportRef.value.style.width = `${exportWidth}px`;
  exportRef.value.style.maxWidth = `${exportWidth}px`;
  runeExporting.value = true;
  let canvas: HTMLCanvasElement;
  try {
    await nextTick();
    if (typeof document !== "undefined" && (document as any).fonts?.ready) {
      await (document as any).fonts.ready;
      if ((document as any).fonts?.load) {
        await (document as any).fonts.load('900 12px "Font Awesome 6 Free"');
      }
    }
    await waitForImages(exportRef.value);
    const bounds = exportRef.value.getBoundingClientRect();
    canvas = await html2canvas(exportRef.value, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      width: Math.ceil(bounds.width),
      height: Math.ceil(bounds.height)
    });
  } finally {
    exportRef.value.style.width = prevWidth;
    exportRef.value.style.maxWidth = prevMaxWidth;
    runeExporting.value = false;
  }

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      runeExportStatus.value = "Rune image copied.";
      return;
    } catch {
      /* fall through */
    }
  }
  if (isIOS() || isAndroid()) {
    openImageInNewTab(blob);
    runeExportStatus.value = "Image opened in a new tab.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${selectedHero.value.name.replace(/\s+/g, "-").toLowerCase()}-runes.png`;
  link.click();
  URL.revokeObjectURL(url);
  runeExportStatus.value = "Rune image downloaded.";
}

function rarityBadgeClass(rarity: Rarity) {
  if (rarity === "Sublime") return "badge badge-sublime";
  if (rarity === "Mythic") return "badge badge-mythic";
  if (rarity === "Legendary") return "badge badge-legendary";
  if (rarity === "Epic") return "badge badge-rare";
  return "badge";
}

function slotClass(slot: number) {
  return `rune-slot-${slot}`;
}
</script>

<template>
  <section class="panel rune-recommender-panel">
    <div class="rune-recommender-header">
      <div>
        <p class="eyebrow">Rune planning</p>
        <h2>Rune Recommender</h2>
        <p class="muted">Pick a hero and compare the standard and advanced rune targets.</p>
      </div>
      <div class="rune-recommender-controls">
        <label class="rune-select-label">
          <span>Hero</span>
          <select v-model="selectedHeroId">
            <optgroup
              v-for="group in selectOptions"
              :key="`select-${group.rarity}`"
              :label="group.rarity"
            >
              <option
                v-for="hero in group.heroes"
                :key="hero.id"
                :value="hero.id"
              >
                {{ hero.name }} ({{ hero.id }})
              </option>
            </optgroup>
          </select>
        </label>
      </div>
    </div>

    <div class="panel-body rune-workspace">
      <aside class="rune-hero-picker" :class="{ 'is-collapsed': heroListCollapsed }">
        <div class="rune-hero-picker-header">
          <button
            type="button"
            class="rune-hero-collapse"
            @click="heroListCollapsed = !heroListCollapsed"
          >
            <i
              class="fa-solid"
              :class="heroListCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"
              aria-hidden="true"
            ></i>
            {{ heroListCollapsed ? "Show heroes" : "Hide heroes" }}
          </button>
          <span class="rune-hero-picker-title">Hero Picker</span>
        </div>
        <div class="rune-search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            v-model="heroSearch"
            type="search"
            placeholder="Search heroes..."
            aria-label="Search heroes"
          />
          <button
            v-if="heroSearch"
            class="btn btn-sm btn-ghost"
            type="button"
            @click="heroSearch = ''"
          >
            Clear
          </button>
        </div>
        <div class="rune-hero-groups">
          <div
            v-for="group in groupedHeroes"
            :key="group.rarity"
            class="rune-hero-group"
          >
            <div class="rune-hero-rarity">{{ group.rarity }}</div>
            <div class="rune-hero-list">
              <button
                v-for="hero in group.heroes"
                :key="hero.id"
                type="button"
                class="rune-hero-option"
                :class="[
                  { active: selectedHero?.id === hero.id, 'stier-badge': hero.isSTier },
                  `rarity-${hero.rarity.toLowerCase()}`
                ]"
                @click="selectHero(hero.id)"
              >
                <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" loading="lazy" />
                <span>{{ hero.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div v-if="selectedHero && recommendation" class="rune-detail">
        <div ref="exportRef" class="rune-export" :class="{ exporting: runeExporting }">
        <div class="rune-hero-summary">
          <div class="rune-hero-profile">
            <div class="rune-hero-avatar" :class="{ 'stier-badge': selectedHero.isSTier }">
              <img :src="avatarUrl(selectedHero.id, selectedHero.name)" :alt="selectedHero.name" />
            </div>
            <div class="rune-hero-copy">
              <div class="rune-hero-name">{{ selectedHero.name }}</div>
              <div class="rune-hero-meta">
                <span class="meta-pill">
                  <i
                    :class="ELEMENT_META[selectedHero.element].icon"
                    :style="{ color: ELEMENT_META[selectedHero.element].color }"
                    aria-hidden="true"
                  ></i>
                  <span>{{ selectedHero.element }}</span>
                </span>
                <span class="meta-pill">
                  <i
                    :class="ROLE_META[selectedHero.role].icon"
                    :style="{ color: ROLE_META[selectedHero.role].color }"
                    aria-hidden="true"
                  ></i>
                  <span>{{ selectedHero.role }}</span>
                </span>
                <span :class="rarityBadgeClass(selectedHero.rarity)">
                  {{ selectedHero.rarity }}
                </span>
              </div>
            </div>
          </div>
          <div class="rune-hero-actions">
            <label class="rune-switch">
              <input v-model="includeAdvancedRunes" type="checkbox" />
              <span class="rune-switch-track" aria-hidden="true">
                <span class="rune-switch-thumb"></span>
              </span>
              <span class="rune-switch-text">Advanced runes</span>
            </label>
            <button
              type="button"
              class="btn btn-sm btn-secondary rune-copy-button"
              :disabled="runeExporting"
              @click="copyRuneRecommendationImage"
            >
              <i class="fa-solid fa-image" aria-hidden="true"></i>
              {{ runeExporting ? "Copying..." : "Copy Image" }}
            </button>
            <span v-if="runeExportStatus" class="rune-export-status">{{ runeExportStatus }}</span>
          </div>
        </div>

        <div class="rune-set-strip">
          <div
            v-for="piece in setPieces"
            :key="piece.runeId"
            class="rune-set-piece"
            :class="{ advanced: piece.rune.advanced }"
          >
            <div class="rune-icon">
              <span>{{ piece.rune.abbreviation }}</span>
              <img
                v-if="!isRuneImageMissing(piece.runeId)"
                :src="runeImageSrc(piece.runeId)"
                :alt="piece.rune.name"
                @error="markRuneImageMissing(piece.runeId)"
              />
            </div>
            <div>
              <div class="rune-set-count">{{ piece.count }} x {{ piece.rune.name }}</div>
              <div class="rune-set-type">{{ piece.rune.advanced ? "Advanced" : "Standard" }}</div>
            </div>
          </div>
        </div>

        <div class="rune-note rune-order-note">
          <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
          <span>
            Runes can be placed in any order. Main stats and recommended substats should determine
            which rune goes in each slot.
          </span>
        </div>

        <div class="rune-board" aria-label="Recommended rune layout">
          <div class="rune-orbit-center">
            <i
              :class="ELEMENT_META[selectedHero.element].icon"
              :style="{ color: ELEMENT_META[selectedHero.element].color }"
              aria-hidden="true"
            ></i>
          </div>
          <div
            v-for="slot in recommendation.slots"
            :key="slot.slot"
            class="rune-orbit-node"
            :class="slotClass(slot.slot)"
            :title="`Slot ${slot.slot}: ${runeForId(slot.runeId).name}`"
          >
            <span class="rune-node-badge">S{{ slot.slot }}</span>
            <span class="rune-socket-ring" aria-hidden="true"></span>
            <div class="rune-icon orbit">
              <span>{{ runeForId(slot.runeId).abbreviation }}</span>
              <img
                v-if="!isRuneImageMissing(slot.runeId)"
                :src="runeImageSrc(slot.runeId)"
                :alt="runeForId(slot.runeId).name"
                @error="markRuneImageMissing(slot.runeId)"
              />
            </div>
          </div>
        </div>

        <div class="rune-slot-details-grid">
          <article
            v-for="slot in detailSlots"
            :key="`details-${slot.slot}`"
            class="rune-slot-card"
          >
            <div class="rune-slot-topline">
              <span>Slot {{ slot.slot }}</span>
              <small>{{ slot.position }}</small>
            </div>
            <div class="rune-slot-rune">
              <div class="rune-icon">
                <span>{{ runeForId(slot.runeId).abbreviation }}</span>
                <img
                  v-if="!isRuneImageMissing(slot.runeId)"
                  :src="runeImageSrc(slot.runeId)"
                  :alt="runeForId(slot.runeId).name"
                  @error="markRuneImageMissing(slot.runeId)"
                />
              </div>
              <div>
                <div class="rune-name">{{ runeForId(slot.runeId).name }}</div>
              </div>
            </div>
            <div class="rune-stat-grid">
              <div class="rune-stat-panel main">
                <div class="rune-stat-label">Main Stat</div>
                <div class="rune-stat-value">{{ slot.mainStat }}</div>
              </div>
              <div class="rune-stat-panel">
                <div class="rune-stat-label">Recommended Substats</div>
                <div class="rune-substats">
                  <span
                    v-for="substat in slot.substats"
                    :key="`${slot.slot}-${substat}`"
                  >
                    {{ substat }}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div class="rune-notes">
          <div
            v-for="note in recommendation.notes"
            :key="note"
            class="rune-note"
          >
            <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
            <span>{{ note }}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rune-recommender-panel {
  width: min(100%, 1080px);
  min-width: 0;
  margin: 0 auto;
  overflow: hidden;
}

.rune-recommender-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.rune-recommender-header .eyebrow {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rune-recommender-header h2 {
  margin: 0;
}

.rune-recommender-header .muted {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.rune-recommender-controls {
  display: none;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.rune-select-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.rune-select-label select,
.rune-search input {
  min-height: 38px;
  border: 1px solid var(--input-border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-main);
  padding: 0 12px;
  font: inherit;
}

.rune-select-label select {
  min-width: min(320px, 78vw);
}

.rune-workspace {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  align-items: start;
}

.rune-switch {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 10px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--meta-pill-bg);
  color: var(--text-main);
  font-size: 0.86rem;
  font-weight: 700;
  cursor: pointer;
  flex: 0 0 auto;
}

.rune-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.rune-switch-track {
  width: 42px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.28);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  transition: background 0.18s ease, box-shadow 0.18s ease;
}

.rune-switch-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transform: translateX(0);
  transition: transform 0.18s ease;
}

.rune-switch input:checked + .rune-switch-track {
  background: linear-gradient(135deg, #7c3aed, #0891b2);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.rune-switch input:checked + .rune-switch-track .rune-switch-thumb {
  transform: translateX(18px);
}

.rune-switch input:focus-visible + .rune-switch-track {
  outline: 2px solid #67e8f9;
  outline-offset: 3px;
}

.rune-switch-text {
  white-space: nowrap;
}

.rune-hero-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.rune-hero-picker-header {
  display: none;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.rune-hero-collapse {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 14px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--meta-pill-bg);
  color: var(--text-main);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
}

.rune-hero-picker-title {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.rune-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  background: var(--meta-pill-bg);
}

.rune-search i {
  color: var(--text-muted);
}

.rune-search input {
  min-width: 0;
  flex: 1;
}

.rune-hero-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 760px;
  overflow: auto;
  padding-right: 4px;
}

.rune-hero-rarity {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
}

.rune-hero-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.rune-hero-option {
  width: 100%;
  min-height: 54px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--meta-pill-bg);
  color: var(--text-main);
  text-align: left;
  cursor: pointer;
  padding: 7px 9px;
}

.rune-hero-option.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-strong);
}

.rune-hero-option img {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
}

.rune-hero-option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  font-size: 0.85rem;
}

.rune-detail {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rune-export {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rune-export.exporting {
  padding: 14px;
  border-radius: 18px;
  background: var(--panel-bg);
}

.rune-export.exporting .rune-copy-button,
.rune-export.exporting .rune-export-status {
  display: none;
}

.rune-hero-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: var(--meta-pill-bg);
}

.rune-hero-profile {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.rune-hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  border: 1px solid var(--border-soft);
  overflow: hidden;
  background: var(--avatar-surface);
  flex: 0 0 auto;
}

.rune-hero-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rune-hero-copy {
  min-width: 0;
}

.rune-hero-name {
  font-size: clamp(1.2rem, 2vw, 1.7rem);
  font-weight: 800;
}

.rune-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.rune-hero-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.rune-copy-button {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.rune-export-status {
  position: fixed;
  right: 18px;
  bottom: 18px;
  padding: 4px 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  z-index: 50;
}

.rune-set-strip {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.rune-set-piece {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: 10px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(20, 83, 45, 0.18));
}

.rune-set-piece.advanced {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.78), rgba(14, 116, 144, 0.2));
  border-color: rgba(56, 189, 248, 0.32);
}

.rune-set-count {
  font-weight: 800;
}

.rune-set-type {
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.rune-icon {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: radial-gradient(circle at 30% 20%, #facc15, #0f766e 58%, #0f172a);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-weight: 900;
  font-size: 0.78rem;
}

.rune-icon img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rune-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid rgba(148, 163, 184, 0.24);
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(circle at center, rgba(124, 58, 237, 0.22) 0 18%, transparent 19%),
    radial-gradient(circle at center, transparent 0 31%, rgba(148, 163, 184, 0.2) 32% 33%, transparent 34%),
    radial-gradient(circle at center, transparent 0 47%, rgba(148, 163, 184, 0.18) 48% 49%, transparent 50%),
    linear-gradient(145deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.rune-orbit-center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) rotate(45deg);
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.rune-orbit-center i {
  transform: rotate(-45deg);
  font-size: clamp(1.6rem, 6vw, 2.6rem);
  opacity: 0.42;
}

.rune-orbit-node {
  position: absolute;
  width: clamp(96px, 24%, 134px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  isolation: isolate;
}

.rune-node-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  min-width: 32px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  padding: 0 7px;
  border: 2px solid #0f172a;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 950;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.28);
}

.rune-socket-ring {
  position: absolute;
  inset: 0;
  border: 4px solid rgba(226, 232, 240, 0.92);
  border-radius: 31%;
  background: #e11d48;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.45);
  z-index: 2;
}

.rune-icon.orbit {
  width: 52%;
  height: 52%;
  z-index: 4;
  border: none;
  background: radial-gradient(circle at 30% 20%, #fde68a, #0f766e 58%, #0f172a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.42);
}

.rune-slot-1 {
  left: 33%;
  top: 21%;
}

.rune-slot-2 {
  left: 20.5%;
  top: 50%;
}

.rune-slot-3 {
  left: 35%;
  top: 79%;
}

.rune-slot-4 {
  left: 65%;
  top: 79%;
}

.rune-slot-5 {
  left: 79.5%;
  top: 50%;
}

.rune-slot-6 {
  left: 67%;
  top: 21%;
}

.rune-slot-details-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rune-slot-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: var(--hero-card-bg);
}

.rune-slot-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.rune-slot-topline span {
  font-weight: 900;
}

.rune-slot-topline small {
  color: var(--text-muted);
  text-align: right;
  font-size: 0.72rem;
}

.rune-slot-rune {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rune-name {
  font-weight: 800;
}

.rune-stat-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: auto;
}

.rune-stat-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 9px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.36);
}

.rune-stat-panel.main {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  border-color: rgba(103, 232, 249, 0.26);
  background: rgba(8, 145, 178, 0.12);
}

.rune-stat-label {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
}

.rune-stat-value {
  color: #67e8f9;
  font-weight: 900;
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.rune-substats {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.rune-substats span {
  flex: 0 1 auto;
  max-width: 100%;
  min-width: 0;
  border-radius: 999px;
  padding: 3px 8px;
  background: var(--meta-pill-bg);
  border: 1px solid var(--border-soft);
  color: var(--text-main);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: normal;
  white-space: nowrap;
}

.rune-notes {
  display: grid;
  gap: 8px;
}

.rune-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.rune-note i {
  color: #38bdf8;
  margin-top: 3px;
}

.rune-order-note {
  padding: 10px 12px;
  border: 1px solid rgba(56, 189, 248, 0.24);
  border-radius: 12px;
  background: rgba(8, 145, 178, 0.1);
}

@media (max-width: 980px) {
  .rune-recommender-controls {
    display: flex;
  }

  .rune-workspace {
    grid-template-columns: 1fr;
  }

  .rune-hero-picker-header {
    display: flex;
  }

  .rune-hero-picker.is-collapsed {
    gap: 0;
  }

  .rune-hero-picker.is-collapsed .rune-search,
  .rune-hero-picker.is-collapsed .rune-hero-groups {
    display: none;
  }

  .rune-hero-groups {
    max-height: none;
  }

  .rune-hero-list {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
}

@media (max-width: 760px) {
  .rune-recommender-controls,
  .rune-select-label,
  .rune-select-label select {
    width: 100%;
  }

  .rune-slot-details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .rune-hero-summary,
  .rune-hero-profile,
  .rune-switch {
    width: 100%;
  }

  .rune-switch {
    justify-content: center;
  }

  .rune-orbit-node {
    width: clamp(72px, 27%, 96px);
  }

  .rune-node-badge {
    min-width: 30px;
    height: 22px;
    font-size: 0.72rem;
  }

  .rune-slot-card {
    min-height: 0;
  }

  .rune-stat-grid {
    grid-template-columns: 1fr;
  }

  .rune-substats span {
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
</style>
