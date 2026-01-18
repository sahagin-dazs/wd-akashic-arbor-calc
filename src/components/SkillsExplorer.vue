<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import html2canvas from "html2canvas";
import type { Element, HeroDef, Rarity, Role } from "../models/types";
import { avatarUrl } from "../utils/avatar";
import HeroFilters from "./HeroFilters.vue";

type SkillType = "base" | "chain" | "atk60" | "white" | "awakening" | "awakening-core" | "blue";

type SkillDef = {
  id: string;
  label: string;
  name: string;
  effect: string;
  type: SkillType;
};

const ROLE_META = {
  Ranger: { icon: "fa-solid fa-person-rifle", color: "#38bdf8" },
  Fighter: { icon: "fa-solid fa-hand-fist", color: "#facc15" },
  Support: { icon: "fa-solid fa-heart", color: "#22c55e" },
  Mage: { icon: "fa-solid fa-wand-magic-sparkles", color: "#c084fc" }
} as const;

const ELEMENT_META = {
  Fire: { icon: "fa-solid fa-fire", color: "#ef4444" },
  Ice: { icon: "fa-solid fa-snowflake", color: "#60a5fa" },
  Wind: { icon: "fa-solid fa-wind", color: "#34d399" },
  Electro: { icon: "fa-solid fa-bolt", color: "#facc15" },
  Xeno: { icon: "fa-solid fa-star-of-david", color: "#a855f7" }
} as const;

const SKILL_DEFS: SkillDef[] = [
  {
    id: "base",
    label: "Base Skill",
    name: "Summon",
    effect: "",
    type: "base"
  },
  {
    id: "chain",
    label: "Chain Skill",
    name: "Chain Skill",
    effect: "",
    type: "chain"
  },
  {
    id: "atk60-1",
    label: "ATK +60% I",
    name: "ATK +60% I",
    effect: "",
    type: "atk60"
  },
  {
    id: "atk60-2",
    label: "ATK +60% II",
    name: "ATK +60% II",
    effect: "",
    type: "atk60"
  },
  {
    id: "white-1",
    label: "Utility I",
    name: "Utility I",
    effect: "",
    type: "white"
  },
  {
    id: "white-2",
    label: "Utility II",
    name: "Utility II",
    effect: "",
    type: "white"
  },
  {
    id: "awakening-1",
    label: "Awakening I",
    name: "Awakening Skill I",
    effect: "",
    type: "awakening"
  },
  {
    id: "awakening-2",
    label: "Awakening II",
    name: "Awakening Skill II",
    effect: "",
    type: "awakening"
  },
  {
    id: "awakening-3",
    label: "Awakening III",
    name: "Awakening Skill III",
    effect: "",
    type: "awakening"
  },
  {
    id: "awakening-core",
    label: "Purple Skill",
    name: "Awakening",
    effect: "",
    type: "awakening-core"
  },
  {
    id: "blue-1",
    label: "Blue I",
    name: "Blue Skill I",
    effect: "",
    type: "blue"
  },
  {
    id: "blue-2",
    label: "Blue II",
    name: "Blue Skill II",
    effect: "",
    type: "blue"
  },
  {
    id: "blue-3",
    label: "Blue III",
    name: "Blue Skill III",
    effect: "",
    type: "blue"
  }
];

const SKILL_DEF_MAP = new Map(SKILL_DEFS.map((skill) => [skill.id, skill]));

const SKILL_GROUPS = [
  { id: "base", title: "Base Skills", types: ["base"] },
  { id: "chain", title: "Chain Skills", types: ["chain"] },
  { id: "awakening", title: "Awakening Skills", types: ["awakening"] },
  { id: "evolution", title: "Evolution", types: ["awakening-core"] },
  { id: "utility", title: "Utility Skills", types: ["white"] },
  { id: "atk60", title: "60% Skills", types: ["atk60"] },
  { id: "blue", title: "Blue Skills", types: ["blue"] }
] as const;

const props = defineProps<{
  heroes: HeroDef[];
}>();

