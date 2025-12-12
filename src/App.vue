<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { HEROES } from "./models/heroes";
import type {
  OwnedHero,
  Lineup,
  Role,
  Element,
  Rarity,
  Level
} from "./models/types";
import { LEVELS, NOT_OWNED_LEVEL_INDEX } from "./models/types";
import HeroCollection from "./components/HeroCollection.vue";
import LineupPanel from "./components/LineupPanel.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import ResultsPanel from "./components/ResultsPanel.vue";
import HeroFilters from "./components/HeroFilters.vue";
import { runOptimization } from "./logic/optimizer";

const HERO_STORAGE_KEY = "wd-akashic-owned-heroes";
const NIGHTMARE_STORAGE_KEY = "wd-akashic-nightmare-level";
const LINEUP_STORAGE_KEY = "wd-akashic-lineup";
const OWNERSHIP_FILTER_STORAGE_KEY = "wd-akashic-ownership-filter";
const INTRO_STORAGE_KEY = "wd-akashic-intro-hidden";
const BASE_URL =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const ARBOR_IMAGE_SRC = `${NORMALIZED_BASE}images/arbor.jpg`;

type OwnershipFilter = "all" | "owned" | "not-owned" | "untracked" | "lineup";

const ZERO_STAR_INDEX = LEVELS.indexOf("0S");

function isBaseHero(heroId: string) {
  const hero = HEROES.find((h) => h.id === heroId);
  return hero ? hero.rarity === "Epic" || hero.rarity === "Common" : false;
}

function defaultLevelForHero(heroId: string) {
  if (isBaseHero(heroId) && ZERO_STAR_INDEX >= 0) {
    return ZERO_STAR_INDEX;
  }
  return null;
}

function buildDefaultOwned(): OwnedHero[] {
  return HEROES.map((h) => ({
    heroId: h.id,
    levelIndex: defaultLevelForHero(h.id)
  }));
}

function loadOwnedHeroes(): OwnedHero[] {
  if (typeof window === "undefined") {
    return buildDefaultOwned();
  }
  try {
    const saved = localStorage.getItem(HERO_STORAGE_KEY);
    if (!saved) return buildDefaultOwned();
    const parsed = JSON.parse(saved) as OwnedHero[];
    const map = new Map<string, number | null>();
    parsed.forEach((item) => {
      if (typeof item?.heroId !== "string") return;
      if (item?.levelIndex === null || typeof item?.levelIndex === "number") {
        map.set(item.heroId, item.levelIndex);
      }
    });
    return HEROES.map((hero) => ({
      heroId: hero.id,
      levelIndex: map.has(hero.id)
        ? map.get(hero.id)!
        : defaultLevelForHero(hero.id)
    }));
  } catch {
    return buildDefaultOwned();
  }
}

function buildDefaultLineup(): Lineup {
  return {
    slots: [
      { heroId: null, isPriority: true },
      { heroId: null, isPriority: false },
      { heroId: null, isPriority: false },
      { heroId: null, isPriority: false },
      { heroId: null, isPriority: false }
    ]
  };
}

function loadLineup(): Lineup {
  if (typeof window === "undefined") {
    return buildDefaultLineup();
  }
  try {
    const stored = localStorage.getItem(LINEUP_STORAGE_KEY);
    if (!stored) return buildDefaultLineup();
    const parsed = JSON.parse(stored) as Lineup;
    if (!parsed?.slots || !Array.isArray(parsed.slots)) {
      return buildDefaultLineup();
    }
    const slots = parsed.slots.slice(0, 5).map((slot, idx) => ({
      heroId: typeof slot?.heroId === "string" ? slot.heroId : null,
      isPriority: typeof slot?.isPriority === "boolean" ? slot.isPriority : idx === 0
    }));
    while (slots.length < 5) {
      slots.push({ heroId: null, isPriority: false });
    }
    return { slots };
  } catch {
    return buildDefaultLineup();
  }
}

function loadNightmareLevel(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(NIGHTMARE_STORAGE_KEY);
  const parsed = stored ? Number(stored) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function loadOwnershipFilter(): OwnershipFilter {
  if (typeof window === "undefined") return "all";
  const stored = localStorage.getItem(OWNERSHIP_FILTER_STORAGE_KEY);
  if (
    stored === "owned" ||
    stored === "not-owned" ||
    stored === "untracked" ||
    stored === "all" ||
    stored === "lineup"
  ) {
    return stored;
  }
  return "all";
}

function loadIntroHidden(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INTRO_STORAGE_KEY) === "true";
}

