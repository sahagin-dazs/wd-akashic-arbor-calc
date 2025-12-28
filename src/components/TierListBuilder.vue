<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, onErrorCaptured, nextTick, watch } from "vue";
import html2canvas from "html2canvas";
import { HEROES } from "../models/heroes";
import type { TierRow, TierAssignments, TierData, TierDocument, TierOrder } from "../models/tierList";
import { createTierList, fetchTierList, updateTierList } from "../utils/tierApi";
import { newId } from "../utils/ids";
import { avatarUrl } from "../utils/avatar";

const COLOR_PRESETS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#a855f7",
  "#ec4899"
];

const DEFAULT_ROWS: TierRow[] = [
  { id: newId(), label: "SS", color: COLOR_PRESETS[0] },
  { id: newId(), label: "S", color: COLOR_PRESETS[1] },
  { id: newId(), label: "A", color: COLOR_PRESETS[2] },
  { id: newId(), label: "B", color: COLOR_PRESETS[3] },
  { id: newId(), label: "C", color: COLOR_PRESETS[4] },
  { id: newId(), label: "D", color: COLOR_PRESETS[5] }
];

const LOCAL_STORAGE_KEY = "wdtools-tier-draft";
const LEGACY_KEYS = ["wd-tools-tier-draft", "wdtools-tier-draft"];
const TOKEN_STORAGE_KEY = "wdtools-tier-tokens";
const LOCAL_SAVED_KEY = "wdtools-tier-saved";
const OWNED_LISTS_KEY = "wdtools-tier-owned";

type DraftState = {
  id: string | null;
  title: string;
  rows: TierRow[];
  assignments: TierAssignments;
  order: TierOrder;
  linkedHeroes: LinkedHero[];
  notes: string;
};

type OwnedList = {
  id: string;
  title: string;
  updatedAt: string;
  source: "cloud" | "local";
};

type LinkedHero = {
  id: string;
  heroIds: string[];
};

type LinkedHeroView = LinkedHero & {
  name: string;
  linked: true;
};

type HeroEntry = (typeof HEROES)[number] | LinkedHeroView;

const draft = reactive<DraftState>(normalizeDraft(loadDraft()));
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const search = ref("");
const shareUrl = ref<string | null>(null);
const editUrl = ref<string | null>(null);
const openInput = ref("");
const exportRef = ref<HTMLElement | null>(null);
const lastSavedSnapshot = ref("");
const linkedBuilderOpen = ref(false);
const linkSelection = ref<string[]>([]);

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
const exporting = ref(false);
const selectedForMove = reactive<Record<string, string>>({});
const rowConfigOpen = reactive<Record<string, boolean>>({});
const rowAddOpen = reactive<Record<string, boolean>>({});
const moveTarget = reactive<Record<string, string>>({});

const tokens = ref(loadTokens());
const localSavedLists = ref(loadLocalSaved());
const ownedListsStore = ref(loadOwnedLists());
const BASE_HERO_MAP = new Map(HEROES.map((h) => [h.id, h]));
const linkedHeroViews = computed(() => {
  return (draft.linkedHeroes || [])
    .map((link) => {
      const heroIds = (link.heroIds || []).filter((id) => BASE_HERO_MAP.has(id));
      if (heroIds.length < 2) return null;
      const name = heroIds
        .map((id) => BASE_HERO_MAP.get(id))
        .filter(Boolean)
        .map((hero) => hero?.name || hero?.id || "")
        .filter(Boolean)
        .join(" + ");
      return {
        id: link.id,
        heroIds,
        name: name || "Linked heroes",
        linked: true
      };
    })
    .filter((link): link is { id: string; heroIds: string[]; name: string; linked: true } => Boolean(link));
});
const allHeroes = computed(() => [...HEROES, ...linkedHeroViews.value]);
const heroMap = computed(() => new Map(allHeroes.value.map((hero) => [hero.id, hero])));
const validHeroIds = computed(() => new Set(allHeroes.value.map((hero) => hero.id)));
const rowsList = computed(() => normalizeRows(draft.rows));
const rowsWithHeroes = computed(() => {
  try {
    const map = heroMap.value;
    const validIds = validHeroIds.value;
    return rowsList.value.filter(Boolean).map((row) => {
      const rowId = row.id;
      const orderIds = Array.isArray(draft.order?.[rowId]) ? draft.order[rowId] : [];
      const assignedIds = Object.entries(draft.assignments || {})
        .filter(([heroId, assignedRowId]) => assignedRowId === rowId && validIds.has(heroId))
        .map(([heroId]) => heroId);
      const merged = Array.from(new Set([...orderIds, ...assignedIds])).filter((id) => validIds.has(id));
      return {
        row,
        rowId,
        heroes: merged.map((id) => map.get(id)).filter((h): h is HeroEntry => Boolean(h))
      };
    });
  } catch (err) {
    console.error("rowsWithHeroes failed", err);
    return [];
  }
});

