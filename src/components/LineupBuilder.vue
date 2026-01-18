<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import html2canvas from "html2canvas";
import type { HeroDef, OwnedHero, Level } from "../models/types";
import type { GuildBossData, LineupData, LineupFormat, LineupSlot } from "../models/lineupList";
import { LEVELS } from "../models/types";
import { createLineup, fetchLineup, updateLineup } from "../utils/lineupApi";
import { newId } from "../utils/ids";
import { avatarUrl } from "../utils/avatar";

const props = defineProps<{
  heroes: HeroDef[];
  owned: OwnedHero[];
}>();

const LOCAL_STORAGE_KEY = "wdtools-lineup-draft";
const TOKEN_STORAGE_KEY = "wdtools-lineup-tokens";
const LOCAL_SAVED_KEY = "wdtools-lineup-saved";
const GUILD_BOSS_COLLAPSE_KEY = "wdtools-lineup-guildboss-collapse";
const AKASHIC_LINEUP_STORAGE_KEY = "wd-akashic-lineup";

type DraftState = {
  id: string | null;
  title: string;
  format: LineupFormat;
  slots: LineupSlot[];
  notes: string;
  guildBoss: GuildBossData;
};

type AkashicLineupSlot = {
  heroId: string | null;
};

type SavedLineup = {
  id: string;
  title: string;
  data: LineupData;
};

const SLOT_COUNT_BY_FORMAT: Record<LineupFormat, number> = {
  pve: 5,
  pvp: 10,
  gvg: 30,
  guildboss: 5,
  nightmare: 10
};
const HERO_LIMIT_PER_TEAM = 5;
const GVG_TEAM_COUNT = 3;
const GVG_TEAM_SLOT_COUNT = 10;
const NIGHTMARE_TEAM_COUNT = 2;
const NIGHTMARE_TEAM_SLOT_COUNT = 5;
const MAX_GUILD_BOSS_SKILLS = 6;
const GUILD_BOSS_AWAKENING_SKILLS = ["awakening-1", "awakening-2", "awakening-3"] as const;
const GUILD_BOSS_SKILLS = [
  {
    id: "chain",
    label: "Chain Skill",
    name: "Chain Skill",
    effect: "",
    imageKey: "chain",
    type: "chain"
  },
  {
    id: "atk60-1",
    label: "ATK +60% I",
    name: "ATK +60% I",
    effect: "",
    imageKey: "atk60-1",
    type: "atk60"
  },
  {
    id: "atk60-2",
    label: "ATK +60% II",
    name: "ATK +60% II",
    effect: "",
    imageKey: "atk60-2",
    type: "atk60",
    requires: "atk60-1"
  },
  {
    id: "awakening-1",
    label: "Awakening Skill I",
    name: "Awakening Skill I",
    effect: "",
    imageKey: "awakening-1",
    type: "awakening"
  },
  {
    id: "awakening-2",
    label: "Awakening Skill II",
    name: "Awakening Skill II",
    effect: "",
    imageKey: "awakening-2",
    type: "awakening"
  },
  {
    id: "awakening-3",
    label: "Awakening Skill III",
    name: "Awakening Skill III",
    effect: "",
    imageKey: "awakening-3",
    type: "awakening"
  },
  {
    id: "awakening-core",
    label: "Awakening",
    name: "Awakening",
    effect: "",
    imageKey: "awaken",
    type: "awakening-core"
  },
  {
    id: "blue-1",
    label: "+100% ATK",
    name: "+100% ATK",
    effect: "",
    imageKey: "blue-1",
    type: "blue"
  },
  {
    id: "blue-2",
    label: "Blue Skill II",
    name: "Blue Skill II",
    effect: "",
    imageKey: "blue-2",
    type: "blue"
  },
  {
    id: "blue-3",
    label: "Blue Skill III",
    name: "Blue Skill III",
    effect: "",
    imageKey: "blue-3",
    type: "blue"
  },
  {
    id: "white-1",
    label: "White Skill I",
    name: "White Skill I",
    effect: "",
    imageKey: "white-1",
    type: "white"
  },
  {
    id: "white-2",
    label: "White Skill II",
    name: "White Skill II",
    effect: "",
    imageKey: "white-2",
    type: "white",
    requires: "white-1"
  }
] as const;

type GuildBossSkill = (typeof GUILD_BOSS_SKILLS)[number];
type GuildBossSkillId = GuildBossSkill["id"];
const GUILD_BOSS_SKILL_MAP = new Map(GUILD_BOSS_SKILLS.map((skill) => [skill.id, skill]));

function defaultSlots(format: LineupFormat): LineupSlot[] {
  return Array.from({ length: SLOT_COUNT_BY_FORMAT[format] }, () => ({
    id: newId(),
    heroId: null
  }));
}

function trimToHeroLimit(slots: LineupSlot[], format: LineupFormat) {
  if (format !== "gvg" && format !== "nightmare") {
    let count = 0;
    return slots.map((slot) => {
      if (!slot.heroId) return slot;
      if (count < HERO_LIMIT_PER_TEAM) {
        count += 1;
        return slot;
      }
      return { ...slot, heroId: null };
    });
  }
  const teamSlotCount = format === "gvg" ? GVG_TEAM_SLOT_COUNT : NIGHTMARE_TEAM_SLOT_COUNT;
  return slots.map((slot, index) => {
    if (!slot.heroId) return slot;
    const teamIndex = Math.floor(index / teamSlotCount);
    const filledBefore = slots
      .slice(teamIndex * teamSlotCount, index)
      .filter((entry) => entry.heroId).length;
    if (filledBefore < HERO_LIMIT_PER_TEAM) return slot;
    return { ...slot, heroId: null };
  });
}

function normalizeSlots(rawSlots: LineupSlot[] | undefined, format: LineupFormat): LineupSlot[] {
  const normalized = (rawSlots ?? [])
    .slice(0, SLOT_COUNT_BY_FORMAT[format])
    .map((slot) => ({
      id: slot?.id || newId(),
      heroId: typeof slot?.heroId === "string" ? slot.heroId : null
    }));
  while (normalized.length < SLOT_COUNT_BY_FORMAT[format]) {
    normalized.push({ id: newId(), heroId: null });
  }
  return trimToHeroLimit(normalized, format);
}

function normalizeGuildBoss(raw?: Partial<GuildBossData> | null): GuildBossData {
  const skills: Record<string, string[]> = {};
  if (raw?.skills) {
    Object.entries(raw.skills).forEach(([heroId, skillList]) => {
      if (!Array.isArray(skillList)) return;
      const filtered = skillList.filter((skillId) => {
        const skill = GUILD_BOSS_SKILL_MAP.get(skillId as GuildBossSkillId);
        return Boolean(skill && skill.type !== "awakening-core");
      });
      if (filtered.length) {
        skills[heroId] = filtered;
      }
    });
  }
  return {
    awakenedHeroId: raw?.awakenedHeroId ?? null,
    argentSkins: raw?.argentSkins ?? {},
    skills,
    showDescriptions: raw?.showDescriptions ?? true
  };
}

function normalizeDraft(raw?: Partial<DraftState> | null): DraftState {
  const format: LineupFormat =
    raw?.format === "gvg"
      ? "gvg"
      : raw?.format === "pvp"
        ? "pvp"
        : raw?.format === "guildboss"
          ? "guildboss"
          : raw?.format === "nightmare"
            ? "nightmare"
            : "pve";
  return {
    id: raw?.id ?? null,
    title: raw?.title ?? "New Lineup",
    format,
    slots: normalizeSlots(raw?.slots, format),
    notes: raw?.notes ?? "",
    guildBoss: normalizeGuildBoss(raw?.guildBoss)
  };
}

