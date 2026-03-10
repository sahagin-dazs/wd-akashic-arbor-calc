<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import html2canvas from "html2canvas";
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
import SummonSimulator from "./components/SummonSimulator.vue";
import { runOptimization } from "./logic/optimizer";
import TierListBuilder from "./components/TierListBuilder.vue";
import LineupBuilder from "./components/LineupBuilder.vue";
import SkillsExplorer from "./components/SkillsExplorer.vue";
import { avatarUrl } from "./utils/avatar";

const HERO_STORAGE_KEY = "wd-akashic-owned-heroes";
const NIGHTMARE_STORAGE_KEY = "wd-akashic-nightmare-level";
const LINEUP_STORAGE_KEY = "wd-akashic-lineup";
const OWNERSHIP_FILTER_STORAGE_KEY = "wd-akashic-ownership-filter";
const INTRO_STORAGE_KEY = "wd-akashic-intro-hidden";
const WELCOME_POPUP_DISMISSED_KEY = "wd-tools-welcome-popup-dismissed";
const THEME_STORAGE_KEY = "wd-akashic-theme";
const ACTIVE_TOOL_STORAGE_KEY = "wd-tools-active-view";
const SCREEN_NAME_STORAGE_KEY = "wd-tools-screen-name";
const BASE_URL =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const ARBOR_IMAGE_SRC = `${NORMALIZED_BASE}images/arbor.jpg`;
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
const TOOL_TABS = [
  { id: "collection", label: "Hero Collection" },
  { id: "arbor", label: "Akashic Arbor" },
  { id: "summons", label: "Summon Simulator" },
  { id: "lineups", label: "Lineups" },
  { id: "skills", label: "Skills Explorer" },
  { id: "tiers", label: "Tier Lists" }
] as const;
type ToolTab = (typeof TOOL_TABS)[number]["id"];
const HASH_TOOL_MAP: Record<string, ToolTab> = {
  "#summon": "summons",
  "#summons": "summons",
  "#arbor": "arbor",
  "#lineup": "lineups",
  "#lineups": "lineups",
  "#skill": "skills",
  "#skills": "skills",
  "#tier": "tiers",
  "#tiers": "tiers",
  "#collection": "collection"
};
const LEGACY_HOST = "sahagin-dazs.github.io";
const LEGACY_PATH = "/wd-akashic-arbor-calc";
const SUPPORTER_ROYALTY = [
  "Harkshaw",
  "Joseph",
  "Honey Bradger",
  "Fray"
] as const;

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

function loadScreenName() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SCREEN_NAME_STORAGE_KEY) || "";
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

function loadWelcomePopupDismissed(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(WELCOME_POPUP_DISMISSED_KEY) === "true";
}

const ownedHeroes = ref<OwnedHero[]>(loadOwnedHeroes());
const ownedExportRef = ref<HTMLElement | null>(null);
const ownedExporting = ref(false);
const ownedExportStatus = ref<string | null>(null);
const screenName = ref(loadScreenName());
const ownedExportDate = ref("");
const isResetCollectionOpen = ref(false);
const showWelcomePopup = ref(!loadWelcomePopupDismissed());

type LevelIconType = "star" | "moon" | "diamond" | "sublime";
const LEVEL_ICON_SRC_MAP: Record<LevelIconType, string> = {
  star: `${NORMALIZED_BASE}images/star.png`,
  moon: `${NORMALIZED_BASE}images/moon.png`,
  diamond: `${NORMALIZED_BASE}images/diamond.png`,
  sublime: `${NORMALIZED_BASE}images/sublime.png`
};
const EXPORT_RARITIES: Rarity[] = ["Sublime", "Mythic", "Legendary"];

