export interface RecordEntry {
  year: number;
  type: string;
  institution: string;
  name: string;
  decisionDate: string;
  effectiveDate: string;
  party: string;
  government: string;
}

export type StatCard = {
  title: string;
  value: string | number;
  description: string;
  trend?: "up" | "down" | "neutral";
};