function loadAkashicLineupSlots(): AkashicLineupSlot[] {
  const emptySlots = Array.from({ length: HERO_LIMIT_PER_TEAM }, () => ({ heroId: null }));
  if (typeof window === "undefined") return emptySlots;
  try {
    const stored = localStorage.getItem(AKASHIC_LINEUP_STORAGE_KEY);
    if (!stored) return emptySlots;
    const parsed = JSON.parse(stored) as { slots?: AkashicLineupSlot[] };
    if (!Array.isArray(parsed?.slots)) return emptySlots;
    const normalized = parsed.slots.slice(0, HERO_LIMIT_PER_TEAM).map((slot) => ({
      heroId: typeof slot?.heroId === "string" ? slot.heroId : null
    }));
    while (normalized.length < HERO_LIMIT_PER_TEAM) {
      normalized.push({ heroId: null });
    }
    return normalized;
  } catch {
    return emptySlots;
  }
}

function loadDraft(): DraftState {
  if (typeof window === "undefined") return normalizeDraft(null);
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return normalizeDraft(null);
    return normalizeDraft(JSON.parse(saved));
  } catch {
    return normalizeDraft(null);
  }
}

function persistDraft(value: DraftState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(value));
}

function loadTokens() {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(TOKEN_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function persistTokens(value: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(value));
}

function loadLocalSaved(): Record<string, SavedLineup> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(LOCAL_SAVED_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function persistLocalSaved(value: Record<string, SavedLineup>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(value));
}

function loadGuildBossCollapse(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const saved = localStorage.getItem(GUILD_BOSS_COLLAPSE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function persistGuildBossCollapse(value: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUILD_BOSS_COLLAPSE_KEY, JSON.stringify(value));
}

const initialDraft = normalizeDraft(loadDraft());
const draft = reactive<DraftState>(initialDraft);
const showGuildBossDescriptions = ref(initialDraft.guildBoss?.showDescriptions ?? true);
const saving = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const shareUrl = ref<string | null>(null);
const editUrl = ref<string | null>(null);
const openInput = ref("");
const tokens = ref<Record<string, string>>(loadTokens());
const localSaved = ref<Record<string, SavedLineup>>(loadLocalSaved());
const activeSlotPopoverId = ref<string | null>(null);
const collapsedGuildBossSkills = ref<Record<string, boolean>>(loadGuildBossCollapse());
const exportRef = ref<HTMLElement | null>(null);
const exporting = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const showPreviewNames = ref(true);
const showPreviewLevels = ref(true);
const isMobile = ref(false);
const akashicLineupSlots = ref<AkashicLineupSlot[]>(loadAkashicLineupSlots());
let lineupMediaQuery: MediaQueryList | null = null;
let lineupMediaListener: ((event: MediaQueryListEvent) => void) | null = null;
let akashicStorageListener: ((event: StorageEvent) => void) | null = null;
let akashicLineupListener: (() => void) | null = null;

const ALLOWED_HERO_RARITIES = new Set(["Sublime", "Mythic", "Legendary"]);

const heroMap = computed(() => new Map(props.heroes.map((hero) => [hero.id, hero])));
const ownedMap = computed(() => {
  const map = new Map<string, number | null>();
  props.owned.forEach((entry) => map.set(entry.heroId, entry.levelIndex));
  return map;
});

const isLocked = computed(() => {
  if (!draft.id) return false;
  if (draft.id.startsWith("local-")) return false;
  const token = tokens.value[draft.id];
  return !token;
});

const hasEditToken = computed(() => {
  if (!draft.id) return false;
  if (draft.id.startsWith("local-")) return false;
  return Boolean(tokens.value[draft.id]);
});

function isLocalId(id: string | null | undefined) {
  return Boolean(id && id.startsWith("local-"));
}

function buildShareUrl(id: string) {
  if (typeof window === "undefined") return `#lineup=${id}`;
  return `${window.location.origin}${window.location.pathname}#lineup=${id}`;
}

function buildEditUrl(id: string, token: string) {
  if (typeof window === "undefined") return `#lineup=${id}&edit=${token}`;
  return `${window.location.origin}${window.location.pathname}#lineup=${id}&edit=${token}`;
}

function updateShareLinks() {
  if (!draft.id) {
    shareUrl.value = null;
    editUrl.value = null;
    return;
  }
  shareUrl.value = buildShareUrl(draft.id);
  const token = tokens.value[draft.id];
  editUrl.value = token ? buildEditUrl(draft.id, token) : null;
}

function clearStatus() {
  error.value = null;
  success.value = null;
}

function makePayload(): LineupData {
  return {
    format: draft.format,
    slots: draft.slots.map((slot) => ({
      id: slot.id,
      heroId: slot.heroId
    })),
    notes: draft.notes,
    guildBoss: {
      ...draft.guildBoss,
      showDescriptions: showGuildBossDescriptions.value
    }
  };
}

function saveLocalLineup(id: string, title: string, data: LineupData) {
  const next = { ...localSaved.value };
  next[id] = { id, title, data };
  localSaved.value = next;
  persistLocalSaved(next);
}

const copyToClipboard = async (text: string | null | undefined) => {
  if (!text) return;
  const nav = typeof window !== "undefined" ? window.navigator : undefined;
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to legacy method.
  }
  if (typeof document === "undefined") return;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

async function save() {
  if (saving.value) return;
  clearStatus();
  saving.value = true;
  shareUrl.value = null;
  editUrl.value = null;
  const payload = makePayload();
  try {
    if (!draft.id || isLocalId(draft.id)) {
      try {
        const created = await createLineup({
          title: draft.title || "Untitled",
          data: payload
        });
        draft.id = created.id;
        const next = { ...tokens.value, [created.id]: created.editToken };
        tokens.value = next;
        persistTokens(next);
        saveLocalLineup(created.id, created.title || "Untitled", payload);
        shareUrl.value = buildShareUrl(created.id);
        editUrl.value = buildEditUrl(created.id, created.editToken);
        success.value = "Saved to the cloud.";
      } catch {
        const localId = draft.id && isLocalId(draft.id) ? draft.id : `local-${newId()}`;
        draft.id = localId;
        saveLocalLineup(localId, draft.title || "Untitled", payload);
        shareUrl.value = buildShareUrl(localId);
        editUrl.value = null;
        success.value = `Saved locally as ${localId}.`;
      }
    } else {
      const editToken = tokens.value[draft.id] || "";
      if (!editToken) {
        error.value = "Missing edit token for this lineup. Provide it to update.";
        return;
      }
      const updated = await updateLineup({
        id: draft.id,
        editToken,
        title: draft.title || "Untitled",
        data: payload
      });
      saveLocalLineup(updated.id, updated.title || "Untitled", payload);
      shareUrl.value = buildShareUrl(updated.id);
      editUrl.value = buildEditUrl(updated.id, editToken);
      success.value = "Lineup updated.";
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to save.";
  } finally {
    saving.value = false;
  }
}

async function loadExisting(id: string, editToken?: string | null) {
  if (!id) return;
  clearStatus();
  loading.value = true;
  shareUrl.value = null;
  editUrl.value = null;
  activeSlotPopoverId.value = null;
  try {
    const doc = await fetchLineup(id);
    const normalized = normalizeDraft(doc.data);
    draft.id = doc.id;
    draft.title = doc.title || "Untitled";
    draft.format = normalized.format;
    draft.slots = normalized.slots;
    draft.notes = normalized.notes || "";
    draft.guildBoss = normalized.guildBoss;
    showGuildBossDescriptions.value = normalized.guildBoss.showDescriptions ?? true;
    if (editToken) {
      const next = { ...tokens.value, [id]: editToken };
      tokens.value = next;
      persistTokens(next);
    }
    const token = editToken || tokens.value[id];
    if (token) {
      editUrl.value = buildEditUrl(doc.id, token);
    }
    shareUrl.value = buildShareUrl(doc.id);
    saveLocalLineup(doc.id, doc.title || "Untitled", doc.data);
    success.value = "Lineup loaded.";
  } catch (err: any) {
    error.value = err?.message || "Failed to load.";
  } finally {
    loading.value = false;
  }
}

function parseOpenValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { id: "", token: null };
  if (trimmed.includes("#lineup=")) {
    try {
      const url = new URL(trimmed);
      const hash = url.hash.replace("#", "");
      const params = new URLSearchParams(hash);
      return { id: params.get("lineup") || "", token: params.get("edit") };
    } catch {
      // Fall through.
    }
  }
  if (trimmed.startsWith("#lineup=")) {
    const params = new URLSearchParams(trimmed.replace("#", ""));
    return { id: params.get("lineup") || "", token: params.get("edit") };
  }
  if (trimmed.includes("&edit=")) {
    const [idPart, tokenPart] = trimmed.split("&edit=");
    return { id: idPart.replace("#lineup=", ""), token: tokenPart };
  }
  return { id: trimmed.replace("#lineup=", ""), token: null };
}

function openLineup() {
  const { id, token } = parseOpenValue(openInput.value);
  if (!id) {
    error.value = "Enter a lineup id or link.";
    return;
  }
  loadExisting(id, token);
}

function newLineup() {
  draft.id = null;
  draft.title = "New Lineup";
  draft.format = "pve";
  draft.slots = defaultSlots("pve");
  draft.notes = "";
  draft.guildBoss = normalizeGuildBoss(null);
  showGuildBossDescriptions.value = true;
  shareUrl.value = null;
  editUrl.value = null;
  activeSlotPopoverId.value = null;
  error.value = null;
  success.value = "Started a new lineup.";
}

function selectSaved(id: string) {
  const saved = localSaved.value[id];
  if (!saved) return;
  const normalized = normalizeDraft(saved.data);
  draft.id = saved.id;
  draft.title = saved.title;
  draft.format = normalized.format;
  draft.slots = normalized.slots;
  draft.notes = normalized.notes || "";
  draft.guildBoss = normalized.guildBoss;
  showGuildBossDescriptions.value = normalized.guildBoss.showDescriptions ?? true;
  activeSlotPopoverId.value = null;
  shareUrl.value = buildShareUrl(saved.id);
  const token = tokens.value[saved.id];
  editUrl.value = token ? buildEditUrl(saved.id, token) : null;
}

function clearSlot(index: number) {
  draft.slots[index].heroId = null;
}

function clearLineup() {
  draft.slots.forEach((slot) => {
    slot.heroId = null;
  });
  activeSlotPopoverId.value = null;
  success.value = "Lineup cleared.";
  error.value = null;
}

function refreshAkashicLineup() {
  akashicLineupSlots.value = loadAkashicLineupSlots();
}

const filledHeroCount = computed(
  () => draft.slots.filter((slot) => Boolean(slot.heroId)).length
);
const totalHeroLimit = computed(() => {
  if (draft.format === "gvg") return HERO_LIMIT_PER_TEAM * GVG_TEAM_COUNT;
  if (draft.format === "nightmare") return HERO_LIMIT_PER_TEAM * NIGHTMARE_TEAM_COUNT;
  return HERO_LIMIT_PER_TEAM;
});
const isLineupFull = computed(() => filledHeroCount.value >= totalHeroLimit.value);
const hasAkashicLineup = computed(
  () =>
    akashicLineupSlots.value.length === HERO_LIMIT_PER_TEAM &&
    akashicLineupSlots.value.every((slot) => Boolean(slot.heroId))
);
const teamHeroCounts = computed(() => {
  if (draft.format !== "gvg" && draft.format !== "nightmare") return [filledHeroCount.value];
  const teamCount = draft.format === "gvg" ? GVG_TEAM_COUNT : NIGHTMARE_TEAM_COUNT;
  const teamSlotCount = draft.format === "gvg" ? GVG_TEAM_SLOT_COUNT : NIGHTMARE_TEAM_SLOT_COUNT;
  const counts = Array.from({ length: teamCount }, () => 0);
  draft.slots.forEach((slot, index) => {
    if (slot.heroId) {
      counts[Math.floor(index / teamSlotCount)] += 1;
    }
  });
  return counts;
});
const groupedSlots = computed(() => {
  if (draft.format !== "gvg" && draft.format !== "nightmare") return [draft.slots];
  const teamCount = draft.format === "gvg" ? GVG_TEAM_COUNT : NIGHTMARE_TEAM_COUNT;
  const teamSlotCount = draft.format === "gvg" ? GVG_TEAM_SLOT_COUNT : NIGHTMARE_TEAM_SLOT_COUNT;
  return Array.from({ length: teamCount }, (_, teamIndex) =>
    draft.slots.slice(teamIndex * teamSlotCount, (teamIndex + 1) * teamSlotCount)
  );
});
const lineupLimitText = computed(() => {
  if (draft.format === "gvg") {
    return `Up to ${HERO_LIMIT_PER_TEAM} heroes per team (${totalHeroLimit.value} total) can be placed per lineup.`;
  }
  if (draft.format === "nightmare") {
    return `Up to ${HERO_LIMIT_PER_TEAM} heroes per lineup (${totalHeroLimit.value} total) can be placed.`;
  }
  return `Up to ${HERO_LIMIT_PER_TEAM} heroes can be placed per lineup.`;
});
const assignedHeroIds = computed(
  () => new Set(draft.slots.map((slot) => slot.heroId).filter(Boolean) as string[])
);
const guildBossHeroIds = computed(() =>
  draft.format === "guildboss"
    ? (draft.slots.map((slot) => slot.heroId).filter(Boolean) as string[])
    : []
);
const guildBossSkillCount = computed(() =>
  Object.values(draft.guildBoss.skills).reduce((total, list) => total + list.length, 0)
);

const availableHeroes = computed(() =>
  props.heroes.filter((hero) => ALLOWED_HERO_RARITIES.has(hero.rarity))
);

const showPreviewNamesEffective = computed(
  () => showPreviewNames.value && (!isMobile.value || exporting.value)
);
const showPreviewLevelsEffective = computed(
  () => showPreviewLevels.value && (!isMobile.value || exporting.value)
);

function getGuildBossSkillGroups(heroId: string) {
  const skills = guildBossSkillsForHero(heroId);
  return [
    { id: "chain", title: "Chain", items: skills.filter((skill) => skill.type === "chain") },
    {
      id: "awakening",
      title: "Awakening",
      items: skills.filter(
        (skill) => skill.type === "awakening" || skill.type === "awakening-core"
      )
    },
    { id: "atk60", title: "60%", items: skills.filter((skill) => skill.type === "atk60") },
    { id: "utility", title: "Utility", items: skills.filter((skill) => skill.type === "white") },
    { id: "blue", title: "Blue", items: skills.filter((skill) => skill.type === "blue") }
  ].filter((group) => group.items.length > 0);
}

function teamHeaderLabel(index: number) {
  if (draft.format === "nightmare") return `Lineup ${index + 1}`;
  return `Team ${index + 1}`;
}

function setSlotHero(slot: LineupSlot, heroId: string | null) {
  if (!heroId) {
    slot.heroId = null;
    return;
  }
  const existingSlot = draft.slots.find((entry) => entry.heroId === heroId);
  if (existingSlot && existingSlot !== slot) {
    existingSlot.heroId = null;
  }
  if (!existingSlot && !slot.heroId) {
    if (draft.format === "gvg" || draft.format === "nightmare") {
      const slotIndex = draft.slots.findIndex((entry) => entry.id === slot.id);
      const teamSlotCount = draft.format === "gvg" ? GVG_TEAM_SLOT_COUNT : NIGHTMARE_TEAM_SLOT_COUNT;
      const teamIndex = slotIndex >= 0 ? Math.floor(slotIndex / teamSlotCount) : 0;
      if (teamHeroCounts.value[teamIndex] >= HERO_LIMIT_PER_TEAM) return;
    } else if (isLineupFull.value) {
      return;
    }
  }
  slot.heroId = heroId;
}

function copyFromAkashicLineup() {
  if (draft.format !== "pve" && draft.format !== "guildboss") {
    success.value = null;
    error.value = "Switch to PvE or Guild Boss format to copy from Akashic Arbor.";
    return;
  }
  refreshAkashicLineup();
  if (!hasAkashicLineup.value) {
    success.value = null;
    error.value = "Fill all 5 Akashic Arbor lineup slots to copy them here.";
    return;
  }
  const slots = akashicLineupSlots.value.map((slot) => ({
    id: newId(),
    heroId: slot.heroId
  }));
  const targetFormat = draft.format === "guildboss" ? "guildboss" : "pve";
  draft.slots = normalizeSlots(slots, targetFormat);
  activeSlotPopoverId.value = null;
  error.value = null;
  success.value = "Copied lineup from Akashic Arbor.";
}

function getHero(heroId: string | null) {
  if (!heroId) return null;
  return heroMap.value.get(heroId) ?? null;
}

function isGuildBossAwakenedHero(heroId: string) {
  return draft.guildBoss.awakenedHeroId === heroId;
}

function getHeroSelectedSkills(heroId: string): GuildBossSkillId[] {
  return (draft.guildBoss.skills[heroId] ?? []) as GuildBossSkillId[];
}

function setHeroSelectedSkills(heroId: string, skills: GuildBossSkillId[]) {
  const next = { ...draft.guildBoss.skills };
  if (skills.length) {
    next[heroId] = skills;
  } else {
    delete next[heroId];
  }
  draft.guildBoss.skills = next;
}

function clearHeroSkills(heroId: string) {
  setHeroSelectedSkills(heroId, []);
}

function setHeroArgentSkin(heroId: string, enabled: boolean) {
  const hero = getHero(heroId);
  if (!hero || hero.hasArgentSkin === false) return;
  const next = { ...draft.guildBoss.argentSkins };
  if (enabled) {
    next[heroId] = true;
  } else {
    delete next[heroId];
  }
  draft.guildBoss.argentSkins = next;
}

function heroHasArgentSkin(heroId: string) {
  return Boolean(draft.guildBoss.argentSkins[heroId]);
}

function heroHasAllAwakeningSkills(heroId: string) {
  return GUILD_BOSS_AWAKENING_SKILLS.every((skillId) =>
    getHeroSelectedSkills(heroId).includes(skillId)
  );
}

function awakeningSkillCount(heroId: string) {
  return GUILD_BOSS_AWAKENING_SKILLS.filter((skillId) =>
    getHeroSelectedSkills(heroId).includes(skillId)
  ).length;
}

function isHeroAwakened(heroId: string) {
  return isGuildBossAwakenedHero(heroId) || heroHasAllAwakeningSkills(heroId);
}

function canUseChainSkill(heroId: string) {
  const hero = getHero(heroId);
  if (!hero?.chainPartnerId) return false;
  if (heroHasArgentSkin(heroId)) return true;
  return assignedHeroIds.value.has(hero.chainPartnerId);
}

function normalizeGuildBossSkillsForHero(heroId: string, skillIds: GuildBossSkillId[]) {
  const unique = Array.from(new Set(skillIds));
  const filtered = unique.filter((id) => Boolean(GUILD_BOSS_SKILL_MAP.get(id)));
  const cleaned = filtered.filter((skillId) => {
    const skill = GUILD_BOSS_SKILL_MAP.get(skillId);
    if (!skill) return false;
    if (skill.type === "chain" && !canUseChainSkill(heroId)) return false;
    if (skill.type === "blue" && !isHeroAwakened(heroId)) return false;
    if (skill.type === "awakening" && isGuildBossAwakenedHero(heroId)) return false;
    if (skill.type === "awakening-core" && !isHeroAwakened(heroId)) return false;
    if (skill.id === "atk60-2" && !filtered.includes("atk60-1")) return false;
    if (skill.id === "white-2" && !filtered.includes("white-1")) return false;
    return true;
  });
  return cleaned;
}

function refreshGuildBossSkills(heroId: string) {
  const selected = getHeroSelectedSkills(heroId);
  const cleaned = normalizeGuildBossSkillsForHero(heroId, selected);
  const autoRemoved = cleaned.filter((skillId) => {
    const skill = GUILD_BOSS_SKILL_MAP.get(skillId as GuildBossSkillId);
    return !(skill && isAutoSkill(heroId, skill));
  });
  if (autoRemoved.join("|") !== selected.join("|")) {
    setHeroSelectedSkills(heroId, autoRemoved);
  }
}

function canSelectGuildBossSkill(heroId: string, skillId: GuildBossSkillId) {
  const skill = GUILD_BOSS_SKILL_MAP.get(skillId);
  if (!skill) return false;
  if (skill.type === "awakening-core" && !isHeroAwakened(heroId)) return false;
  if (skill.type === "awakening" && isGuildBossAwakenedHero(heroId)) return false;
  if (skill.type === "chain" && !canUseChainSkill(heroId)) return false;
  if (skill.type === "blue" && !isHeroAwakened(heroId)) return false;
  if (isAutoSkill(heroId, skill)) return false;
  if (skill.id === "atk60-2" && !getHeroSelectedSkills(heroId).includes("atk60-1")) return false;
  if (skill.id === "white-2" && !getHeroSelectedSkills(heroId).includes("white-1")) return false;
  if (!getHeroSelectedSkills(heroId).includes(skillId) && guildBossSkillCount.value >= MAX_GUILD_BOSS_SKILLS) {
    return false;
  }
  return true;
}

function guildBossSkillsForHero(heroId: string) {
  return GUILD_BOSS_SKILLS.filter((skill) => {
    if (skill.type === "chain") return canUseChainSkill(heroId);
    return true;
  });
}

function getHeroSkillMeta(heroId: string, skill: GuildBossSkill) {
  const hero = getHero(heroId);
  const meta = hero?.skillMeta?.[skill.id];
  return {
    name: meta?.name ?? skill.name,
    effect: meta?.effect ?? skill.effect,
    imageKey: meta?.imageKey
  };
}

function getSkillImageKey(skill: GuildBossSkill, metaImageKey?: string) {
  if (metaImageKey) return metaImageKey;
  if (skill.type === "chain") return "chain";
  if (skill.type === "awakening-core") return "awaken";
  return "skill";
}

function isAutoSkill(heroId: string, skill: GuildBossSkill) {
  if (heroHasArgentSkin(heroId) && skill.type === "chain") return true;
  return (
    isGuildBossAwakenedHero(heroId) &&
    (skill.type === "awakening" || skill.type === "awakening-core")
  );
}

function getSkillImageSrc(heroId: string, skill: GuildBossSkill) {
  const meta = getHeroSkillMeta(heroId, skill);
  return `/skills/${heroId}_${getSkillImageKey(skill, meta.imageKey)}.png`;
}

function hasAutoSkills(heroId: string) {
  return guildBossSkillsForHero(heroId).some((skill) => isAutoSkill(heroId, skill));
}

function isHeroSkillsCollapsed(heroId: string) {
  const stored = collapsedGuildBossSkills.value[heroId];
  if (typeof stored === "boolean") return stored;
  return getHeroSelectedSkills(heroId).length === 0 && !hasAutoSkills(heroId);
}

function toggleHeroSkills(heroId: string) {
  const next = { ...collapsedGuildBossSkills.value };
  next[heroId] = !isHeroSkillsCollapsed(heroId);
  collapsedGuildBossSkills.value = next;
}

function toggleGuildBossSkill(heroId: string, skillId: GuildBossSkillId) {
  const current = new Set(getHeroSelectedSkills(heroId));
  const isSelected = current.has(skillId);
  if (!isSelected && !canSelectGuildBossSkill(heroId, skillId)) return;
  if (isSelected) {
    current.delete(skillId);
    if (skillId === "atk60-1") current.delete("atk60-2");
    if (skillId === "white-1") current.delete("white-2");
  } else {
    current.add(skillId);
  }
  const cleaned = normalizeGuildBossSkillsForHero(heroId, Array.from(current));
  setHeroSelectedSkills(heroId, cleaned);
}

function setAwakenedHero(heroId: string | null) {
  draft.guildBoss.awakenedHeroId = heroId;
  if (heroId) {
    refreshGuildBossSkills(heroId);
  }
}

function getGuildBossPreviewSkills(heroId: string) {
  const selectedSet = new Set(getHeroSelectedSkills(heroId));
  return GUILD_BOSS_SKILLS.filter((skill) => {
    if (skill.type === "chain" && !canUseChainSkill(heroId)) return false;
    if (skill.type === "blue" && !isHeroAwakened(heroId)) return false;
    if (skill.type === "awakening-core") return false;
    return selectedSet.has(skill.id);
  });
}

function getGuildBossPreviewSkillsOrdered(heroId: string) {
  const selectedSet = new Set(getHeroSelectedSkills(heroId));
  const ordered: GuildBossSkill[] = [];
  getGuildBossSkillGroups(heroId).forEach((group) => {
    group.items.forEach((skill) => {
      if (selectedSet.has(skill.id)) ordered.push(skill);
    });
  });
  return ordered;
}

function getSkillCategoryTitle(skill: GuildBossSkill) {
  if (skill.type === "chain") return "Chain";
  if (skill.type === "awakening" || skill.type === "awakening-core") return "Awakening";
  if (skill.type === "atk60") return "60%";
  if (skill.type === "white") return "Utility";
  if (skill.type === "blue") return "Blue";
  return "Skill";
}

function shouldShowGuildBossPreviewHero(heroId: string) {
  return (
    isHeroAwakened(heroId) ||
    heroHasArgentSkin(heroId) ||
    getHeroSelectedSkills(heroId).length > 0
  );
}

function rarityBorder(hero?: HeroDef | null) {
  if (!hero) return "rgba(148, 163, 184, 0.45)";
  if (hero.rarity === "Sublime") return "linear-gradient(120deg, #22d3ee, #d946ef)";
  if (hero.rarity === "Mythic") return "#ef4444";
  if (hero.rarity === "Legendary") return "#f59e0b";
  return "rgba(148, 163, 184, 0.45)";
}

type LevelIconType = "star" | "moon" | "diamond" | "rainbow";
const LEVEL_ICON_CLASS_MAP: Record<LevelIconType, string> = {
  star: "fa-solid fa-star level-icon-star",
  moon: "fa-solid fa-moon level-icon-moon",
  diamond: "fa-solid fa-gem level-icon-diamond",
  rainbow: "fa-solid fa-gem level-icon-rainbow"
};

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
  if (!heroId) return [];
  const index = ownedMap.value.get(heroId);
  if (typeof index !== "number" || index < 0) return [];
  const level = LEVELS[index];
  if (!level) return [];
  return tokenizeLevel(level);
}

function levelIconClass(type: LevelIconType) {
  return LEVEL_ICON_CLASS_MAP[type];
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

async function copyLineupImage() {
  if (!exportRef.value) return;
  const exportWidth = 650;
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

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      success.value = "Lineup image copied.";
      return;
    } catch {
      /* fall through */
    }
  }
  if (isIOS()) {
    openImageInNewTab(blob);
    success.value = "Image opened in a new tab.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${draft.title || "lineup"}.png`;
  link.click();
  URL.revokeObjectURL(url);
  success.value = "Lineup image downloaded.";
}

function jumpToHeroLevels() {
  if (typeof window === "undefined") return;
  window.location.hash = "#collection";
  window.setTimeout(() => {
    document.getElementById("hero-collection")?.scrollIntoView({ behavior: "smooth" });
  }, 200);
}

watch(
  () => ({ ...draft, slots: draft.slots.map((slot) => ({ ...slot })) }),
  () => {
    persistDraft({
      id: draft.id,
      title: draft.title,
      format: draft.format,
      slots: draft.slots,
      notes: draft.notes,
      guildBoss: {
        ...draft.guildBoss,
        showDescriptions: showGuildBossDescriptions.value
      }
    });
    updateShareLinks();
  },
  { deep: true }
);

watch(
  () => ({ ...collapsedGuildBossSkills.value }),
  (next) => {
    persistGuildBossCollapse(next);
  },
  { deep: true }
);

watch(
  () => draft.format,
  (next) => {
    draft.slots = normalizeSlots(draft.slots, next);
  }
);

watch(
  () => guildBossHeroIds.value,
  (heroIds) => {
    if (draft.format !== "guildboss") return;
    const heroSet = new Set(heroIds);
    if (draft.guildBoss.awakenedHeroId && !heroSet.has(draft.guildBoss.awakenedHeroId)) {
      draft.guildBoss.awakenedHeroId = null;
    }
    const nextSkills = { ...draft.guildBoss.skills };
    let skillsChanged = false;
    Object.keys(nextSkills).forEach((heroId) => {
      if (!heroSet.has(heroId)) {
        delete nextSkills[heroId];
        skillsChanged = true;
      }
    });
    if (skillsChanged) {
      draft.guildBoss.skills = nextSkills;
    }
    const nextArgents = { ...draft.guildBoss.argentSkins };
    let argentsChanged = false;
    Object.keys(nextArgents).forEach((heroId) => {
      if (!heroSet.has(heroId)) {
        delete nextArgents[heroId];
        argentsChanged = true;
      }
    });
    if (argentsChanged) {
      draft.guildBoss.argentSkins = nextArgents;
    }
    const nextCollapsed = { ...collapsedGuildBossSkills.value };
    let collapsedChanged = false;
    Object.keys(nextCollapsed).forEach((heroId) => {
      if (!heroSet.has(heroId)) {
        delete nextCollapsed[heroId];
        collapsedChanged = true;
      }
    });
    if (collapsedChanged) {
      collapsedGuildBossSkills.value = nextCollapsed;
    }
    heroIds.forEach((heroId) => refreshGuildBossSkills(heroId));
  },
  { deep: true }
);

watch(
  () => draft.guildBoss.awakenedHeroId,
  () => {
    if (draft.format !== "guildboss") return;
    guildBossHeroIds.value.forEach((heroId) => refreshGuildBossSkills(heroId));
  }
);

watch(
  () => ({ ...draft.guildBoss.argentSkins }),
  () => {
    if (draft.format !== "guildboss") return;
    guildBossHeroIds.value.forEach((heroId) => refreshGuildBossSkills(heroId));
  }
);

async function toggleSlotPopover(slotId: string) {
  if (!availableHeroes.value.length) return;
  activeSlotPopoverId.value = activeSlotPopoverId.value === slotId ? null : slotId;
  if (activeSlotPopoverId.value) {
    await nextTick();
  }
}

function closeSlotPopovers(event: MouseEvent) {
  const root = rootRef.value;
  if (!root) return;
  if (!root.contains(event.target as Node)) {
    activeSlotPopoverId.value = null;
  }
}

function positionPopover() {}

onMounted(() => {
  if (typeof window === "undefined") return;
  lineupMediaQuery = window.matchMedia("(max-width: 600px)");
  lineupMediaListener = (event) => {
    isMobile.value = event.matches;
  };
  isMobile.value = lineupMediaQuery.matches;
  lineupMediaQuery.addEventListener("change", lineupMediaListener);
  refreshAkashicLineup();
  akashicStorageListener = (event) => {
    if (event.key === AKASHIC_LINEUP_STORAGE_KEY) {
      refreshAkashicLineup();
    }
  };
  window.addEventListener("storage", akashicStorageListener);
  akashicLineupListener = () => {
    refreshAkashicLineup();
  };
  window.addEventListener("wd-akashic-lineup-updated", akashicLineupListener);
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("lineup=")) {
    const params = new URLSearchParams(hash);
    const id = params.get("lineup");
    const token = params.get("edit");
    if (id) {
      loadExisting(id, token);
      return;
    }
  }
  updateShareLinks();
  document.addEventListener("click", closeSlotPopovers);
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("click", closeSlotPopovers);
  }
  if (lineupMediaQuery && lineupMediaListener) {
    lineupMediaQuery.removeEventListener("change", lineupMediaListener);
  }
  if (akashicStorageListener && typeof window !== "undefined") {
    window.removeEventListener("storage", akashicStorageListener);
  }
  if (akashicLineupListener && typeof window !== "undefined") {
    window.removeEventListener("wd-akashic-lineup-updated", akashicLineupListener);
  }
});
</script>

