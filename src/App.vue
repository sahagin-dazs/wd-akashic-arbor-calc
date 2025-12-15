<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { HEROES } from "./models/heroes";
import type {
  OwnedHero,
  Lineup,
  Role,
  Element,
  Rarity,
  Level,
  OptimizationResult
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
const THEME_STORAGE_KEY = "wd-akashic-theme";
const BASE_URL =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const ARBOR_IMAGE_SRC = `${NORMALIZED_BASE}images/arbor.jpg`;
const APP_VERSION = "1.3.1";

type OwnershipFilter = "all" | "owned" | "not-owned" | "untracked" | "lineup";
type ThemeMode = "dark" | "light";

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
      { heroId: null, priorityRank: null },
      { heroId: null, priorityRank: null },
      { heroId: null, priorityRank: null },
      { heroId: null, priorityRank: null },
      { heroId: null, priorityRank: null }
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
    const slots = parsed.slots.slice(0, 5).map((slot) => {
      const normalized: LineupSlot = {
        heroId: typeof slot?.heroId === "string" ? slot.heroId : null,
        priorityRank:
          typeof slot?.priorityRank === "number"
            ? slot.priorityRank
            : null
      };
      return {
        slot: normalized,
        legacyPriority: normalized.priorityRank == null && slot?.isPriority
      };
    });
    const legacyOrdered = slots.filter((s) => s.legacyPriority);
    legacyOrdered.forEach(({ slot }, index) => {
      slot.priorityRank = index + 1;
    });
    const normalizedSlots = slots.map(({ slot }) => slot);
    while (normalizedSlots.length < 5) {
      normalizedSlots.push({ heroId: null, priorityRank: null });
    }
    return { slots: normalizedSlots };
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

function loadTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  if (window.matchMedia?.("(prefers-color-scheme: light)")?.matches) {
    return "light";
  }
  return "dark";
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

const lastResult = ref<OptimizationResult | null>(null);
const isCalculating = ref(false);
const resultsRef = ref<HTMLElement | null>(null);
const calcProgress = ref(0);
const calcProgressTarget = ref(0);
const calcPhrase = ref("Consulting the Arbor spirits...");
const calcPhraseKey = ref(0);
const FUN_PHRASES = [
  "Polishing Cheffy's ladle of destiny...",
  "Convincing Scarlet Reaper to let her hair down...",
  "Praying to RNGesus for good rune rolls...",
  "Reloading the game hoping for an update...",
  "Playing bingo...",
  "Wasting tickets on wheel spins...",
  "Converting Hero EXP to Promotion Stones...",
  "Raising Hero Echo Level...",
  "Hoping Wave 20 isn't Medusa Queen...",
  "Partying with Mr. Plump...",
  "Feeding rune dust to Void Witch's Piercing Sights...",
  "Spending Lunarite on xeno scrolls...",
  "Asking Archon Armor to reboot its Afterimages...",
  "Feeding Fiery Vanguard extra ember snacks...",
  "Unmasking Zorro...",
  "Kiting boss attacks with Ice Demon trolls...",
  "Buying essences from the black market vendor...",
  "Nerfing Polar Captain in Arena...",
  "Rolling Fire DMG on the Oracle Statue until it sparks...",
  "Checking Abyss Tower leaderboards for new rivals...",
  "Donating 5x daily to the guild...",
  "Running a Quick Patrol for inspiration...",
  "Collecting daily rewards from the mailbox...",
  "Merging hero shards...",
  "Salvaging gear for extra Enhancite...",
  "Enjoying a 0% success rate on gear refinement...",
  "Sending daily friend gifts...",
  "Peeking at the arcade leaderboard between runs...",
  "Hitting 30-scroll pity on the Xeno banner...",
  "Skipping ads like a true veteran...",
  "Polishing the guild statue for bonus luck...",
  "Taking a peek in the Golden Rat Hole...",
  "Assembling snacks for the Cheffy fan club...",
  "Teaching Ice Wolf Pup some new tricks...",
  "Running spreadsheets to please the Arbor spirits...",
  "Stargazing for comets with Starlight Weaver...",
  "Dreaming of a Demon Spawn buff...",
  "Losing in Apex arena...",
  "Rewiring Robot's overclocked core...",
  "Negotiating with the shopkeeper for extra rerolls...",
  "Charting rune routes through Goblin Ground...",
  "Syncing patrol timers with your sleep schedule...",
  "Updating guild message with fresh memes...",
  "Repainting the Arbor nodes for extra sparkle...",
  "Sharpening Sword Saint's blades for dramatic effect...",
  "Clearing Quick Patrol rewards...",
  "Complaining about Rate-up drop rates..."
];
let phraseTimer: number | null = null;
let progressInterval: number | null = null;
const NAV_LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "Lineup", href: "#lineup" },
  { label: "Settings", href: "#settings" },
  { label: "Hero Collection", href: "#hero-collection" },
  { label: "Changelog", href: "/changelog.html", external: true }
];


