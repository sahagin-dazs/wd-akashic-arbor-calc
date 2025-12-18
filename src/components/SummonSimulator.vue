<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { HeroDef, Rarity } from "../models/types";
import { avatarKey, avatarUrl } from "../utils/avatar";

const props = defineProps<{
  heroes: HeroDef[];
}>();

type SummonTab = "warrior" | "rate" | "xeno";
type SummonCategory =
  | "wishlist"
  | "legendary"
  | "epic"
  | "common"
  | "rateup"
  | "otherMythic"
  | "xenoHero"
  | "mythicHero"
  | "legendaryHero"
  | "epicHero"
  | "mythicShard"
  | "legendaryShard"
  | "promoStone"
  | "hammer"
  | "gem30k"
  | "gem2888";

interface SummonResult {
  id: string;
  type: "hero" | "item";
  rarity: string;
  label: string;
  heroId?: string;
  quantity?: number;
  note?: string;
  category: SummonCategory;
}

interface SummonHistoryEntry {
  id: string;
  timestamp: number;
  banner: SummonTab;
  pulls: SummonResult[];
  gemsSpent: number;
  scrollsSpent: number;
}

interface SummonState {
  resources: { gems: number };
  warrior: {
    scrolls: number;
    wishlist: Record<"Fire" | "Ice" | "Wind" | "Electro", string | null>;
    guaranteedMythicCount: number;
    guaranteedMythicProgress: number;
    xenoScrollCount: number;
    xenoScrollProgress: number;
  };
  rateUp: {
    scrolls: number;
    featuredHeroId: string | null;
    pity: number;
  };
  xeno: {
    scrolls: number;
    targetHeroId: string | null;
    pity: number;
  };
  history: SummonHistoryEntry[];
}

const SUMMON_STORAGE_KEY = "wd-tools-summon-state";
const SUMMON_TAB_STORAGE_KEY = "wd-tools-summon-tab";
const RATE_UP_DEFAULT_FALLBACK = [
  "DS",
  "ID",
  "Pharaoh",
  "SM",
  "BA",
  "NB",
  "Robot",
  "IQ"
] as const;

const TOOLTIP_META = {
  warrior: "Warrior Summon",
  rate: "Rate-Up Summon",
  xeno: "Xenoscape Summon"
} as const;

const DEFAULT_STATE: SummonState = {
  resources: { gems: 0 },
  warrior: {
    scrolls: 0,
    wishlist: {
      Fire: null,
      Ice: null,
      Wind: null,
      Electro: null
    },
    guaranteedMythicCount: 0,
    guaranteedMythicProgress: 0,
    xenoScrollCount: 0,
    xenoScrollProgress: 0
  },
  rateUp: {
    scrolls: 0,
    featuredHeroId: "Valk",
    pity: 40
  },
  xeno: {
    scrolls: 0,
    targetHeroId: "VW",
    pity: 30
  },
  history: []
};

function cloneDefaultState(): SummonState {
  return JSON.parse(JSON.stringify(DEFAULT_STATE)) as SummonState;
}

function loadState(): SummonState {
  if (typeof window === "undefined") return cloneDefaultState();
  try {
    const saved = localStorage.getItem(SUMMON_STORAGE_KEY);
    if (!saved) return cloneDefaultState();
    const parsed = JSON.parse(saved) as SummonState;
    return {
      resources: {
        gems: Math.max(0, Number(parsed?.resources?.gems) || 0)
      },
      warrior: {
        scrolls: Math.max(0, Number(parsed?.warrior?.scrolls) || 0),
        wishlist: {
          Fire: parsed?.warrior?.wishlist?.Fire ?? null,
          Ice: parsed?.warrior?.wishlist?.Ice ?? null,
          Wind: parsed?.warrior?.wishlist?.Wind ?? null,
          Electro: parsed?.warrior?.wishlist?.Electro ?? null
        },
        guaranteedMythicCount: parsed?.warrior?.guaranteedMythicCount ?? 0,
        guaranteedMythicProgress: parsed?.warrior?.guaranteedMythicProgress ?? 0,
        xenoScrollCount: parsed?.warrior?.xenoScrollCount ?? 0,
        xenoScrollProgress: parsed?.warrior?.xenoScrollProgress ?? 0
      },
      rateUp: {
        scrolls: Math.max(0, Number(parsed?.rateUp?.scrolls) || 0),
        featuredHeroId: parsed?.rateUp?.featuredHeroId ?? "Valk",
        pity: parsed?.rateUp?.pity ?? 40
      },
      xeno: {
        scrolls: Math.max(0, Number(parsed?.xeno?.scrolls) || 0),
        targetHeroId: parsed?.xeno?.targetHeroId ?? "VW",
        pity: parsed?.xeno?.pity ?? 30
      },
      history: Array.isArray(parsed?.history)
        ? parsed.history.slice(0, 300).map((entry) => ({
            ...entry,
            gemsSpent: entry?.gemsSpent ?? 0,
            scrollsSpent: entry?.scrollsSpent ?? entry?.pulls?.length ?? 0,
            pulls: Array.isArray(entry?.pulls)
              ? entry.pulls.map((pull: SummonResult) => ({
                  ...pull,
                  category: pull?.category ?? "common"
                }))
              : []
          }))
        : []
    };
  } catch {
    return cloneDefaultState();
  }
}

function loadSummonTab(): SummonTab {
  if (typeof window === "undefined") return "warrior";
  const stored = localStorage.getItem(SUMMON_TAB_STORAGE_KEY);
  if (stored === "xeno") return "xeno";
  if (stored === "rate" || stored === "rateMonthly" || stored === "rateWeekly") {
    return "rate";
  }
  return "warrior";
}

const state = ref<SummonState>(loadState());
const activeTab = ref<SummonTab>(loadSummonTab());
const statusMessage = ref<string | null>(null);
const lastRoll = ref<SummonHistoryEntry | null>(null);
const brokenAvatars = ref<Record<string, boolean>>({});
const WARRIOR_ELEMENTS = ["Ice", "Fire", "Electro", "Wind"] as const;
type WarriorElement = (typeof WARRIOR_ELEMENTS)[number];
const SUMMON_BASE =
  typeof import.meta !== "undefined" && typeof import.meta.env?.BASE_URL === "string"
    ? import.meta.env.BASE_URL
    : "/";
const SUMMON_BASE_NORMALIZED = SUMMON_BASE.endsWith("/")
  ? SUMMON_BASE
  : `${SUMMON_BASE}/`;