watch(
  ownedHeroes,
  (value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(HERO_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

watch(
  screenName,
  (value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SCREEN_NAME_STORAGE_KEY, value.trim());
  },
  { immediate: true }
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
    window.dispatchEvent(new Event("wd-akashic-lineup-updated"));
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
const calcElapsedSeconds = ref(0);
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
  "Polishing the Skeleton King's crown for bonus luck...",
  "Taking a peek in the Golden Rat Hole...",
  "Assembling snacks for the Cheffy fan club...",
  "Teaching Ice Wolf Pup some new tricks...",
  "Running spreadsheets to please the Arbor spirits...",
  "Stargazing for comets with Starlight Weaver...",
  "Dreaming of a Demon Spawn buff...",
  "Losing every battle in Apex arena...",
  "Rewiring Robot's overclocked core...",
  "Negotiating with the shopkeeper for extra rerolls...",
  "Charting rune routes through Goblin Ground...",
  "Syncing patrol timers with your sleep schedule...",
  "Updating guild message with fresh memes...",
  "Repainting the Arbor nodes for extra sparkle...",
  "Sharpening Sword Saint's blades for dramatic effect...",
  "Clearing Quick Patrol rewards...",
  "Complaining about Rate-up drop rates...",
  "Helping Monkey King find the perfect cloud parking spot...",
  "Trying to keep Peace Keeper from punching the UI...",
  "Teaching Starlight Weaver to stop naming every comet...",
  "Asking Void Witch to stop opening portals during maintenance...",
  "Counting Polar Captain ricochets and losing count at 3...",
  "Convincing Valkyrie that every target is already judged...",
  "Dodging Windborne Ranger arrows in the backline...",
  "Politely declining Cheffy's mystery stew buff...",
  "Calibrating Archon Armor's afterimage warranty...",
  "Untangling Ice Queen's freeze paperwork...",
  "Reminding Fiery Vanguard that the tree is not fireproof...",
  "Sweeping Demon Spawn embers out of the optimizer cache...",
  "Asking Robot to restart without exploding...",
  "Letting Scarlet Reaper pose before every simulation...",
  "Checking if Odin's lightning qualifies as a feature...",
  "Trying to bench Night Baron, failing dramatically...",
  "Measuring Swordmaster spin speed in RPM...",
  "Sharpening Blazing Archer arrows for mathematically optimal drama...",
  "Negotiating with Thunder Pharaoh over pyramid zoning rights...",
  "Feeding Ice Demon exactly one (1) tiny chaos snack...",
  "Rewriting Monkey King's staff permissions for Arbor access...",
  "Asking Starlight Weaver to stop summoning comets indoors...",
  "Checking Peace Keeper's safety manual (page missing)...",
  "Convincing Void Witch to close at least one portal...",
  "Untangling Demon Spawn from a very fiery cable mess...",
  "Helping Windborne Ranger aim somewhere less judgmental...",
  "Timing Polar Captain bounces with a kitchen stopwatch...",
  "Buffing Archon Armor with premium elbow grease...",
  "Trying to invoice Odin for lightning damage to the nodes...",
  "Teaching Sword Saint that subtlety is also DPS...",
  "Cooling down Fiery Vanguard with one tiny ice cube...",
  "Asking Scarlet Reaper for one non-dramatic entrance...",
  "Auditing Cheffy's crit-rate soup ingredients...",
  "Polishing Robot's core until it passes inspection...",
  "Explaining to Ice Queen why frostbite isn't a tax deduction...",
  "Helping Thunder Pharaoh file a storm permit...",
  "Telling Valkyrie that every fight is not the final boss...",
  "Separating Night Baron from the optimizer's shadow settings...",
  "Charging Peace Keeper's battery with pure optimism...",
  "Giving Monkey King a cloud lane assignment for faster clears...",
  "Checking if Void Witch can portal around cooldowns legally...",
  "Negotiating with Blazing Archer over arrow budget cuts...",
  "Reminding Demon Hunter that this is math, not vengeance...",
  "Recounting Swordmaster spins after another dizzying test...",
  "Bribing Ice Wolf Pup with treats for cleaner pathing...",
  "Turning Odin's thunder volume from MAX to merely LOUD...",
  "Rehearsing Starlight Weaver's comet timing with a metronome...",
  "Making sure Polar Captain's ricochet doesn't hit the UI again...",
  "Double-checking Fiery Vanguard's torch distance from dry leaves...",
  "Convincing Monkey King that clone tax is not a real thing..."
];
let phraseTimer: number | null = null;
let progressInterval: number | null = null;
let calcElapsedTimer: number | null = null;

function toolFromHash(hash: string): ToolTab | null {
  const normalized = hash.toLowerCase();
  if (normalized.startsWith("#tier=") || normalized.startsWith("#tiers=")) {
    return "tiers";
  }
  if (normalized.startsWith("#tier&") || normalized.startsWith("#tiers&")) {
    return "tiers";
  }
  if (normalized.startsWith("#lineup=") || normalized.startsWith("#lineups=")) {
    return "lineups";
  }
  if (normalized.startsWith("#lineup&") || normalized.startsWith("#lineups&")) {
    return "lineups";
  }
  return HASH_TOOL_MAP[normalized as "#summon"] ?? null;
}

function loadActiveTool(): ToolTab {
  if (typeof window === "undefined") return "arbor";
  const isLegacyHost =
    window.location.hostname === LEGACY_HOST &&
    window.location.pathname.startsWith(LEGACY_PATH);
  const hashTool = toolFromHash(window.location.hash);
  if (hashTool === "tiers" && isLegacyHost) return "arbor";
  if (hashTool === "lineups" && isLegacyHost) return "arbor";
  if (hashTool) return hashTool;
  const stored = localStorage.getItem(ACTIVE_TOOL_STORAGE_KEY);
  if (stored === "tiers" && isLegacyHost) return "arbor";
  if (stored === "lineups" && isLegacyHost) return "arbor";
  return stored === "summons" ||
    stored === "tiers" ||
    stored === "lineups" ||
    stored === "collection" ||
    stored === "skills"
    ? (stored as ToolTab)
    : "arbor";
}

const activeTool = ref<ToolTab>(loadActiveTool());

watch(activeTool, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_TOOL_STORAGE_KEY, value);
  syncToolHash(value);
});