const ownedLists = computed(() => {
  const local = localSavedLists.value;
  const owned = ownedListsStore.value;
  const merged = new Map<string, OwnedList>();
  Object.values(local).forEach((doc) => {
    merged.set(doc.id, {
      id: doc.id,
      title: doc.title || "Untitled",
      updatedAt: doc.updatedAt || doc.createdAt || "",
      source: "local"
    });
  });
  Object.values(owned).forEach((item) => {
    merged.set(item.id, item);
  });
  return Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

const heroPool = computed(() =>
  allHeroes.value.filter(Boolean).filter((hero) => {
    if (!hero) return false;
    if (isLinkedHero(hero)) return true;
    return hero.rarity !== "Common" && hero.rarity !== "Epic";
  })
);

const heroesFiltered = computed(() => {
  const term = search.value.trim().toLowerCase();
  const pool = heroPool.value;
  if (!term) return pool;
  return pool.filter((hero) => {
    return (
      hero?.name?.toLowerCase().includes(term) ||
      hero?.id?.toLowerCase().includes(term) ||
      hero?.role?.toLowerCase().includes(term) ||
      hero?.element?.toLowerCase().includes(term)
    );
  });
});

const assignedSet = computed(() => new Set(Object.keys(draft.assignments || {})));
const draftSnapshot = () => {
  const rows = draft.rows.map((row) => ({ id: row.id, label: row.label, color: row.color }));
  const assignments = Object.keys(draft.assignments || {})
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = draft.assignments[key];
      return acc;
    }, {});
  const order = Object.keys(draft.order || {})
    .sort()
    .reduce<Record<string, string[]>>((acc, key) => {
      acc[key] = [...(draft.order[key] || [])];
      return acc;
    }, {});
  const linkedHeroes = (draft.linkedHeroes || [])
    .map((link) => ({
      id: link.id,
      heroIds: [...(link.heroIds || [])]
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({
    id: draft.id,
    title: draft.title,
    rows,
    assignments,
    order,
    linkedHeroes,
    notes: draft.notes
  });
};
const markSavedSnapshot = () => {
  lastSavedSnapshot.value = draftSnapshot();
};
const isDirty = computed(() => lastSavedSnapshot.value !== draftSnapshot());
markSavedSnapshot();

function isLinkedHero(hero?: HeroEntry | null): hero is LinkedHeroView {
  return Boolean(hero && (hero as LinkedHeroView).linked);
}

function heroStack(hero?: HeroEntry | null) {
  if (!hero) return [];
  if (isLinkedHero(hero)) {
    return hero.heroIds
      .map((id) => BASE_HERO_MAP.get(id))
      .filter((h): h is (typeof HEROES)[number] => Boolean(h));
  }
  return [hero];
}

function heroDisplayName(hero?: HeroEntry | null) {
  if (!hero) return "Hero";
  if (isLinkedHero(hero)) return hero.name || "Linked heroes";
  return hero.name || hero.id;
}

function heroImg(hero?: (typeof HEROES)[number]) {
  if (!hero) return "";
  return avatarUrl(hero.id, hero.name);
}
const rarityStyles: Record<string, { border: string; bg: string }> = {
  Sublime: {
    border: "linear-gradient(135deg, #06b6d4, #ec4899)",
    bg: "linear-gradient(135deg, rgba(6,182,212,0.38), rgba(236,72,153,0.38))"
  },
  Mythic: {
    border: "#ef4444",
    bg: "rgba(239,68,68,0.32)"
  },
  Legendary: {
    border: "#facc15",
    bg: "rgba(250,204,21,0.32)"
  },
  Epic: {
    border: "#38bdf8",
    bg: "rgba(56,189,248,0.28)"
  }
};

const rarityPreviewBg: Record<string, string> = {
  Sublime: "linear-gradient(135deg, rgba(6, 182, 212, 0.85), rgba(236, 72, 153, 0.85))",
  Mythic: "rgba(225, 29, 72, 0.88)",
  Legendary: "rgba(250, 204, 21, 0.9)",
  Epic: "rgba(168, 85, 247, 0.82)",
  Common: "rgba(59, 130, 246, 0.82)"
};

const ADJECTIVES = ["amber", "brave", "bright", "calm", "cobalt", "daring", "ember", "fuzzy", "golden", "happy", "icy", "jolly", "lucky", "mighty", "neon", "quiet", "rapid", "silver", "sunny", "wild"];
const NOUNS = ["axolotl", "badger", "beacon", "boogers", "cactus", "comet", "dragon", "falcon", "firefly", "goblin", "lantern", "lemur", "meteor", "otter", "panda", "phoenix", "raccoon", "tiger", "tortoise", "wizard"];
const TOPPERS = ["spark", "blitz", "boost", "chomp", "dash", "echo", "flare", "glow", "howl", "jolt", "moxie", "pounce", "quirk", "roar", "rush", "spice"];

function rarityBorder(hero: HeroEntry) {
  if (isLinkedHero(hero)) return undefined;
  const style = rarityStyles[hero.rarity];
  if (!style) return undefined;
  return style.border;
}

function rarityBackground(hero: HeroEntry) {
  if (isLinkedHero(hero)) {
    const primary = hero.heroIds.map((id) => BASE_HERO_MAP.get(id)).find(Boolean);
    if (!primary) return undefined;
    const style = rarityStyles[primary.rarity];
    return style?.bg;
  }
  const style = rarityStyles[hero.rarity];
  if (!style) return undefined;
  return style.bg;
}

function highestRarity(hero: HeroEntry): string {
  const rank = ["Common", "Epic", "Legendary", "Mythic", "Sublime"];
  const heroes = heroStack(hero);
  if (!heroes.length) return "Common";
  return heroes
    .map((h) => h.rarity)
    .reduce((best, current) => (rank.indexOf(current) > rank.indexOf(best) ? current : best));
}

function previewHeroBackground(hero: HeroEntry) {
  const rarity = highestRarity(hero);
  return rarityPreviewBg[rarity] || "rgba(15, 23, 42, 0.6)";
}

function heroRarityClass(hero: HeroEntry) {
  const rarity = highestRarity(hero);
  if (rarity === "Sublime") return "rarity-sublime";
  if (rarity === "Mythic") return "rarity-mythic";
  if (rarity === "Legendary") return "rarity-legendary";
  return "";
}

function generatePassphraseId() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const top = TOPPERS[Math.floor(Math.random() * TOPPERS.length)];
  return `${adj}-${noun}-${top}`;
}

function isLocalId(id: string | null | undefined) {
  return typeof id === "string" && id.startsWith("local-");
}

function setTierHash(id: string) {
  if (typeof window === "undefined") return;
  window.location.hash = `#tier=${encodeURIComponent(id)}`;
}

function buildShareUrl(id: string) {
  if (typeof window === "undefined") return `#tier=${id}`;
  return `${window.location.origin}${window.location.pathname}#tier=${id}`;
}

function buildEditUrl(id: string, token: string) {
  if (typeof window === "undefined") return `#tier=${id}&edit=${token}`;
  return `${window.location.origin}${window.location.pathname}#tier=${id}&edit=${token}`;
}

function refreshShareLinks() {
  if (!draft.id) {
    shareUrl.value = null;
    editUrl.value = null;
    return;
  }
  shareUrl.value = buildShareUrl(draft.id);
  const token = tokens.value[draft.id];
  editUrl.value = token ? buildEditUrl(draft.id, token) : null;
}

const isLocked = computed(() => {
  if (!draft.id) return false;
  if (isLocalId(draft.id)) return false;
  return !tokens.value[draft.id];
});

function normalizeRows(rows: TierRow[] | null | undefined): TierRow[] {
  const normalized =
    rows
      ?.filter((r) => r && typeof r.id === "string" && r.id.trim())
      .map((r) => ({
        id: r.id,
        label: r.label ?? "Row",
        color: r.color || randomColor()
      })) ?? [];
  return normalized.length ? normalized : [...DEFAULT_ROWS];
}

function ensureRowOrder(rowId: string) {
  if (!Array.isArray(draft.order[rowId])) draft.order[rowId] = [];
  const validIds = validHeroIds.value;
  draft.order[rowId] = draft.order[rowId].filter((id) => validIds.has(id));
  return draft.order[rowId];
}

function availableHeroesForRow() {
  const assignedIds = new Set(Object.keys(draft.assignments || {}));
  return allHeroes.value.filter(Boolean).filter((h) => {
    if (!h || assignedIds.has(h.id)) return false;
    if (isLinkedHero(h)) return true;
    return h.rarity !== "Common" && h.rarity !== "Epic";
  });
}

function linkedKey(ids: string[]) {
  return [...ids].sort().join("|");
}

function toggleLinkSelection(heroId: string) {
  if (!heroId) return;
  if (linkSelection.value.includes(heroId)) {
    linkSelection.value = linkSelection.value.filter((id) => id !== heroId);
    return;
  }
  if (linkSelection.value.length >= 3) return;
  linkSelection.value = [...linkSelection.value, heroId];
}

function createLinkedHero() {
  const unique = Array.from(new Set(linkSelection.value)).slice(0, 3);
  if (unique.length < 2) return;
  const key = linkedKey(unique);
  const exists = draft.linkedHeroes.some((link) => linkedKey(link.heroIds) === key);
  if (exists) {
    success.value = "That linked hero already exists.";
    linkSelection.value = [];
    return;
  }
  const id = `link-${newId()}`;
  draft.linkedHeroes.push({ id, heroIds: unique });
  linkSelection.value = [];
  success.value = "Linked hero added.";
  persistDraft();
}

function removeLinkedHero(linkId: string) {
  if (!linkId) return;
  draft.linkedHeroes = draft.linkedHeroes.filter((link) => link.id !== linkId);
  if (draft.assignments[linkId]) {
    delete draft.assignments[linkId];
  }
  Object.keys(draft.order || {}).forEach((rowId) => {
    draft.order[rowId] = (draft.order[rowId] || []).filter((id) => id !== linkId);
  });
  Object.keys(selectedForMove).forEach((rowId) => {
    if (selectedForMove[rowId] === linkId) {
      selectedForMove[rowId] = "";
    }
  });
  Object.keys(moveTarget).forEach((rowId) => {
    if (moveTarget[rowId] === linkId) {
      moveTarget[rowId] = "";
    }
  });
  persistDraft();
}

function rowsOther(rowId: string) {
  return rowsList.value.filter((r) => r?.id && r.id !== rowId);
}

function selectedIndex(entry: { heroes: HeroEntry[] }, heroId?: string) {
  if (!heroId) return -1;
  return entry.heroes.findIndex((h) => h?.id === heroId);
}

function canMove(entry: { heroes: HeroEntry[] }, heroId: string | undefined, dir: -1 | 1) {
  const idx = selectedIndex(entry, heroId);
  if (idx === -1) return false;
  const next = idx + dir;
  return next >= 0 && next < entry.heroes.length;
}

function moveHero(rowId: string, heroId: string, direction: -1 | 1) {
  if (!heroMap.value.has(heroId)) return;
  const list = [...ensureRowOrder(rowId)];
  const idx = list.indexOf(heroId);
  if (idx === -1) return;
  const target = Math.min(Math.max(idx + direction, 0), list.length - 1);
  if (target === idx) return;
  const [h] = list.splice(idx, 1);
  list.splice(target, 0, h);
  draft.order[rowId] = list;
  persistDraft();
  selectedForMove[rowId] = h;
}

function normalizeDraft(state: DraftState): DraftState {
  // Ensure rows have valid ids/labels and fall back to defaults if needed.
  state.rows = normalizeRows(state.rows);
  state.linkedHeroes = Array.isArray(state.linkedHeroes)
    ? state.linkedHeroes
        .filter((link) => link && typeof link.id === "string")
        .map((link) => ({
          id: link.id,
          heroIds: Array.isArray(link.heroIds) ? Array.from(new Set(link.heroIds)).filter(Boolean) : []
        }))
        .filter((link) => link.id && link.heroIds.length >= 2)
    : [];

  state.notes = typeof state.notes === "string" ? state.notes : "";
  const validIds = new Set([...HEROES.map((hero) => hero.id), ...state.linkedHeroes.map((link) => link.id)]);
  const validRows = new Set(state.rows.map((r) => r.id));
  Object.keys(state.assignments).forEach((heroId) => {
    const rowId = state.assignments[heroId];
    if (!validIds.has(heroId) || !validRows.has(rowId)) {
      delete state.assignments[heroId];
    }
  });
  Object.keys(state.order).forEach((rowId) => {
    if (!validRows.has(rowId)) {
      delete state.order[rowId];
      return;
    }
    const list = (state.order[rowId] || []).filter((heroId) => validIds.has(heroId));
    state.order[rowId] = list;
  });
  // Ensure every row has an order array.
  state.rows.forEach((row) => {
    const base = state.order[row.id] || [];
    const assigned = Object.entries(state.assignments)
      .filter(([heroId, rId]) => rId === row.id && validIds.has(heroId))
      .map(([heroId]) => heroId);
    const merged = Array.from(new Set([...base, ...assigned])).filter((heroId) => validIds.has(heroId));
    state.order[row.id] = merged;
  });
  return state;
}

function loadDraft(): DraftState {
  const parsePayload = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DraftState;
    } catch {
      return null;
    }
  };

  const readLocal = (): DraftState | null => {
    if (typeof window === "undefined") return null;
    const primary = parsePayload(localStorage.getItem(LOCAL_STORAGE_KEY));
    if (primary) return primary;
    for (const key of LEGACY_KEYS) {
      const legacy = parsePayload(localStorage.getItem(key));
      if (legacy) return legacy;
    }
    return null;
  };

  if (typeof window === "undefined") {
    return normalizeDraft({
      id: null,
      title: "New Tier List",
      rows: [...DEFAULT_ROWS],
      assignments: {},
      order: {},
      linkedHeroes: [],
      notes: ""
    });
  }
  try {
    const loaded = readLocal();
    if (!loaded) {
      return normalizeDraft({
        id: null,
        title: "New Tier List",
        rows: [...DEFAULT_ROWS],
        assignments: {},
        order: {},
        linkedHeroes: [],
        notes: ""
      });
    }
    return normalizeDraft({
      id: loaded.id ?? null,
      title: loaded.title || "New Tier List",
      rows: Array.isArray(loaded.rows) && loaded.rows.length ? loaded.rows : [...DEFAULT_ROWS],
      assignments: loaded.assignments && typeof loaded.assignments === "object" ? loaded.assignments : {},
      order: loaded.order && typeof loaded.order === "object" ? loaded.order : {},
      linkedHeroes: Array.isArray(loaded.linkedHeroes) ? loaded.linkedHeroes : [],
      notes: typeof loaded.notes === "string" ? loaded.notes : ""
    });
  } catch {
    return normalizeDraft({
      id: null,
      title: "New Tier List",
      rows: [...DEFAULT_ROWS],
      assignments: {},
      order: {},
      linkedHeroes: [],
      notes: ""
    });
  }
}