<template>
  <section ref="rootRef" class="tier-card lineup-card">
    <div class="tier-header">
      <div>
        <div class="eyebrow">Lineup Builder</div>
        <h2>Build & Share Lineups</h2>
        <p class="muted">
          Create independent lineups, save them, and share view/edit links with notes.
        </p>
      </div>
      <div class="actions">
        <button class="ghost" @click="newLineup" :disabled="saving || loading">New Lineup</button>
        <button v-if="!isLocked" class="primary" :disabled="saving || loading" @click="save">
          {{ saving ? "Saving..." : "Save" }}
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="tier-grid">
        <div class="field">
          <label>Title</label>
          <input v-model="draft.title" :disabled="isLocked" />
        </div>
        <div class="field">
          <label>Format</label>
            <select v-model="draft.format" :disabled="isLocked">
              <option value="pve">PvE - 1x5 (1 row, 1 team)</option>
              <option value="pvp">PvP - 2x5 (2 rows, 1 team)</option>
              <option value="gvg">GvG - 2x5 (2 rows, 3 teams)</option>
              <option value="guildboss">Guild Boss - 1x5 (1 row, 6 skills)</option>
              <option value="nightmare">Nightmare - 1x5 (1 row, 2 teams)</option>
            </select>
        </div>
        <div class="field dual">
          <div>
            <label>Open lineup</label>
            <div class="inline-input">
              <input v-model="openInput" placeholder="Paste list link or ID" />
              <button class="ghost" @click="openLineup" :disabled="loading">
                {{ loading ? "Loading..." : "Open" }}
              </button>
            </div>
          </div>
          <div>
            <label>My lineups</label>
            <div class="inline-input">
              <select @change="selectSaved(($event.target as HTMLSelectElement).value)">
                <option value="">Select a saved lineup</option>
                <option v-for="lineup in Object.values(localSaved)" :key="lineup.id" :value="lineup.id">
                  {{ lineup.title }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div v-if="error" class="pill danger">{{ error }}</div>
        <div v-if="success" class="pill success">{{ success }}</div>
      </div>
    </div>

    <div v-if="shareUrl || editUrl" class="panel share-box">
      <div v-if="shareUrl" class="inline-input">
        <input :value="shareUrl" readonly />
        <button class="ghost share-copy-btn" @click="() => copyToClipboard(shareUrl)">
          Copy view link
        </button>
      </div>
      <div v-if="editUrl" class="inline-input">
        <input :value="editUrl" readonly />
        <button class="ghost share-copy-btn" @click="() => editUrl && copyToClipboard(editUrl)">
          Copy edit link
        </button>
      </div>
      <p class="muted share-hint">Edit link includes the token. Share it only with people you trust.</p>
    </div>

    <div class="panel">
      <div class="rows-header">
        <strong>Lineup slots</strong>
        <div class="row-header-actions">
          <button class="ghost" :disabled="isLocked" @click="clearLineup">Clear lineup</button>
          <button
            v-if="draft.format === 'pve' || draft.format === 'guildboss'"
            class="ghost"
            :disabled="isLocked || !hasAkashicLineup"
            @click="copyFromAkashicLineup"
          >
            Copy from Akashic Arbor
          </button>
          <span v-if="isLineupFull" class="pill success">Lineup full</span>
        </div>
      </div>
      <div v-if="draft.format === 'gvg' || draft.format === 'nightmare'" class="lineup-team-groups">
        <div
          v-for="(teamSlots, teamIndex) in groupedSlots"
          :key="`team-${teamIndex}`"
          class="lineup-team-group"
        >
          <div class="lineup-team-header">{{ teamHeaderLabel(teamIndex) }}</div>
          <div class="lineup-grid">
            <div
              v-for="(slot, index) in teamSlots"
              :key="slot.id"
              class="lineup-slot-card"
            >
              <div class="lineup-slot-header">
                <span class="slot-index">{{ index + 1 }}</span>
              </div>
              <div class="lineup-slot-body">
                <div v-if="slot.heroId" class="lineup-slot-hero">
                  <button
                    class="lineup-slot-avatar"
                    type="button"
                    :disabled="isLocked"
                    :data-slot-id="slot.id"
                    @click.stop="toggleSlotPopover(slot.id)"
                    aria-label="Change hero"
                  >
                    <img
                      :src="avatarUrl(slot.heroId, getHero(slot.heroId)?.name)"
                      :alt="getHero(slot.heroId)?.name || slot.heroId"
                    />
                  </button>
                  <div v-if="!isMobile" class="lineup-slot-info">
                    <div class="lineup-slot-name">
                      {{ getHero(slot.heroId)?.name || slot.heroId }}
                    </div>
                    <div class="lineup-slot-level">
                      <template v-for="token in getLevelTokens(slot.heroId)" :key="`lvl-${slot.id}-${token.type}`">
                        <i
                          v-for="countIndex in token.count"
                          :key="`lvl-${slot.id}-${token.type}-${countIndex}`"
                          class="level-icon"
                          :class="levelIconClass(token.type)"
                          aria-hidden="true"
                        ></i>
                      </template>
                    </div>
                  </div>
                </div>
                <div v-if="!slot.heroId" class="lineup-slot-empty">
                  <button
                    v-if="availableHeroes.length > 0"
                    class="hero-add"
                    type="button"
                    :disabled="isLocked"
                    :data-slot-id="slot.id"
                    @click.stop="toggleSlotPopover(slot.id)"
                    aria-label="Add hero"
                  >
                    +
                  </button>
                </div>
                <div
                  v-if="activeSlotPopoverId === slot.id"
                  class="hero-add-backdrop"
                  @click="activeSlotPopoverId = null"
                >
                  <div
                    class="hero-add-popover"
                    :data-slot-id="slot.id"
                    @click.stop
                  >
                    <div class="hero-add-grid">
                      <button
                        v-for="hero in availableHeroes"
                        :key="hero.id"
                  class="hero-add-card"
                  :class="{ selected: assignedHeroIds.has(hero.id) }"
                  type="button"
                  :disabled="isLocked"
                  @click="() => { if (!isLocked) { setSlotHero(slot, hero.id); activeSlotPopoverId = null; } }"
                >
                      <div class="hero-stack">
                        <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" />
                      </div>
                      <span>{{ hero.name }}</span>
                    </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                class="ghost tiny slot-clear"
                @click="
                  clearSlot(
                    teamIndex *
                      (draft.format === 'gvg' ? GVG_TEAM_SLOT_COUNT : NIGHTMARE_TEAM_SLOT_COUNT) +
                      index
                  )
                "
                :disabled="isLocked"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="lineup-grid">
        <div v-for="(slot, index) in draft.slots" :key="slot.id" class="lineup-slot-card">
          <div class="lineup-slot-header">
            <span class="slot-index">{{ index + 1 }}</span>
          </div>
          <div class="lineup-slot-body">
            <div v-if="slot.heroId" class="lineup-slot-hero">
              <button
                class="lineup-slot-avatar"
                type="button"
                :disabled="isLocked"
                :data-slot-id="slot.id"
                @click.stop="toggleSlotPopover(slot.id)"
                aria-label="Change hero"
              >
                <img
                  :src="avatarUrl(slot.heroId, getHero(slot.heroId)?.name)"
                  :alt="getHero(slot.heroId)?.name || slot.heroId"
                />
              </button>
              <div v-if="!isMobile" class="lineup-slot-info">
                <div class="lineup-slot-name">
                  {{ getHero(slot.heroId)?.name || slot.heroId }}
                </div>
                <div class="lineup-slot-level">
                  <template v-for="token in getLevelTokens(slot.heroId)" :key="`lvl-${slot.id}-${token.type}`">
                    <i
                      v-for="countIndex in token.count"
                      :key="`lvl-${slot.id}-${token.type}-${countIndex}`"
                      class="level-icon"
                      :class="levelIconClass(token.type)"
                      aria-hidden="true"
                    ></i>
                  </template>
                </div>
              </div>
            </div>
            <div v-if="!slot.heroId" class="lineup-slot-empty">
              <button
                v-if="availableHeroes.length > 0"
                class="hero-add"
                type="button"
                :disabled="isLocked"
                :data-slot-id="slot.id"
                @click.stop="toggleSlotPopover(slot.id)"
                aria-label="Add hero"
              >
                +
              </button>
            </div>
            <div
              v-if="activeSlotPopoverId === slot.id"
              class="hero-add-backdrop"
              @click="activeSlotPopoverId = null"
            >
              <div
                class="hero-add-popover"
                :data-slot-id="slot.id"
                @click.stop
              >
                <div class="hero-add-grid">
                  <button
                    v-for="hero in availableHeroes"
                    :key="hero.id"
                    class="hero-add-card"
                    :class="{
                      sublime: hero.rarity === 'Sublime',
                      selected: assignedHeroIds.has(hero.id)
                    }"
                    type="button"
                    :disabled="isLocked"
                    :style="{
                      borderColor: typeof rarityBorder(hero) === 'string' ? rarityBorder(hero) : undefined,
                      background: 'var(--hero-card-bg)',
                      borderImage: 'none',
                      '--sublime-border': rarityBorder(hero)?.startsWith('linear-gradient') ? rarityBorder(hero) : ''
                    }"
                    @click="() => { if (!isLocked) { setSlotHero(slot, hero.id); activeSlotPopoverId = null; } }"
                  >
                    <div class="hero-stack">
                      <img :src="avatarUrl(hero.id, hero.name)" :alt="hero.name" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button class="ghost tiny slot-clear" @click="clearSlot(index)" :disabled="isLocked">
            Clear
          </button>
        </div>
      </div>
      <p class="muted lineup-limit">{{ lineupLimitText }}</p>
    </div>

    <div v-if="draft.format === 'guildboss'" class="panel guildboss-panel">
      <div class="guildboss-header">
        <div>
          <strong>Guild Boss - 6 skills</strong>
          <p class="muted">
            Choose 1 awakened hero and up to {{ MAX_GUILD_BOSS_SKILLS }} skills across the lineup.
          </p>
        </div>
        <div class="guildboss-header-actions">
          <div class="guildboss-skill-count">
            <span v-if="guildBossSkillCount === MAX_GUILD_BOSS_SKILLS" class="pill success">
              All Skills Slotted
            </span>
            <span v-else>Skills: {{ guildBossSkillCount }} / {{ MAX_GUILD_BOSS_SKILLS }}</span>
          </div>
        </div>
      </div>

      <div class="guildboss-heroes">
        <div v-for="heroId in guildBossHeroIds" :key="`guildboss-${heroId}`" class="guildboss-hero-card">
          <div class="guildboss-hero-header">
            <div class="guildboss-hero-info">
              <img
                class="guildboss-hero-avatar"
                :src="avatarUrl(heroId, getHero(heroId)?.name)"
                :alt="getHero(heroId)?.name || heroId"
              />
              <div>
                <div class="guildboss-hero-name-row">
                  <div class="guildboss-hero-name">{{ getHero(heroId)?.name || heroId }}</div>
                  <button class="guildboss-toggle" type="button" @click="toggleHeroSkills(heroId)">
                    <i
                      class="fa-solid fa-chevron-right"
                      :class="{ open: !isHeroSkillsCollapsed(heroId) }"
                      aria-hidden="true"
                    ></i>
                    <span>{{ isHeroSkillsCollapsed(heroId) ? "Show skills" : "Hide skills" }}</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="guildboss-hero-controls">
              <span class="guildboss-hero-count">
                Hero Skills {{ getHeroSelectedSkills(heroId).length }} / {{ MAX_GUILD_BOSS_SKILLS }}
              </span>
              <span class="guildboss-hero-total">
                Total {{ guildBossSkillCount }} / {{ MAX_GUILD_BOSS_SKILLS }}
              </span>
              <button
                class="ghost tiny"
                type="button"
                :disabled="isLocked || getHeroSelectedSkills(heroId).length === 0"
                @click="clearHeroSkills(heroId)"
                :class="{ 'has-selection': getHeroSelectedSkills(heroId).length > 0 }"
              >
                Clear ({{ getHeroSelectedSkills(heroId).length }})
              </button>
              <label class="guildboss-awakened-toggle">
                <input
                  type="checkbox"
                  :disabled="
                  isLocked ||
                  (draft.guildBoss.awakenedHeroId !== null &&
                    !isGuildBossAwakenedHero(heroId))
                "
                :checked="isGuildBossAwakenedHero(heroId)"
                :name="'guildboss-awakened'"
                @change="
                  setAwakenedHero(
                    ($event.target as HTMLInputElement).checked ? heroId : null
                  );
                  refreshGuildBossSkills(heroId)
                "
              />
              Awakened
            </label>
            <label v-if="getHero(heroId)?.hasArgentSkin !== false" class="guildboss-argent-toggle">
              <input
                type="checkbox"
                :disabled="isLocked"
                :checked="heroHasArgentSkin(heroId)"
                @change="
                  setHeroArgentSkin(heroId, ($event.target as HTMLInputElement).checked);
                  refreshGuildBossSkills(heroId)
                "
              />
              Argent
            </label>
            </div>
          </div>
          <div class="guildboss-skill-groups" v-show="!isHeroSkillsCollapsed(heroId)">
            <div
              v-for="group in getGuildBossSkillGroups(heroId)"
              :key="`${heroId}-${group.id}`"
              class="guildboss-skill-group"
            >
              <div class="guildboss-skill-group-title">{{ group.title }}</div>
              <div class="guildboss-skill-grid">
                <button
                  v-for="skill in group.items"
                  :key="`${heroId}-${skill.id}`"
                  class="guildboss-skill"
                  type="button"
                  :disabled="
                    isLocked ||
                    (isGuildBossAwakenedHero(heroId) && skill.type === 'awakening') ||
                    (!getHeroSelectedSkills(heroId).includes(skill.id) &&
                      !canSelectGuildBossSkill(heroId, skill.id))
                  "
                  :class="{
                    [`skill-${skill.type}`]: true,
                    selected:
                      getHeroSelectedSkills(heroId).includes(skill.id) ||
                      (isGuildBossAwakenedHero(heroId) && skill.type === 'awakening'),
                    auto: isAutoSkill(heroId, skill),
                    disabled:
                      isLocked ||
                      (isGuildBossAwakenedHero(heroId) && skill.type === 'awakening') ||
                      isAutoSkill(heroId, skill) ||
                      (!getHeroSelectedSkills(heroId).includes(skill.id) &&
                        !canSelectGuildBossSkill(heroId, skill.id))
                  }"
                  @click="toggleGuildBossSkill(heroId, skill.id)"
                  :data-skill-type="skill.type"
                >
                  <div class="guildboss-skill-card">
                    <div
                      v-if="
                        getHeroSelectedSkills(heroId).includes(skill.id) || isAutoSkill(heroId, skill)
                      "
                      class="skill-pill-stack"
                    >
                      <span
                        v-if="getHeroSelectedSkills(heroId).includes(skill.id)"
                        class="skill-pill"
                      >
                        ✓ Selected
                      </span>
                      <span v-if="isAutoSkill(heroId, skill)" class="skill-pill auto">
                        ✓ Auto
                      </span>
                    </div>
                    <div class="guildboss-skill-image">
                      <img
                        :src="getSkillImageSrc(heroId, skill)"
                        :alt="getHeroSkillMeta(heroId, skill).name"
                        loading="lazy"
                      />
                    </div>
                    <div v-if="skill.type === 'awakening'" class="guildboss-skill-dots">
                      <span
                        v-for="index in GUILD_BOSS_AWAKENING_SKILLS.length"
                        :key="`${heroId}-${skill.id}-dot-${index}`"
                        :class="{ filled: index <= awakeningSkillCount(heroId) }"
                      ></span>
                    </div>
                    <div class="guildboss-skill-title">
                      {{ getHeroSkillMeta(heroId, skill).name }}
                    </div>
                    <div
                      class="guildboss-skill-effect"
                      :class="{ placeholder: !getHeroSkillMeta(heroId, skill).effect }"
                    >
                      {{ getHeroSkillMeta(heroId, skill).effect || "Add effect text" }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel notes-panel">
      <strong>Lineup notes</strong>
      <textarea
        v-model="draft.notes"
        :disabled="isLocked"
        placeholder="Add notes, strategy, or matchup tips..."
      ></textarea>
      <p class="muted notes-hint">Notes are saved as plain text. Links or scripts won’t run.</p>
    </div>

    <div class="panel">
      <div class="preview-header">
        <strong>Lineup preview</strong>
      </div>
      <div class="preview-controls">
        <label class="preview-toggle">
          <input type="checkbox" v-model="showPreviewNames" />
          Show names
        </label>
        <label class="preview-toggle">
          <input type="checkbox" v-model="showPreviewLevels" />
          Show star levels
        </label>
        <label v-if="draft.format === 'guildboss'" class="preview-toggle">
          <input type="checkbox" v-model="showGuildBossDescriptions" />
          Show skill descriptions
        </label>
        <button
          v-if="showPreviewLevels"
          class="ghost preview-link"
          type="button"
          @click="jumpToHeroLevels"
        >
          Update hero levels
        </button>
        <button class="ghost" @click="copyLineupImage" :disabled="exporting">
          {{ exporting ? "Copying..." : "Copy Image" }}
        </button>
      </div>
      <div ref="exportRef" class="lineup-export" :class="{ exporting }">
        <div class="lineup-export-title">{{ draft.title }}</div>
        <div v-if="draft.format === 'gvg' || draft.format === 'nightmare'" class="lineup-export-teams">
          <div v-for="(teamSlots, teamIndex) in groupedSlots" :key="`export-team-${teamIndex}`">
            <div class="lineup-team-header lineup-export-team-header">
              {{ teamHeaderLabel(teamIndex) }}
            </div>
            <div class="lineup-export-grid">
              <div
                v-for="(slot, index) in teamSlots"
                :key="`export-${slot.id}`"
                class="lineup-export-slot"
              >
                <div class="lineup-export-number">{{ index + 1 }}</div>
                <div v-if="slot.heroId" class="lineup-export-avatar">
                  <img
                    :src="avatarUrl(slot.heroId, getHero(slot.heroId)?.name)"
                    :alt="getHero(slot.heroId)?.name || slot.heroId"
                  />
                </div>
                <div v-if="slot.heroId && showPreviewNamesEffective" class="lineup-export-name">
                  {{ getHero(slot.heroId)?.name || slot.heroId }}
                </div>
                <div v-if="slot.heroId && showPreviewLevelsEffective" class="lineup-export-levels">
                  <template v-for="token in getLevelTokens(slot.heroId)" :key="`export-lvl-${slot.id}-${token.type}`">
                    <i
                      v-for="countIndex in token.count"
                      :key="`export-lvl-${slot.id}-${token.type}-${countIndex}`"
                      class="level-icon"
                      :class="levelIconClass(token.type)"
                      aria-hidden="true"
                    ></i>
                  </template>
                </div>
                <div v-else-if="!slot.heroId" class="lineup-export-empty" aria-hidden="true"></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="lineup-export-grid">
          <div
            v-for="(slot, index) in draft.slots"
            :key="`export-${slot.id}`"
            class="lineup-export-slot"
          >
            <div class="lineup-export-number">{{ index + 1 }}</div>
            <div v-if="slot.heroId" class="lineup-export-avatar">
              <img
                :src="avatarUrl(slot.heroId, getHero(slot.heroId)?.name)"
                :alt="getHero(slot.heroId)?.name || slot.heroId"
              />
            </div>
            <div v-if="slot.heroId && showPreviewNamesEffective" class="lineup-export-name">
              {{ getHero(slot.heroId)?.name || slot.heroId }}
            </div>
            <div v-if="slot.heroId && showPreviewLevelsEffective" class="lineup-export-levels">
              <template v-for="token in getLevelTokens(slot.heroId)" :key="`export-lvl-${slot.id}-${token.type}`">
                <i
                  v-for="countIndex in token.count"
                  :key="`export-lvl-${slot.id}-${token.type}-${countIndex}`"
                  class="level-icon"
                  :class="levelIconClass(token.type)"
                  aria-hidden="true"
                ></i>
              </template>
            </div>
            <div v-else-if="!slot.heroId" class="lineup-export-empty" aria-hidden="true"></div>
          </div>
        </div>
        <div
          v-if="draft.format === 'guildboss' && guildBossSkillCount > 0"
          class="guildboss-export-skills"
        >
          <div class="lineup-export-notes-title">Skills</div>
          <div
            v-for="heroId in guildBossHeroIds.filter(shouldShowGuildBossPreviewHero)"
            :key="`guildboss-export-${heroId}`"
            class="guildboss-export-hero"
          >
            <div class="guildboss-export-hero-header">
              <img
                class="guildboss-export-avatar"
                :src="avatarUrl(heroId, getHero(heroId)?.name)"
                :alt="getHero(heroId)?.name || heroId"
              />
              <div class="guildboss-export-name">
                {{ getHero(heroId)?.name || heroId }}
                <span
                  v-if="draft.format === 'guildboss' && isGuildBossAwakenedHero(heroId)"
                  class="awakened-badge"
                >
                  ★ Awakened
                </span>
                <span
                  v-if="draft.format === 'guildboss' && heroHasArgentSkin(heroId)"
                  class="argent-badge"
                >
                  <i class="fa-solid fa-link" aria-hidden="true"></i>
                  Argent
                </span>
              </div>
            </div>
            <div class="guildboss-export-skill-tags">
              <div
                v-for="skill in getGuildBossPreviewSkillsOrdered(heroId)"
                :key="`guildboss-export-${heroId}-${skill.id}`"
                class="guildboss-export-skill"
                :class="`skill-${skill.type}`"
              >
                <div class="guildboss-skill-card">
                  <div class="guildboss-skill-category">{{ getSkillCategoryTitle(skill) }}</div>
                  <div class="guildboss-skill-image">
                    <img
                      :src="getSkillImageSrc(heroId, skill)"
                      :alt="getHeroSkillMeta(heroId, skill).name"
                      loading="lazy"
                    />
                  </div>
                  <div v-if="skill.type === 'awakening'" class="guildboss-skill-dots">
                    <span
                      v-for="index in GUILD_BOSS_AWAKENING_SKILLS.length"
                      :key="`preview-${heroId}-${skill.id}-dot-${index}`"
                      :class="{ filled: index <= awakeningSkillCount(heroId) }"
                    ></span>
                  </div>
                  <div class="guildboss-skill-title">
                    {{ getHeroSkillMeta(heroId, skill).name }}
                  </div>
                  <div
                    v-if="showGuildBossDescriptions"
                    class="guildboss-skill-effect"
                    :class="{ placeholder: !getHeroSkillMeta(heroId, skill).effect }"
                  >
                    {{ getHeroSkillMeta(heroId, skill).effect || " " }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="draft.notes" class="lineup-export-notes">
          <div class="lineup-export-notes-title">Notes</div>
          <div class="lineup-export-notes-body" v-text="draft.notes"></div>
        </div>
      </div>
      <p v-if="exporting" class="tool-callout">
        Generate and share your own Lineups at: https://wdtoolbox.com
      </p>
    </div>
  </section>
</template>