const ownedHeroes = ref<OwnedHero[]>(loadOwnedHeroes());

watch(
  ownedHeroes,
  (value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

const nightmareLevel = ref(loadNightmareLevel());

watch(nightmareLevel, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(NIGHTMARE_STORAGE_KEY, String(value));
});

const lineup = ref<Lineup>(loadLineup());

watch(
  lineup,
  (value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

const lastResult = ref(
  null as ReturnType<typeof runOptimization> | null
);
const isCalculating = ref(false);
const resultsRef = ref<HTMLElement | null>(null);

const lineupHeroIds = computed(() =>
  new Set(lineup.value.slots.map((s) => s.heroId).filter(Boolean) as string[])
);

const roleFilters = ref<Role[]>([]);
const elementFilters = ref<Element[]>([]);
const rarityFilters = ref<Rarity[]>([]);
const searchQuery = ref("");
const ownershipFilter = ref<OwnershipFilter>(loadOwnershipFilter());
const introHidden = ref(loadIntroHidden());

watch(ownershipFilter, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNERSHIP_FILTER_STORAGE_KEY, value);
});

watch(introHidden, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTRO_STORAGE_KEY, value ? "true" : "false");
});

const untrackedHeroesCount = computed(
  () => ownedHeroes.value.filter((hero) => hero.levelIndex === null).length
);

watch(untrackedHeroesCount, (count) => {
  if (count === 0 && ownershipFilter.value === "untracked") {
    ownershipFilter.value = "all";
  }
});

function describeLevel(level: Level | "NONE") {
  if (level === "NONE") return "No Stars";
  if (level === "RD") return "Rainbow Diamond";
  const suffix = level.slice(-1);
  const count = Number(level.slice(0, -1));
  if (suffix === "S") return `${count} ${count === 1 ? "Star" : "Stars"}`;
  if (suffix === "M") return `${count} ${count === 1 ? "Moon" : "Moons"}`;
  if (suffix === "D") return `${count} ${count === 1 ? "Diamond" : "Diamonds"}`;
  return level;
}

type OwnershipStatus = "owned" | "not-owned" | "unassigned";

function getHeroOwnershipStatus(heroId: string): OwnershipStatus {
  const owned = ownedHeroes.value.find((o) => o.heroId === heroId);
  if (!owned || owned.levelIndex == null) return "unassigned";
  return owned.levelIndex >= 0 ? "owned" : "not-owned";
}

const facetFilteredHeroes = computed(() =>
  HEROES.filter((hero) => {
    const roleOk =
      roleFilters.value.length === 0 || roleFilters.value.includes(hero.role);
    const elementOk =
      elementFilters.value.length === 0 || elementFilters.value.includes(hero.element);
    const rarityOk =
      rarityFilters.value.length === 0 || rarityFilters.value.includes(hero.rarity);
    return roleOk && elementOk && rarityOk;
  })
);

function heroMatchesSearch(hero: typeof HEROES[number], tokens: string[]) {
  if (!tokens.length) return true;
  const owned = ownedHeroes.value.find((o) => o.heroId === hero.id);
  const levelIndex = owned?.levelIndex ?? null;
  let levelCode = "";
  let levelLabel = "Not Set";
  if (levelIndex === NOT_OWNED_LEVEL_INDEX) {
    levelLabel = "Not Owned";
  } else if (typeof levelIndex === "number" && levelIndex >= 0) {
    levelCode = LEVELS[levelIndex];
    levelLabel = describeLevel(levelCode as Level);
  }

  const ownershipStatus = getHeroOwnershipStatus(hero.id);

  const baseStrings = [
    hero.name,
    hero.id,
    hero.role,
    hero.element,
    hero.rarity,
    hero.name.replace(/[^a-z0-9]/gi, ""),
    hero.id.replace(/[^a-z0-9]/gi, ""),
    levelCode,
    levelCode.replace(/[^a-z0-9]/gi, ""),
    levelLabel,
    levelLabel.replace(/\s+/g, ""),
    ownershipStatus,
    ownershipStatus.replace("-", "")
  ];

  const normalized = baseStrings
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return tokens.every((token) =>
    normalized.some((entry) => entry.includes(token))
  );
}

