import type { NodeKey } from "../models/types";

const BASE_URL =
  typeof import.meta !== "undefined" ? import.meta.env.BASE_URL ?? "/" : "/";
const NORMALIZED_BASE = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
const IMAGE_BASE = `${NORMALIZED_BASE}avatars/`;

const NODE_IMAGE_MAP: Record<string, string> = {
  Fire: "Fire.png",
  Ice: "Ice.png",
  Electro: "Electro.png",
  Wind: "Wind.png",
  Xeno: "Xeno.png",
  Fighter: "Fighter.png",
  Mage: "Mage.png",
  Ranger: "Ranger.png",
  Support: "Support.png"
};

export function nodeImageSrc(node: NodeKey): string | null {
  const filename = NODE_IMAGE_MAP[node.value];
  if (!filename) return null;
  return `${IMAGE_BASE}${filename}`;
}
