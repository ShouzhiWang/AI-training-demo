"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import type { Viewer } from "@/app/_components/platform-app";
import { createClient } from "@/lib/supabase/client";

type Tab = "overview" | "students" | "projects" | "usage";
type Stats = {
  total_students: number;
  active_projects: number;
  ai_requests: number;
  completed_projects: number;
};
type Student = {
  id: string;
  name: string;
  email: string;
  projects: number;
  ai_usage: number;
  progress: number;
  last_activity: string | null;
};
type ProjectRow = {
  id: string;
  name: string;
  status: string;
  progress: number;
  updated_at: string;
  user_profiles?: { name?: string; email?: string } | null;
};
type UsageRow = {
  id: string;
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  created_at: string;
};

const emptyStats: Stats = {
  total_students: 0,
  active_projects: 0,
  ai_requests: 0,
  completed_projects: 0,
};

export default function AdminDashboard({ viewer }: { viewer: Viewer }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState(emptyStats);
  const [students, setStudents] = useState<Student[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const endpoints = ["stats", "students", "projects", "usage"];
      const responses = await Promise.all(
        endpoints.map((endpoint) => fetch(`${apiUrl}/admin/${endpoint}`, { headers })),
      );
      const payloads = await Promise.all(responses.map((response) => response.json()));
      const failedIndex = responses.findIndex((response) => !response.ok);
      if (failedIndex >= 0) {
        throw new Error(payloads[failedIndex].detail ?? "The educator dashboard could not load.");
      }
      setStats(payloads[0]);
      setStudents(payloads[1]);
      setProjects(payloads[2]);
      setUsage(payloads[3]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The educator dashboard could not load.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(task);
  }, [loadDashboard]);

  const filteredStudents = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(normalized) ||
        student.email.toLowerCase().includes(normalized),
    );
  }, [query, students]);

  const totalTokens = usage.reduce(
    (total, row) => total + row.input_tokens + row.output_tokens,
    0,
  );
  const totalCost = usage.reduce((total, row) => total + Number(row.cost), 0);
  const agentCounts = countBy(usage, (row) => row.agent);

  return (
    <section className="page-view admin-view">
      <header className="admin-header">
        <div>
          <span>EDUCATOR WORKSPACE</span>
          <h1>Learning at a glance.</h1>
          <p>Welcome, {firstName(viewer.name)}. Follow student progress and AI support without entering their workspace.</p>
        </div>
        <button className="button secondary" disabled={isLoading} onClick={() => void loadDashboard()}>
          <ArrowPathIcon /> {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <nav className="admin-tabs" aria-label="Educator dashboard views">
        {(["overview", "students", "projects", "usage"] as Tab[]).map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>
            {item === "usage" ? "AI analytics" : capitalize(item)}
          </button>
        ))}
      </nav>

      {error && (
        <div className="admin-notice" role="alert">
          <strong>Dashboard unavailable</strong>
          <span>{error}</span>
          <button onClick={() => void loadDashboard()}>Try again</button>
        </div>
      )}

      {isLoading ? (
        <div className="admin-loading"><ArrowPathIcon /><span>Gathering classroom activity…</span></div>
      ) : (
        <>
          {tab === "overview" && (
            <div className="admin-content">
              <div className="admin-stats">
                <AdminStat icon={<UserGroupIcon />} label="Students" value={stats.total_students} detail="enrolled learners" />
                <AdminStat icon={<FolderIcon />} label="Active projects" value={stats.active_projects} detail="currently in progress" />
                <AdminStat icon={<BoltIcon />} label="AI requests" value={stats.ai_requests} detail="guided interactions" />
                <AdminStat icon={<CheckCircleIcon />} label="Completed" value={stats.completed_projects} detail="finished projects" />
              </div>
              <div className="admin-overview-grid">
                <section className="admin-card">
                  <div className="admin-card-title"><div><span>STUDENT PROGRESS</span><h2>Who may need a nudge?</h2></div><button onClick={() => setTab("students")}>View all</button></div>
                  <StudentTable students={students.slice(0, 6)} />
                </section>
                <section className="admin-card admin-activity">
                  <div className="admin-card-title"><div><span>RECENT PROJECTS</span><h2>Classroom activity</h2></div></div>
                  {projects.slice(0, 6).map((project) => (
                    <div className="admin-activity-row" key={project.id}>
                      <span><FolderIcon /></span>
                      <div><strong>{project.name}</strong><small>{project.user_profiles?.name ?? project.user_profiles?.email ?? "Student"} · {relativeTime(project.updated_at)}</small></div>
                      <b>{project.progress}%</b>
                    </div>
                  ))}
                  {!projects.length && <p className="admin-empty">No project activity yet.</p>}
                </section>
              </div>
            </div>
          )}

          {tab === "students" && (
            <div className="admin-content">
              <section className="admin-card">
                <div className="admin-card-title">
                  <div><span>STUDENT DIRECTORY</span><h2>{students.length} learners</h2></div>
                  <label className="admin-search"><MagnifyingGlassIcon /><input aria-label="Search students" onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" value={query} /></label>
                </div>
                <StudentTable students={filteredStudents} />
              </section>
            </div>
          )}

          {tab === "projects" && (
            <div className="admin-content">
              <section className="admin-card">
                <div className="admin-card-title"><div><span>ALL PROJECTS</span><h2>Learning projects</h2></div></div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>Project</th><th>Student</th><th>Status</th><th>Progress</th><th>Updated</th></tr></thead>
                    <tbody>
                      {projects.map((project) => (
                        <tr key={project.id}>
                          <td><strong>{project.name}</strong></td>
                          <td>{project.user_profiles?.name ?? project.user_profiles?.email ?? "Student"}</td>
                          <td><span className={`status-chip ${project.status}`}>{project.status}</span></td>
                          <td><Progress value={project.progress} /></td>
                          <td>{relativeTime(project.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!projects.length && <p className="admin-empty">No projects have been created.</p>}
                </div>
              </section>
            </div>
          )}

          {tab === "usage" && (
            <div className="admin-content">
              <div className="usage-summary">
                <AdminStat icon={<BoltIcon />} label="Requests" value={usage.length} detail="latest 200 events" />
                <AdminStat icon={<ClockIcon />} label="Tokens" value={totalTokens.toLocaleString()} detail="input and output" />
                <AdminStat icon={<FolderIcon />} label="Estimated cost" value={`$${totalCost.toFixed(4)}`} detail="recorded provider cost" />
              </div>
              <div className="admin-overview-grid">
                <section className="admin-card">
                  <div className="admin-card-title"><div><span>AGENT ROUTING</span><h2>Requests by specialist</h2></div></div>
                  <div className="agent-breakdown">
                    {["planner", "coder", "reviewer", "supervisor"].map((agent) => (
                      <div key={agent}><span>{capitalize(agent)}</span><b>{agentCounts[agent] ?? 0}</b><i><em style={{ width: `${usage.length ? ((agentCounts[agent] ?? 0) / usage.length) * 100 : 0}%` }} /></i></div>
                    ))}
                  </div>
                </section>
                <section className="admin-card">
                  <div className="admin-card-title"><div><span>LATEST ACTIVITY</span><h2>AI requests</h2></div></div>
                  {usage.slice(0, 7).map((row) => (
                    <div className="usage-row" key={row.id}><span className={`agent-label ${row.agent}`}>{capitalize(row.agent)}</span><div><strong>{row.model}</strong><small>{(row.input_tokens + row.output_tokens).toLocaleString()} tokens</small></div><time>{relativeTime(row.created_at)}</time></div>
                  ))}
                  {!usage.length && <p className="admin-empty">AI usage appears after the first agent request.</p>}
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function StudentTable({ students }: { students: Student[] }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Student</th><th>Projects</th><th>AI assists</th><th>Progress</th><th>Last active</th></tr></thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td><div className="student-cell"><span>{initials(student.name)}</span><div><strong>{student.name || "Student"}</strong><small>{student.email}</small></div></div></td>
              <td>{student.projects}</td>
              <td>{student.ai_usage}</td>
              <td><Progress value={student.progress} /></td>
              <td>{student.last_activity ? relativeTime(student.last_activity) : "No activity"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!students.length && <p className="admin-empty">No students found.</p>}
    </div>
  );
}

function AdminStat({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number | string; detail: string }) {
  return <div className="admin-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></div>;
}

function Progress({ value }: { value: number }) {
  return <div className="admin-progress"><i><b style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></i><span>{value}%</span></div>;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Educator";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "ST";
}

function capitalize(value: string) {
  return value[0]?.toUpperCase() + value.slice(1);
}

function relativeTime(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  return formatter.format(Math.round(hours / 24), "day");
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const value = key(row);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
