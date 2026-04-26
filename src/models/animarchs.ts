import type { Rarity } from "./types";

export type AnimarchDef = {
  id: string;
  abbr: string;
  name: string;
  rarity: Rarity;
  imageKey: string;
};

export const ANIMARCHS: AnimarchDef[] = [
  {
    id: "animarch-bloody-shark",
    abbr: "Shark",
    name: "Bloody Shark",
    rarity: "Mythic",
    imageKey: "BloodyShark"
  },
  {
    id: "animarch-demon-knight",
    abbr: "DK",
    name: "Demon Knight",
    rarity: "Legendary",
    imageKey: "DemonKnight"
  },
  {
    id: "animarch-gorgon",
    abbr: "Gorgon",
    name: "Gorgon",
    rarity: "Legendary",
    imageKey: "Gorgon"
  },
  {
    id: "animarch-infernal-demon",
    abbr: "Infernal",
    name: "Infernal Demon",
    rarity: "Legendary",
    imageKey: "InfernalDemon"
  },
  {
    id: "animarch-raging-centaur",
    abbr: "Centaur",
    name: "Raging Centaur",
    rarity: "Legendary",
    imageKey: "RagingCentaur"
  }
];