function persistDraft() {
  if (typeof window === "undefined") return;
  persistDraftState(draft);
}

function persistDraftState(state: DraftState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        id: state.id ?? null,
        title: state.title,
        rows: state.rows,
        assignments: state.assignments,
        order: state.order,
        linkedHeroes: state.linkedHeroes,
        notes: state.notes
      })
    );
  } catch {
    /* ignore */
  }
}

function loadTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persistTokens(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(map));
}

function loadLocalSaved(): Record<string, TierDocument> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_SAVED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, TierDocument>) : {};
  } catch {
    return {};
  }
}

function persistLocalSaved(map: Record<string, TierDocument>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(map));
  localSavedLists.value = map;
}

function loadOwnedLists(): Record<string, OwnedList> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OWNED_LISTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OwnedList>) : {};
  } catch {
    return {};
  }
}

function persistOwnedLists(map: Record<string, OwnedList>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OWNED_LISTS_KEY, JSON.stringify(map));
  ownedListsStore.value = map;
}

function upsertOwnedList(id: string, title: string, source: "cloud" | "local") {
  const owned = { ...ownedListsStore.value };
  owned[id] = {
    id,
    title: title || "Untitled",
    updatedAt: new Date().toISOString(),
    source
  };
  persistOwnedLists(owned);
}