const viewMode = ref<"hero" | "all">("hero");
const VIEW_MODE_STORAGE_KEY = "wd-tools-skills-explorer-view";
const HERO_STORAGE_KEY = "wd-tools-skills-explorer-hero";
const HERO_LIST_COLLAPSED_KEY = "wd-tools-skills-explorer-collapsed";
const selectedHeroId = ref<string | null>(null);
const heroListCollapsed = ref(false);
const heroPickerOpen = ref(false);
const heroDetailRef = ref<HTMLElement | null>(null);

const roleFilters = ref<Role[]>([]);
const elementFilters = ref<Element[]>([]);
const rarityFilters = ref<Rarity[]>([]);
const searchTerm = ref("");

const exporting = ref(false);
const exportStatus = ref<string | null>(null);
const exportRef = ref<HTMLElement | null>(null);

function toggleFilter<T extends Role | Element | Rarity>(
  list: T[],
  value: T
) {
  const index = list.indexOf(value);
  if (index >= 0) {
    list.splice(index, 1);
  } else {
    list.push(value);
  }
}

function toggleRoleFilter(role: Role) {
  toggleFilter(roleFilters.value, role);
}

function toggleElementFilter(element: Element) {
  toggleFilter(elementFilters.value, element);
}

function toggleRarityFilter(rarity: Rarity) {
  toggleFilter(rarityFilters.value, rarity);
}

const selectedHero = computed(() =>
  props.heroes.find((hero) => hero.id === selectedHeroId.value) ?? null
);

const visibleHeroes = computed(() =>
  props.heroes.filter((hero) => hero.rarity !== "Epic" && hero.rarity !== "Common")
);

const RARITY_ORDER: Rarity[] = ["Sublime", "Mythic", "Legendary"];

const groupedHeroes = computed(() =>
  RARITY_ORDER.map((rarity) => ({
    rarity,
    heroes: visibleHeroes.value.filter((hero) => hero.rarity === rarity)
  })).filter((group) => group.heroes.length)
);

watch(
  () => props.heroes,
  (next) => {
    if (!next.length) {
      selectedHeroId.value = null;
      return;
    }
    if (!selectedHeroId.value) return;
    const filtered = next.filter((hero) => hero.rarity !== "Epic" && hero.rarity !== "Common");
    if (!filtered.length) {
      selectedHeroId.value = null;
      return;
    }
    if (!filtered.some((hero) => hero.id === selectedHeroId.value)) {
      selectedHeroId.value = filtered[0].id;
    }
  }
);

watch(selectedHeroId, () => {
  exportStatus.value = null;
});

watch(selectedHeroId, (value) => {
  if (typeof window === "undefined" || !value) return;
  localStorage.setItem(HERO_STORAGE_KEY, value);
});

watch(heroListCollapsed, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HERO_LIST_COLLAPSED_KEY, value ? "true" : "false");
});

watch(viewMode, (value) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
});

if (typeof window !== "undefined") {
  const savedHero = localStorage.getItem(HERO_STORAGE_KEY);
  const visibleIds = new Set(visibleHeroes.value.map((hero) => hero.id));
  if (savedHero && visibleIds.has(savedHero)) {
    selectedHeroId.value = savedHero;
  }
  const savedCollapsed = localStorage.getItem(HERO_LIST_COLLAPSED_KEY);
  if (savedCollapsed === "true" || savedCollapsed === "false") {
    heroListCollapsed.value = savedCollapsed === "true";
  }
  const savedView = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (savedView === "hero" || savedView === "all") {
    viewMode.value = savedView;
  }
}

function getSkillCategory(skill: SkillDef) {
  if (skill.type === "base") return "Base";
  if (skill.type === "chain") return "Chain";
  if (skill.type === "atk60") return "60%";
  if (skill.type === "white") return "Utility";
  if (skill.type === "awakening") return "Awakening";
  if (skill.type === "awakening-core") return "Evolution";
  if (skill.type === "blue") return "Blue";
  return "";
}

