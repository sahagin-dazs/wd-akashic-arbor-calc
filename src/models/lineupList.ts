export type LineupSlot = {
  id: string;
  heroId: string | null;
};

export type LineupFormat = "pve" | "pvp" | "gvg" | "guildboss" | "nightmare";

export type GuildBossData = {
  awakenedHeroId: string | null;
  argentSkins: Record<string, boolean>;
  skills: Record<string, string[]>;
  showDescriptions?: boolean;
};

export type LineupData = {
  format: LineupFormat;
  slots: LineupSlot[];
  notes: string;
  guildBoss?: GuildBossData;
};

export type LineupDocument = {
  id: string;
  title: string;
  data: LineupData;
  voteTally?: number;
  comments?: any[];
  createdAt?: string;
  updatedAt?: string;
};