function pickRandomPhrase(previous?: string) {
  const candidates = FUN_PHRASES.filter((phrase) => phrase !== previous);
  const pool = candidates.length ? candidates : FUN_PHRASES;
  const next = pool[Math.floor(Math.random() * pool.length)];
  return next ?? previous ?? FUN_PHRASES[0];
}

function startPhraseLoop() {
  stopPhraseLoop();
  calcPhrase.value = pickRandomPhrase();
  calcPhraseKey.value += 1;
  if (typeof window === "undefined") return;
  phraseTimer = window.setInterval(() => {
    calcPhrase.value = pickRandomPhrase(calcPhrase.value);
    calcPhraseKey.value += 1;
  }, 3500);
}

function stopPhraseLoop() {
  if (phraseTimer) {
    clearInterval(phraseTimer);
    phraseTimer = null;
  }
}

function startProgressInterval() {
  if (typeof window === "undefined") return;
  if (progressInterval) {
    clearInterval(progressInterval);
  }
  progressInterval = window.setInterval(() => {
    if (calcProgress.value < calcProgressTarget.value) {
      calcProgress.value = Math.min(
        calcProgress.value + 0.015,
        calcProgressTarget.value
      );
    } else if (
      calcProgressTarget.value < 0.96 &&
      calcProgressTarget.value < 1
    ) {
      calcProgressTarget.value = Math.min(
        calcProgressTarget.value + 0.005,
        0.96
      );
    }
    if (calcProgress.value >= 1 && progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }, 900);
}

function stopProgressInterval() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

const lineupHeroIds = computed(() =>
  new Set(lineup.value.slots.map((s) => s.heroId).filter(Boolean) as string[])
);

const roleFilters = ref<Role[]>([]);
const elementFilters = ref<Element[]>([]);
const rarityFilters = ref<Rarity[]>([]);
const searchQuery = ref("");
const ownershipFilter = ref<OwnershipFilter>(loadOwnershipFilter());
const introHidden = ref(loadIntroHidden());
const theme = ref<ThemeMode>(loadTheme());

watch(ownershipFilter, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNERSHIP_FILTER_STORAGE_KEY, value);
});

watch(introHidden, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(INTRO_STORAGE_KEY, value ? "true" : "false");
});

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
}

watch(theme, (value) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, value);
  }
  applyTheme(value);
});

if (typeof document !== "undefined") {
  applyTheme(theme.value);
}

const themeButtonLabel = computed(() =>
  theme.value === "dark" ? "Light Mode" : "Dark Mode"
);
const themeAriaLabel = computed(() =>
  theme.value === "dark" ? "Switch to light mode" : "Switch to dark mode"
);
const themeIcon = computed(() =>
  theme.value === "dark" ? "fa-sun" : "fa-moon"
);

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
          slot.priorityRank = null;
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
    slotWithHero.priorityRank = null;
  }
}

