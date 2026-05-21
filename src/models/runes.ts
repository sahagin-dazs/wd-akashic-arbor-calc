import type { Element, HeroDef, Role } from "./types";

export type RuneId =
  | "UW"
  | "LR"
  | "BS"
  | "IF"
  | "DG"
  | "AF"
  | "EB"
  | "DR"
  | "GE"
  | "TB"
  | "FT"
  | "SW"
  | "TO"
  | "GM";

export type RuneSlotNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface RuneDef {
  id: RuneId;
  name: string;
  abbreviation: string;
  advanced: boolean;
}

export interface RuneSetPiece {
  runeId: RuneId;
  count: number;
}

export interface RuneSlotRecommendation {
  slot: RuneSlotNumber;
  position: string;
  runeId: RuneId;
  mainStat: string;
  substats: string[];
}

export interface RuneRecommendation {
  heroId: string;
  buildType: "DPS" | "Support";
  setPieces: RuneSetPiece[];
  slots: RuneSlotRecommendation[];
  notes: string[];
}

export const RUNE_CATALOG: Record<RuneId, RuneDef> = {
  UW: {
    id: "UW",
    name: "Unshaken Will",
    abbreviation: "UW",
    advanced: false
  },
  LR: {
    id: "LR",
    name: "Lethal Ripose",
    abbreviation: "LR",
    advanced: false
  },
  BS: {
    id: "BS",
    name: "Bloodrage Slam",
    abbreviation: "BS",
    advanced: false
  },
  IF: {
    id: "IF",
    name: "Illusive Flurry",
    abbreviation: "IF",
    advanced: false
  },
  DG: {
    id: "DG",
    name: "Divine Grace",
    abbreviation: "DG",
    advanced: false
  },
  AF: {
    id: "AF",
    name: "Arcane Flood",
    abbreviation: "AF",
    advanced: false
  },
  EB: {
    id: "EB",
    name: "Endless Bloom",
    abbreviation: "EB",
    advanced: false
  },
  DR: {
    id: "DR",
    name: "Divine Revival",
    abbreviation: "DR",
    advanced: false
  },
  GE: {
    id: "GE",
    name: "Galaxy Echo",
    abbreviation: "GE",
    advanced: true
  },
  TB: {
    id: "TB",
    name: "Tempest Barrier",
    abbreviation: "TB",
    advanced: true
  },
  FT: {
    id: "FT",
    name: "Frostwolf Totem",
    abbreviation: "FT",
    advanced: true
  },
  SW: {
    id: "SW",
    name: "Sanctuary Watcher",
    abbreviation: "SW",
    advanced: true
  },
  TO: {
    id: "TO",
    name: "Twin Oath",
    abbreviation: "TO",
    advanced: true
  },
  GM: {
    id: "GM",
    name: "Godsbane Manifesto",
    abbreviation: "GM",
    advanced: true
  }
};

const SLOT_POSITIONS: Record<RuneSlotNumber, string> = {
  1: "Diagonal Top Left",
  2: "Left",
  3: "Diagonal Bottom Left",
  4: "Diagonal Bottom Right",
  5: "Right",
  6: "Diagonal Top Right"
};

const ELEMENT_DAMAGE_MAIN_STAT: Record<Element, string> = {
  Fire: "Fire DMG",
  Ice: "Ice DMG",
  Electro: "Electro DMG",
  Wind: "Wind DMG",
  Xeno: "Xenoscape Ele. DMG"
};

const ROLE_DAMAGE_MAIN_STAT: Record<Role, string> = {
  Fighter: "Fighter DMG Bonus",
  Mage: "Mage DMG Bonus",
  Ranger: "Ranger DMG Bonus",
  Support: "HP%"
};