const filteredHeroes = computed(() => {
  const tokens = searchQuery.value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  return facetFilteredHeroes.value.filter(
    (hero) =>
      heroMatchesSearch(hero, tokens) &&
      matchesOwnershipFilter(hero.id)
  );
});

function matchesOwnershipFilter(heroId: string) {
  const status = getHeroOwnershipStatus(heroId);
  if (ownershipFilter.value === "all") return true;
  if (ownershipFilter.value === "owned") return status === "owned";
  if (ownershipFilter.value === "untracked") return status === "unassigned";
  if (ownershipFilter.value === "not-owned") return status === "not-owned";
  if (ownershipFilter.value === "lineup") {
    return lineupHeroIds.value.has(heroId);
  }
  return status !== "owned";
}

function updateOwned(heroId: string, levelIndex: number | null) {
  const idx = ownedHeroes.value.findIndex((o) => o.heroId === heroId);
  if (idx >= 0) {
    ownedHeroes.value[idx].levelIndex = levelIndex;
    if (levelIndex == null || levelIndex < 0) {
      lineup.value.slots.forEach((slot) => {
        if (slot.heroId === heroId) {
          slot.heroId = null;
        }
      });
    }
  }
}

function toggleHeroInLineup(heroId: string, shouldAdd: boolean) {
  if (shouldAdd) {
    if (lineupHeroIds.value.has(heroId)) return;
    const owned = ownedHeroes.value.find((h) => h.heroId === heroId);
    if (!owned || owned.levelIndex == null || owned.levelIndex < 0) return;
    const emptySlot = lineup.value.slots.find((slot) => !slot.heroId);
    if (!emptySlot) return;
    emptySlot.heroId = heroId;
    return;
  }
  const slotWithHero = lineup.value.slots.find((slot) => slot.heroId === heroId);
  if (slotWithHero) {
    slotWithHero.heroId = null;
  }
}

function togglePriority(slotIndex: number) {
  lineup.value.slots[slotIndex].isPriority =
    !lineup.value.slots[slotIndex].isPriority;
}

function clearLineupSlot(slotIndex: number) {
  lineup.value.slots[slotIndex].heroId = null;
}

function toggleRoleFilter(role: Role) {
  if (roleFilters.value.includes(role)) {
    roleFilters.value = roleFilters.value.filter((r) => r !== role);
  } else {
    roleFilters.value = [...roleFilters.value, role];
  }
}

function toggleElementFilter(element: Element) {
  if (elementFilters.value.includes(element)) {
    elementFilters.value = elementFilters.value.filter((e) => e !== element);
  } else {
    elementFilters.value = [...elementFilters.value, element];
  }
}

function toggleRarityFilter(rarity: Rarity) {
  if (rarityFilters.value.includes(rarity)) {
    rarityFilters.value = rarityFilters.value.filter((r) => r !== rarity);
  } else {
    rarityFilters.value = [...rarityFilters.value, rarity];
  }
}

function clearFilters() {
  roleFilters.value = [];
  elementFilters.value = [];
  rarityFilters.value = [];
  ownershipFilter.value = "all";
}

function clearSearch() {
  searchQuery.value = "";
}

function handleSearch(value: string) {
  searchQuery.value = value;
}

const hasActiveFilters = computed(
  () =>
    roleFilters.value.length > 0 ||
    elementFilters.value.length > 0 ||
    rarityFilters.value.length > 0 ||
    ownershipFilter.value !== "all"
);

const hasSearch = computed(() => searchQuery.value.trim().length > 0);

const isLineupFull = computed(() =>
  lineup.value.slots.every((slot) => !!slot.heroId)
);

const allHeroesClassified = computed(() =>
  ownedHeroes.value.every((hero) => hero.levelIndex !== null)
);

const canOptimize = computed(
  () => isLineupFull.value && allHeroesClassified.value
);

const lastUpdated = new Date().toLocaleDateString(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric"
});