const summonAsset = (name: string) => `${SUMMON_BASE_NORMALIZED}summon/${name}`;
const SUMMON_TAB_ICONS: Record<SummonTab, string> = {
  warrior: summonAsset("WarriorSummon.png"),
  rate: summonAsset("RateUpSummon.png"),
  xeno: summonAsset("XenoSummon.png")
};
const REWARD_ICONS: Partial<Record<SummonCategory, string>> = {
  gem30k: summonAsset("30kgems.png"),
  gem2888: summonAsset("2888gems.png"),
  hammer: summonAsset("XenoHammer.png"),
  mythicShard: summonAsset("RandomMythicHeroShard.png"),
  legendaryShard: summonAsset("RandomLegendaryHeroShard.png"),
  promoStone: summonAsset("PromotionStone.png")
};
const GEM_ICON = summonAsset("Gem.png");
const ELEMENT_META: Record<
  WarriorElement,
  { label: string; icon: string; color: string }
> = {
  Fire: { label: "Fire", icon: "fa-solid fa-fire", color: "#ef4444" },
  Ice: { label: "Ice", icon: "fa-solid fa-snowflake", color: "#60a5fa" },
  Wind: { label: "Wind", icon: "fa-solid fa-wind", color: "#34d399" },
  Electro: { label: "Electro", icon: "fa-solid fa-bolt", color: "#facc15" }
};

watch(
  state,
  (value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SUMMON_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true }
);

const heroMap = computed<Map<string, HeroDef>>(() => {
  const map = new Map<string, HeroDef>();
  props.heroes.forEach((hero) => map.set(hero.id, hero));
  return map;
});

const heroesByRarity = computed<Record<Rarity, HeroDef[]>>(() => {
  const groups: Record<Rarity, HeroDef[]> = {
    Sublime: [],
    Mythic: [],
    Legendary: [],
    Epic: [],
    Common: []
  };
  props.heroes.forEach((hero) => {
    groups[hero.rarity].push(hero);
  });
  return groups;
});

const heroesByElement = computed<
  Record<"Fire" | "Ice" | "Wind" | "Electro" | "Xeno", HeroDef[]>
>(() => ({
  Fire: props.heroes.filter((hero) => hero.element === "Fire"),
  Ice: props.heroes.filter((hero) => hero.element === "Ice"),
  Wind: props.heroes.filter((hero) => hero.element === "Wind"),
  Electro: props.heroes.filter((hero) => hero.element === "Electro"),
  Xeno: props.heroes.filter((hero) => hero.element === "Xeno")
}));

const nonRateUpMythics = computed(() =>
  props.heroes.filter(
    (hero) => hero.rarity === "Mythic" && hero.isRateUpHero !== true
  )
);

const warriorOptionsByElement = computed<
  Record<WarriorElement, HeroDef[]>
>(() => ({
  Fire: heroesByElement.value.Fire.filter((hero) => hero.isWishlistHero),
  Ice: heroesByElement.value.Ice.filter((hero) => hero.isWishlistHero),
  Wind: heroesByElement.value.Wind.filter((hero) => hero.isWishlistHero),
  Electro: heroesByElement.value.Electro.filter((hero) => hero.isWishlistHero)
}));

const rateUpHeroes = computed(() =>
  props.heroes.filter((hero) => hero.isRateUpHero)
);

const isWarriorReady = computed(() =>
  Object.values(state.value.warrior.wishlist).every((value) => Boolean(value))
);
const isRateReady = computed(() => Boolean(state.value.rateUp.featuredHeroId));
const isXenoReady = computed(() => Boolean(state.value.xeno.targetHeroId));

const historyByTab = computed(() =>
  state.value.history.filter((entry) => entry.banner === activeTab.value)
);

const pullsForTab = computed(() =>
  historyByTab.value.flatMap((entry) => entry.pulls)
);

const scrollsUsed = computed(() =>
  historyByTab.value.reduce((sum, entry) => sum + (entry.scrollsSpent ?? entry.pulls.length), 0)
);

const gemsUsed = computed(() =>
  historyByTab.value.reduce((sum, entry) => sum + (entry.gemsSpent ?? 0), 0)
);

const totalPulls = computed(() => pullsForTab.value.length);

function countCategory(category: SummonCategory) {
  return pullsForTab.value.reduce(
    (sum, pull) => sum + (pull.category === category ? 1 : 0),
    0
  );
}

function countHeroPulls(heroId?: string | null, category?: SummonCategory) {
  if (!heroId) return 0;
  return pullsForTab.value.reduce(
    (sum, pull) =>
      sum +
      (pull.heroId === heroId &&
      (!category || pull.category === category)
        ? 1
        : 0),
    0
  );
}

function heroActualRate(heroId?: string | null, category?: SummonCategory) {
  if (!heroId || !totalPulls.value) return null;
  const hits = countHeroPulls(heroId, category);
  if (!hits) return null;
  return `${((hits / totalPulls.value) * 100).toFixed(2)}%`;
}

const warriorFeaturedList = computed(() =>
  WARRIOR_ELEMENTS.map((element) => {
    const heroId = state.value.warrior.wishlist[element];
    const hero = heroId ? heroMap.value.get(heroId) : null;
    return {
      key: element,
      heroId,
      hero,
      count: countHeroPulls(heroId, "wishlist")
    };
  }).filter((entry) => entry.hero)
);

const rateUpFeatured = computed(() => {
  const heroId = state.value.rateUp.featuredHeroId;
  const hero = heroId ? heroMap.value.get(heroId) : null;
  return hero
    ? {
        heroId,
        hero,
        count: countHeroPulls(heroId, "rateup")
      }
    : null;
});

const xenoFeatured = computed(() => {
  const heroId = state.value.xeno.targetHeroId;
  const hero = heroId ? heroMap.value.get(heroId) : null;
  return hero
    ? {
        heroId,
        hero,
        count: countHeroPulls(heroId, "xenoHero")
      }
    : null;
});

