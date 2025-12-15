import {
  HeroDef,
  Level,
  LEVELS,
  Lineup,
  NodeKey,
  NodeType,
  OptimizationResult,
  OwnedHero
} from "../models/types";
import { HERO_MAP, HEROES } from "../models/heroes";
import {
  buildNodeConfigForNightmare,
  nodeKeyId
} from "../models/nodeConfig";

export interface OptimizerInput {
  ownedHeroes: OwnedHero[];
  lineup: Lineup;
  nightmareLevel: number;
}

export function getLevelForOwned(hero: OwnedHero | undefined): Level | null {
  if (
    !hero ||
    hero.levelIndex == null ||
    hero.levelIndex < 0 ||
    hero.levelIndex >= LEVELS.length
  ) {
    return null;
  }
  return LEVELS[hero.levelIndex];
}

export function percentToDecimal(p: number | undefined): number {
  if (p == null) return 0;
  return p / 100;
}

const ROLE_THRESHOLDS: Record<
  "Fighter" | "Mage" | "Ranger" | "Support",
  [number, number, number]
> = {
  Fighter: [17, 41, 65],
  Mage: [20, 44, 68],
  Ranger: [23, 47, 71],
  Support: [26, 50, 74]
};

const ELEMENT_THRESHOLDS: Record<Element, [number, number, number]> = {
  Fire: [0, 24, 48],
  Ice: [8, 32, 56],
  Electro: [11, 35, 59],
  Wind: [14, 38, 62],
  Xeno: [29, 53, 77]
};

const PRIORITY_WEIGHT_MAP: Record<number, number> = {
  1: 1e12,
  2: 1e9,
  3: 1e6,
  4: 1e3,
  5: 1
};

function buildSlotWeights(lineup: Lineup) {
  const weights: Record<string, number> = {};
  lineup.slots.forEach((slot) => {
    if (!slot.heroId) return;
    if (typeof slot.priorityRank === "number") {
      weights[slot.heroId] =
        PRIORITY_WEIGHT_MAP[slot.priorityRank] ?? PRIORITY_WEIGHT_MAP[5];
    }
  });
  lineup.slots.forEach((slot) => {
    if (!slot.heroId) return;
    if (weights[slot.heroId] == null) {
      weights[slot.heroId] = 1;
    }
  });
  return weights;
}

function rankedHeroSet(lineup: Lineup) {
  const set = new Set<string>();
  lineup.slots.forEach((slot) => {
    if (slot.heroId && typeof slot.priorityRank === "number") {
      set.add(slot.heroId);
    }
  });
  return set;
}

function slotsForLevel(level: number, [first, second, third]: [number, number, number]) {
  if (level >= third) return 3;
  if (level >= second) return 2;
  if (level >= first) return 1;
  return 0;
}

export function buildNodeConfigForNightmare(
  nightmareLevel: number
): NodeConfig[] {
  const roles: NodeConfig[] = (Object.keys(ROLE_THRESHOLDS) as Array<
    keyof typeof ROLE_THRESHOLDS
  >).map((role) => ({
    key: { type: "Role", value: role },
    maxSlots: slotsForLevel(nightmareLevel, ROLE_THRESHOLDS[role])
  }));

  const elements: NodeConfig[] = (Object.keys(ELEMENT_THRESHOLDS) as Element[]).map(
    (element) => ({
      key: { type: "Element", value: element },
      maxSlots: slotsForLevel(nightmareLevel, ELEMENT_THRESHOLDS[element])
    })
  );

  return [...roles, ...elements];
}

interface PreparedHero {
  hero: HeroDef;
  owned: OwnedHero;
  valueByNode: Map<string, number>; // key stringified NodeKey
}

function nodeKeyString(n: NodeKey): string {
  return `${n.type}:${n.value}`;
}

function computeValueForHeroNode(
  heroDef: HeroDef,
  level: Level,
  lineup: Lineup,
  node: NodeKey,
  slotWeights: Record<string, number>
): number {
  const basePercent = percentToDecimal(heroDef.percents[level]);
  if (basePercent <= 0) return 0;

  let total = 0;
  for (const slot of lineup.slots) {
    if (!slot.heroId) continue;
    const weight = slotWeights[slot.heroId] ?? 0;
    if (weight <= 0) continue;
    const target = HERO_MAP.get(slot.heroId);
    if (!target) continue;

    const matches =
      node.type === "Role"
        ? target.role === node.value
        : target.element === node.value;

    const scale = matches ? 3 : 1;
    total += basePercent * scale * weight;
  }
  return total;
}

