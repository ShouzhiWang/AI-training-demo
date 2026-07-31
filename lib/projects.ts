export type ProjectTemplate =
  | "educational_game"
  | "market_research_report";

export type ProjectStatus = "draft" | "active" | "completed";

export type StudentProject = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  template: ProjectTemplate;
  status: ProjectStatus;
  progress: number;
  created_at: string;
  updated_at: string;
};

export const demoProject: StudentProject = {
  id: "demo-habitat-heroes",
  owner_id: "demo-student",
  name: "Habitat Heroes",
  description:
    "A matching game that helps young learners discover where animals live.",
  template: "educational_game",
  status: "active",
  progress: 68,
  created_at: "2026-07-28T02:42:00.000Z",
  updated_at: "2026-07-31T05:42:00.000Z",
};