function scrollResultsIntoView() {
  if (resultsRef.value) {
    resultsRef.value.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function optimize() {
  if (!canOptimize.value || isCalculating.value) return;
  isCalculating.value = true;
  lastResult.value = null;
  setTimeout(() => {
    const result = runOptimization(
      ownedHeroes.value,
      lineup.value,
      nightmareLevel.value
    );
    lastResult.value = result;
    isCalculating.value = false;
    scrollResultsIntoView();
  }, 0);
}

function optimizeFromResults() {
  scrollResultsIntoView();
  optimize();
}

function setOwnershipFilter(value: OwnershipFilter) {
  ownershipFilter.value = value;
}

const isMobileFilters = ref(false);
const filtersCollapsed = ref(false);
let filtersMediaQuery: MediaQueryList | null = null;
let filtersMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

function applyFiltersMediaState(matches: boolean) {
  isMobileFilters.value = matches;
  filtersCollapsed.value = matches;
}

onMounted(() => {
  if (typeof window === "undefined") return;
  filtersMediaQuery = window.matchMedia("(max-width: 820px)");
  applyFiltersMediaState(filtersMediaQuery.matches);
  filtersMediaListener = (event) => {
    isMobileFilters.value = event.matches;
    filtersCollapsed.value = event.matches;
  };
  filtersMediaQuery.addEventListener("change", filtersMediaListener);
});

onBeforeUnmount(() => {
  if (filtersMediaQuery && filtersMediaListener) {
    filtersMediaQuery.removeEventListener("change", filtersMediaListener);
  }
});

function toggleFiltersPanel() {
  filtersCollapsed.value = !filtersCollapsed.value;
}

const isIntroImageOpen = ref(false);

function openIntroImage() {
  isIntroImageOpen.value = true;
}

function closeIntroImage() {
  isIntroImageOpen.value = false;
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-title">Wittle Defenders Akashic Arbor Optimizer</div>
      <div class="app-subtitle">
        Save hero levels, pick your lineup from the collection, set nightmare
        level, then optimize the tree for your priority units.
      </div>
    </header>

    <main class="app-main">
      <button
        v-if="introHidden"
        class="btn btn-sm btn-secondary intro-toggle"
        type="button"
        @click="introHidden = false"
      >
        Show Akashic Arbor intro
      </button>
      <section v-else class="panel intro-panel">
        <div class="panel-header">
          <div class="panel-title">What is the Akashic Arbor?</div>
          <button class="btn btn-sm btn-ghost" type="button" @click="introHidden = true">
            Hide
          </button>
        </div>
        <div class="panel-body intro-body">
          <p>
            Akashic Arbor unlocks for Wittle Defenders players at account level 35, eight days after
            the account is created. Each role and element node contains up to three slots. A hero can
            be placed in either its role node or its element node, and every slot grants stat bonuses
            to the lineup: matching heroes receive <strong>3×</strong> the listed ATK/DEF/HP %, while
            all other heroes receive <strong>1×</strong> the same value.
          </p>
          <ul>
            <li>Heroes can only occupy one slot at a time, so trading a hero between role and element nodes matters.</li>
            <li>Slot unlocks depend on your Nightmare progress - this tool tracks those thresholds and only optimizes available slots.</li>
            <li>The calculator stores hero levels, lineup, and preference for priority targets so the best buffs are recomputed instantly.</li>
          </ul>
          <div class="intro-actions">
            <a class="link-btn" href="#hero-collection">Track heroes now</a>
            <button class="btn btn-sm btn-secondary" type="button" @click="openIntroImage">
              View Example Arbor
            </button>
          </div>
        </div>
      </section>

      <section class="panel lineup-panel">
        <div class="panel-body">
          <LineupPanel
            :heroes="HEROES"
            :lineup="lineup"
            :owned="ownedHeroes"
            :untracked-count="untrackedHeroesCount"
            @toggle-priority="togglePriority"
            @clear-slot="clearLineupSlot"
          />
        </div>
      </section>

      <section class="panel settings-panel">
        <SettingsPanel
          v-model:nightmareLevel="nightmareLevel"
          :optimize-disabled="!canOptimize || isCalculating"
          :lineup-ready="isLineupFull"
          :all-classified="allHeroesClassified"
          :untracked-count="untrackedHeroesCount"
          :is-calculating="isCalculating"
          @optimize="optimize"
        />
      </section>
      <section class="panel" v-if="lastResult || isCalculating" ref="resultsRef">
        <div class="panel-header">
          <div class="panel-title">Results</div>
        </div>
        <div class="panel-body">
          <div v-if="isCalculating" class="calc-status-panel">
            <span class="spinner"></span>
            <span>Calculating optimal arbor...</span>
          </div>
          <ResultsPanel
            v-else
            :result="lastResult"
            :lineup="lineup"
            :heroes="HEROES"
            :owned="ownedHeroes"
            :nightmare-level="nightmareLevel"
            @optimize-again="optimizeFromResults"
          />
        </div>
      </section>

      <section
        class="panel filters-panel"
        :class="{
          'is-collapsible': isMobileFilters,
          collapsed: isMobileFilters && filtersCollapsed
        }"
      >
        <div class="panel-header filters-header">
          <div class="panel-title">Filter Heroes</div>
          <div class="filters-header-actions">
            <button class="btn btn-sm btn-ghost" @click="clearFilters" :disabled="!hasActiveFilters">
              Clear
            </button>
            <button
              v-if="isMobileFilters"
              class="btn btn-sm btn-ghost collapse-toggle"
              type="button"
              @click="toggleFiltersPanel"
              :aria-expanded="!filtersCollapsed"
            >
              <i
                :class="[
                  'fa-solid',
                  filtersCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'
                ]"
                aria-hidden="true"
              ></i>
              {{ filtersCollapsed ? "Show Filters" : "Hide Filters" }}
            </button>
          </div>
        </div>
        <div class="panel-body" v-if="!isMobileFilters || !filtersCollapsed">
          <HeroFilters
            :selected-roles="roleFilters"
            :selected-elements="elementFilters"
            :selected-rarities="rarityFilters"
            @toggle-role="toggleRoleFilter"
            @toggle-element="toggleElementFilter"
            @toggle-rarity="toggleRarityFilter"
          />
        </div>
      </section>

      <section class="panel hero-panel" id="hero-collection">
        <div class="panel-header">
          <div class="panel-title">Hero Collection</div>
        </div>
        <div class="panel-body">
          <HeroCollection
            :heroes="filteredHeroes"
            :owned="ownedHeroes"
            :lineupHeroIds="lineupHeroIds"
            :levels="LEVELS"
            :lineup-size="lineup.slots.length"
            :search-value="searchQuery"
            :total-count="HEROES.length"
            :shown-count="filteredHeroes.length"
            :has-active-filters="hasActiveFilters"
            :has-search="hasSearch"
            :ownership-filter="ownershipFilter"
            @update-owned="updateOwned"
            @toggle-lineup="toggleHeroInLineup"
            @search="handleSearch"
            @clear-search="clearSearch"
            @clear-filters="clearFilters"
            @update:ownershipFilter="setOwnershipFilter"
          />
        </div>
      </section>
    </main>
    <footer class="app-footer">
      <div class="footer-meta">
        <span>
          Wittle Defenders is ©
          <a href="https://www.habby.com/" target="_blank" rel="noreferrer">Habby</a>.
          Tool created by Sahagin Dazs.
        </span>
        <span>Last updated {{ lastUpdated }}</span>
        <span class="footer-support-note">
          Hosting and development are funded out of pocket. If this tool helps you, please consider supporting the costs to keep it online.
        </span>
      </div>
      <div class="footer-actions">
        <a class="btn btn-sm btn-secondary" href="https://github.com/sahagin-dazs/wd-akashic-arbor-calc" target="_blank" rel="noreferrer">
          View Source on GitHub
        </a>
        <a class="btn btn-sm btn-support" href="https://www.buymeacoffee.com/sahagin" target="_blank" rel="noreferrer">
          Support This Tool
        </a>
      </div>
    </footer>
    <div
      v-if="isIntroImageOpen"
      class="intro-modal-backdrop"
      role="presentation"
      @click="closeIntroImage"
    >
      <div class="intro-modal" role="dialog" aria-modal="true" aria-label="Example Akashic Arbor" @click.stop>
        <img :src="ARBOR_IMAGE_SRC" alt="Example Akashic Arbor" />
        <p>Example Akashic Arbor</p>
        <button class="btn btn-sm btn-secondary" type="button" @click="closeIntroImage">
          Close
        </button>
      </div>
    </div>
  </div>
</template>
