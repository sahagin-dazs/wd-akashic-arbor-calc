import {
  HeroDef,
  Level,
  LEVELS,
  Lineup,
  NodeKey,
  OptimizationResult,
  OwnedHero,
  SlotAssignment
} from "../models/types";
import { HERO_MAP, HEROES } from "../models/heroes";
import { buildNodeConfigForNightmare } from "../models/nodeConfig";

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

interface PreparedHero {
  hero: HeroDef;
  owned: OwnedHero;
  valueByNode: Map<string, number>; // key stringified NodeKey
}

const FLOW_EPSILON = 1e-9;

function nodeKeyString(n: NodeKey): string {
  return `${n.type}:${n.value}`;
}

interface ExpandedSlot {
  node: NodeKey;
  nodeIndex: number;
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

function solveMaximumWeightMatching(
  weights: number[][],
  progressCallback?: (value: number) => void
) {
  const size = weights.length;
  if (size === 0) {
    return [];
  }

  const u = new Array<number>(size + 1).fill(0);
  const v = new Array<number>(size + 1).fill(0);
  const p = new Array<number>(size + 1).fill(0);
  const way = new Array<number>(size + 1).fill(0);

  for (let row = 1; row <= size; row += 1) {
    p[0] = row;
    const minv = new Array<number>(size + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(size + 1).fill(false);
    let col0 = 0;

    do {
      used[col0] = true;
      const row0 = p[col0];
      let delta = Number.POSITIVE_INFINITY;
      let col1 = 0;

      for (let col = 1; col <= size; col += 1) {
        if (used[col]) continue;
        const current = -(weights[row0 - 1]?.[col - 1] ?? 0) - u[row0] - v[col];
        if (current < minv[col]) {
          minv[col] = current;
          way[col] = col0;
        }
        if (minv[col] < delta) {
          delta = minv[col];
          col1 = col;
        }
      }

      for (let col = 0; col <= size; col += 1) {
        if (used[col]) {
          u[p[col]] += delta;
          v[col] -= delta;
        } else {
          minv[col] -= delta;
        }
      }

      col0 = col1;
    } while (p[col0] !== 0);

    do {
      const col1 = way[col0];
      p[col0] = p[col1];
      col0 = col1;
    } while (col0 !== 0);

    if (progressCallback) {
      const ratio = 0.2 + (row / size) * 0.75;
      progressCallback(Math.min(ratio, 0.95));
    }
  }

  const assignment = new Array<number>(size).fill(-1);
  for (let col = 1; col <= size; col += 1) {
    if (p[col] > 0) {
      assignment[p[col] - 1] = col - 1;
    }
  }
  return assignment;
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

  prepared.sort((a, b) => {
    const maxA = Math.max(...Array.from(a.valueByNode.values()), 0);
    const maxB = Math.max(...Array.from(b.valueByNode.values()), 0);
    return maxB - maxA;
  });

  const expandedSlots: ExpandedSlot[] = [];
  nodes.forEach((node, nodeIndex) => {
    for (let slotIndex = 0; slotIndex < node.maxSlots; slotIndex += 1) {
      expandedSlots.push({ node: node.key, nodeIndex });
    }
  });

  const dimension = Math.max(prepared.length, expandedSlots.length);
  const weights: number[][] = Array.from({ length: dimension }, () =>
    new Array<number>(dimension).fill(0)
  );

  for (let heroIndex = 0; heroIndex < prepared.length; heroIndex += 1) {
    const prep = prepared[heroIndex];
    for (let slotIndex = 0; slotIndex < expandedSlots.length; slotIndex += 1) {
      const value =
        prep.valueByNode.get(nodeKeyString(expandedSlots[slotIndex].node)) ?? 0;
      weights[heroIndex][slotIndex] = value;
    }
  }

  const assignment = solveMaximumWeightMatching(weights, progressCallback);

  const bestAssignments: SlotAssignment[] = [];
  for (let heroIndex = 0; heroIndex < prepared.length; heroIndex += 1) {
    const slotIndex = assignment[heroIndex];
    if (slotIndex < 0 || slotIndex >= expandedSlots.length) continue;
    const value = weights[heroIndex][slotIndex] ?? 0;
    if (value <= FLOW_EPSILON) continue;
    bestAssignments.push({
      heroId: prepared[heroIndex].hero.id,
      node: expandedSlots[slotIndex].node
    });
  }

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