function getHeroSkillMeta(heroId: string, skill: SkillDef) {
  const hero = props.heroes.find((entry) => entry.id === heroId);
  const meta = hero?.skillMeta?.[skill.id];
  return {
    name: meta?.name ?? skill.name,
    effect: meta?.effect ?? skill.effect,
    imageKey: meta?.imageKey
  };
}

function getSkillImageKey(skill: SkillDef, metaImageKey?: string) {
  if (skill.type === "base") return "skill";
  if (metaImageKey) return metaImageKey;
  if (skill.type === "chain") return "chain";
  if (skill.type === "awakening-core") return "awaken";
  return "skill";
}

function getSkillImageSrc(heroId: string, skill: SkillDef) {
  const meta = getHeroSkillMeta(heroId, skill);
  return `/skills/${heroId}_${getSkillImageKey(skill, meta.imageKey)}.png`;
}

function getSkillDef(skillId: string) {
  return SKILL_DEF_MAP.get(skillId)!;
}

function heroHasChainSkill(hero: HeroDef) {
  return Boolean(hero.skillMeta?.chain?.name || hero.skillMeta?.chain?.effect);
}

function baseSkillTheme(hero: HeroDef) {
  if (hero.element === "Xeno") return "xeno";
  if (hero.rarity === "Mythic") return "mythic";
  return "legendary";
}

function rarityBadgeClass(rarity: Rarity) {
  if (rarity === "Sublime") return "badge badge-sublime";
  if (rarity === "Mythic") return "badge badge-mythic";
  if (rarity === "Legendary") return "badge badge-legendary";
  if (rarity === "Epic") return "badge badge-rare";
  return "badge";
}

function awakeningRank(skillId: string) {
  if (skillId === "awakening-1") return 1;
  if (skillId === "awakening-2") return 2;
  if (skillId === "awakening-3") return 3;
  return 0;
}

const allSkills = computed(() =>
  visibleHeroes.value.flatMap((hero) =>
    SKILL_DEFS.filter((skill) => {
      if (skill.type === "chain") return heroHasChainSkill(hero);
      if (skill.id === "atk60-2") return false;
      return true;
    }).map((skill) => {
      const meta = getHeroSkillMeta(hero.id, skill);
      return {
        hero,
        skill,
        meta
      };
    })
  )
);

const filteredAllSkills = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  return allSkills.value.filter(({ hero, meta }) => {
    if (roleFilters.value.length && !roleFilters.value.includes(hero.role)) {
      return false;
    }
    if (elementFilters.value.length && !elementFilters.value.includes(hero.element)) {
      return false;
    }
    if (rarityFilters.value.length && !rarityFilters.value.includes(hero.rarity)) {
      return false;
    }
    if (query) {
      const haystack = `${meta.name} ${meta.effect}`.toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });
});

const groupedAllSkills = computed(() => {
  const grouped: Record<string, typeof filteredAllSkills.value> = {};
  SKILL_GROUPS.forEach((group) => {
    grouped[group.id] = filteredAllSkills.value.filter(({ skill }) =>
      group.types.includes(skill.type)
    );
  });
  return grouped;
});

async function selectHero(heroId: string) {
  selectedHeroId.value = heroId;
  heroPickerOpen.value = false;
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches) {
    await nextTick();
    heroDetailRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function clearSelectedHero() {
  selectedHeroId.value = null;
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

async function copyHeroSkills() {
  if (!exportRef.value || !selectedHero.value) return;
  exportStatus.value = null;
  const exportWidth = 660;
  const prevWidth = exportRef.value.style.width;
  const prevMaxWidth = exportRef.value.style.maxWidth;
  exportRef.value.style.width = `${exportWidth}px`;
  exportRef.value.style.maxWidth = `${exportWidth}px`;
  exporting.value = true;
  await nextTick();
  if (typeof document !== "undefined" && (document as any).fonts?.ready) {
    await (document as any).fonts.ready;
    if ((document as any).fonts?.load) {
      await (document as any).fonts.load('900 12px "Font Awesome 6 Free"');
    }
  }
  await waitForImages(exportRef.value);
  const bounds = exportRef.value.getBoundingClientRect();
  const canvas = await html2canvas(exportRef.value, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    width: Math.ceil(bounds.width),
    height: Math.ceil(bounds.height)
  });
  exportRef.value.style.width = prevWidth;
  exportRef.value.style.maxWidth = prevMaxWidth;
  exporting.value = false;

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );
  if (!blob) return;
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      exportStatus.value = "Skill tree copied.";
      return;
    } catch {
      /* fall through */
    }
  }
  if (isIOS()) {
    openImageInNewTab(blob);
    exportStatus.value = "Image opened in a new tab.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${selectedHero.value.name.replace(/\s+/g, "-").toLowerCase()}-skill.png`;
  link.click();
  URL.revokeObjectURL(url);
  exportStatus.value = "Skill tree downloaded.";
}
</script>

