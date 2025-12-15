export type Role = "Fighter" | "Mage" | "Ranger" | "Support";
export type Element = "Fire" | "Ice" | "Wind" | "Electro" | "Xeno";

export const LEVELS = [
  "0S",
  "1S",
  "2S",
  "3S",
  "4S",
  "5S",
  "1M",
  "2M",
  "3M",
  "4M",
  "5M",
  "1D",
  "2D",
  "3D",
  "4D",
  "5D",
  "RD"
] as const;

export type Level = (typeof LEVELS)[number];

export type Rarity = "Sublime" | "Mythic" | "Legendary" | "Epic" | "Common";

export interface HeroDef {
  id: string; // abbreviation
  name: string;
  rarity: Rarity;
  role: Role;
  element: Element;
  percents: Partial<Record<Level, number>>; // store as percent, e.g. 0.9 means 0.9%
}

export interface OwnedHero {
  heroId: string;
  /**
   * null   -> player has not set a value yet
   * -1     -> hero not owned
   * >= 0   -> index into LEVELS for owned star/moon/diamond level
   */
  levelIndex: number | null;
}

export const NOT_OWNED_LEVEL_INDEX = -1;

export interface LineupSlot {
  heroId: string | null;
  /**
   * Optional ranking (1 = highest priority). When null, hero is unranked.
   */
  priorityRank: number | null;
  /**
   * Legacy flag retained for backwards compatibility with saved data.
   * Not used by new logic.
   */
  isPriority?: boolean;
}

export interface Lineup {
  slots: LineupSlot[];
}

export type NodeType = "Role" | "Element";

export interface NodeKey {
  type: NodeType;
  value: Role | Element;
}

export interface NodeConfig {
  key: NodeKey;
  maxSlots: number;
}

export interface SlotAssignment {
  heroId: string;
  node: NodeKey;
}

export interface OptimizationResult {
  assignments: SlotAssignment[];
  buffPerHero: Record<string, number>;
  totalPriorityBuff: number;
  overallBuff: number;
}
