import type { Element, NodeConfig, NodeKey, Role } from "./types";

export type NodeThreshold = [number, number, number];

export interface ThresholdConfig {
  key: NodeKey;
  thresholds: NodeThreshold;
  label: string;
}

function roleKey(value: Role): NodeKey {
  return { type: "Role", value };
}

function elementKey(value: Element): NodeKey {
  return { type: "Element", value };
}

export const NODE_CONFIGS: ThresholdConfig[] = [
  { key: elementKey("Xeno"), thresholds: [29, 53, 77], label: "Xeno" },
  { key: elementKey("Ice"), thresholds: [8, 32, 56], label: "Ice" },
  { key: elementKey("Fire"), thresholds: [0, 24, 48], label: "Fire" },
  { key: elementKey("Electro"), thresholds: [11, 35, 59], label: "Electro" },
  { key: elementKey("Wind"), thresholds: [14, 38, 62], label: "Wind" },
  { key: roleKey("Fighter"), thresholds: [17, 41, 65], label: "Fighter" },
  { key: roleKey("Mage"), thresholds: [20, 44, 68], label: "Mage" },
  { key: roleKey("Ranger"), thresholds: [23, 47, 71], label: "Ranger" },
  { key: roleKey("Support"), thresholds: [26, 50, 74], label: "Support" }
];

export const NODE_TREE_LAYOUT: NodeKey[][] = [
  [elementKey("Xeno")],
  [elementKey("Ice"), elementKey("Fire")],
  [elementKey("Electro"), elementKey("Wind")],
  [roleKey("Fighter"), roleKey("Mage")],
  [roleKey("Ranger"), roleKey("Support")]
];

export function nodeKeyId(key: NodeKey) {
  return `${key.type}:${key.value}`;
}

function slotsForLevel(level: number, thresholds: NodeThreshold) {
  const [first, second, third] = thresholds;
  if (level >= third) return 3;
  if (level >= second) return 2;
  if (level >= first) return 1;
  return 0;
}

export function buildNodeConfigForNightmare(
  nightmareLevel: number
): NodeConfig[] {
  return NODE_CONFIGS.map((config) => ({
    key: config.key,
    maxSlots: slotsForLevel(nightmareLevel, config.thresholds)
  }));
}

export function getNodeStatuses(nightmareLevel: number) {
  return NODE_CONFIGS.map((config) => {
    const unlocked = slotsForLevel(nightmareLevel, config.thresholds);
    const nextUnlock =
      unlocked >= 3 ? null : config.thresholds[unlocked] ?? null;
    return {
      ...config,
      unlocked,
      nextUnlock
    };
  });
}

export function formatNodeLabel(node: NodeKey) {
  const id = nodeKeyId(node);
  const match = NODE_CONFIGS.find(
    (config) => nodeKeyId(config.key) === id
  );
  if (match) return match.label;
  return node.type === "Role"
    ? `Role: ${node.value}`
    : `Element: ${node.value}`;
}
