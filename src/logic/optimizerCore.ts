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

interface FlowEdge {
  to: number;
  rev: number;
  capacity: number;
  cost: number;
}

type Graph = FlowEdge[][];

interface AssignmentCandidate {
  nodeKey: string;
  nodeIndex: number;
  edgeIndex: number;
}

const FLOW_EPSILON = 1e-9;

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

  prepared.sort((a, b) => {
    const maxA = Math.max(...Array.from(a.valueByNode.values()), 0);
    const maxB = Math.max(...Array.from(b.valueByNode.values()), 0);
    return maxB - maxA;
  });

  const nodeIndexByKey = new Map<string, number>();
  nodes.forEach((node, index) => {
    nodeIndexByKey.set(nodeKeyString(node.key), index);
  });

  const source = 0;
  const heroOffset = 1;
  const nodeOffset = heroOffset + prepared.length;
  const sink = nodeOffset + nodes.length;
  const graph: Graph = Array.from({ length: sink + 1 }, () => []);
  const heroAssignments: AssignmentCandidate[][] = prepared.map(() => []);

  function addEdge(from: number, to: number, capacity: number, cost: number) {
    const forward: FlowEdge = {
      to,
      rev: graph[to].length,
      capacity,
      cost
    };
    const backward: FlowEdge = {
      to: from,
      rev: graph[from].length,
      capacity: 0,
      cost: -cost
    };
    graph[from].push(forward);
    graph[to].push(backward);
    return graph[from].length - 1;
  }

  prepared.forEach((prep, heroIndex) => {
    const heroVertex = heroOffset + heroIndex;
    addEdge(source, heroVertex, 1, 0);

    for (const [nodeKey, value] of prep.valueByNode.entries()) {
      const nodeIndex = nodeIndexByKey.get(nodeKey);
      if (nodeIndex == null) continue;
      const nodeVertex = nodeOffset + nodeIndex;
      const edgeIndex = addEdge(heroVertex, nodeVertex, 1, -value);
      heroAssignments[heroIndex].push({ nodeKey, nodeIndex, edgeIndex });
    }
  });

  nodes.forEach((node, index) => {
    addEdge(nodeOffset + index, sink, node.maxSlots, 0);
  });

  const maxAssignments = Math.min(
    prepared.length,
    nodes.reduce((sum, node) => sum + node.maxSlots, 0)
  );
  let completedAssignments = 0;

  while (completedAssignments < maxAssignments) {
    const dist = new Array<number>(graph.length).fill(Number.POSITIVE_INFINITY);
    const prevVertex = new Array<number>(graph.length).fill(-1);
    const prevEdge = new Array<number>(graph.length).fill(-1);
    const inQueue = new Array<boolean>(graph.length).fill(false);
    const queue: number[] = [source];
    let queueIndex = 0;

    dist[source] = 0;
    inQueue[source] = true;

    while (queueIndex < queue.length) {
      const from = queue[queueIndex++];
      inQueue[from] = false;

      if (!Number.isFinite(dist[from])) continue;

      for (let edgeIndex = 0; edgeIndex < graph[from].length; edgeIndex += 1) {
        const edge = graph[from][edgeIndex];
        if (edge.capacity <= 0) continue;

        const candidate = dist[from] + edge.cost;
        if (candidate >= dist[edge.to] - FLOW_EPSILON) continue;

        dist[edge.to] = candidate;
        prevVertex[edge.to] = from;
        prevEdge[edge.to] = edgeIndex;

        if (!inQueue[edge.to]) {
          queue.push(edge.to);
          inQueue[edge.to] = true;
        }
      }
    }

    if (!Number.isFinite(dist[sink]) || prevVertex[sink] === -1) {
      break;
    }

    if (dist[sink] >= -FLOW_EPSILON) {
      break;
    }

    for (let vertex = sink; vertex !== source; vertex = prevVertex[vertex]) {
      const from = prevVertex[vertex];
      const edgeIndex = prevEdge[vertex];
      const edge = graph[from][edgeIndex];
      edge.capacity -= 1;
      graph[vertex][edge.rev].capacity += 1;
    }

    completedAssignments += 1;
    if (progressCallback && maxAssignments > 0) {
      const ratio = 0.2 + (completedAssignments / maxAssignments) * 0.75;
      progressCallback(Math.min(ratio, 0.95));
    }
  }

  const bestAssignments: SlotAssignment[] = [];
  prepared.forEach((prep, heroIndex) => {
    for (const candidate of heroAssignments[heroIndex]) {
      const edge = graph[heroOffset + heroIndex][candidate.edgeIndex];
      if (edge.capacity > 0) continue;
      bestAssignments.push({
        heroId: prep.hero.id,
        node: nodes[candidate.nodeIndex].key
      });
      break;
    }
  });

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
