export type LineupSlot = {
  id: string;
  heroId: string | null;
};

export type LineupFormat = "pve" | "pvp" | "gvg";

export type LineupData = {
  format: LineupFormat;
  slots: LineupSlot[];
  notes: string;
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