function setPriorityRank(slotIndex: number, rank: number | null) {
  const slot = lineup.value.slots[slotIndex];
  if (!slot) return;
  if (!slot.heroId) {
    slot.priorityRank = null;
    return;
  }
  if (rank === null) {
    slot.priorityRank = null;
    return;
  }
  // Ensure uniqueness: remove rank from other slots.
  lineup.value.slots.forEach((other, idx) => {
    if (idx !== slotIndex && other.priorityRank === rank) {
      other.priorityRank = null;
    }
  });
  slot.priorityRank = rank;
}

function clearLineupSlot(slotIndex: number) {
  lineup.value.slots[slotIndex].heroId = null;
  lineup.value.slots[slotIndex].priorityRank = null;
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
  if (!resultsRef.value || typeof window === "undefined") return;
  const rect = resultsRef.value.getBoundingClientRect();
  const target = rect.top + window.scrollY - 24;
  window.scrollTo({
    top: Math.max(target, 0),
    behavior: "smooth"
  });
}

async function optimize() {
  if (!canOptimize.value || isCalculating.value) return;
  isCalculating.value = true;
  calcProgress.value = 0;
  calcProgressTarget.value = 0.15;
  startProgressInterval();
  lastResult.value = null;
  startPhraseLoop();
  const ownedPayload = ownedHeroes.value.map((hero) => ({
    heroId: hero.heroId,
    levelIndex: hero.levelIndex
  }));
  const lineupPayload: Lineup = {
    slots: lineup.value.slots.map((slot) => ({
      heroId: slot.heroId,
      priorityRank: slot.priorityRank
    }))
  };
  try {
    const result = await runOptimization(
      ownedPayload,
      lineupPayload,
      nightmareLevel.value,
      (progress) => {
          const clamped = Math.min(Math.max(progress, 0), 0.9);
          if (clamped > calcProgressTarget.value) {
            calcProgressTarget.value = clamped;
            startProgressInterval();
          }
      }
    );
    lastResult.value = result;
    calcProgressTarget.value = 1;
    startProgressInterval();
    scrollResultsIntoView();
  } catch (error) {
    console.error("Failed to optimize arbor", error);
  } finally {
    isCalculating.value = false;
    stopPhraseLoop();
    stopProgressInterval();
    calcProgress.value = 1;
    calcPhrase.value = "Arbor ready to deploy!";
  }
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

const navOpen = ref(false);
const isMobileNav = ref(false);

function applyFiltersMediaState(matches: boolean) {
  isMobileFilters.value = matches;
  filtersCollapsed.value = matches;
}

function updateNavMode() {
  if (typeof window === "undefined") return;
  isMobileNav.value = window.innerWidth < 900;
  if (!isMobileNav.value) {
    navOpen.value = false;
  }
}

function toggleNav() {
  navOpen.value = !navOpen.value;
}

function closeNav() {
  navOpen.value = false;
}

function handleNavLink(link?: { external?: boolean }) {
  if (link?.external) return;
  closeNav();
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
  updateNavMode();
  window.addEventListener("resize", updateNavMode);
});

