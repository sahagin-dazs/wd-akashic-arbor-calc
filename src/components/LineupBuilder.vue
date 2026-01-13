<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import html2canvas from "html2canvas";
import type { HeroDef, OwnedHero, Level } from "../models/types";
import type { LineupData, LineupFormat, LineupSlot } from "../models/lineupList";
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

type DraftState = {
  id: string | null;
  title: string;
  format: LineupFormat;
  slots: LineupSlot[];
  notes: string;
};

type SavedLineup = {
  id: string;
  title: string;
  data: LineupData;
};

const SLOT_COUNT_BY_FORMAT: Record<LineupFormat, number> = {
  pve: 5,
  pvp: 10,
  gvg: 30
};
const HERO_LIMIT_PER_TEAM = 5;
const GVG_TEAM_COUNT = 3;
const GVG_TEAM_SLOT_COUNT = 10;

function defaultSlots(format: LineupFormat): LineupSlot[] {
  return Array.from({ length: SLOT_COUNT_BY_FORMAT[format] }, () => ({
    id: newId(),
    heroId: null
  }));
}

function trimToHeroLimit(slots: LineupSlot[], format: LineupFormat) {
  if (format !== "gvg") {
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
  return slots.map((slot, index) => {
    if (!slot.heroId) return slot;
    const teamIndex = Math.floor(index / GVG_TEAM_SLOT_COUNT);
    const filledBefore = slots
      .slice(teamIndex * GVG_TEAM_SLOT_COUNT, index)
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

function normalizeDraft(raw?: Partial<DraftState> | null): DraftState {
  const format: LineupFormat = raw?.format === "gvg" ? "gvg" : raw?.format === "pvp" ? "pvp" : "pve";
  return {
    id: raw?.id ?? null,
    title: raw?.title ?? "New Lineup",
    format,
    slots: normalizeSlots(raw?.slots, format),
    notes: raw?.notes ?? ""
  };
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

const draft = reactive<DraftState>(normalizeDraft(loadDraft()));
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
const exportRef = ref<HTMLElement | null>(null);
const exporting = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const showPreviewNames = ref(true);
const showPreviewLevels = ref(true);
const isMobile = ref(false);
let lineupMediaQuery: MediaQueryList | null = null;
let lineupMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

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
    notes: draft.notes
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
  shareUrl.value = null;
  editUrl.value = null;
  activeSlotPopoverId.value = null;
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
  activeSlotPopoverId.value = null;
  shareUrl.value = buildShareUrl(saved.id);
  const token = tokens.value[saved.id];
  editUrl.value = token ? buildEditUrl(saved.id, token) : null;
}

function clearSlot(index: number) {
  draft.slots[index].heroId = null;
}

const filledHeroCount = computed(
  () => draft.slots.filter((slot) => Boolean(slot.heroId)).length
);
const totalHeroLimit = computed(() =>
  draft.format === "gvg" ? HERO_LIMIT_PER_TEAM * GVG_TEAM_COUNT : HERO_LIMIT_PER_TEAM
);
const isLineupFull = computed(() => filledHeroCount.value >= totalHeroLimit.value);
const teamHeroCounts = computed(() => {
  if (draft.format !== "gvg") return [filledHeroCount.value];
  const counts = Array.from({ length: GVG_TEAM_COUNT }, () => 0);
  draft.slots.forEach((slot, index) => {
    if (slot.heroId) {
      counts[Math.floor(index / GVG_TEAM_SLOT_COUNT)] += 1;
    }
  });
  return counts;
});
const groupedSlots = computed(() => {
  if (draft.format !== "gvg") return [draft.slots];
  return Array.from({ length: GVG_TEAM_COUNT }, (_, teamIndex) =>
    draft.slots.slice(teamIndex * GVG_TEAM_SLOT_COUNT, (teamIndex + 1) * GVG_TEAM_SLOT_COUNT)
  );
});
const lineupLimitText = computed(() =>
  draft.format === "gvg"
    ? `Up to ${HERO_LIMIT_PER_TEAM} heroes per team (${totalHeroLimit.value} total) can be placed per lineup.`
    : `Up to ${HERO_LIMIT_PER_TEAM} heroes can be placed per lineup.`
);
const assignedHeroIds = computed(
  () => new Set(draft.slots.map((slot) => slot.heroId).filter(Boolean) as string[])
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
    if (draft.format === "gvg") {
      const slotIndex = draft.slots.findIndex((entry) => entry.id === slot.id);
      const teamIndex = slotIndex >= 0 ? Math.floor(slotIndex / GVG_TEAM_SLOT_COUNT) : 0;
      if (teamHeroCounts.value[teamIndex] >= HERO_LIMIT_PER_TEAM) return;
    } else if (isLineupFull.value) {
      return;
    }
  }
  slot.heroId = heroId;
}

function getHero(heroId: string | null) {
  if (!heroId) return null;
  return heroMap.value.get(heroId) ?? null;
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
  window.location.hash = "#arbor";
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
      notes: draft.notes
    });
    updateShareLinks();
  },
  { deep: true }
);

watch(
  () => draft.format,
  (next) => {
    draft.slots = normalizeSlots(draft.slots, next);
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
              <option value="pve">PvE (5 slots, 1 row)</option>
              <option value="pvp">PvP (10 slots, 2 rows)</option>
              <option value="gvg">GvG (3 teams, 5x2 each)</option>
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
        <span v-if="isLineupFull" class="pill success">Lineup full</span>
      </div>
      <div v-if="draft.format === 'gvg'" class="lineup-team-groups">
        <div
          v-for="(teamSlots, teamIndex) in groupedSlots"
          :key="`team-${teamIndex}`"
          class="lineup-team-group"
        >
          <div class="lineup-team-header">Team {{ teamIndex + 1 }}</div>
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
                    <div class="lineup-slot-name">{{ getHero(slot.heroId)?.name || slot.heroId }}</div>
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
                @click="clearSlot(teamIndex * GVG_TEAM_SLOT_COUNT + index)"
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
                <div class="lineup-slot-name">{{ getHero(slot.heroId)?.name || slot.heroId }}</div>
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
        <div v-if="draft.format === 'gvg'" class="lineup-export-teams">
          <div v-for="(teamSlots, teamIndex) in groupedSlots" :key="`export-team-${teamIndex}`">
            <div class="lineup-team-header lineup-export-team-header">Team {{ teamIndex + 1 }}</div>
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
