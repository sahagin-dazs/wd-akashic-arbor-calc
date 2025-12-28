export type TierRow = {
  id: string;
  label: string;
  color: string;
};

export type TierAssignments = Record<string, string>; // heroId -> rowId
export type TierOrder = Record<string, string[]>; // rowId -> ordered heroIds

export type TierData = {
  rows: TierRow[];
  assignments: TierAssignments;
  order?: TierOrder;
  linkedHeroes?: Array<{
    id: string;
    heroIds: string[];
  }>;
  notes?: string;
};

export type TierDocument = {
  id: string;
  title: string;
  data: TierData;
  voteTally?: number;
  comments?: Array<{
    id: string;
    author?: string;
    body: string;
    createdAt: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
};