export function runOptimizationCore(
  input: OptimizerInput,
  progressCallback?: (value: number) => void
): OptimizationResult {
  const { ownedHeroes, lineup, nightmareLevel } = input;
  const nodeConfigs = buildNodeConfigForNightmare(nightmareLevel);
  const nodes = nodeConfigs.filter((n) => n.maxSlots > 0);
  const slotWeights = buildSlotWeights(lineup);
  const rankedHeroes = rankedHeroSet(lineup);

  // Map heroId -> OwnedHero
  const ownedMap = new Map<string, OwnedHero>();
  ownedHeroes.forEach((o) => {
    ownedMap.set(o.heroId, o);
  });

  const prepared: PreparedHero[] = [];

  for (const heroDef of HEROES) {
    const owned = ownedMap.get(heroDef.id);
    const level = getLevelForOwned(owned);
    if (!level) continue;

    const valueByNode = new Map<string, number>();
    let maxValue = 0;

    for (const node of nodes) {
      const matchesRole =
        node.key.type === "Role" && heroDef.role === node.key.value;
      const matchesElem =
        node.key.type === "Element" && heroDef.element === node.key.value;
      if (!matchesRole && !matchesElem) continue;

      const v = computeValueForHeroNode(
        heroDef,
        level,
        lineup,
        node.key,
        slotWeights
      );
      if (v > 0) {
        valueByNode.set(nodeKeyString(node.key), v);
        if (v > maxValue) maxValue = v;
      }
    }

    if (valueByNode.size === 0) continue;
    if (!owned) continue;

    prepared.push({ hero: heroDef, owned, valueByNode });
  }

  // Sort heroes by descending max potential value for better pruning
  prepared.sort((a, b) => {
    const maxA =
      Math.max(...Array.from(a.valueByNode.values())) || 0;
    const maxB =
      Math.max(...Array.from(b.valueByNode.values())) || 0;
    return maxB - maxA;
  });

  const capacityByNode = new Map<string, number>();
  for (const node of nodes) {
    capacityByNode.set(nodeKeyString(node.key), node.maxSlots);
  }

  let bestScore = 0;
  let bestAssignments: SlotAssignment[] = [];

  const maxValueSuffix: number[] = [];
  let running = 0;
  for (let i = prepared.length - 1; i >= 0; i -= 1) {
    const hero = prepared[i];
    const maxHero =
      Math.max(...Array.from(hero.valueByNode.values())) || 0;
    running += maxHero;
    maxValueSuffix[i] = running;
  }

  const currentAssignments: SlotAssignment[] = [];
  let deepestDepth = 0;
  function reportProgress(depth: number) {
    if (!progressCallback || prepared.length === 0) return;
    if (depth <= deepestDepth) return;
    deepestDepth = depth;
    const ratio = depth / Math.max(prepared.length, 1);
    progressCallback(ratio);
  }

  function dfs(idx: number, currentScore: number) {
    reportProgress(idx);
    if (idx >= prepared.length) {
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestAssignments = [...currentAssignments];
      }
      return;
    }

    const potential =
      currentScore + (maxValueSuffix[idx] ?? 0);
    if (potential <= bestScore) {
      return;
    }

    const prep = prepared[idx];

    // Option 1: skip
    dfs(idx + 1, currentScore);

    // Options 2: place hero in one of its nodes that has capacity
    for (const [keyStr, val] of prep.valueByNode.entries()) {
      const cap = capacityByNode.get(keyStr) ?? 0;
      if (cap <= 0) continue;

      capacityByNode.set(keyStr, cap - 1);
      const [type, value] = keyStr.split(":");
      const nodeKey: NodeKey = {
        type: type as NodeType,
        value: value as any
      };
      currentAssignments.push({ heroId: prep.hero.id, node: nodeKey });

      dfs(idx + 1, currentScore + val);

      currentAssignments.pop();
      capacityByNode.set(keyStr, cap);
    }
  }

  dfs(0, 0);
  if (progressCallback) {
    progressCallback(1);
  }

  // Now compute per hero buff values from final assignments
  const buffPerHero: Record<string, number> = {};
  for (const slot of lineup.slots) {
    if (slot.heroId) {
      buffPerHero[slot.heroId] = 0;
    }
  }

  for (const assign of bestAssignments) {
    const owned = ownedMap.get(assign.heroId);
    const heroDef = HERO_MAP.get(assign.heroId);
    const level = getLevelForOwned(owned);
    if (!owned || !heroDef || !level) continue;

    const base = percentToDecimal(heroDef.percents[level]);

    for (const slot of lineup.slots) {
      if (!slot.heroId) continue;
      const target = HERO_MAP.get(slot.heroId);
      if (!target) continue;

      const matches =
        assign.node.type === "Role"
          ? target.role === assign.node.value
          : target.element === assign.node.value;

      const scale = matches ? 3 : 1;
      const inc = base * scale;
      buffPerHero[slot.heroId] =
        (buffPerHero[slot.heroId] ?? 0) + inc;
    }
  }

  let totalPriorityBuff = 0;
  let overallBuff = 0;
  const hasRanks = rankedHeroes.size > 0;
  for (const slot of lineup.slots) {
    if (!slot.heroId) continue;
    const contribution = buffPerHero[slot.heroId] ?? 0;
    overallBuff += contribution;
    if (hasRanks) {
      if (slot.priorityRank != null) {
        totalPriorityBuff += contribution;
      }
    } else {
      totalPriorityBuff += contribution;
    }
  }

  return {
    assignments: bestAssignments,
    buffPerHero,
    totalPriorityBuff,
    overallBuff
  };
}
