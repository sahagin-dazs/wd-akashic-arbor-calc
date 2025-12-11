import { HeroDef, LEVELS } from "./types";

const S = ["0S", "1S", "2S", "3S", "4S", "5S"] as const;
const M = ["1M", "2M", "3M", "4M", "5M"] as const;
const D = ["1D", "2D", "3D", "4D", "5D"] as const;

function buildPercents(values: number[]): HeroDef["percents"] {
  const result: HeroDef["percents"] = {};
  LEVELS.forEach((lvl, idx) => {
    if (values[idx] != null) {
      result[lvl] = values[idx];
    }
  });
  return result;
}

// Keep everything exactly matching your table
export const HEROES: HeroDef[] = [
  {
    id: "VW",
    name: "Void Witch",
    rarity: "Sublime",
    role: "Mage",
    element: "Xeno",
    percents: buildPercents([
      0.9, 1.05, 1.2, 1.35, 1.5, 1.65, 1.8, 1.95, 2.1, 2.25, 2.4, 2.55, 2.7,
      2.85, 3, 3.15, 3.3
    ])
  },
  {
    id: "SW",
    name: "Starlight Weaver",
    rarity: "Sublime",
    role: "Support",
    element: "Xeno",
    percents: buildPercents([
      0.9, 1.05, 1.2, 1.35, 1.5, 1.65, 1.8, 1.95, 2.1, 2.25, 2.4, 2.55, 2.7,
      2.85, 3, 3.15, 3.3
    ])
  },
  {
    id: "PK",
    name: "Peace Keeper",
    rarity: "Sublime",
    role: "Fighter",
    element: "Xeno",
    percents: buildPercents([
      0.9, 1.05, 1.2, 1.35, 1.5, 1.65, 1.8, 1.95, 2.1, 2.25, 2.4, 2.55, 2.7,
      2.85, 3, 3.15, 3.3
    ])
  },
  {
    id: "WR",
    name: "Windborn Ranger",
    rarity: "Mythic",
    role: "Ranger",
    element: "Wind",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Lich",
    name: "Frost Lich",
    rarity: "Mythic",
    role: "Support",
    element: "Ice",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "AA",
    name: "Archon Armor",
    rarity: "Mythic",
    role: "Support",
    element: "Electric",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "FL",
    name: "Fabled Lyra",
    rarity: "Mythic",
    role: "Support",
    element: "Wind",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "SR",
    name: "Scarlet Reaper",
    rarity: "Mythic",
    role: "Ranger",
    element: "Fire",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Cheffy",
    name: "Cheffy",
    rarity: "Mythic",
    role: "Support",
    element: "Fire",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "IQ",
    name: "Ice Queen",
    rarity: "Mythic",
    role: "Mage",
    element: "Ice",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "VG",
    name: "Fiery Vanguard",
    rarity: "Mythic",
    role: "Support",
    element: "Fire",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "PC",
    name: "Polar Captain",
    rarity: "Mythic",
    role: "Fighter",
    element: "Ice",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "SS",
    name: "Sword Saint",
    rarity: "Mythic",
    role: "Mage",
    element: "Wind",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "NB",
    name: "Night Baron",
    rarity: "Mythic",
    role: "Ranger",
    element: "Wind",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Odin",
    name: "God Ruler Odin",
    rarity: "Mythic",
    role: "Fighter",
    element: "Electric",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "BA",
    name: "Blazing Archer",
    rarity: "Mythic",
    role: "Ranger",
    element: "Fire",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "SM",
    name: "Swordmaster",
    rarity: "Mythic",
    role: "Fighter",
    element: "Wind",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Pharaoh",
    name: "Thunder Pharaoh",
    rarity: "Mythic",
    role: "Mage",
    element: "Electric",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "ID",
    name: "Ice Demon",
    rarity: "Mythic",
    role: "Support",
    element: "Ice",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "DS",
    name: "Demon Spawn",
    rarity: "Mythic",
    role: "Fighter",
    element: "Fire",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Robot",
    name: "Robot",
    rarity: "Mythic",
    role: "Fighter",
    element: "Electric",
    percents: buildPercents([
      0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9,
      2.0, 2.1, 2.2
    ])
  },
  {
    id: "Seraph",
    name: "Seraph",
    rarity: "Legendary",
    role: "Support",
    element: "Electric",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "FM",
    name: "Fire Mage",
    rarity: "Legendary",
    role: "Mage",
    element: "Fire",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "DH",
    name: "Demon Hunter",
    rarity: "Legendary",
    role: "Ranger",
    element: "Wind",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "Cat",
    name: "Cat Assassin",
    rarity: "Legendary",
    role: "Ranger",
    element: "Wind",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "IM",
    name: "Ice Mage",
    rarity: "Legendary",
    role: "Mage",
    element: "Ice",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "HP",
    name: "High Priest",
    rarity: "Legendary",
    role: "Mage",
    element: "Electric",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "IW",
    name: "Ice Witch",
    rarity: "Legendary",
    role: "Mage",
    element: "Ice",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "FW",
    name: "Fire Witch",
    rarity: "Legendary",
    role: "Mage",
    element: "Fire",
    percents: buildPercents([
      0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9,
      0.95, 1.0, 1.05, 1.1
    ])
  },
  {
    id: "ElfRanger",
    name: "Elf Ranger",
    rarity: "Epic",
    role: "Ranger",
    element: "Wind",
    percents: { "0S": 0.2 }
  },
  {
    id: "NovicePriest",
    name: "Novice Priest",
    rarity: "Epic",
    role: "Support",
    element: "Electric",
    percents: { "0S": 0.2 }
  },
  {
    id: "FrostArcher",
    name: "Frost Archer",
    rarity: "Epic",
    role: "Ranger",
    element: "Ice",
    percents: { "0S": 0.2 }
  },
  {
    id: "FireApprentice",
    name: "Fire Apprentice",
    rarity: "Epic",
    role: "Mage",
    element: "Fire",
    percents: { "0S": 0.2 }
  },
  {
    id: "UL",
    name: "Unyielding Lancer",
    rarity: "Common",
    role: "Fighter",
    element: "Wind",
    percents: { "0S": 0.1 }
  },
  {
    id: "Frankenstein",
    name: "Frankenstein",
    rarity: "Common",
    role: "Mage",
    element: "Electric",
    percents: { "0S": 0.1 }
  },
  {
    id: "RogueFM",
    name: "Rogue Fire Mage",
    rarity: "Common",
    role: "Mage",
    element: "Fire",
    percents: { "0S": 0.1 }
  },
  {
    id: "IceWolfPup",
    name: "Ice Wolf Pup",
    rarity: "Common",
    role: "Fighter",
    element: "Ice",
    percents: { "0S": 0.1 }
  }
];

export const HERO_MAP = new Map(HEROES.map((h) => [h.id, h]));