const summaryCards = computed<{ main: SummaryCard[]; bonus: SummaryCard[] }>(() => {
  const actualRateFor = (value: number) => {
    if (!totalPulls.value) return null;
    return `${((value / totalPulls.value) * 100).toFixed(2)}%`;
  };
  const buildCard = (options: {
    key: string;
    label: string;
    category: SummonCategory;
    rarity: SummaryCard["rarity"];
    rate?: string;
  }) => {
    const value = countCategory(options.category);
    return {
      key: options.key,
      label: options.label,
      value,
      rarity: options.rarity,
      rate: options.rate,
      actualRate: options.rate ? actualRateFor(value) : null
    };
  };
  if (activeTab.value === "warrior") {
    const rates = RATE_MAP.warrior;
    const main = [
      buildCard({
        key: "wishlist",
        label: "Wishlist Mythics",
        category: "wishlist",
        rarity: "mythic",
        rate: rates?.wishlist
      }),
      buildCard({
        key: "legendary",
        label: "Legendary Heroes",
        category: "legendary",
        rarity: "legendary",
        rate: rates?.legendary
      }),
      buildCard({
        key: "epic",
        label: "Epic Heroes",
        category: "epic",
        rarity: "epic",
        rate: rates?.epic
      }),
      buildCard({
        key: "common",
        label: "Common Heroes",
        category: "common",
        rarity: "common",
        rate: rates?.common
      }),
    ];
    const bonus: SummaryCard[] = [
      {
        key: "guaranteed",
        label: "Lucky Summon",
        value: state.value.warrior.guaranteedMythicCount,
        rarity: "mythic",
        alert: true,
        subtext: `${state.value.warrior.guaranteedMythicProgress}/200`
      },
      {
        key: "xenoCounter",
        label: "Xeno Scroll Reward",
        value: state.value.warrior.xenoScrollCount,
        rarity: "mythic",
        alert: true,
        subtext: `${state.value.warrior.xenoScrollProgress}/40`
      }
    ];
    return { main, bonus };
  }
  if (activeTab.value === "rate") {
    const rates = RATE_MAP.rate;
    return {
      main: [
        buildCard({
          key: "rateup",
          label: "Featured Mythic",
          category: "rateup",
          rarity: "mythic",
        rate: rates?.rateup
      }),
      buildCard({
        key: "other-mythic",
        label: "Other Mythic",
        category: "otherMythic",
        rarity: "mythic",
        rate: rates?.otherMythic
      }),
      buildCard({
        key: "legendary",
        label: "Legendary Heroes",
        category: "legendary",
        rarity: "legendary",
        rate: rates?.legendary
      }),
      buildCard({
        key: "epic",
        label: "Epic Heroes",
        category: "epic",
        rarity: "epic",
        rate: rates?.epic
      }),
        buildCard({
          key: "common",
          label: "Common Heroes",
          category: "common",
          rarity: "common",
          rate: rates?.common
        })
      ],
      bonus: []
    };
  }
  const rates = RATE_MAP.xeno;
  return {
    main: [
      buildCard({
        key: "wishlist",
        label: "Xeno Hero",
        category: "xenoHero",
        rarity: "mythic",
        rate: rates?.xenoHero
      }),
      buildCard({
        key: "mythicHero",
        label: "Mythic Hero",
        category: "mythicHero",
        rarity: "mythic",
        rate: rates?.mythicHero
      }),
      buildCard({
        key: "legendaryHero",
        label: "Legendary Hero",
        category: "legendaryHero",
        rarity: "legendary",
        rate: rates?.legendaryHero
      }),
      buildCard({
        key: "epicHero",
        label: "Epic Hero",
        category: "epicHero",
        rarity: "epic",
        rate: rates?.epicHero
      }),
      buildCard({
        key: "mythicShard",
        label: "Mythic Hero Shards",
        category: "mythicShard",
        rarity: "mythic",
        rate: rates?.mythicShard
      }),
      buildCard({
        key: "legendaryShard",
        label: "Legendary Hero Shards",
        category: "legendaryShard",
        rarity: "legendary",
        rate: rates?.legendaryShard
      }),
      buildCard({
        key: "promoStone",
        label: "Promotion Stones",
        category: "promoStone",
        rarity: "epic",
        rate: rates?.promoStone
      }),
      buildCard({
        key: "hammer",
        label: "Xenoscape Hammer",
        category: "hammer",
        rarity: "mythic",
        rate: rates?.hammer
      }),
      buildCard({
        key: "gem30k",
        label: "30,000 Gems",
        category: "gem30k",
        rarity: "legendary",
        rate: rates?.gem30k
      }),
      buildCard({
        key: "gem2888",
        label: "2,888 Gems",
        category: "gem2888",
        rarity: "legendary",
        rate: rates?.gem2888
      })
    ],
    bonus: []
  };
});

function pickRandom<T>(list: readonly T[] | T[]): T {
  if (!list.length) throw new Error("No options available.");
  return list[Math.floor(Math.random() * list.length)];
}

function heroFromRarity(rarity: Rarity): HeroDef {
  const pool = heroesByRarity.value[rarity];
  if (!pool.length) {
    throw new Error(`No ${rarity} heroes found.`);
  }
  return pickRandom(pool);
}

function heroFromNonRateUpMythic(): HeroDef {
  const pool = nonRateUpMythics.value;
  if (!pool.length) return heroFromRarity("Mythic");
  return pickRandom(pool);
}