function saveLocalList(id: string, title: string, data: TierData) {
  const saved = { ...localSavedLists.value };
  saved[id] = { id, title, data };
  persistLocalSaved(saved);
}

function loadLocalList(id: string): TierDocument | null {
  const saved = localSavedLists.value;
  return saved[id] || null;
}

function addRow() {
  draft.rows.push({
    id: newId(),
    label: `Row ${draft.rows.length + 1}`,
    color: COLOR_PRESETS[draft.rows.length % COLOR_PRESETS.length]
  });
  persistDraft();
}

function parseListInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("tier=")) {
    return { id: trimmed, token: null };
  }
  try {
    const hashIndex = trimmed.indexOf("#");
    const fragment = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed;
    const params = new URLSearchParams(fragment.replace(/^\\?/, ""));
    const id = params.get("tier");
    const token = params.get("edit");
    if (!id) return null;
    return { id, token };
  } catch {
    return null;
  }
}

function openFromInput() {
  const parsed = parseListInput(openInput.value);
  if (!parsed) {
    error.value = "Paste a list link or ID.";
    return;
  }
  openInput.value = "";
  loadExisting(parsed.id, parsed.token);
}

function removeRow(rowId: string) {
  if (draft.rows.length <= 1) return;
  draft.rows = draft.rows.filter((row) => row.id !== rowId);
  Object.keys(draft.assignments).forEach((heroId) => {
    if (draft.assignments[heroId] === rowId) {
      delete draft.assignments[heroId];
    }
  });
  delete draft.order[rowId];
  persistDraft();
}

function moveRow(rowId: string, direction: -1 | 1) {
  const idx = draft.rows.findIndex((r) => r.id === rowId);
  if (idx === -1) return;
  const target = idx + direction;
  if (target < 0 || target >= draft.rows.length) return;
  const next = [...draft.rows];
  const [row] = next.splice(idx, 1);
  next.splice(target, 0, row);
  draft.rows = next;
  persistDraft();
}

function updateRowLabel(rowId: string, label: string) {
  const row = draft.rows.find((r) => r.id === rowId);
  if (row) {
    row.label = label;
    persistDraft();
  }
}

function finalizeRowLabel(rowId: string) {
  const row = draft.rows.find((r) => r.id === rowId);
  if (!row) return;
  if (!row.label || !row.label.trim()) {
    row.label = "Row";
    persistDraft();
  }
}

function updateRowColor(rowId: string, color: string) {
  const row = draft.rows.find((r) => r.id === rowId);
  if (row) {
    row.color = color;
    persistDraft();
  }
}

function assignHero(heroId: string, rowId: string) {
  if (!heroMap.value.has(heroId)) return;
  const prevRowId = draft.assignments[heroId];
  if (prevRowId && draft.order[prevRowId]) {
    draft.order[prevRowId] = draft.order[prevRowId].filter((id) => id !== heroId);
  }
  draft.assignments[heroId] = rowId;
  const order = ensureRowOrder(rowId);
  if (!order.includes(heroId)) {
    order.push(heroId);
  }
  persistDraft();
}

function unassignHero(heroId: string) {
  const rowId = draft.assignments[heroId];
  if (rowId && draft.order[rowId]) {
    draft.order[rowId] = draft.order[rowId].filter((id) => id !== heroId);
  }
  delete draft.assignments[heroId];
  persistDraft();
}