function setActiveTool(tab: ToolTab) {
  if (tab === "tiers" && isTierDisabled.value) return;
  if (tab === "lineups" && isLineupDisabled.value) return;
  activeTool.value = tab;
  closeNav();
}

function syncToolHash(value: ToolTab) {
  if (typeof window === "undefined") return;
  if (value === "tiers" && isTierDisabled.value) {
    window.location.hash = "#arbor";
    return;
  }
  if (value === "collection") {
    if (window.location.hash !== "#collection") {
      window.location.hash = "#collection";
    }
    return;
  }
  if (value === "skills") {
    if (window.location.hash !== "#skills") {
      window.location.hash = "#skills";
    }
    return;
  }
  const hash = window.location.hash.toLowerCase();
  if (value === "summons") {
    if (hash !== "#summon" && hash !== "#summons") {
      window.location.hash = "#summon";
    }
  } else if (value === "lineups") {
    const isLineupHash =
      hash === "#lineup" ||
      hash === "#lineups" ||
      hash.startsWith("#lineup=") ||
      hash.startsWith("#lineups=");
    if (!isLineupHash) {
      window.location.hash = "#lineup";
    }
  } else if (value === "tiers") {
    const isTierHash =
      hash === "#tier" ||
      hash === "#tiers" ||
      hash.startsWith("#tier=") ||
      hash.startsWith("#tiers=");
    if (!isTierHash) {
      window.location.hash = "#tier";
    }
  } else {
    if (hash !== "#arbor") {
      window.location.hash = "#arbor";
    }
  }
}

function handleToolHashChange() {
  if (typeof window === "undefined") return;
  const mapped = toolFromHash(window.location.hash);
  if (mapped === "tiers" && isTierDisabled.value) {
    activeTool.value = "arbor";
    window.location.hash = "#arbor";
    return;
  }
  if (mapped === "lineups" && isLineupDisabled.value) {
    activeTool.value = "arbor";
    window.location.hash = "#arbor";
    return;
  }
  if (mapped && mapped !== activeTool.value) {
    activeTool.value = mapped;
  } else if (!mapped && activeTool.value === "summons") {
    activeTool.value = "arbor";
  }
}

const isArborView = computed(() => activeTool.value === "arbor");
const isSummonView = computed(() => activeTool.value === "summons");
const isLineupView = computed(() => activeTool.value === "lineups");
const isSkillsView = computed(() => activeTool.value === "skills");
const isTierView = computed(() => activeTool.value === "tiers");
const isCollectionView = computed(() => activeTool.value === "collection");
const isTierDisabled = computed(() => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === LEGACY_HOST &&
    window.location.pathname.startsWith(LEGACY_PATH)
  );
});
const isLineupDisabled = computed(() => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === LEGACY_HOST &&
    window.location.pathname.startsWith(LEGACY_PATH)
  );
});

