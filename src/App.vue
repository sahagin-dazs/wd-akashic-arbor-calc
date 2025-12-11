<script setup lang="ts">
import { ref, computed, watch } from "vue";
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

type OwnershipFilter = "all" | "owned" | "not-owned" | "lineup";

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
    stored === "all" ||
    stored === "lineup"
  ) {
    return stored;
  }
  return "all";
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

const lineupHeroIds = computed(() =>
  new Set(lineup.value.slots.map((s) => s.heroId).filter(Boolean) as string[])
);

const roleFilters = ref<Role[]>([]);
const elementFilters = ref<Element[]>([]);
const rarityFilters = ref<Rarity[]>([]);
const searchQuery = ref("");
const ownershipFilter = ref<OwnershipFilter>(loadOwnershipFilter());

watch(ownershipFilter, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNERSHIP_FILTER_STORAGE_KEY, value);
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
  if (ownershipFilter.value === "lineup") {
    return lineupHeroIds.value.has(heroId);
  }
  return status !== "owned"; // includes not-owned + unassigned
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
  }, 0);
}

function setOwnershipFilter(value: OwnershipFilter) {
  ownershipFilter.value = value;
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-title">Akashic Arbor Optimizer</div>
      <div class="app-subtitle">
        Save hero levels, pick your lineup from the collection, set nightmare
        level, then optimize the tree for your priority units.
      </div>
    </header>

    <main class="app-main">
      <section class="panel lineup-panel">
        <div class="panel-body">
          <LineupPanel
            :heroes="HEROES"
            :lineup="lineup"
            :owned="ownedHeroes"
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
          :is-calculating="isCalculating"
          @optimize="optimize"
        />
      </section>
      <section class="panel" v-if="lastResult || isCalculating">
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
          />
        </div>
      </section>

      <section class="panel filters-panel">
        <div class="panel-header">
          <div class="panel-title">Filter Heroes</div>
          <button class="btn btn-sm btn-ghost" @click="clearFilters" :disabled="!hasActiveFilters">
            Clear
          </button>
        </div>
        <div class="panel-body">
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
  </div>
</template>