function resetDraft() {
  if (isDirty.value && typeof window !== "undefined") {
    const ok = window.confirm("You have unsaved changes. Start a new list anyway?");
    if (!ok) return;
  }
  draft.id = null;
  draft.title = "New Tier List";
  draft.rows = [...DEFAULT_ROWS];
  draft.assignments = {};
  draft.order = {};
  draft.linkedHeroes = [];
  draft.notes = "";
  shareUrl.value = null;
  editUrl.value = null;
  linkSelection.value = [];
  linkedBuilderOpen.value = false;
  success.value = null;
  error.value = null;
  if (typeof window !== "undefined") {
    window.location.hash = "";
  }
  persistDraft();
  markSavedSnapshot();
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

async function copyTierImage() {
  if (!exportRef.value) return;
  const exportWidth = 650;
  const prevWidth = exportRef.value.style.width;
  const prevMaxWidth = exportRef.value.style.maxWidth;
  exportRef.value.style.width = `${exportWidth}px`;
  exportRef.value.style.maxWidth = `${exportWidth}px`;
  exporting.value = true;
  await nextTick();
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
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    success.value = "Tier list image copied.";
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${draft.title || "tier-list"}.png`;
  link.click();
  URL.revokeObjectURL(url);
  success.value = "Tier list image downloaded.";
}

function confirmClearRows() {
  if (typeof window === "undefined") return;
  const ok = window.confirm("Clear all heroes from this list? This keeps your tiers but removes every hero.");
  if (!ok) return;
  draft.assignments = {};
  draft.order = {};
  persistDraft();
}

function forkList() {
  const payload: TierData = {
    rows: draft.rows,
    assignments: draft.assignments,
    order: draft.order,
    linkedHeroes: draft.linkedHeroes,
    notes: draft.notes
  };
  const generated = generatePassphraseId();
  const localId = `local-${generated}`;
  draft.id = localId;
  saveLocalList(localId, draft.title || "Untitled", payload);
  setTierHash(localId);
  shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${localId}`;
  editUrl.value = null;
  success.value = `Forked locally as ${localId}.`;
  upsertOwnedList(localId, draft.title || "Untitled", "local");
  persistDraft();
  markSavedSnapshot();
}

async function save() {
  success.value = null;
  error.value = null;
  saving.value = true;
  shareUrl.value = null;
  editUrl.value = null;
  const payload: TierData = {
    rows: draft.rows,
    assignments: draft.assignments,
    order: draft.order,
    linkedHeroes: draft.linkedHeroes,
    notes: draft.notes
  };
  try {
    if (!draft.id || isLocalId(draft.id)) {
      try {
        const created = await createTierList({ title: draft.title || "Untitled", data: payload });
        draft.id = created.id;
        const tokenMap = { ...tokens.value, [created.id]: created.editToken };
        tokens.value = tokenMap;
        persistTokens(tokenMap);
        setTierHash(created.id);
        shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${created.id}`;
        editUrl.value = `${window.location.origin}${window.location.pathname}#tier=${created.id}&edit=${created.editToken}`;
        success.value = "Created new list.";
        upsertOwnedList(created.id, draft.title || "Untitled", "cloud");
        markSavedSnapshot();
      } catch {
        const generated = generatePassphraseId();
        const localId = draft.id && isLocalId(draft.id) ? draft.id : `local-${generated}`;
        draft.id = localId;
        saveLocalList(localId, draft.title || "Untitled", payload);
        setTierHash(localId);
        shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${localId}`;
        editUrl.value = null;
        success.value = `Saved locally as ${localId}.`;
        upsertOwnedList(localId, draft.title || "Untitled", "local");
        markSavedSnapshot();
      }
    } else {
      const editToken = tokens.value[draft.id] || "";
      if (!editToken) {
        error.value = "Missing edit token for this list. Provide it to update.";
        return;
      }
      const updated = await updateTierList({
        id: draft.id,
        editToken,
        title: draft.title || "Untitled",
        data: payload
      });
      setTierHash(updated.id);
      shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${updated.id}`;
      editUrl.value = `${window.location.origin}${window.location.pathname}#tier=${updated.id}&edit=${editToken}`;
      success.value = "Saved changes.";
      upsertOwnedList(updated.id, draft.title || "Untitled", "cloud");
      markSavedSnapshot();
    }
  } catch (err: any) {
    error.value = err?.message || "Failed to save";
  } finally {
    saving.value = false;
    persistDraft();
  }
}

async function loadExisting(id: string, editToken?: string | null) {
  if (!id) return;
  if (isDirty.value && typeof window !== "undefined") {
    const ok = window.confirm("You have unsaved changes. Load another list and discard them?");
    if (!ok) return;
  }
  loading.value = true;
  error.value = null;
  success.value = null;
  try {
    if (isLocalId(id)) {
      const local = loadLocalList(id);
      if (!local) {
        error.value = "Local list not found.";
        return;
      }
      applyDoc(local);
      shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${local.id}`;
      editUrl.value = null;
      success.value = "Loaded local list.";
      markSavedSnapshot();
      return;
    }
    const doc = await fetchTierList(id);
    applyDoc(doc);
    if (editToken) {
      const map = { ...tokens.value, [id]: editToken };
      tokens.value = map;
      persistTokens(map);
    }
    shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${doc.id}`;
    const token = editToken || tokens.value[doc.id];
    if (token) {
      editUrl.value = `${window.location.origin}${window.location.pathname}#tier=${doc.id}&edit=${token}`;
    } else {
      editUrl.value = null;
    }
    success.value = "Loaded list.";
    upsertOwnedList(doc.id, doc.title || "Untitled", isLocalId(doc.id) ? "local" : "cloud");
    markSavedSnapshot();
  } catch (err: any) {
    const local = loadLocalList(id);
    if (local) {
      applyDoc(local);
      shareUrl.value = `${window.location.origin}${window.location.pathname}#tier=${local.id}`;
      editUrl.value = null;
      success.value = "Loaded local list.";
      markSavedSnapshot();
      return;
    }
    error.value = err?.message || "Failed to load";
  } finally {
    loading.value = false;
    persistDraft();
  }
}

function applyDoc(doc: TierDocument) {
  draft.id = doc.id;
  draft.title = doc.title || "Untitled";
  draft.rows = doc.data?.rows && doc.data.rows.length ? doc.data.rows : [...DEFAULT_ROWS];
  draft.assignments = doc.data?.assignments || {};
  draft.order = doc.data?.order || {};
  draft.linkedHeroes = Array.isArray(doc.data?.linkedHeroes) ? doc.data.linkedHeroes : [];
  draft.notes = typeof doc.data?.notes === "string" ? doc.data.notes : "";
  normalizeDraft(draft);
  markSavedSnapshot();
}

function applyDraftState(state: DraftState) {
  draft.id = state.id ?? null;
  draft.title = state.title || "New Tier List";
  draft.rows = state.rows && state.rows.length ? state.rows : [...DEFAULT_ROWS];
  draft.assignments = state.assignments || {};
  draft.order = state.order || {};
  draft.linkedHeroes = Array.isArray(state.linkedHeroes) ? state.linkedHeroes : [];
  draft.notes = typeof state.notes === "string" ? state.notes : "";
  normalizeDraft(draft);
  markSavedSnapshot();
}

function handleHashLoad() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.replace("#", "");
  if (!hash.startsWith("tier=")) return;
  const [, query] = hash.split("tier=");
  const [idPart, tokenPart] = query.split("&edit=");
  const id = decodeURIComponent(idPart || "");
  const token = tokenPart ? decodeURIComponent(tokenPart) : null;
  if (id) {
    loadExisting(id, token);
  }
}

function randomColor() {
  return COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)];
}