function jumpToHeroCollection(event?: Event) {
  if (event) {
    event.preventDefault();
  }
  if (!isCollectionView.value) {
    setActiveTool("collection");
  }
  nextTick(() => {
    if (typeof window !== "undefined") {
      window.location.hash = "#collection";
    }
  });
}

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

function formatElapsedDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

const showLongCalcNotice = computed(() => calcElapsedSeconds.value >= 60);
const calcElapsedLabel = computed(() =>
  formatElapsedDuration(calcElapsedSeconds.value)
);

function startCalcElapsedTimer() {
  stopCalcElapsedTimer();
  calcElapsedSeconds.value = 0;
  if (typeof window === "undefined") return;
  calcElapsedTimer = window.setInterval(() => {
    calcElapsedSeconds.value += 1;
  }, 1000);
}

function stopCalcElapsedTimer() {
  if (calcElapsedTimer) {
    clearInterval(calcElapsedTimer);
    calcElapsedTimer = null;
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
        calcProgress.value + 0.01,
        calcProgressTarget.value
      );
    } else if (
      calcProgressTarget.value < 0.96 &&
      calcProgressTarget.value < 1
    ) {
      calcProgressTarget.value = Math.min(
        calcProgressTarget.value + 0.003,
        0.96
      );
    }
    if (calcProgress.value >= 1 && progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }, 1000);
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

const hasPendingHeroes = computed(() => untrackedHeroesCount.value > 0);

watch(untrackedHeroesCount, (count) => {
  if (count === 0 && ownershipFilter.value === "untracked") {
    ownershipFilter.value = "all";
  }
});

function describeLevel(level: Level | "NONE") {
  if (level === "NONE") return "No Stars";
  if (level === "RD") return "Sublime";
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

function levelIconClass(type: LevelIconType) {
  return `level-icon-${type}`;
}

function levelIconSrc(type: LevelIconType) {
  return LEVEL_ICON_SRC_MAP[type];
}

function rarityBorder(rarity: Rarity) {
  if (rarity === "Sublime") return "linear-gradient(120deg, #22d3ee, #d946ef)";
  if (rarity === "Mythic") return "#ef4444";
  if (rarity === "Legendary") return "#f59e0b";
  return "rgba(148, 163, 184, 0.45)";
}

function formatExportDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function ownedExportCardStyle(hero: { rarity: Rarity }) {
  const border = rarityBorder(hero.rarity);
  if (border.startsWith("linear-gradient")) {
    return {};
  }
  return { borderColor: border };
}

const ownedLevelMap = computed(() => {
  const map = new Map<string, number | null>();
  ownedHeroes.value.forEach((entry) => map.set(entry.heroId, entry.levelIndex));
  return map;
});

const ownedExportGroups = computed(() => {
  const grouped = EXPORT_RARITIES.map((rarity) => ({
    rarity,
    heroes: [] as { id: string; name: string; level: Level | null; rarity: Rarity; owned: boolean }[]
  }));
  const rarityIndex = new Map(EXPORT_RARITIES.map((rarity, index) => [rarity, index]));
  HEROES.forEach((hero) => {
    const index = rarityIndex.get(hero.rarity);
    if (index == null) return;
    const levelIndex = ownedLevelMap.value.get(hero.id);
    const owned = typeof levelIndex === "number" && levelIndex >= 0;
    const level = owned && LEVELS[levelIndex] ? LEVELS[levelIndex] : null;
    grouped[index].heroes.push({ id: hero.id, name: hero.name, level, rarity: hero.rarity, owned });
  });
  return grouped;
});

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

function clearArborLineup() {
  lineup.value.slots.forEach((slot) => {
    slot.heroId = null;
    slot.priorityRank = null;
  });
}

function openResetCollection() {
  isResetCollectionOpen.value = true;
}

function closeResetCollection() {
  isResetCollectionOpen.value = false;
}

function resetCollection() {
  ownedHeroes.value = HEROES.map((hero) => ({
    heroId: hero.id,
    levelIndex: defaultLevelForHero(hero.id)
  }));
  lineup.value.slots.forEach((slot) => {
    slot.heroId = null;
    slot.priorityRank = null;
  });
  ownedExportStatus.value = null;
  closeResetCollection();
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

async function copyOwnedHeroesImage() {
  if (!ownedExportRef.value) return;
  ownedExportStatus.value = null;
  ownedExportDate.value = formatExportDate(new Date());
  const exportWidth = 650;
  const prevWidth = ownedExportRef.value.style.width;
  const prevMaxWidth = ownedExportRef.value.style.maxWidth;
  ownedExportRef.value.style.width = `${exportWidth}px`;
  ownedExportRef.value.style.maxWidth = `${exportWidth}px`;
  ownedExporting.value = true;
  await nextTick();
  if (typeof document !== "undefined" && (document as any).fonts?.ready) {
    await (document as any).fonts.ready;
    if ((document as any).fonts?.load) {
      await (document as any).fonts.load('900 12px "Font Awesome 6 Free"');
    }
  }
  await waitForImages(ownedExportRef.value);
  const bounds = ownedExportRef.value.getBoundingClientRect();
  const canvas = await html2canvas(ownedExportRef.value, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    width: Math.ceil(bounds.width),
    height: Math.ceil(bounds.height)
  });
  ownedExportRef.value.style.width = prevWidth;
  ownedExportRef.value.style.maxWidth = prevMaxWidth;
  ownedExporting.value = false;

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      ownedExportStatus.value = "Owned heroes image copied.";
      return;
    } catch {
      /* fall through */
    }
  }
  if (isIOS()) {
    openImageInNewTab(blob);
    ownedExportStatus.value = "Image opened in a new tab.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "owned-heroes.png";
  link.click();
  URL.revokeObjectURL(url);
  ownedExportStatus.value = "Owned heroes image downloaded.";
}