function addHistoryEntry(
  banner: SummonTab,
  pulls: SummonResult[],
  gemsSpent = 0,
  scrollsSpent = pulls.length
) {
  const entry: SummonHistoryEntry = {
    id: `${banner}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    banner,
    pulls,
    gemsSpent,
    scrollsSpent
  };
  state.value.history = [entry, ...state.value.history].slice(0, 200);
  lastRoll.value = entry;
}

function addQuickScrolls(amount = 100) {
  if (activeTab.value === "warrior") {
    state.value.warrior.scrolls += amount;
    return;
  }
  if (activeTab.value === "rate") {
    state.value.rateUp.scrolls += amount;
    return;
  }
  state.value.xeno.scrolls += amount;
}

const resourceSectionRef = ref<HTMLElement | null>(null);
const missingResource = ref<
  null | { type: "scrolls" | "gems" | "both"; banner: SummonTab }
>(null);

function scrollToResources() {
  if (resourceSectionRef.value && typeof window !== "undefined") {
    resourceSectionRef.value.scrollIntoView({ behavior: "smooth", block: "center" });
    resourceSectionRef.value.classList.add("summon-field-warning");
    window.setTimeout(() => resourceSectionRef.value?.classList.remove("summon-field-warning"), 1500);
  }
}

function needsResourceHighlight(banner: SummonTab, kind: "scrolls" | "gems") {
  const alert = missingResource.value;
  if (!alert || alert.banner !== banner) return false;
  return alert.type === kind || alert.type === "both";
}

function coverGemDeficit(deficit: number, banner: "warrior" | "rate") {
  if (deficit <= 0) return 0;
  const gemCost = banner === "warrior" ? 290 : 300;
  const needed = deficit * gemCost;
  if (state.value.resources.gems < needed) {
    missingResource.value = {
      type: "both",
      banner
    };
    throw new Error("Add more scrolls or gems for this summon.");
  }
  state.value.resources.gems -= needed;
  statusMessage.value = `Used ${needed} gems to cover ${deficit} scroll(s).`;
  return needed;
}

interface SpendResult {
  gemsSpent: number;
  scrollsSpent: number;
}

function consumeScrolls(amount: number, banner: "warrior" | "rate" | "xeno"): SpendResult {
  if (banner === "warrior") {
    const available = state.value.warrior.scrolls;
    let scrollsSpent = 0;
    let deficit = amount;
    if (available >= amount) {
      scrollsSpent = amount;
      state.value.warrior.scrolls -= amount;
      deficit = 0;
    }
    const gemsSpent = coverGemDeficit(deficit, "warrior");
    return { gemsSpent, scrollsSpent };
  }
  if (banner === "rate") {
    const available = state.value.rateUp.scrolls;
    let scrollsSpent = 0;
    let deficit = amount;
    if (available >= amount) {
      scrollsSpent = amount;
      state.value.rateUp.scrolls -= amount;
      deficit = 0;
    }
    const gemsSpent = coverGemDeficit(deficit, "rate");
    return { gemsSpent, scrollsSpent };
  }
  if (state.value.xeno.scrolls < amount) {
    missingResource.value = { type: "scrolls", banner: "xeno" };
    throw new Error("Add more Xenoscape scrolls to summon.");
  }
  state.value.xeno.scrolls -= amount;
  return { gemsSpent: 0, scrollsSpent: amount };
}

function buildHeroResult(
  hero: HeroDef,
  options?: { rarityLabel?: string; note?: string; category?: SummonCategory }
): SummonResult {
  return {
    id: `hero-${hero.id}-${Math.random().toString(36).slice(2)}`,
    type: "hero",
    heroId: hero.id,
    label: hero.name,
    rarity: options?.rarityLabel ?? hero.rarity,
    note: options?.note,
    category:
      options?.category ??
      (hero.rarity === "Legendary"
        ? "legendary"
        : hero.rarity === "Epic"
        ? "epic"
        : hero.rarity === "Common"
        ? "common"
        : "otherMythic")
  };
}

function buildItemResult(
  label: string,
  rarity: string,
  category: SummonCategory,
  quantity?: number
): SummonResult {
  return {
    id: `item-${label}-${Math.random().toString(36).slice(2)}`,
    type: "item",
    rarity,
    label,
    quantity,
    category
  };
}

function updateWarriorProgress(pulls: number) {
  const warrior = state.value.warrior;
  warrior.guaranteedMythicProgress += pulls;
  while (warrior.guaranteedMythicProgress >= 200) {
    warrior.guaranteedMythicProgress -= 200;
    warrior.guaranteedMythicCount += 1;
  }
  warrior.xenoScrollProgress += pulls;
  while (warrior.xenoScrollProgress >= 40) {
    warrior.xenoScrollProgress -= 40;
    warrior.xenoScrollCount += 1;
  }
}

function rollWarriorOnce(): SummonResult {
  const roll = Math.random() * 100;
  if (roll < 2.5) {
    const picks = Object.values(state.value.warrior.wishlist).filter(Boolean) as string[];
    if (picks.length) {
      const hero = heroMap.value.get(pickRandom(picks));
      if (hero) {
        return buildHeroResult(hero, {
          rarityLabel: "Mythic",
          note: "Wishlist",
          category: "wishlist"
        });
      }
    }
  }
  if (roll < 2.5 + 5.5) {
    return buildHeroResult(heroFromRarity("Legendary"), {
      rarityLabel: "Legendary",
      category: "legendary"
    });
  }
  if (roll < 2.5 + 5.5 + 27) {
    return buildHeroResult(heroFromRarity("Epic"), {
      rarityLabel: "Epic",
      category: "epic"
    });
  }
  return buildHeroResult(heroFromRarity("Common"), {
    rarityLabel: "Common",
    category: "common"
  });
}

function updateRatePity(hitMythic: boolean) {
  state.value.rateUp.pity = hitMythic ? 40 : Math.max(1, state.value.rateUp.pity - 1);
}

function targetHero() {
  const id = state.value.rateUp.featuredHeroId;
  return (id && heroMap.value.get(id)) ?? heroFromRarity("Mythic");
}

function rollRateUpOnce(): SummonResult {
  const pityRemaining = state.value.rateUp.pity;
  const forceMythic = pityRemaining <= 1;
  const roll = Math.random() * 100;
  if (forceMythic || roll < 3.11) {
    const featured = targetHero();
    const pool = RATE_UP_DEFAULT_FALLBACK.map((id) => heroMap.value.get(id)).filter(
      (hero): hero is HeroDef => Boolean(hero && hero.id !== featured.id)
    );
    const mythicHero =
      Math.random() < 0.5 || !pool.length ? featured : pickRandom(pool);
    updateRatePity(true);
    return buildHeroResult(mythicHero, {
      rarityLabel: "Mythic",
      note: mythicHero.id === featured.id ? "Featured" : undefined,
      category: mythicHero.id === featured.id ? "rateup" : "otherMythic"
    });
  }
  updateRatePity(false);
  if (roll < 3.11 + 3.4) {
    return buildHeroResult(heroFromRarity("Legendary"), {
      rarityLabel: "Legendary",
      category: "legendary"
    });
  }
  if (roll < 3.11 + 3.4 + 25.5) {
    return buildHeroResult(heroFromRarity("Epic"), {
      rarityLabel: "Epic",
      category: "epic"
    });
  }
  return buildHeroResult(heroFromRarity("Common"), {
    rarityLabel: "Common",
    category: "common"
  });
}

function rollXenoOnce(): SummonResult {
  const pity = state.value.xeno.pity;
  const hero =
    (state.value.xeno.targetHeroId &&
      heroMap.value.get(state.value.xeno.targetHeroId)) ||
    heroMap.value.get("VW");
  const forceWishlist = pity <= 1;
  const roll = Math.random() * 100;
  if (forceWishlist || roll < 3.87) {
    if (hero) {
      state.value.xeno.pity = 30;
      return buildHeroResult(hero, {
        rarityLabel: "Mythic",
        note: "Wishlist",
        category: "xenoHero"
      });
    }
  }
  state.value.xeno.pity = Math.max(1, pity - 1);
  if (roll < 3.97) {
    return buildItemResult("30,000 Gems", "Artifact", "gem30k");
  }
  if (roll < 3.97 + 1.75) {
    return buildHeroResult(heroFromNonRateUpMythic(), {
      rarityLabel: "Mythic",
      category: "mythicHero"
    });
  }
  if (roll < 3.97 + 1.75 + 10.96) {
    return buildItemResult("Mythic Hero Shards x10", "Shard", "mythicShard", 10);
  }
  if (roll < 3.97 + 1.75 + 10.96 + 10.23) {
    return buildItemResult("Xenoscape Hammer", "Artifact", "hammer");
  }
  if (roll < 3.97 + 1.75 + 10.96 + 10.23 + 4.39) {
    return buildHeroResult(heroFromRarity("Legendary"), {
      rarityLabel: "Legendary",
      category: "legendaryHero"
    });
  }
  if (roll < 3.97 + 1.75 + 10.96 + 10.23 + 4.39 + 24.36) {
    return buildItemResult(
      "Legendary Hero Shards x20",
      "Shard",
      "legendaryShard",
      20
    );
  }
  if (roll < 3.97 + 1.75 + 10.96 + 10.23 + 4.39 + 24.36 + 3.9) {
    return buildItemResult("2,888 Gems", "Artifact", "gem2888");
  }
  if (
    roll <
    3.97 + 1.75 + 10.96 + 10.23 + 4.39 + 24.36 + 3.9 + 20.95
  ) {
    return buildHeroResult(heroFromRarity("Epic"), {
      rarityLabel: "Epic",
      category: "epicHero"
    });
  }
  return buildItemResult("Promotion Stone x200", "Resource", "promoStone", 200);
}

function runSummon(pulls: number) {
  try {
    statusMessage.value = null;
    missingResource.value = null;
    if (activeTab.value === "warrior") {
      if (!isWarriorReady.value) throw new Error("Set your wishlist first.");
      const spend = consumeScrolls(pulls, "warrior");
      updateWarriorProgress(pulls);
      addHistoryEntry(
        "warrior",
        Array.from({ length: pulls }, () => rollWarriorOnce()),
        spend.gemsSpent,
        spend.scrollsSpent
      );
      return;
    }
    if (activeTab.value === "rate") {
      if (!isRateReady.value) throw new Error("Pick a rate-up hero first.");
      const spend = consumeScrolls(pulls, "rate");
      addHistoryEntry(
        "rate",
        Array.from({ length: pulls }, () => rollRateUpOnce()),
        spend.gemsSpent,
        spend.scrollsSpent
      );
      return;
    }
    if (!isXenoReady.value) throw new Error("Select a Xenoscape hero first.");
    const spend = consumeScrolls(pulls, "xeno");
    addHistoryEntry(
      "xeno",
      Array.from({ length: pulls }, () => rollXenoOnce()),
      spend.gemsSpent,
      spend.scrollsSpent
    );
  } catch (error) {
    statusMessage.value =
      error instanceof Error ? error.message : "Unable to run summon.";
    scrollToResources();
  }
}

function clearHistoryForActiveTab() {
  state.value.history = state.value.history.filter(
    (entry) => entry.banner !== activeTab.value
  );
  if (lastRoll.value?.banner === activeTab.value) {
    lastRoll.value = null;
  }
  if (activeTab.value === "warrior") {
    state.value.warrior.guaranteedMythicCount = 0;
    state.value.warrior.guaranteedMythicProgress = 0;
    state.value.warrior.xenoScrollCount = 0;
    state.value.warrior.xenoScrollProgress = 0;
  }
}

function changeTab(tab: SummonTab) {
  activeTab.value = tab;
}

watch(activeTab, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SUMMON_TAB_STORAGE_KEY, value);
});

function heroOptionLabel(hero?: HeroDef | null) {
  if (!hero) return "Unknown hero";
  return hero.name;
}

function heroAvatar(id?: string) {
  if (!id) return "";
  const hero = heroMap.value.get(id);
  return avatarUrl(hero?.id ?? id, hero?.name);
}

function avatarBroken(id?: string) {
  if (!id) return false;
  const key = avatarKey(id, heroMap.value.get(id)?.name);
  return Boolean(brokenAvatars.value[key]);
}

function onAvatarError(id?: string) {
  if (!id) return;
  const key = avatarKey(id, heroMap.value.get(id)?.name);
  brokenAvatars.value = { ...brokenAvatars.value, [key]: true };
}

const lastResultsForTab = computed(() => {
  if (!lastRoll.value || lastRoll.value.banner !== activeTab.value) return [];
  return lastRoll.value.pulls;
});

const highlightedHeroIds = computed(() => {
  const ids = new Set<string>();
  if (!lastRoll.value || lastRoll.value.banner !== activeTab.value) return ids;
  let category: SummonCategory | null = null;
  if (activeTab.value === "warrior") category = "wishlist";
  if (activeTab.value === "rate") category = "rateup";
  if (activeTab.value === "xeno") category = "xenoHero";
  if (!category) return ids;
  lastRoll.value.pulls.forEach((result) => {
    if (result.category === category && result.heroId) {
      ids.add(result.heroId);
    }
  });
  return ids;
});

const pullRowsForDisplay = computed(() => {
  const results = lastResultsForTab.value;
  if (!results.length) return [];
  if (results.length === 1) {
    return [[null, results[0], null]];
  }
  const template = [3, 4, 3];
  const padded: Array<SummonResult | null> = [...results.slice(0, 10)];
  while (padded.length < 10) {
    padded.push(null);
  }
  const rows: Array<Array<SummonResult | null>> = [];
  let cursor = 0;
  template.forEach((size) => {
    rows.push(padded.slice(cursor, cursor + size));
    cursor += size;
  });
  return rows;
});

function pullIcon(result: SummonResult) {
  if (result.type === "item") {
    return REWARD_ICONS[result.category] ?? null;
  }
  return null;
}

function resultQuantity(result: SummonResult) {
  if (result.category === "gem30k") return 30000;
  if (result.category === "gem2888") return 2888;
  return result.quantity ?? 1;
}

function resultRarityClass(result: SummonResult) {
  const normalized = result.rarity?.toLowerCase?.() ?? "";
  if (result.category === "xenoHero") {
    return "rarity-sublime";
  }
  if (result.category === "rateup") {
    return "rarity-mythic";
  }
  if (result.category === "wishlist" || result.category === "otherMythic" || normalized === "mythic") {
    return "rarity-mythic";
  }
  if (result.category === "legendary" || result.category === "legendaryHero" || normalized === "legendary") {
    return "rarity-legendary";
  }
  if (result.category === "epic" || result.category === "epicHero" || normalized === "epic") {
    return "rarity-epic";
  }
  if (result.category === "legendaryShard" || result.category === "gem30k" || result.category === "gem2888") {
    return "rarity-legendary";
  }
  if (result.category === "mythicShard" || result.category === "hammer") {
    return "rarity-mythic";
  }
  if (result.category === "promoStone") {
    return "rarity-epic";
  }
  if (result.category === "common" || normalized === "common") {
    return "rarity-common";
  }
  return "";
}

function featuredHighlightClass(heroId?: string | null) {
  if (!heroId || !highlightedHeroIds.value.has(heroId)) return "";
  const rarity = heroMap.value.get(heroId)?.rarity ?? "Mythic";
  return `highlight-${rarity.toLowerCase()}`;
}

const RATE_UP_MYTHIC_CHANCE = 3.11;
const RATE_UP_SPLIT = 0.5;
const FEATURED_POSTED = `${(RATE_UP_MYTHIC_CHANCE * RATE_UP_SPLIT).toFixed(
  2
)}% (3.11% × 50% featured)`;
const OTHER_MYTHIC_POSTED = `${(RATE_UP_MYTHIC_CHANCE * RATE_UP_SPLIT).toFixed(
  2
)}% (other mythic pool)`;

const RATE_MAP: Record<
  SummonTab,
  Partial<Record<SummonCategory, string>>
> = {
  warrior: {
    wishlist: "2.5%",
    legendary: "5.5%",
    epic: "27%",
    common: "65%"
  },
  rate: {
    rateup: FEATURED_POSTED,
    otherMythic: OTHER_MYTHIC_POSTED,
    legendary: "3.4%",
    epic: "25.5%",
    common: "67.99%"
  },
  xeno: {
    xenoHero: "3.87%",
    gem30k: "0.10%",
    mythicHero: "1.75%",
    mythicShard: "10.96%",
    hammer: "10.23%",
    legendaryHero: "4.39%",
    legendaryShard: "24.36%",
    gem2888: "3.90%",
    epicHero: "20.95%",
    promoStone: "19.49%"
  }
};
const FEATURED_RATE_TEXT: Record<SummonTab, string> = {
  warrior: RATE_MAP.warrior?.wishlist ?? "2.5%",
  rate: FEATURED_POSTED,
  xeno: RATE_MAP.xeno?.xenoHero ?? "3.87%"
};

const inlineScrolls = computed(() => {
  if (activeTab.value === "warrior") return state.value.warrior.scrolls;
  if (activeTab.value === "rate") return state.value.rateUp.scrolls;
  return state.value.xeno.scrolls;
});

const activeSummonLabel = computed(() => TOOLTIP_META[activeTab.value]);
const activeScrollIcon = computed(() => SUMMON_TAB_ICONS[activeTab.value]);

const xenoHeroName = computed(() => {
  const heroId = state.value.xeno.targetHeroId;
  return heroId ? heroMap.value.get(heroId)?.name ?? "Wishlist hero" : "Wishlist hero";
});

const resultsCallout = computed(() => {
  if (activeTab.value === "rate") {
    return {
      type: "rate",
      value: state.value.rateUp.pity
    };
  }
  if (activeTab.value === "xeno") {
    return {
      type: "xeno",
      value: state.value.xeno.pity,
      hero: xenoHeroName.value
    };
  }
  return null;
});

const SUMMON_GEM_COST: Record<SummonTab, number | null> = {
  warrior: 290,
  rate: 300,
  xeno: null
};

interface SummonButtonState {
  pulls: number;
  scrollRequirement: number;
  scrollsEnough: boolean;
  gemCost: number | null;
  hasGemSupport: boolean;
  disabled: boolean;
}

interface SummaryCard {
  key: string;
  label: string;
  value: number;
  rarity: "sublime" | "mythic" | "legendary" | "epic" | "common";
  rate?: string;
  actualRate?: string | null;
  subtext?: string;
  alert?: boolean;
}

const summonButtons = computed<SummonButtonState[]>(() => {
  const tab = activeTab.value;
  const ready =
    tab === "warrior"
      ? isWarriorReady.value
      : tab === "rate"
      ? isRateReady.value
      : isXenoReady.value;
  const scrolls =
    tab === "warrior"
      ? state.value.warrior.scrolls
      : tab === "rate"
      ? state.value.rateUp.scrolls
      : state.value.xeno.scrolls;
  const gemCostPer = SUMMON_GEM_COST[tab];
  const gems = state.value.resources.gems;

  return [1, 10].map((pulls) => {
    const hasScrolls = scrolls >= pulls;
    const requiresGems = !hasScrolls && Boolean(gemCostPer);
    const gemCost =
      requiresGems && gemCostPer ? pulls * gemCostPer : null;
    const hasGemSupport = gemCost == null ? true : gems >= gemCost;
    const disabled =
      !ready || (!hasScrolls && (gemCost == null || !hasGemSupport));
    return {
      pulls,
      scrollRequirement: pulls,
      scrollsEnough: hasScrolls,
      gemCost,
      hasGemSupport,
      disabled
    };
  });
});

watch(
  rateUpHeroes,
  (list) => {
    if (!list.length) {
      state.value.rateUp.featuredHeroId = null;
      return;
    }
    if (!list.some((hero) => hero.id === state.value.rateUp.featuredHeroId)) {
      state.value.rateUp.featuredHeroId = list[0]?.id ?? null;
    }
  },
  { immediate: true }
);

watch(
  warriorOptionsByElement,
  (groups) => {
    WARRIOR_ELEMENTS.forEach((element) => {
      const pool = groups[element];
      const current = state.value.warrior.wishlist[element];
      if (!pool.some((hero) => hero.id === current)) {
        state.value.warrior.wishlist[element] = pool[0]?.id ?? null;
      }
    });
  },
  { immediate: true }
);
</script>

<template>
  <div class="summon-shell">
    <div class="panel-header">
      <div>
        <div class="panel-title">Summon Simulator</div>
        <p class="summon-subtitle">
          Configure wishlists, pity counters, and resource pools. Summon history is stored in your browser so you can track streaks over time.
        </p>
      </div>
    </div>

    <div class="summon-tabs">
      <button
        v-for="tab in [
          { id: 'warrior', label: 'Warrior' },
          { id: 'rate', label: 'Rate-Up' },
          { id: 'xeno', label: 'Xeno' }
        ]"
        :key="tab.id"
        type="button"
        class="summon-tab"
        :class="{ active: activeTab === tab.id }"
        @click="changeTab(tab.id as SummonTab)"
      >
        <img
          class="summon-tab-icon"
          :src="SUMMON_TAB_ICONS[tab.id as SummonTab]"
          :alt="tab.label"
          width="40"
          height="40"
        />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <div v-if="statusMessage" class="summon-status">
      <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span>{{ statusMessage }}</span>
    </div>

    <div v-if="activeTab === 'warrior'" class="summon-panel">
      <div class="summon-grid wishlist-grid">
        <label v-for="element in WARRIOR_ELEMENTS" :key="element" class="summon-field">
          <span class="summon-field-label">
            <i
              :class="ELEMENT_META[element].icon"
              :style="{ color: ELEMENT_META[element].color }"
              aria-hidden="true"
            ></i>
            {{ ELEMENT_META[element].label }} wishlist hero
          </span>
          <select v-model="state.warrior.wishlist[element]">
            <option
              v-for="hero in warriorOptionsByElement[element]"
              :key="hero.id"
              :value="hero.id"
            >
              {{ heroOptionLabel(hero) }}
            </option>
          </select>
        </label>
      </div>
      <div class="summon-grid two" ref="resourceSectionRef">
        <label
          :class="[
            'summon-field',
            { 'summon-field-error': needsResourceHighlight('warrior', 'scrolls') }
          ]"
        >
          <span>Warrior Scrolls</span>
          <div class="input-with-icon">
            <img :src="SUMMON_TAB_ICONS.warrior" alt="Warrior scroll" />
            <input type="number" min="0" v-model.number="state.warrior.scrolls" />
          </div>
        </label>
        <label
          :class="[
            'summon-field',
            { 'summon-field-error': needsResourceHighlight('warrior', 'gems') }
          ]"
        >
          <span>Gems (290 per fallback scroll)</span>
          <div class="input-with-icon">
            <img :src="GEM_ICON" alt="Gems" />
            <input type="number" min="0" v-model.number="state.resources.gems" />
          </div>
        </label>
      </div>
    </div>

    <div v-else-if="activeTab === 'rate'" class="summon-panel">
      <label class="summon-field standalone-field">
        <span>Featured hero</span>
        <select v-model="state.rateUp.featuredHeroId">
          <option
            v-for="hero in rateUpHeroes"
            :value="hero.id"
            :key="`rate-${hero.id}`"
          >
            {{ heroOptionLabel(hero) }}
          </option>
        </select>
      </label>
      <div class="summon-grid two" ref="resourceSectionRef">
        <label
          :class="[
            'summon-field',
            { 'summon-field-error': needsResourceHighlight('rate', 'scrolls') }
          ]"
        >
          <span>Rate-Up Scrolls</span>
          <div class="input-with-icon">
            <img :src="SUMMON_TAB_ICONS.rate" alt="Rate-up scroll" />
            <input type="number" min="0" v-model.number="state.rateUp.scrolls" />
          </div>
        </label>
        <label
          :class="[
            'summon-field',
            { 'summon-field-error': needsResourceHighlight('rate', 'gems') }
          ]"
        >
          <span>Gems (300 per fallback scroll)</span>
          <div class="input-with-icon">
            <img :src="GEM_ICON" alt="Gems" />
            <input type="number" min="0" v-model.number="state.resources.gems" />
          </div>
        </label>
      </div>
    </div>

    <div v-else class="summon-panel">
      <label class="summon-field standalone-field">
        <span>Xeno wishlist hero</span>
        <select v-model="state.xeno.targetHeroId">
          <option v-for="hero in heroesByElement.Xeno" :value="hero.id" :key="`xeno-${hero.id}`">
            {{ heroOptionLabel(hero) }}
          </option>
        </select>
      </label>
      <div class="summon-grid two" ref="resourceSectionRef">
        <label
          :class="[
            'summon-field',
            { 'summon-field-error': needsResourceHighlight('xeno', 'scrolls') }
          ]"
        >
          <span>Xenoscape Scrolls</span>
          <div class="input-with-icon">
            <img :src="SUMMON_TAB_ICONS.xeno" alt="Xeno scroll" />
            <input type="number" min="0" v-model.number="state.xeno.scrolls" />
          </div>
        </label>
      </div>
    </div>

    <div class="summon-stats">
      <div class="usage-row">
        <div class="usage-pill">
          Scrolls used on this banner: <strong>{{ scrollsUsed }}</strong>
        </div>
        <div v-if="activeTab !== 'xeno'" class="usage-pill">
          Gems used on this banner: <strong>{{ gemsUsed }}</strong>
        </div>
      </div>

      <div
        v-if="activeTab === 'warrior'"
        class="featured-count-row warrior-grid"
      >
        <div
          v-for="entry in warriorFeaturedList"
          :key="entry.key"
          :class="['featured-count-card', featuredHighlightClass(entry.hero?.id)]"
        >
          <div class="featured-avatar">
            <img
              v-if="entry.hero"
              :src="heroAvatar(entry.hero.id)"
              :alt="heroOptionLabel(entry.hero)"
              width="48"
              height="48"
            />
          </div>
          <div class="featured-card-main">
            <div class="featured-name">{{ entry.hero?.name }}</div>
            <div class="featured-rate" v-if="FEATURED_RATE_TEXT.warrior">
              {{ FEATURED_RATE_TEXT.warrior }}
            </div>
            <div class="featured-actual" v-if="heroActualRate(entry.heroId, 'wishlist')">
              Actual {{ heroActualRate(entry.heroId, 'wishlist') }}
            </div>
          </div>
          <div class="featured-count-badge">×{{ entry.count }}</div>
        </div>
      </div>

      <div v-else-if="activeTab === 'rate' && rateUpFeatured" class="featured-count-row">
        <div
          :class="['featured-count-card', featuredHighlightClass(rateUpFeatured.heroId)]"
        >
          <div class="featured-avatar">
            <img
              :src="heroAvatar(rateUpFeatured.heroId)"
              :alt="rateUpFeatured.hero?.name"
              width="48"
              height="48"
            />
          </div>
          <div class="featured-card-main">
            <div class="featured-name">{{ rateUpFeatured.hero?.name }}</div>
            <div class="featured-rate" v-if="FEATURED_RATE_TEXT.rate">
              {{ FEATURED_RATE_TEXT.rate }}
            </div>
            <div class="featured-actual" v-if="heroActualRate(rateUpFeatured.heroId, 'rateup')">
              Actual {{ heroActualRate(rateUpFeatured.heroId, 'rateup') }}
            </div>
          </div>
          <div class="featured-count-badge">×{{ rateUpFeatured.count }}</div>
        </div>
      </div>

      <div v-else-if="activeTab === 'xeno' && xenoFeatured" class="featured-count-row">
        <div
          :class="['featured-count-card', featuredHighlightClass(xenoFeatured.heroId)]"
        >
          <div class="featured-avatar">
            <img
              :src="heroAvatar(xenoFeatured.heroId)"
              :alt="xenoFeatured.hero?.name"
              width="48"
              height="48"
            />
          </div>
          <div class="featured-card-main">
            <div class="featured-name">{{ xenoFeatured.hero?.name }}</div>
            <div class="featured-rate" v-if="FEATURED_RATE_TEXT.xeno">
              {{ FEATURED_RATE_TEXT.xeno }}
            </div>
            <div class="featured-actual" v-if="heroActualRate(xenoFeatured.heroId, 'xenoHero')">
              Actual {{ heroActualRate(xenoFeatured.heroId, 'xenoHero') }}
            </div>
          </div>
          <div class="featured-count-badge">×{{ xenoFeatured.count }}</div>
        </div>
      </div>

      <div class="summon-summary" v-if="summaryCards.main.length">
        <div
          v-for="card in summaryCards.main"
          :key="card.key"
          :class="[
            'summary-card',
            card.rarity ? `rarity-${card.rarity}` : '',
            { alert: card.alert }
          ]"
        >
          <div class="summary-card-inner">
            <div>
              <div class="summary-label">{{ card.label }}</div>
              <div class="summary-rate" v-if="card.rate">Posted {{ card.rate }}</div>
              <div class="summary-actual" v-if="card.actualRate">
                Actual {{ card.actualRate }}
              </div>
              <div class="summary-value">{{ card.value }}</div>
              <div v-if="card.subtext" class="summary-subtext">{{ card.subtext }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="summon-summary bonus-row" v-if="summaryCards.bonus.length">
        <div
          v-for="card in summaryCards.bonus"
          :key="card.key"
          :class="[
            'summary-card',
            card.rarity ? `rarity-${card.rarity}` : '',
            { alert: card.alert }
          ]"
        >
          <div class="summary-card-inner">
            <div>
              <div class="summary-label">{{ card.label }}</div>
              <div class="summary-rate" v-if="card.rate">Posted {{ card.rate }}</div>
              <div class="summary-actual" v-if="card.actualRate">
                Actual {{ card.actualRate }}
              </div>
              <div class="summary-value">{{ card.value }}</div>
              <div v-if="card.subtext" class="summary-subtext">{{ card.subtext }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="history-actions">
        <button
          class="btn btn-lg btn-outline clear-history-btn"
          type="button"
          @click="clearHistoryForActiveTab"
          :disabled="historyByTab.length === 0"
        >
          Clear {{ TOOLTIP_META[activeTab] }} history
        </button>
      </div>
    </div>

      <div class="summon-results">
        <div class="summon-results-header">
          <div class="results-title-block">
            <div class="panel-title">Latest Results</div>
            <div class="panel-subtitle">{{ activeSummonLabel }}</div>
          </div>
          <div class="results-chip-row">
            <button class="quick-add-btn" type="button" @click="addQuickScrolls()">
              +100
            </button>
            <div class="resource-chip">
              <img :src="activeScrollIcon" :alt="`${activeSummonLabel} scroll`" />
              <span>{{ inlineScrolls }}</span>
            </div>
            <div class="resource-chip" v-if="activeTab !== 'xeno'">
            <img :src="GEM_ICON" alt="Gems" />
            <span>{{ state.resources.gems }}</span>
          </div>
        </div>
      </div>

      <div class="pity-inline-callout" v-if="resultsCallout">
        <template v-if="resultsCallout.type === 'rate'">
          Summon <span class="callout-number">{{ resultsCallout.value }}</span>x more for Mythic Hero.
        </template>
        <template v-else-if="resultsCallout.type === 'xeno'">
          Guaranteed after <span class="callout-number">{{ resultsCallout.value }}</span> summon(s):
          <span class="sublime-label">{{ resultsCallout.hero }}</span>
        </template>
      </div>

      <div class="summon-button-row">
        <button
          v-for="btn in summonButtons"
          :key="`summon-${btn.pulls}`"
          class="summon-control-btn"
          :disabled="btn.disabled"
          @click="runSummon(btn.pulls)"
        >
          <div class="summon-button-top">
            <div class="summon-chip" :class="{ insufficient: !btn.scrollsEnough }">
              <img :src="activeScrollIcon" :alt="`${activeSummonLabel} cost`" />
              <span>{{ btn.scrollRequirement }}</span>
            </div>
            <div
              v-if="btn.gemCost !== null"
              class="summon-chip"
              :class="{ insufficient: !btn.hasGemSupport }"
            >
              <img :src="GEM_ICON" alt="Gems" />
              <span>{{ btn.gemCost }}</span>
            </div>
          </div>
          <div class="summon-button-label">
            {{ btn.pulls }}x Summon
          </div>
        </button>
      </div>

      <p class="summon-results-hint" v-if="!lastResultsForTab.length">
        Run a summon to display the pull breakdown for this banner.
      </p>
      <div v-else class="summon-pulls">
        <div
          v-for="(row, rowIdx) in pullRowsForDisplay"
          :key="`row-${rowIdx}`"
          class="summon-pull-row"
          :class="{ 'row-wide': row.length === 4 }"
        >
          <div
            v-for="(result, idx) in row"
            :key="result?.id ?? `placeholder-${rowIdx}-${idx}`"
            :class="['summon-pull-card', result ? resultRarityClass(result) : 'placeholder']"
            :style="{ animationDelay: `${(rowIdx * row.length + idx) * 0.02}s` }"
          >
            <template v-if="result">
              <div class="pull-visual">
                <img
                  v-if="result.heroId && !avatarBroken(result.heroId)"
                  :src="heroAvatar(result.heroId)"
                  :alt="result.label"
                  @error="onAvatarError(result.heroId)"
                />
                <img
                  v-else-if="pullIcon(result)"
                  :src="pullIcon(result)!"
                  :alt="result.label"
                  class="token-img"
                />
                <div v-else class="token-icon">
                  {{ result.type === "hero" ? "Hero" : "Item" }}
                </div>
              </div>
              <div class="pull-quantity">
                x{{ resultQuantity(result) }}
              </div>
            </template>
            <template v-else>
              <div class="pull-placeholder"></div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