const STANDARD_GUIDE: Record<string, RuneSetPiece[]> = {
  ID: [{ runeId: "DR", count: 6 }],
  BA: [
    { runeId: "LR", count: 4 },
    { runeId: "EB", count: 2 }
  ],
  PC: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  Odin: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  SS: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  VG: [{ runeId: "DR", count: 6 }],
  Cheffy: [
    { runeId: "DG", count: 4 },
    { runeId: "BS", count: 2 }
  ],
  SR: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  FL: [
    { runeId: "DR", count: 2 },
    { runeId: "UW", count: 2 },
    { runeId: "BS", count: 2 }
  ],
  AA: [{ runeId: "EB", count: 6 }],
  Lich: [{ runeId: "DR", count: 6 }],
  WR: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  Valk: [
    { runeId: "BS", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  VW: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ],
  PK: [{ runeId: "EB", count: 6 }],
  SW: [
    { runeId: "EB", count: 4 },
    { runeId: "DR", count: 2 }
  ],
  PD: [
    { runeId: "UW", count: 4 },
    { runeId: "IF", count: 2 }
  ]
};

const ADVANCED_EXCEPTIONS: Record<string, RuneSetPiece[]> = {
  SW: [
    { runeId: "GE", count: 4 },
    { runeId: "DR", count: 2 }
  ],
  Panda: [
    { runeId: "TB", count: 4 },
    { runeId: "GM", count: 2 }
  ],
  LA: [
    { runeId: "TO", count: 4 },
    { runeId: "GM", count: 2 }
  ],
  NT: [
    { runeId: "FT", count: 4 },
    { runeId: "GM", count: 2 }
  ]
};

const DPS_SUBSTATS = ["ATK", "ATK%", "Crit DMG", "Crit Rate"];
const SUPPORT_SUBSTATS = ["HP", "HP%", "Skill CD Reduction"];
const HEALER_SUBSTATS = ["HP%", "Skill CD Reduction", "Healing Bonus", "HP"];
const STARLIGHT_SUBSTATS = ["Skill CD Reduction", "HP%", "HP", "Healing Bonus"];

function isDamageHero(hero: HeroDef) {
  return hero.role !== "Support";
}

function defaultSetPieces(hero: HeroDef, includeAdvancedRunes: boolean): RuneSetPiece[] {
  if (includeAdvancedRunes) {
    const advancedException = ADVANCED_EXCEPTIONS[hero.id];
    if (advancedException) return advancedException;
    if (isDamageHero(hero)) {
      return [
        { runeId: "GM", count: 4 },
        { runeId: "UW", count: 2 }
      ];
    }
    return [{ runeId: "DR", count: 6 }];
  }

  const standardGuide = STANDARD_GUIDE[hero.id];
  if (standardGuide) return standardGuide;
  if (isDamageHero(hero)) {
    return [
      { runeId: "UW", count: 4 },
      { runeId: "IF", count: 2 }
    ];
  }
  return [{ runeId: "DR", count: 6 }];
}

function expandSetPieces(setPieces: RuneSetPiece[]) {
  const runeIds = setPieces.flatMap((piece) =>
    Array.from({ length: piece.count }, () => piece.runeId)
  );
  while (runeIds.length < 6) {
    runeIds.push(setPieces[0]?.runeId ?? "DR");
  }
  return runeIds.slice(0, 6);
}

function mainStatForSlot(hero: HeroDef, slot: RuneSlotNumber) {
  if (slot === 1) return "ATK";
  if (slot === 2) return "DEF";
  if (slot === 3) return "HP";
  if (!isDamageHero(hero)) return "HP%";
  if (slot === 4) return "Crit DMG";
  if (slot === 5) return ELEMENT_DAMAGE_MAIN_STAT[hero.element];
  return ROLE_DAMAGE_MAIN_STAT[hero.role];
}

function substatsForHero(hero: HeroDef) {
  if (isDamageHero(hero)) return DPS_SUBSTATS;
  if (hero.id === "SW") return STARLIGHT_SUBSTATS;
  if (hero.id === "Cheffy" || hero.id === "FL" || hero.id === "Seraph") {
    return HEALER_SUBSTATS;
  }
  return SUPPORT_SUBSTATS;
}

function recommendationNotes(hero: HeroDef, includeAdvancedRunes: boolean) {
  const notes: string[] = [];
  if (includeAdvancedRunes && isDamageHero(hero) && !ADVANCED_EXCEPTIONS[hero.id]) {
    notes.push("DPS rule: prioritize a 4-piece Godsbane Manifesto set.");
  }

  if (isDamageHero(hero)) {
    notes.push("Use Crit Rate in slot 4 only if the hero still needs crit consistency.");
  } else if (hero.id === "SW") {
    notes.push("Starlight Weaver values Skill CD Reduction more than other supports.");
  } else {
    notes.push("Support rule: stack HP and cooldown-friendly substats.");
  }
  return notes;
}

export function runeForId(runeId: RuneId) {
  return RUNE_CATALOG[runeId];
}

export function buildRuneRecommendation(
  hero: HeroDef,
  includeAdvancedRunes: boolean
): RuneRecommendation {
  const setPieces = defaultSetPieces(hero, includeAdvancedRunes);
  const runeIds = expandSetPieces(setPieces);
  const substats = substatsForHero(hero);
  const slots = ([1, 2, 3, 4, 5, 6] as RuneSlotNumber[]).map((slot, index) => ({
    slot,
    position: SLOT_POSITIONS[slot],
    runeId: runeIds[index],
    mainStat: mainStatForSlot(hero, slot),
    substats
  }));

  return {
    heroId: hero.id,
    buildType: isDamageHero(hero) ? "DPS" : "Support",
    setPieces,
    slots,
    notes: recommendationNotes(hero, includeAdvancedRunes)
  };
}