function setLineupSlotHero(slotIndex: number, heroId: string) {
  if (!heroId) return;
  if (lineupHeroIds.value.has(heroId)) return;
  const slot = lineup.value.slots[slotIndex];
  if (!slot) return;
  slot.heroId = heroId;
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
  startCalcElapsedTimer();
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
    stopCalcElapsedTimer();
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

function handleNavLink() {
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
  handleToolHashChange();
  window.addEventListener("hashchange", handleToolHashChange);
});

onBeforeUnmount(() => {
  if (filtersMediaQuery && filtersMediaListener) {
    filtersMediaQuery.removeEventListener("change", filtersMediaListener);
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateNavMode);
    window.removeEventListener("hashchange", handleToolHashChange);
  }
  stopPhraseLoop();
  stopProgressInterval();
  stopCalcElapsedTimer();
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

function dismissWelcomePopup() {
  showWelcomePopup.value = false;
  if (typeof window !== "undefined") {
    localStorage.setItem(WELCOME_POPUP_DISMISSED_KEY, "true");
  }
}

function openSupportFromWelcome() {
  dismissWelcomePopup();
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-row">
        <div class="logo-block">
          <div class="app-title">WD Toolbox</div>
          <p class="app-tagline">Various tools and utilities for Wittle Defenders</p>
          <div v-if="hasPendingHeroes" class="pending-chip">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <span>
              {{ untrackedHeroesCount }} hero<span v-if="untrackedHeroesCount !== 1">es</span> need star data
            </span>
          </div>
        </div>
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
            <span v-if="hasPendingHeroes" class="pending-dot"></span>
          </button>
        </div>
      </div>
      <div class="tool-nav-row">
        <div class="tool-tabs" role="tablist">
          <button
            v-for="tab in TOOL_TABS"
            :key="tab.id"
            type="button"
            class="tool-tab"
            :class="{
              active: activeTool === tab.id,
              disabled:
                (tab.id === 'tiers' && isTierDisabled) ||
                (tab.id === 'lineups' && isLineupDisabled)
            }"
            :disabled="
              (tab.id === 'tiers' && isTierDisabled) ||
              (tab.id === 'lineups' && isLineupDisabled)
            "
            @click="setActiveTool(tab.id)"
          >
            {{ tab.label }}
            <span
              v-if="tab.id === 'collection' && hasPendingHeroes"
              class="pending-counter"
            >
              {{ untrackedHeroesCount }}
            </span>
          </button>
        </div>
      </div>
      <div
        v-if="navOpen && isMobileNav"
        class="mobile-nav"
        role="dialog"
        aria-modal="true"
      >
        <div class="tool-tabs mobile-tool-tabs">
          <button
            v-for="tab in TOOL_TABS"
            :key="`mobile-${tab.id}`"
            type="button"
            class="tool-tab"
            :class="{
              active: activeTool === tab.id,
              disabled:
                (tab.id === 'tiers' && isTierDisabled) ||
                (tab.id === 'lineups' && isLineupDisabled)
            }"
            :disabled="
              (tab.id === 'tiers' && isTierDisabled) ||
              (tab.id === 'lineups' && isLineupDisabled)
            "
            @click="setActiveTool(tab.id)"
          >
            {{ tab.label }}
            <span
              v-if="tab.id === 'collection' && hasPendingHeroes"
              class="pending-counter"
            >
              {{ untrackedHeroesCount }}
            </span>
          </button>
        </div>
        <div v-if="hasPendingHeroes" class="mobile-pending">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span>{{ untrackedHeroesCount }} hero<span v-if="untrackedHeroesCount !== 1">es</span> still untracked.</span>
        </div>
        <button
          class="btn btn-sm btn-discord"
          href="https://discord.com/invite/wittledefender"
          target="_blank"
          rel="noreferrer"
          @click="handleNavLink"
        >
          <i class="fa-brands fa-discord" aria-hidden="true"></i>
          Join Discord
        </button>
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
      <div v-if="isArborView" class="tool-view arbor-view" id="arbor">
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
              <a class="link-btn" href="#collection">Track heroes now</a>
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
              @clear-all="clearArborLineup"
              @clear-slot="clearLineupSlot"
              @set-hero="setLineupSlotHero"
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


      </div>
      <div v-else-if="isLineupView" class="tool-view lineup-view" id="lineup">
        <LineupBuilder :heroes="HEROES" :owned="ownedHeroes" />
      </div>
      <div v-else-if="isSkillsView" class="tool-view skills-view" id="skills">
        <SkillsExplorer :heroes="HEROES" />
      </div>
      <div v-else-if="isSummonView" class="tool-view summon-view" id="summon">
        <section class="panel summon-panel-wrapper">
          <div class="panel-body">
            <div
              v-if="hasPendingHeroes"
              class="collection-warning"
            >
              <div class="warning-text">
                <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                <span>
                  {{ untrackedHeroesCount }} hero<span v-if="untrackedHeroesCount !== 1">es</span> still need star levels. Optimizer and simulator data stay in sync, so update them in the hero collection first.
                </span>
              </div>
              <a href="#collection" class="link-btn" @click.prevent="jumpToHeroCollection">
                Track heroes
              </a>
            </div>
            <SummonSimulator :heroes="HEROES" />
          </div>
        </section>
      </div>
      <div v-else-if="isTierView" class="tool-view tier-view" id="tier">
        <TierListBuilder />
      </div>
      <div v-else-if="isCollectionView" class="tool-view collection-view" id="collection">
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
        <section class="panel hero-panel">
          <div class="panel-header">
            <div class="panel-title">Hero Collection</div>
            <div class="panel-actions">
              <label class="owned-export-name-input">
                <span class="sr-only">Screen name</span>
                <input
                  v-model="screenName"
                  type="text"
                  placeholder="Screen name"
                  aria-label="Screen name"
                />
              </label>
              <button
                class="btn btn-sm btn-secondary"
                type="button"
                :disabled="ownedExporting"
                @click="copyOwnedHeroesImage"
              >
                {{ ownedExporting ? "Copying..." : "Copy owned heroes" }}
              </button>
              <button class="btn btn-sm btn-ghost" type="button" @click="openResetCollection">
                Reset collection
              </button>
              <span v-if="ownedExportStatus" class="owned-export-status">{{ ownedExportStatus }}</span>
            </div>
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
            <div ref="ownedExportRef" class="owned-export" aria-hidden="true">
              <div class="owned-export-title-row">
                <div class="owned-export-title">
                  {{ screenName ? `${screenName}'s Hero Collection` : "Hero Collection" }}
                </div>
                <div class="owned-export-date">{{ ownedExportDate }}</div>
              </div>
              <div
                v-for="group in ownedExportGroups"
                :key="group.rarity"
                class="owned-export-group"
              >
                <div class="owned-export-header">{{ group.rarity }}</div>
                <div class="owned-export-grid">
                  <div
                    v-for="hero in group.heroes"
                    :key="hero.id"
                    class="owned-export-card"
                    :style="ownedExportCardStyle(hero)"
                    :class="[`rarity-${hero.rarity.toLowerCase()}`, { 'is-not-owned': !hero.owned }]"
                  >
                    <div class="owned-export-avatar" :class="{ 'stier-badge': hero.isSTier }">
                      <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" />
                    </div>
                    <div class="owned-export-name">{{ hero.name }}</div>
                    <div v-if="hero.owned && hero.level" class="owned-export-levels">
                      <template v-for="token in tokenizeLevel(hero.level)" :key="`${hero.id}-${token.type}`">
                        <img
                          v-for="countIndex in token.count"
                          :key="`${hero.id}-${token.type}-${countIndex}`"
                          class="level-icon"
                          :class="levelIconClass(token.type)"
                          :src="levelIconSrc(token.type)"
                          alt=""
                          aria-hidden="true"
                        />
                      </template>
                    </div>
                    <div v-else class="owned-export-not-owned">Not owned</div>
                  </div>
                </div>
              </div>
              <div class="owned-export-callout">
                Track and share your own Hero Collection at: https://wdtoolbox.com
              </div>
            </div>
          </div>
        </section>
      </div>
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
        <div v-if="showLongCalcNotice" class="calc-patience">
          (This can take some time, please be patient! {{ calcElapsedLabel }})
        </div>
      </div>
    </div>
    <footer class="app-footer">
      <div class="footer-royal-callout">
        <span class="footer-supporters-title">Royal Court of Supporters</span>
        <div class="footer-supporters-list">
          <span
            v-for="supporter in SUPPORTER_ROYALTY"
            :key="supporter"
            class="footer-supporter-pill"
          >
            {{ supporter }}
          </span>
        </div>
        <hr class="footer-royal-divider" />
        <p class="footer-royal-cta">
          Want to join this SUBLIME group of supporters?
        </p>
        <a class="btn btn-sm btn-support" href="https://www.buymeacoffee.com/sahagin" target="_blank" rel="noreferrer">
          Support this Project
        </a>
      </div>
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
      </div>
    </footer>
    <div
      v-if="showWelcomePopup"
      class="welcome-modal-backdrop"
      role="presentation"
      @click="dismissWelcomePopup"
    >
      <div
        class="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        @click.stop
      >
        <p class="welcome-kicker">Welcome to WD Toolbox</p>
        <h2 id="welcome-modal-title">Community-powered and proudly player-funded</h2>
        <p>
          Thanks for stopping by and using WD Toolbox!
        </p>
        <p>This project is 100% community built and funded. We rely on players just like you keep everything running.</p>
        <p>
          If you find this site helpful, please consider donating to keep it alive. Every bit of support helps.
          <br/><br/>
          <span class="welcome-signoff">Much <i class="fa-solid fa-heart welcome-heart" aria-hidden="true"></i>, <br/>Sahagin Dazs
          </span>
        </p>
        <div class="welcome-royalty">
          <div class="welcome-royalty-title">Royal Court of Supporters</div>
          <div class="welcome-royalty-list">
            <span
              v-for="supporter in SUPPORTER_ROYALTY"
              :key="`welcome-${supporter}`"
              class="welcome-royalty-pill"
            >
              {{ supporter }}
            </span>
          </div>
        </div>
        <div class="welcome-actions">
          <button class="btn btn-sm btn-secondary" type="button" @click="dismissWelcomePopup">
            Maybe later
          </button>
          <a
            class="btn btn-sm btn-support"
            href="https://www.buymeacoffee.com/sahagin"
            target="_blank"
            rel="noreferrer"
            @click="openSupportFromWelcome"
          >
            Support this Project
          </a>
        </div>
      </div>
    </div>
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
    <div
      v-if="isResetCollectionOpen"
      class="intro-modal-backdrop"
      role="presentation"
      @click="closeResetCollection"
    >
      <div class="intro-modal" role="dialog" aria-modal="true" aria-label="Reset hero collection" @click.stop>
        <div class="panel-title">Reset hero collection?</div>
        <p>This will clear all owned heroes and star levels. You can’t undo this.</p>
        <div class="panel-actions">
          <button class="btn btn-sm btn-secondary" type="button" @click="closeResetCollection">
            Cancel
          </button>
          <button class="btn btn-sm btn-ghost" type="button" @click="resetCollection">
            Reset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
