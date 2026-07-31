"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  Bars3BottomLeftIcon,
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  FolderIcon,
  LightBulbIcon,
  PlusIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { StudentProject } from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";
import type { Viewer } from "@/app/_components/platform-app";

type Props = {
  projects: StudentProject[];
  viewer: Viewer;
  onCreate: (project: StudentProject) => void;
  onOpen: (project: StudentProject) => void;
};

export default function StudentDashboard({
  projects,
  viewer,
  onCreate,
  onOpen,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProjects = projects.filter(
    (project) => project.status === "active",
  ).length;
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((sum, project) => sum + project.progress, 0) /
          projects.length,
      )
    : 0;
  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (left, right) =>
            new Date(right.updated_at).getTime() -
            new Date(left.updated_at).getTime(),
        )
        .slice(0, 3),
    [projects],
  );

  function openCreate() {
    setError(null);
    setShowCreate(true);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const now = new Date().toISOString();
      let project: StudentProject;

      if (viewer.id) {
        const supabase = createClient();
        const { data, error: createError } = await supabase
          .from("projects")
          .insert({
            owner_id: viewer.id,
            name: name.trim(),
            description: idea.trim(),
            template: "educational_game",
            status: "draft",
            progress: 10,
          })
          .select(
            "id, owner_id, name, description, template, status, progress, created_at, updated_at",
          )
          .single();

        if (createError) throw createError;
        project = data as StudentProject;
      } else {
        project = {
          id: `demo-${Date.now()}`,
          owner_id: "demo-student",
          name: name.trim(),
          description: idea.trim(),
          template: "educational_game",
          status: "draft",
          progress: 10,
          created_at: now,
          updated_at: now,
        };
      }

      onCreate(project);
      setName("");
      setIdea("");
      setShowCreate(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Muse could not create the project. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  const featuredProject = recentProjects[0];

  return (
    <section className="page-view projects-view">
      <header className="projects-header">
        <div>
          <span>STUDENT DASHBOARD</span>
          <h1>Good to see you, {firstName(viewer.name)}.</h1>
          <p>Pick up an idea or start a new learning project.</p>
        </div>
        <button className="button primary" onClick={openCreate}>
          <PlusIcon /> New project
        </button>
      </header>

      <div className="dashboard-stats" aria-label="Learning overview">
        <DashboardStat
          icon={<FolderIcon />}
          label="Projects"
          value={String(projects.length)}
          detail={projects.length === 1 ? "idea in progress" : "ideas in progress"}
        />
        <DashboardStat
          icon={<BoltIcon />}
          label="Active"
          value={String(activeProjects)}
          detail="ready to keep building"
        />
        <DashboardStat
          icon={<ChartBarIcon />}
          label="Progress"
          value={`${averageProgress}%`}
          detail="average across projects"
        />
        <DashboardStat
          icon={<SparklesIcon />}
          label="AI assists"
          value="0"
          detail="tracking starts in Phase 4"
        />
      </div>

      {featuredProject ? (
        <div className="project-hero">
          <div>
            <span className="eyebrow">CONTINUE CREATING</span>
            <h2>{featuredProject.name}</h2>
            <p>{featuredProject.description || templateDescription(featuredProject)}</p>
            <div className="hero-meta">
              <span><PuzzlePieceIcon /> Educational game</span>
              <span>{featuredProject.progress}% planned</span>
              <span>{relativeTime(featuredProject.updated_at)}</span>
            </div>
            <button
              className="button primary"
              onClick={() => onOpen(featuredProject)}
            >
              Open project <ArrowRightIcon />
            </button>
          </div>
          <div className="mini-game" aria-hidden="true">
            <span className="mini-sun"><LightBulbIcon /></span>
            <span className="mini-tree"><AcademicCapIcon /></span>
            <span className="mini-lion"><PuzzlePieceIcon /></span>
            <span className="mini-wave"><SparklesIcon /></span>
            <b>{featuredProject.name}</b>
          </div>
        </div>
      ) : (
        <div className="dashboard-empty">
          <span><LightBulbIcon /></span>
          <div>
            <h2>Your first project starts with a question.</h2>
            <p>Choose the Educational Game template and tell Muse what students should learn.</p>
          </div>
          <button className="button primary" onClick={openCreate}>
            Create your first project
          </button>
        </div>
      )}

      <div className="dashboard-lower">
        <section>
          <div className="section-title">
            <div>
              <h2>Start with a template</h2>
              <p>Muse handles setup so you can focus on the learning idea.</p>
            </div>
          </div>
          <div className="template-grid phase-two-templates">
            <button onClick={openCreate}>
              <span className="template-visual coral"><PuzzlePieceIcon /></span>
              <div>
                <strong>Educational Game</strong>
                <p>Turn a learning goal into a simple, playable game.</p>
                <small>Available now · 10–15 min</small>
              </div>
            </button>
            <button className="coming" disabled>
              <span className="template-visual blue"><Bars3BottomLeftIcon /></span>
              <div>
                <strong>Market Research Report</strong>
                <p>Investigate an audience, question, or opportunity.</p>
                <small>Next template</small>
              </div>
            </button>
          </div>
        </section>

        <section className="recent-activity">
          <div className="section-title">
            <div>
              <h2>Recent activity</h2>
              <p>Your latest project updates.</p>
            </div>
          </div>
          <div className="activity-list">
            {recentProjects.length ? (
              recentProjects.map((project) => (
                <button key={project.id} onClick={() => onOpen(project)}>
                  <span><ClockIcon /></span>
                  <div>
                    <strong>{project.name}</strong>
                    <small>{statusLabel(project)} · {relativeTime(project.updated_at)}</small>
                  </div>
                  <ArrowRightIcon />
                </button>
              ))
            ) : (
              <p className="activity-empty">Create a project and its updates will appear here.</p>
            )}
          </div>
        </section>
      </div>

      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div
            className="project-create-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
          >
            <button
              className="modal-close"
              onClick={() => setShowCreate(false)}
              aria-label="Close project setup"
            >
              <XMarkIcon />
            </button>
            <span className="modal-icon"><PuzzlePieceIcon /></span>
            <p className="eyebrow">EDUCATIONAL GAME</p>
            <h2 id="create-project-title">What will your game teach?</h2>
            <p>Give Muse a clear name and one-sentence learning idea. You can refine both later.</p>
            <form onSubmit={createProject}>
              <label>
                <span>Project name</span>
                <input
                  autoFocus
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Fractions Quest"
                  required
                  value={name}
                />
              </label>
              <label>
                <span>Learning idea</span>
                <textarea
                  maxLength={500}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder="A game where students match fractions with pictures."
                  required
                  rows={4}
                  value={idea}
                />
              </label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="button primary" disabled={isCreating} type="submit">
                {isCreating ? "Creating project…" : "Create project"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardStat({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="dashboard-stat">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Student";
}

function templateDescription(project: StudentProject) {
  return project.template === "educational_game"
    ? "A learning game ready for planning with Muse."
    : "A research project ready for planning with Muse.";
}

function statusLabel(project: StudentProject) {
  if (project.status === "completed") return "Completed";
  if (project.status === "active") return "Building";
  return "Planning";
}

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}