function handleGlobalClick() {
  Object.keys(rowConfigOpen).forEach((k) => (rowConfigOpen[k] = false));
  Object.keys(rowAddOpen).forEach((k) => (rowAddOpen[k] = false));
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!isDirty.value) return;
  event.preventDefault();
  event.returnValue = "";
}

watch(
  () => draft.id,
  () => {
    refreshShareLinks();
  },
  { immediate: true }
);

watch(
  tokens,
  () => {
    refreshShareLinks();
  },
  { deep: true }
);

onMounted(() => {
  handleHashLoad();
  if (typeof window !== "undefined") {
    const hash = window.location.hash.toLowerCase();
    if (!hash.includes("tier=")) {
      applyDraftState(loadDraft());
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("click", handleGlobalClick);
    window.addEventListener("beforeunload", handleBeforeUnload);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("click", handleGlobalClick);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }
});

onErrorCaptured((err, instance, info) => {
  console.error("TierListBuilder error", err, info, {
    draftSnapshot: {
      id: draft.id,
      title: draft.title,
      rows: draft.rows,
      assignments: draft.assignments,
      order: draft.order
    }
  });
  return false;
});
</script>

<template>
  <section class="tier-card">
    <div class="tier-header">
      <div>
        <p class="eyebrow">Collaborative lists</p>
        <h2>Build & Share</h2>
        <p class="muted">Custom rows, linked heroes, save to the cloud, share a link, lock editing with a token.</p>
      </div>
    <div class="actions">
      <button class="ghost" @click="resetDraft">New List</button>
      <button v-if="isLocked" class="ghost" @click="forkList">Fork & Edit</button>
      <button class="primary" :disabled="saving || isLocked" @click="save">
        <span v-if="saving">Saving...</span>
        <span v-else>Save</span>
      </button>
    </div>
    </div>

    <div class="tier-grid">
      <div class="panel">
        <div class="field">
          <label for="tier-title">Title</label>
          <input id="tier-title" name="tier-title" v-model="draft.title" type="text" placeholder="My list name" :disabled="isLocked" @input="persistDraft" />
        </div>

        <div class="field dual">
          <div>
            <label for="open-list">Open list</label>
            <div class="inline-input">
              <input id="open-list" name="open-list" v-model="openInput" type="text" placeholder="Paste list link or ID" />
              <button class="ghost" :disabled="loading || !openInput" @click="openFromInput">Open</button>
            </div>
          </div>
          <div>
            <label for="my-lists">My lists</label>
            <div class="inline-input">
              <select id="my-lists" name="my-lists" :value="''" @change="(e: any) => e.target.value && loadExisting(e.target.value)">
                <option value="">Select a saved list</option>
                <option v-for="list in ownedLists" :key="list.id" :value="list.id">
                  {{ list.title }} ({{ list.source }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="status">
          <span v-if="loading" class="pill">Loading...</span>
          <span v-if="saving" class="pill">Saving...</span>
          <span v-if="success" class="pill success">{{ success }}</span>
          <span v-if="error" class="pill danger">{{ error }}</span>
          <span v-if="isLocked" class="pill">Read-only until unlocked.</span>
        </div>

        <div v-if="shareUrl || editUrl" class="share-box">
          <div v-if="shareUrl">
            <label>Share links</label>
            <div class="inline-input">
              <input :value="shareUrl" readonly />
              <button class="ghost share-copy-btn" @click="() => copyToClipboard(shareUrl)">Copy view link</button>
              <button class="ghost share-copy-btn" :disabled="!editUrl" @click="() => editUrl && copyToClipboard(editUrl)">
                Copy edit link
              </button>
            </div>
            <p class="muted share-hint">Edit link includes the token. Share it only with people you trust.</p>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="rows-header">
          <h3>{{ isLocked ? "Preview" : "Rows" }}</h3>
          <div v-if="!isLocked" class="row-header-actions">
            <button class="ghost" :disabled="isLocked" @click="addRow">Add Row</button>
            <button class="ghost danger" :disabled="isLocked" @click="confirmClearRows">Clear List</button>
          </div>
          <div v-else class="row-header-actions">
            <button class="ghost" @click="copyTierImage">Copy Image</button>
          </div>
        </div>
        <div v-if="!isLocked" class="rows-list">
          <div
            v-for="(entry, entryIdx) in rowsWithHeroes"
            :key="entry?.rowId || `row-${entryIdx}`"
            class="row-item"
            :style="{
              borderColor: entry?.row?.color,
              background: entry?.row?.color ? entry.row.color + '22' : undefined
            }"
            @click.self="entry?.rowId && (rowConfigOpen[entry.rowId] = false)"
          >
            <div class="row-top">
              <button
                class="ghost color-toggle"
                type="button"
                :disabled="isLocked"
                @click.stop="() => {
                  if (!entry?.rowId) return;
                  Object.keys(rowConfigOpen).forEach((k) => (rowConfigOpen[k] = false));
                  rowConfigOpen[entry.rowId] = true;
                }"
                :aria-label="`Edit color for ${entry?.row?.label ?? ''}`"
              >
                <span class="swatch" :style="{ background: entry?.row?.color }"></span>
              </button>
              <input
                class="row-label"
                :value="entry?.row?.label || ''"
                :disabled="isLocked"
                @input="(e: any) => !isLocked && entry?.rowId && updateRowLabel(entry.rowId, e.target.value)"
                @blur="() => entry?.rowId && finalizeRowLabel(entry.rowId)"
              />
              <div class="row-actions">
                <button class="ghost" :disabled="isLocked" @click="entry?.rowId && moveRow(entry.rowId, -1)">↑</button>
                <button class="ghost" :disabled="isLocked" @click="entry?.rowId && moveRow(entry.rowId, 1)">↓</button>
                <button class="ghost danger" :disabled="isLocked || rowsList.length <= 1" @click="entry?.rowId && removeRow(entry.rowId)">✕</button>
              </div>
            </div>
            <div
              v-if="entry?.rowId && rowConfigOpen[entry.rowId]"
              class="color-popover"
              @click.stop
            >
              <div class="color-picker">
                <label>Row color</label>
                <input class="row-color" type="color" :value="entry.row?.color" :disabled="isLocked" @input="(e: any) => !isLocked && entry?.rowId && updateRowColor(entry.rowId, e.target.value)" />
                <input
                  class="row-color-hex"
                  :value="entry.row?.color || ''"
                  :disabled="isLocked"
                  @input="(e: any) => !isLocked && entry?.rowId && updateRowColor(entry.rowId, e.target.value)"
                />
                <div class="color-presets">
                  <button
                    v-for="preset in COLOR_PRESETS"
                    :key="preset"
                    :style="{ background: preset }"
                    :disabled="isLocked"
                    @click="!isLocked && entry?.rowId && updateRowColor(entry.rowId, preset)"
                    type="button"
                    class="preset"
                    :aria-label="`Set color ${preset}`"
                  ></button>
                </div>
              </div>
            </div>
            <div class="row-heroes">
              <div
                v-for="(hero, idx) in entry.heroes.filter(Boolean)"
                :key="hero?.id || (entry?.rowId ? `row-${entry.rowId}-${idx}` : `row-${idx}`)"
                class="hero-chip"
                :class="{
                  selected: entry?.rowId && selectedForMove[entry.rowId] === hero.id
                }"
                :style="{
                  background: rarityBackground(hero)
                }"
                @click="entry?.rowId && (selectedForMove[entry.rowId] = selectedForMove[entry.rowId] === hero.id ? '' : hero.id)"
              >
                <div class="hero-stack" :class="{ linked: isLinkedHero(hero) }" :style="{ '--stack-count': heroStack(hero).length }">
                  <img
                    v-for="(stackHero, stackIdx) in heroStack(hero)"
                    :key="stackHero.id"
                    :src="heroImg(stackHero)"
                    :alt="heroDisplayName(hero)"
                    :style="{ '--stack-index': stackIdx }"
                  />
                </div>
              </div>
              <button
                v-if="availableHeroesForRow().length > 0"
                class="hero-add"
                type="button"
                :disabled="isLocked"
                @click.stop="entry?.rowId && (rowAddOpen[entry.rowId] = !rowAddOpen[entry.rowId])"
                :aria-label="`Add hero to ${entry?.row?.label ?? ''}`"
              >
                +
              </button>
              <div v-if="entry?.rowId && rowAddOpen[entry.rowId]" class="hero-add-popover" @click.stop>
                <div class="hero-add-grid">
                  <button
                    v-for="(hero, idx) in availableHeroesForRow()"
                    :key="hero?.id || `add-hero-${idx}`"
                    class="hero-add-card"
                    :class="{ sublime: hero?.rarity === 'Sublime' }"
                    type="button"
                    :disabled="isLocked"
                    :style="{
                      borderColor: typeof rarityBorder(hero) === 'string' ? rarityBorder(hero) : undefined,
                      background: 'var(--hero-card-bg)',
                      borderImage: 'none',
                      '--sublime-border': rarityBorder(hero)?.startsWith('linear-gradient') ? rarityBorder(hero) : '',
                      '--stack-count': heroStack(hero).length
                    }"
                    @click="() => { if (!isLocked && entry?.rowId && hero?.id) { assignHero(hero.id, entry.rowId); rowAddOpen[entry.rowId] = false; } }"
                  >
                    <div class="hero-stack" :class="{ linked: isLinkedHero(hero) }" :style="{ '--stack-count': heroStack(hero).length }">
                      <img
                        v-for="(stackHero, stackIdx) in heroStack(hero)"
                        :key="stackHero.id"
                        :src="heroImg(stackHero)"
                        :alt="heroDisplayName(hero)"
                        :style="{ '--stack-index': stackIdx }"
                      />
                    </div>
                  </button>
                </div>
              </div>
              <p v-if="entry.heroes.length === 0 && entry?.rowId && !rowAddOpen[entry.rowId]" class="muted empty-row">No heroes in this row.</p>
            </div>
            <div class="row-hero-actions" v-if="entry.heroes.length > 0 && entry?.rowId">
              <div class="action-row">
                <span class="muted action-label">Hero actions</span>
                <select
                  :value="selectedForMove[entry.rowId] || ''"
                  class="hero-select"
                  @change="(e: any) => { selectedForMove[entry.rowId] = e.target.value; }"
                >
                  <option value="">Choose hero</option>
                  <option
                    v-for="(hero, idx) in entry.heroes.filter(Boolean)"
                    :key="hero?.id || (entry?.rowId ? `opt-${entry.rowId}-${idx}` : `opt-${idx}`)"
                    :value="hero?.id || ''"
                  >
                    {{ heroDisplayName(hero) }}
                  </option>
                </select>
                <div class="adjust-inline">
                  <span class="muted action-subtitle">Reorder hero</span>
                  <button
                    class="ghost tiny"
                    :disabled="isLocked || !canMove(entry, selectedForMove[entry.rowId], -1)"
                    @click="selectedForMove[entry.rowId] && moveHero(entry.rowId, selectedForMove[entry.rowId], -1)"
                  >
                    ←
                  </button>
                  <button
                    class="ghost tiny"
                    :disabled="isLocked || !canMove(entry, selectedForMove[entry.rowId], 1)"
                    @click="selectedForMove[entry.rowId] && moveHero(entry.rowId, selectedForMove[entry.rowId], 1)"
                  >
                    →
                  </button>
                  <button
                    class="ghost tiny danger"
                    :disabled="isLocked || !selectedForMove[entry.rowId]"
                    @click="selectedForMove[entry.rowId] && unassignHero(selectedForMove[entry.rowId]!)"
                  >
                    Remove hero
                  </button>
                </div>
                <div class="move-inline">
                  <select
                    class="hero-select"
                    :disabled="isLocked || !selectedForMove[entry.rowId]"
                    :value="moveTarget[entry.rowId] || ''"
                    @change="(e: any) => { moveTarget[entry.rowId] = e.target.value; }"
                  >
                    <option value="">Move to another tier</option>
                    <option v-for="(r, idx) in rowsOther(entry.rowId)" :key="r?.id || `row-${idx}`" :value="r?.id || ''">
                      {{ r?.label || 'Row' }}
                    </option>
                  </select>
                  <button
                    class="ghost tiny move-btn"
                    :disabled="isLocked || !selectedForMove[entry.rowId] || !moveTarget[entry.rowId]"
                    @click="() => {
                      const hId = selectedForMove[entry.rowId];
                      const target = moveTarget[entry.rowId];
                      if (hId && target) {
                        assignHero(hId, target);
                        moveTarget[entry.rowId] = '';
                        selectedForMove[entry.rowId] = '';
                      }
                    }"
                  >
                    Move
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!isLocked" class="notes-panel">
          <label for="tier-notes">Tier list notes</label>
          <textarea
            id="tier-notes"
            name="tier-notes"
            v-model="draft.notes"
            rows="4"
            placeholder="Add notes, explanations, or matchup tips..."
            @input="persistDraft"
          ></textarea>
          <p class="muted notes-hint">Notes are saved as plain text. Links or scripts won’t run.</p>
        </div>
        <div class="preview-actions">
          <button class="ghost" @click="copyTierImage">Copy Image</button>
        </div>
        <div ref="exportRef" class="tier-export" :class="{ exporting }">
          <div class="tier-export-title">{{ draft.title }}</div>
          <div class="tier-export-rows">
            <div
              v-for="entry in rowsWithHeroes"
              :key="entry?.rowId"
              class="tier-export-row"
              :style="{
                borderColor: entry?.row?.color,
                background: entry?.row?.color ? entry.row.color + '22' : undefined
              }"
            >
              <div class="tier-export-label" :style="{ background: entry?.row?.color }">
                {{ entry?.row?.label }}
              </div>
              <div class="tier-export-heroes">
                <div
                  v-for="(hero, idx) in entry.heroes.filter(Boolean)"
                  :key="hero?.id || `export-${idx}`"
                  class="tier-export-hero"
                  :class="{ linked: isLinkedHero(hero) }"
                  :style="{
                    '--stack-count': heroStack(hero).length,
                    background: previewHeroBackground(hero)
                  }"
                >
                  <div class="hero-stack" :class="{ linked: isLinkedHero(hero) }" :style="{ '--stack-count': heroStack(hero).length }">
                    <img
                      v-for="(stackHero, stackIdx) in heroStack(hero)"
                      :key="stackHero.id"
                      :src="heroImg(stackHero)"
                      :alt="heroDisplayName(hero)"
                      :style="{ '--stack-index': stackIdx }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="draft.notes" class="tier-export-notes">
            <div class="tier-export-notes-title">Notes</div>
            <div class="tier-export-notes-body" v-text="draft.notes"></div>
          </div>
        </div>
      </div>

      <div class="panel" v-if="!isLocked">
        <div class="rows-header">
          <h3>Heroes</h3>
          <div class="hero-controls">
            <button class="ghost" type="button" @click="linkedBuilderOpen = !linkedBuilderOpen">Add Linked Heroes</button>
            <input id="hero-search" name="hero-search" v-model="search" type="search" placeholder="Search heroes" />
          </div>
        </div>
        <div v-if="linkedBuilderOpen" class="linked-builder" @click.stop>
          <div class="linked-meta">
            <span class="muted">Pick 2-3 heroes to make a combo available in this list.</span>
            <button class="ghost tiny" type="button" @click="linkSelection = []">Clear</button>
          </div>
          <div class="linked-grid">
            <button
              v-for="(hero, idx) in HEROES.filter(Boolean).filter((h) => h.rarity !== 'Common' && h.rarity !== 'Epic')"
              :key="hero?.id || `link-${idx}`"
              type="button"
              class="linked-hero"
              :class="[heroRarityClass(hero), { active: hero?.id ? linkSelection.includes(hero.id) : false }]"
              @click="() => hero?.id && toggleLinkSelection(hero.id)"
            >
              <div class="hero-stack" :class="{ linked: false }">
                <img :src="heroImg(hero)" :alt="hero?.name || hero?.id || 'Hero'" />
              </div>
              <span>{{ hero?.name || hero?.id }}</span>
            </button>
          </div>
          <div class="linked-actions">
            <button class="ghost tiny" type="button" @click="linkedBuilderOpen = false">Close</button>
            <button class="primary tiny" type="button" :disabled="linkSelection.length < 2" @click="createLinkedHero">
              Create link
            </button>
          </div>
          <div v-if="draft.linkedHeroes.length" class="linked-existing">
            <p class="muted">Linked heroes in this list:</p>
            <div class="linked-list">
              <div v-for="link in linkedHeroViews" :key="link.id" class="linked-pill" :class="heroRarityClass(link)">
                <div class="hero-stack linked" :style="{ '--stack-count': link.heroIds.length }">
                  <img
                    v-for="(stackHero, stackIdx) in heroStack(link)"
                    :key="stackHero.id"
                    :src="heroImg(stackHero)"
                    :alt="heroDisplayName(link)"
                    :style="{ '--stack-index': stackIdx }"
                  />
                </div>
                <span>{{ link.name }}</span>
                <button class="ghost tiny danger" type="button" @click="removeLinkedHero(link.id)">Remove</button>
              </div>
            </div>
          </div>
        </div>
        <div class="hero-grid">
          <div
            v-for="(hero, idx) in heroesFiltered"
            :key="hero?.id || `hero-${idx}`"
            class="hero-card-mini"
            :class="[heroRarityClass(hero), { assigned: hero?.id ? assignedSet.has(hero.id) : false }]"
            :title="heroDisplayName(hero)"
          >
            <div class="hero-stack" :class="{ linked: isLinkedHero(hero) }" :style="{ '--stack-count': heroStack(hero).length }">
              <img
                v-for="(stackHero, stackIdx) in heroStack(hero)"
                :key="stackHero.id"
                :src="heroImg(stackHero)"
                :alt="heroDisplayName(hero)"
                :style="{ '--stack-index': stackIdx }"
              />
            </div>
            <select
              :value="hero?.id ? draft.assignments[hero.id] || '' : ''"
              :disabled="isLocked"
              @change="(e: any) => {
                const val = e.target.value;
                if (!hero?.id) return;
                if (!val) {
                  unassignHero(hero.id);
                } else {
                  assignHero(hero.id, val);
                }
              }"
            >
              <option value="">Unassigned</option>
              <option v-for="(row, idx) in rowsList.filter(Boolean)" :key="row?.id || `row-${idx}`" :value="row?.id || ''">
                {{ row?.label || 'Row' }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="panel" v-else>
        <div v-if="draft.notes" class="notes-preview">
          <h4>Notes</h4>
          <p class="muted" v-text="draft.notes"></p>
        </div>
      </div>
    </div>
  </section>
</template>