<template>
  <section class="panel skills-explorer-panel">
    <div class="skills-explorer-header">
      <div>
        <p class="eyebrow">Skill library</p>
        <h2>Skills Explorer</h2>
        <p class="muted">Browse every hero skill, filter by class or element, and share the full skill tree.</p>
      </div>
      <div class="skills-explorer-actions">
        <div class="skills-mode-toggle" role="tablist">
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            :class="{ active: viewMode === 'hero' }"
            @click="viewMode = 'hero'"
          >
            Hero Skills
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            :class="{ active: viewMode === 'all' }"
            @click="viewMode = 'all'"
          >
            All Skills
          </button>
        </div>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="viewMode === 'hero'" class="skills-hero-view">
        <div class="skills-hero-selector" :class="{ 'is-collapsed': heroListCollapsed }">
          <div class="skills-hero-selector-header">
            <button
              type="button"
              class="skills-hero-collapse"
              @click="heroListCollapsed = !heroListCollapsed"
            >
              <i
                class="fa-solid"
                :class="heroListCollapsed ? 'fa-chevron-right' : 'fa-chevron-down'"
                aria-hidden="true"
              ></i>
              {{ heroListCollapsed ? "Show heroes" : "Hide heroes" }}
            </button>
            <span class="skills-hero-selector-title">Hero Picker</span>
          </div>
          <div class="skills-hero-list" :class="{ collapsed: heroListCollapsed }">
            <div v-for="group in groupedHeroes" :key="group.rarity" class="skills-hero-rarity-group">
              <div class="skills-hero-rarity-title">{{ group.rarity }}</div>
              <div class="skills-hero-rarity-grid">
                <button
                  v-for="hero in group.heroes"
                  :key="hero.id"
                  type="button"
                  class="skills-hero-card"
                  :class="[{ active: hero.id === selectedHeroId }, `rarity-${hero.rarity.toLowerCase()}`]"
                  @click="selectHero(hero.id)"
                >
                  <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" loading="lazy" />
                  <span>{{ hero.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div ref="heroDetailRef" class="skills-hero-detail">
          <div v-if="selectedHero" class="skills-hero-header" v-show="!exporting">
            <div class="skills-hero-summary">
              <button
                type="button"
                class="skills-hero-picker"
                @click="heroPickerOpen = true"
              >
                <img
                  :src="avatarUrl(selectedHero.id, selectedHero.name)"
                  :alt="selectedHero.name"
                />
              </button>
              <div>
                <div class="skills-hero-name">{{ selectedHero.name }}</div>
                <div class="skills-hero-meta">
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
            <div class="skills-hero-actions" v-show="!exporting">
              <button
                class="btn btn-sm btn-ghost"
                type="button"
                @click="clearSelectedHero"
              >
                Clear hero
              </button>
              <button
                class="btn btn-sm btn-secondary"
                type="button"
                @click="copyHeroSkills"
                :disabled="exporting"
              >
                <i class="fa-solid fa-image" aria-hidden="true"></i>
                Copy Skill Tree
              </button>
              <span v-if="exportStatus" class="skills-export-status">{{ exportStatus }}</span>
            </div>
          </div>
          <div v-else class="skills-hero-empty">
            <button
              type="button"
              class="skills-hero-picker empty"
              @click="heroPickerOpen = true"
            >
              <span class="plus">+</span>
            </button>
            <div class="skills-hero-empty-text">Select a hero to explore their skills.</div>
          </div>
          <div v-if="selectedHero" class="skills-hero-tree" ref="exportRef" :class="{ exporting }">
            <div class="skills-export-header" v-show="exporting">
              <div class="skills-export-title">{{ selectedHero.name }}'s Skills</div>
              <div class="skills-export-hero">
                <img
                  :src="avatarUrl(selectedHero.id, selectedHero.name)"
                  :alt="selectedHero.name"
                />
                <div class="skills-export-hero-meta">
                  <span class="meta-pill light">
                    <i
                      :class="ELEMENT_META[selectedHero.element].icon"
                      :style="{ color: ELEMENT_META[selectedHero.element].color }"
                      aria-hidden="true"
                    ></i>
                    <span>{{ selectedHero.element }}</span>
                  </span>
                  <span class="meta-pill light">
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
            <div class="skills-hero-group">
              <div class="skills-hero-group-title">Base Skill</div>
              <div class="skills-row">
                <div class="skills-card">
                  <div
                    class="skills-skill-card skill-base"
                    :class="`skill-base-${baseSkillTheme(selectedHero)}`"
                  >
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('base'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('base')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('base')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('base')).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="skills-hero-group" v-if="heroHasChainSkill(selectedHero)">
              <div class="skills-hero-group-title">Chain Skill</div>
              <div class="skills-row">
                <div class="skills-card">
                  <div class="skills-skill-card skill-chain">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('chain'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('chain')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('chain')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('chain')).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skills-hero-group">
              <div class="skills-hero-group-title">Awakening Skills</div>
              <div class="skills-row">
                <div class="skills-card" v-for="skillId in ['awakening-1', 'awakening-2', 'awakening-3']" :key="skillId">
                  <div class="skills-skill-card skill-awakening">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef(skillId))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-dots">
                      <span
                        v-for="index in 3"
                        :key="`awakening-${skillId}-${index}`"
                        :class="{ filled: index <= awakeningRank(skillId) }"
                      ></span>
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skills-hero-group">
              <div class="skills-hero-group-title">Evolution</div>
              <div class="skills-row">
                <div class="skills-card">
                  <div class="skills-skill-card skill-awakening-core">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('awakening-core'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('awakening-core')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('awakening-core')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('awakening-core')).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skills-hero-group">
              <div class="skills-hero-group-title">Utility Skills</div>
              <div class="skills-row skills-row-linked">
                <div class="skills-card">
                  <div class="skills-skill-card skill-white">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('white-1'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('white-1')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('white-1')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('white-1')).effect }}
                    </div>
                  </div>
                </div>
                <div class="skills-prereq-arrow">
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </div>
                <div class="skills-card">
                  <div class="skills-skill-card skill-white">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('white-2'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('white-2')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('white-2')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('white-2')).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skills-hero-group">
              <div class="skills-hero-group-title">60% Skills</div>
              <div class="skills-row skills-row-linked">
                <div class="skills-card">
                  <div class="skills-skill-card skill-atk60">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('atk60-1'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-1')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-1')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-1')).effect }}
                    </div>
                  </div>
                </div>
                <div class="skills-prereq-arrow">
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </div>
                <div class="skills-card">
                  <div class="skills-skill-card skill-atk60">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef('atk60-2'))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-2')).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-2')).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef('atk60-2')).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="skills-hero-group">
              <div class="skills-hero-group-title">Blue Skills</div>
              <div class="skills-row">
                <div class="skills-card" v-for="skillId in ['blue-1', 'blue-2', 'blue-3']" :key="skillId">
                  <div class="skills-skill-card skill-blue">
                    <div class="skills-skill-image">
                      <img
                        :src="getSkillImageSrc(selectedHero.id, getSkillDef(skillId))"
                        :alt="getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).name"
                        loading="lazy"
                      />
                    </div>
                    <div class="skills-skill-title">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).name }}
                    </div>
                    <div class="skills-skill-effect">
                      {{ getHeroSkillMeta(selectedHero.id, getSkillDef(skillId)).effect }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div v-else class="skills-all-view">
        <div class="skills-filter-panel">
          <div class="skills-search">
            <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              v-model="searchTerm"
              type="search"
              placeholder="Search skill names or descriptions..."
            />
            <button
              v-if="searchTerm"
              class="btn btn-sm btn-ghost"
              type="button"
              @click="searchTerm = ''"
            >
              Clear
            </button>
          </div>
          <HeroFilters
            :selected-roles="roleFilters"
            :selected-elements="elementFilters"
            :selected-rarities="rarityFilters"
            @toggle-role="toggleRoleFilter"
            @toggle-element="toggleElementFilter"
            @toggle-rarity="toggleRarityFilter"
          />
        </div>
        <div class="skills-all-groups">
          <div
            v-for="group in SKILL_GROUPS"
            :key="group.id"
            class="skills-all-group"
          >
            <div class="skills-all-group-title">{{ group.title }}</div>
            <div class="skills-all-grid">
              <div
                v-for="entry in groupedAllSkills[group.id]"
                :key="`${entry.hero.id}-${entry.skill.id}`"
                class="skills-card"
              >
                <div
                  class="skills-skill-card"
                  :class="[
                    `skill-${entry.skill.type}`,
                    entry.skill.type === 'base' ? `skill-base-${baseSkillTheme(entry.hero)}` : ''
                  ]"
                >
                  <div class="skills-skill-avatar">
                    <img
                      :src="avatarUrl(entry.hero.id, entry.hero.name)"
                      :alt="entry.hero.name"
                      loading="lazy"
                    />
                  </div>
                  <div class="skills-skill-category">
                    {{ getSkillCategory(entry.skill) }}
                  </div>
                  <div class="skills-skill-image">
                    <img
                      :src="getSkillImageSrc(entry.hero.id, entry.skill)"
                      :alt="entry.meta.name"
                      loading="lazy"
                    />
                  </div>
                  <div v-if="entry.skill.type === 'awakening'" class="skills-skill-dots">
                    <span
                      v-for="index in 3"
                      :key="`all-${entry.hero.id}-${entry.skill.id}-${index}`"
                      :class="{ filled: index <= awakeningRank(entry.skill.id) }"
                    ></span>
                  </div>
                  <div class="skills-skill-title">{{ entry.meta.name }}</div>
                  <div class="skills-skill-effect">{{ entry.meta.effect }}</div>
                </div>
              </div>
              <div
                v-if="groupedAllSkills[group.id].length === 0"
                class="skills-empty"
              >
                No skills match these filters.
                </div>
              </div>
            </div>

            <div class="skills-export-footer export-only" v-show="exporting">
              <div class="skills-export-callout">
                Explore all Wittle Defender skills at https://wdtoolbox.com
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="heroPickerOpen"
        class="skills-hero-modal-backdrop"
        role="dialog"
        aria-modal="true"
        @click="heroPickerOpen = false"
      >
        <div class="skills-hero-modal" @click.stop>
          <div class="skills-hero-modal-header">
            <strong>Select a hero</strong>
            <button class="ghost tiny" type="button" @click="heroPickerOpen = false">
              Close
            </button>
          </div>
          <div class="skills-hero-modal-body">
            <div v-for="group in groupedHeroes" :key="`modal-${group.rarity}`" class="skills-hero-rarity-group">
              <div class="skills-hero-rarity-title">{{ group.rarity }}</div>
              <div class="skills-hero-rarity-grid">
                <button
                  v-for="hero in group.heroes"
                  :key="`modal-${hero.id}`"
                  type="button"
                  class="skills-hero-card"
                  :class="[{ active: hero.id === selectedHeroId }, `rarity-${hero.rarity.toLowerCase()}`]"
                  @click="selectHero(hero.id)"
                >
                  <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" loading="lazy" />
                  <span>{{ hero.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  </section>
</template>