onBeforeUnmount(() => {
  if (filtersMediaQuery && filtersMediaListener) {
    filtersMediaQuery.removeEventListener("change", filtersMediaListener);
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateNavMode);
  }
  stopPhraseLoop();
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

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="logo-block">
        <div class="app-title">WD Akashic Arbor Optimizer</div>
      </div>
      <nav class="desktop-nav">
        <a
          v-for="link in NAV_LINKS"
          :key="link.href"
          :href="link.href"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noreferrer' : undefined"
          @click="handleNavLink(link)"
        >
          {{ link.label }}
        </a>
      </nav>
      <div class="header-actions">
        <button
          class="btn btn-sm btn-ghost theme-toggle"
          type="button"
          @click="toggleTheme"
          :aria-label="themeAriaLabel"
        >
          <i class="fa-solid" :class="themeIcon" aria-hidden="true"></i>
          <span>{{ themeButtonLabel }}</span>
        </button>
        <a
          class="btn btn-sm btn-discord"
          href="https://discord.com/invite/wittledefender"
          target="_blank"
          rel="noreferrer"
        >
          <i class="fa-brands fa-discord" aria-hidden="true"></i>
          Join Discord
        </a>
        <a
          class="btn btn-sm btn-support header-support"
          href="https://www.buymeacoffee.com/sahagin"
          target="_blank"
          rel="noreferrer"
        >
          Support this Project
        </a>
        <button
          class="nav-toggle"
          type="button"
          @click="toggleNav"
          :aria-expanded="navOpen"
        >
          <i class="fa-solid" :class="navOpen ? 'fa-xmark' : 'fa-bars'" aria-hidden="true"></i>
          <span class="sr-only">Toggle navigation</span>
        </button>
      </div>
      <div
        v-if="navOpen && isMobileNav"
        class="mobile-nav"
        role="dialog"
        aria-modal="true"
      >
        <a
          v-for="link in NAV_LINKS"
          :key="`mobile-${link.href}`"
          :href="link.href"
          :target="link.external ? '_blank' : undefined"
          :rel="link.external ? 'noreferrer' : undefined"
          @click="handleNavLink(link)"
        >
          {{ link.label }}
        </a>
        <a
          class="btn btn-sm btn-discord"
          href="https://discord.com/invite/wittledefender"
          target="_blank"
          rel="noreferrer"
          @click="handleNavLink"
        >
          <i class="fa-brands fa-discord" aria-hidden="true"></i>
          Join Discord
        </a>
        <a
          class="btn btn-sm btn-support"
          href="https://www.buymeacoffee.com/sahagin"
          target="_blank"
          rel="noreferrer"
          @click="handleNavLink"
        >
          Support this Project
        </a>
        <button
          class="btn btn-sm btn-ghost theme-toggle"
          type="button"
          @click="toggleTheme"
          :aria-label="themeAriaLabel"
        >
          <i class="fa-solid" :class="themeIcon" aria-hidden="true"></i>
          <span>{{ themeButtonLabel }}</span>
        </button>
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
      <section v-else class="panel intro-panel" id="overview">
        <div class="panel-header">
          <div class="panel-title">About this tool</div>
          <button class="btn btn-sm btn-ghost" type="button" @click="introHidden = true">
            Hide
          </button>
        </div>
        <div class="panel-body intro-body">
          <p class="intro-tagline">
            Save hero levels, set your nightmare progress, prioritize lineups, and let the optimizer handle the math.
          </p>
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

      <section class="panel lineup-panel" id="lineup">
        <div class="panel-body">
          <LineupPanel
            :heroes="HEROES"
            :lineup="lineup"
            :owned="ownedHeroes"
            :untracked-count="untrackedHeroesCount"
            @set-rank="setPriorityRank"
            @clear-slot="clearLineupSlot"
          />
        </div>
      </section>

      <section class="panel settings-panel" id="settings">
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
      <section class="panel" v-if="lastResult || isCalculating" ref="resultsRef" id="results">
        <div class="panel-header">
          <div class="panel-title">Results</div>
        </div>
        <div class="panel-body">
          <div v-if="isCalculating" class="calc-status-panel">
            Optimization in progress... check the overlay for live status.
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
        id="filters"
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

    <div
      v-if="isCalculating"
      class="calc-overlay"
      role="alert"
      aria-live="assertive"
    >
      <div class="calc-overlay-card">
        <transition name="phrase-fade" mode="out-in">
          <div class="calc-progress-text" :key="calcPhraseKey">{{ calcPhrase }}</div>
        </transition>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${Math.round(calcProgress * 100)}%` }"></div>
        </div>
        <div class="progress-percent">{{ Math.round(calcProgress * 100) }}%</div>
      </div>
    </div>
    <footer class="app-footer">
      <div class="footer-meta">
        <span>
          Wittle Defenders is ©
          <a href="https://www.habby.com/" target="_blank" rel="noreferrer">Habby</a>.
          Tool created by Sahagin Dazs.
        </span>
        <span>Last updated {{ lastUpdated }}</span>
        <span>Version v{{ APP_VERSION }} • <a href="/changelog.html" target="_blank" rel="noreferrer">Changelog</a></span>
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
