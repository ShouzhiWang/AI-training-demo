"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ChartBarSquareIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  GlobeAltIcon,
  HomeIcon,
  LightBulbIcon,
  LinkIcon,
  PaperClipIcon,
  PlusIcon,
  RectangleStackIcon,
  RocketLaunchIcon,
  ShareIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import StudentDashboard from "@/app/_components/student-dashboard";
import AdminDashboard from "@/app/_components/admin-dashboard";
import {
  buildPreviewDocument,
  demoProjectFiles,
  type ProjectFile,
  type ProjectVersion,
  type StudentProject,
} from "@/lib/projects";
import { createClient } from "@/lib/supabase/client";

type View = "studio" | "learn" | "projects" | "admin";
type StudioTab = "preview" | "files" | "changes";
type AgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: "supervisor" | "planner" | "coder" | "reviewer";
  suggestions?: string[];
  createdAt?: string;
};

export type Viewer = {
  id?: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
};

const promptStarters = [
  "Help me plan the next step",
  "Review the learning experience",
  "Suggest one useful improvement",
];

export default function PlatformApp({
  viewer,
  initialProjects,
}: {
  viewer: Viewer;
  initialProjects: StudentProject[];
}) {
  const [view, setView] = useState<View>("projects");
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState<StudentProject | null>(
    initialProjects[0] ?? null,
  );
  const [studioTab, setStudioTab] = useState<StudioTab>("preview");
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [message, setMessage] = useState("");
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentFileChanges, setAgentFileChanges] = useState(0);
  const [activeModel, setActiveModel] = useState(
    viewer.id ? "DeepSeek" : "Muse Demo",
  );
  const [projectVersions, setProjectVersions] = useState<ProjectVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const activeProject = selectedProject ?? projects[0] ?? null;
  const activeFile =
    projectFiles.find((file) => file.id === selectedFileId) ??
    projectFiles[0] ??
    null;
  const hasUnsavedChanges = Boolean(
    activeFile && activeFile.content !== draftContent,
  );
  const previewFiles = useMemo(
    () =>
      projectFiles.map((file) =>
        file.id === activeFile?.id ? { ...file, content: draftContent } : file,
      ),
    [activeFile?.id, draftContent, projectFiles],
  );
  const previewDocument = useMemo(
    () => buildPreviewDocument(previewFiles),
    [previewFiles],
  );
  const versionSummaries = useMemo(
    () => summarizeVersions(projectVersions),
    [projectVersions],
  );

  useEffect(() => {
    if (!viewer.id) return;
    let isCurrent = true;

    async function loadActiveModel() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/health`,
        );
        if (!response.ok) return;
        const payload = await response.json();
        if (isCurrent && typeof payload.model === "string") {
          setActiveModel(formatModelLabel(payload.model));
        }
      } catch {
        // The agent request will report a detailed connectivity error if used.
      }
    }

    void loadActiveModel();
    return () => {
      isCurrent = false;
    };
  }, [viewer.id]);

  const loadProjectVersions = useCallback(
    async (projectId: string) => {
      if (!viewer.id) {
        setProjectVersions([]);
        return;
      }
      setIsLoadingVersions(true);
      setVersionError(null);
      const { data, error } = await createClient()
        .from("project_versions")
        .select(
          "id, project_id, version, title, source, created_at, project_version_files(id, project_version_id, path, content, file_version)",
        )
        .eq("project_id", projectId)
        .order("version", { ascending: false });
      if (error) {
        setVersionError(error.message);
        setProjectVersions([]);
      } else {
        setProjectVersions((data ?? []) as ProjectVersion[]);
      }
      setIsLoadingVersions(false);
    },
    [viewer.id],
  );

  useEffect(() => {
    if (!activeProject) return;

    let isCurrent = true;

    async function loadProjectFiles() {
      setIsLoadingFiles(true);
      setFileError(null);

      if (!viewer.id) {
        const files = demoProjectFiles.map((file) => ({
          ...file,
          id: `${activeProject.id}-${file.path}`,
          project_id: activeProject.id,
        }));
        if (isCurrent) {
          setProjectFiles(files);
          setSelectedFileId(files[0]?.id ?? null);
          setDraftContent(files[0]?.content ?? "");
          setIsLoadingFiles(false);
        }
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("project_files")
        .select(
          "id, project_id, path, content, version, created_at, updated_at",
        )
        .eq("project_id", activeProject.id)
        .order("path", { ascending: true });

      if (!isCurrent) return;

      if (error) {
        setFileError(error.message);
        setProjectFiles([]);
        setSelectedFileId(null);
      } else {
        const files = (data ?? []) as ProjectFile[];
        const preferredFile =
          files.find((file) => file.path === "index.html") ?? files[0] ?? null;
        setProjectFiles(files);
        setSelectedFileId(preferredFile?.id ?? null);
        setDraftContent(preferredFile?.content ?? "");
      }
      setIsLoadingFiles(false);
    }

    void loadProjectFiles();
    const versionTask = window.setTimeout(
      () => void loadProjectVersions(activeProject.id),
      0,
    );
    return () => {
      isCurrent = false;
      window.clearTimeout(versionTask);
    };
  }, [activeProject, loadProjectVersions, viewer.id]);

  useEffect(() => {
    if (!activeProject) return;
    let isCurrent = true;

    async function loadConversation() {
      setIsLoadingConversation(true);
      setAgentMessages([]);
      setAgentSessionId(null);
      setAgentError(null);

      if (!viewer.id) {
        setIsLoadingConversation(false);
        return;
      }

      const supabase = createClient();
      const { data: sessions, error: sessionError } = await supabase
        .from("agent_sessions")
        .select("id")
        .eq("project_id", activeProject.id)
        .eq("user_id", viewer.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (!isCurrent) return;
      if (sessionError) {
        setAgentError(sessionError.message);
        setIsLoadingConversation(false);
        return;
      }

      const session = sessions?.[0];
      if (!session) {
        setIsLoadingConversation(false);
        return;
      }

      const { data: messages, error: messageError } = await supabase
        .from("agent_messages")
        .select("id, role, agent, content, suggestions, created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });

      if (!isCurrent) return;
      if (messageError) {
        setAgentError(messageError.message);
      } else {
        setAgentSessionId(session.id);
        setAgentMessages(
          (messages ?? [])
            .filter((item) => item.role !== "system")
            .map((item) => ({
              id: item.id,
              role: item.role === "student" ? "user" : "assistant",
              agent: item.agent ?? undefined,
              content: item.content,
              suggestions: item.suggestions ?? [],
              createdAt: item.created_at,
            })) as AgentMessage[],
        );
      }
      setIsLoadingConversation(false);
    }

    const task = window.setTimeout(() => void loadConversation(), 0);
    return () => {
      isCurrent = false;
      window.clearTimeout(task);
    };
  }, [activeProject, viewer.id]);

  function openProject(project: StudentProject) {
    setSelectedProject(project);
    setView("studio");
  }

  function addProject(project: StudentProject) {
    setProjects((current) => [project, ...current]);
    setSelectedProject(project);
  }

  function selectFile(file: ProjectFile) {
    setSelectedFileId(file.id);
    setDraftContent(file.content);
    setFileError(null);
  }

  async function saveActiveFile() {
    if (!activeFile || !activeProject || !hasUnsavedChanges) return;
    setIsSavingFile(true);
    setFileError(null);

    try {
      let savedFiles: ProjectFile[];

      if (viewer.id) {
        const { data, error } = await createClient().rpc(
          "save_project_changes",
          {
            p_project_id: activeProject.id,
            p_actor_id: viewer.id,
            p_changes: [{ path: activeFile.path, content: draftContent }],
            p_title: `Edit ${activeFile.path}`,
            p_source: "manual",
          },
        );
        if (error) throw new Error(error.message);
        savedFiles = (data ?? []) as ProjectFile[];

        const nextProject: StudentProject = {
          ...activeProject,
          status: "active",
          progress: Math.max(activeProject.progress, 45),
          updated_at: new Date().toISOString(),
        };
        setProjects((current) =>
          current.map((project) =>
            project.id === nextProject.id ? nextProject : project,
          ),
        );
      } else {
        const savedFile = {
          ...activeFile,
          content: draftContent,
          version: activeFile.version + 1,
          updated_at: new Date().toISOString(),
        };
        savedFiles = projectFiles.map((file) =>
          file.id === savedFile.id ? savedFile : file,
        );
      }

      const savedFile =
        savedFiles.find((file) => file.path === activeFile.path) ?? activeFile;
      setProjectFiles(savedFiles);
      setDraftContent(savedFile.content);
      setPreviewKey((current) => current + 1);
      await loadProjectVersions(activeProject.id);
    } catch (caughtError) {
      setFileError(
        caughtError instanceof Error
          ? caughtError.message
          : "Muse could not save this file. Please try again.",
      );
    } finally {
      setIsSavingFile(false);
    }
  }

  async function sendPrompt(text = message) {
    const prompt = text.trim();
    if (!prompt || !activeProject || isAgentThinking) return;
    setMessage("");
    setAgentError(null);
    setAgentMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: prompt },
    ]);
    setIsAgentThinking(true);

    try {
      if (!viewer.id) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        setAgentMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            agent: "planner",
            content:
              "I’ve turned that into a clear learning goal. Connect Supabase and the FastAPI service to let the Planner, Coder, and Reviewer work on the project files.",
            suggestions: [
              "Help me choose a learning goal",
              "Ask me one question at a time",
            ],
          },
        ]);
        return;
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please sign in again.");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/agent/chat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            project_id: activeProject.id,
            message: prompt,
            session_id: agentSessionId,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "Muse could not complete that request.");
      }

      setAgentSessionId(payload.session_id);
      if (payload.model) {
        setActiveModel(formatModelLabel(payload.model));
      }
      setAgentMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          agent: payload.agent,
          content: payload.message,
          suggestions: payload.suggestions ?? [],
        },
      ]);

      if (payload.file_updates?.length) {
        const updates = new Map<string, { content: string; version: number }>(
          payload.file_updates.map(
            (file: { path: string; content: string; version: number }) => [
              file.path,
              file,
            ],
          ),
        );
        setProjectFiles((current) =>
          current.map((file) => {
            const update = updates.get(file.path);
            return update
              ? {
                  ...file,
                  content: update.content,
                  version: update.version,
                  updated_at: new Date().toISOString(),
                }
              : file;
          }),
        );
        const activeUpdate = activeFile ? updates.get(activeFile.path) : null;
        if (activeUpdate) setDraftContent(activeUpdate.content);
        setAgentFileChanges((current) => current + payload.file_updates.length);
        setPreviewKey((current) => current + 1);
        setStudioTab("preview");
        await loadProjectVersions(activeProject.id);
      }
    } catch (caughtError) {
      setAgentError(
        caughtError instanceof Error
          ? caughtError.message
          : "Muse could not complete that request.",
      );
    } finally {
      setIsAgentThinking(false);
    }
  }

  function fillSuggestedReply(reply: string) {
    setMessage(reply);
    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(reply.length, reply.length);
    });
  }

  function startNewConversation() {
    setAgentSessionId(null);
    setAgentMessages([]);
    setAgentError(null);
    setMessage("");
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  async function restoreVersion(versionId: string) {
    if (!viewer.id || !activeProject || restoringVersionId) return;
    setRestoringVersionId(versionId);
    setVersionError(null);
    try {
      const { data, error } = await createClient().rpc(
        "restore_project_version",
        {
          p_version_id: versionId,
          p_actor_id: viewer.id,
        },
      );
      if (error) throw new Error(error.message);
      const restoredFiles = (data ?? []) as ProjectFile[];
      setProjectFiles(restoredFiles);
      const restoredActive =
        restoredFiles.find((file) => file.id === selectedFileId) ??
        restoredFiles[0] ??
        null;
      setSelectedFileId(restoredActive?.id ?? null);
      setDraftContent(restoredActive?.content ?? "");
      setPreviewKey((current) => current + 1);
      await loadProjectVersions(activeProject.id);
    } catch (caughtError) {
      setVersionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Muse could not restore this version.",
      );
    } finally {
      setRestoringVersionId(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => setView("projects")} role="button" tabIndex={0}>
          <span className="brand-mark">m</span>
          <span>muse</span>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === "projects" ? "nav-item active" : "nav-item"} onClick={() => setView("projects")}>
            <HomeIcon className="nav-icon" /> Projects
          </button>
          <button className={view === "learn" ? "nav-item active" : "nav-item"} onClick={() => setView("learn")}>
            <AcademicCapIcon className="nav-icon" /> Prompting 101
            <span className="nav-pill">3/5</span>
          </button>
          {viewer.role !== "student" && (
            <button className={view === "admin" ? "nav-item active" : "nav-item"} onClick={() => setView("admin")}>
              <ChartBarSquareIcon className="nav-icon" /> Educator dashboard
            </button>
          )}
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>MY PROJECTS</span>
            <button
              className="bare-icon-button"
              aria-label="Go to project templates"
              onClick={() => setView("projects")}
            >
              <PlusIcon />
            </button>
          </div>
          {projects.slice(0, 4).map((project) => (
            <button
              className={
                view === "studio" && activeProject?.id === project.id
                  ? "project-row active"
                  : "project-row"
              }
              key={project.id}
              onClick={() => openProject(project)}
            >
              <span className="project-icon"><SparklesIcon /></span>
              <span>
                <strong>{project.name}</strong>
                <small>{project.status === "draft" ? "Planning" : `${project.progress}% complete`}</small>
              </span>
              <EllipsisHorizontalIcon className="row-more" />
            </button>
          ))}
          {!projects.length && (
            <button className="project-row muted" onClick={() => setView("projects")}>
              <span className="project-icon lavender"><PlusIcon /></span>
              <span><strong>Create your first project</strong><small>Choose a template</small></span>
            </button>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="learning-card">
            <div className="learning-card-top"><span>Weekly spark</span><span>3 day streak</span></div>
            <div className="spark-row"><span>W</span><span className="filled">T</span><span className="filled">F</span><span className="today">S</span><span>S</span></div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="profile-row" type="submit" title="Sign out">
              <span className="avatar">{initials(viewer.name)}</span>
              <span><strong>{viewer.name}</strong><small>{roleLabel(viewer.role)} workspace</small></span>
              <ChevronDownIcon className="profile-chevron" />
            </button>
          </form>
        </div>
      </aside>

      {view === "studio" && (
        <section className="workspace">
          <header className="topbar">
            <div className="title-group">
              <button className="back-button" onClick={() => setView("projects")} aria-label="Back to projects"><ChevronLeftIcon /></button>
              <div>
                <div className="project-title">
                  {activeProject?.name ?? "Untitled project"}{" "}
                  <span className={hasUnsavedChanges ? "status-dot unsaved" : "status-dot"}>
                    {hasUnsavedChanges ? "Unsaved" : "Saved"}
                  </span>
                </div>
                <div className="breadcrumb">Educational game <span>/</span> main</div>
              </div>
            </div>
            <div className="top-actions">
              <button className="icon-button" onClick={() => setShowVersions(!showVersions)} aria-label="Version history"><ClockIcon /></button>
              <button className="button secondary" onClick={() => setShowShare(true)}><ShareIcon />Share</button>
              <button className="button primary" onClick={() => setIsPublished(true)}>{isPublished ? <><CheckIcon />Published</> : <><RocketLaunchIcon />Publish</>}</button>
            </div>
          </header>

          <div className="studio-grid">
            <section className="assistant-panel">
              <div className="panel-heading">
                <div><span className="ai-orb"><SparklesIcon /></span><strong>Muse</strong><span className="online-dot" /></div>
                <button className="icon-button small" aria-label="New conversation" onClick={startNewConversation}><PlusIcon /></button>
              </div>

              <div className="chat-scroll">
                <div className="lesson-banner">
                  <span className="lesson-icon"><LightBulbIcon /></span>
                  <div><span>PROMPT TIP · 2 MIN</span><strong>Great prompts describe who, what, and why.</strong></div>
                  <button onClick={() => setView("learn")}>Review</button>
                </div>

                {isLoadingConversation && (
                  <div className="conversation-loading">
                    <ArrowPathIcon /><span>Restoring this project’s conversation…</span>
                  </div>
                )}

                {!isLoadingConversation && !agentMessages.length && (
                  <div className="conversation-empty">
                    <span><SparklesIcon /></span>
                    <h3>What should we work on?</h3>
                    <p>This conversation belongs to {activeProject?.name ?? "this project"} and will be here when you return.</p>
                    <div className="suggestion-block">
                      <span>START WITH A DIRECTION</span>
                      {promptStarters.map((prompt) => (
                        <button key={prompt} onClick={() => void sendPrompt(prompt)}>{prompt}<ArrowUpRightIcon /></button>
                      ))}
                    </div>
                  </div>
                )}

                {agentMessages.length > 0 && <div className="date-label">PROJECT CONVERSATION</div>}

                {agentMessages.map((item, index) =>
                  item.role === "user" ? (
                    <div className="user-message compact" key={item.id}>
                      <p>{item.content}</p>
                      {item.createdAt && <span>{messageTime(item.createdAt)}</span>}
                    </div>
                  ) : (
                    <div className="assistant-message" key={item.id}>
                      <div className="message-avatar"><SparklesIcon /></div>
                      <div className="message-body agent-reply">
                        <span className={`agent-label ${item.agent ?? "supervisor"}`}>
                          {agentLabel(item.agent)}
                        </span>
                        <MarkdownMessage content={item.content} />
                        {index === agentMessages.length - 1 && Boolean(item.suggestions?.length) && (
                          <div className="reply-options" aria-label="Suggested replies">
                            <span>CHOOSE A REPLY OR WRITE YOUR OWN</span>
                            {item.suggestions?.map((suggestion) => (
                              <button key={suggestion} onClick={() => fillSuggestedReply(suggestion)}>
                                {suggestion}<ArrowUpRightIcon />
                              </button>
                            ))}
                            <button className="custom-reply" onClick={() => fillSuggestedReply("")}>
                              Write my own response
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ),
                )}
                {isAgentThinking && (
                  <div className="assistant-message agent-thinking">
                    <div className="message-avatar"><SparklesIcon /></div>
                    <div className="message-body">
                      <span className="agent-label supervisor">Supervisor</span>
                      <p>Muse is choosing the right specialist…</p>
                    </div>
                  </div>
                )}
                {agentFileChanges > 0 && (
                  <div className="applied-note agent-applied">
                    <span><CheckIcon /></span>
                    <div><strong>Project files updated</strong><small>{agentFileChanges} AI-assisted changes saved</small></div>
                    <button onClick={() => setStudioTab("changes")}>View <ChevronRightIcon /></button>
                  </div>
                )}
                {agentError && <p className="workspace-error agent-error" role="alert">{agentError}</p>}
              </div>

              <div className="composer-wrap">
                <div className="composer">
                  <textarea ref={composerRef} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Muse what you want to change…" onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt();
                    }
                  }} disabled={isAgentThinking || !activeProject} />
                  <div className="composer-footer">
                    <div><button className="composer-icon" title="Attach"><PaperClipIcon /></button><span>Plan first</span><button className="toggle on" aria-label="Plan first enabled"><i /></button></div>
                    <div className="composer-send">
                      <span className="model-chip" title={`Current AI model: ${activeModel}`}>
                        <SparklesIcon />
                        {activeModel}
                      </span>
                      <button className="send-button" disabled={isAgentThinking || !message.trim()} onClick={() => void sendPrompt()} aria-label="Send message"><ArrowUpIcon /></button>
                    </div>
                  </div>
                </div>
                <span className="composer-hint">Muse can make mistakes. Test your game before sharing.</span>
              </div>
            </section>

            <section className="canvas-panel">
              <div className="canvas-tabs">
                <div className="tab-list">
                  {(["preview", "files", "changes"] as StudioTab[]).map((tab) => (
                    <button key={tab} className={studioTab === tab ? "active" : ""} onClick={() => setStudioTab(tab)}>
                      {tab === "preview" ? <EyeIcon /> : tab === "files" ? <DocumentIcon /> : <ClockIcon />} {tab[0].toUpperCase() + tab.slice(1)}
                      {tab === "changes" && agentFileChanges > 0 && <span className="change-badge">{agentFileChanges}</span>}
                    </button>
                  ))}
                </div>
                <div className="device-actions"><button className="active" aria-label="Desktop preview"><ComputerDesktopIcon /></button><button aria-label="Mobile preview"><DevicePhoneMobileIcon /></button><span /><button aria-label="Refresh preview" onClick={() => setPreviewKey((current) => current + 1)}><ArrowPathIcon /></button><button aria-label="Open preview" disabled><ArrowTopRightOnSquareIcon /></button></div>
              </div>

              {studioTab === "preview" && (
                <div className="preview-stage">
                  <div className="browser-frame">
                    <div className="browser-bar"><div><i /><i /><i /></div><span>{projectSlug(activeProject?.name ?? "project")}.muse.local</span><span>⋮</span></div>
                    {isLoadingFiles ? (
                      <div className="workspace-loading"><ArrowPathIcon /><span>Loading project files…</span></div>
                    ) : projectFiles.length ? (
                      <iframe
                        className="project-preview-frame"
                        key={previewKey}
                        sandbox="allow-scripts"
                        srcDoc={previewDocument}
                        title={`${activeProject?.name ?? "Project"} preview`}
                      />
                    ) : (
                      <div className="workspace-empty">
                        <DocumentIcon />
                        <strong>No project files yet</strong>
                        <p>Create a new Educational Game project to scaffold HTML, CSS, and JavaScript.</p>
                      </div>
                    )}
                  </div>
                  <div className="preview-footer"><span><i /> Sandboxed preview is live</span><span>{hasUnsavedChanges ? "Showing unsaved changes" : "Files are saved"}</span></div>
                </div>
              )}

              {studioTab === "files" && (
                <div className="files-view">
                  <div className="files-sidebar">
                    <span>PROJECT FILES</span>
                    <div className="file-tree-root"><ChevronDownIcon /> <b>{projectSlug(activeProject?.name ?? "project")}</b></div>
                    {projectFiles.map((file) => (
                      <button
                        className={activeFile?.id === file.id ? "active" : ""}
                        key={file.id}
                        onClick={() => selectFile(file)}
                      >
                        <DocumentIcon /> {file.path}
                      </button>
                    ))}
                  </div>
                  <div className="code-card">
                    {isLoadingFiles ? (
                      <div className="workspace-loading"><ArrowPathIcon /><span>Loading project files…</span></div>
                    ) : activeFile ? (
                      <>
                        <div className="code-title">
                          <span>{activeFile.path}</span>
                          <div>
                            <small>Version {activeFile.version}</small>
                            <button
                              className="button primary"
                              disabled={!hasUnsavedChanges || isSavingFile}
                              onClick={saveActiveFile}
                            >
                              {isSavingFile ? "Saving…" : "Save file"}
                            </button>
                          </div>
                        </div>
                        <textarea
                          aria-label={`Edit ${activeFile.path}`}
                          className="code-editor"
                          onChange={(event) => setDraftContent(event.target.value)}
                          spellCheck={false}
                          value={draftContent}
                        />
                        <div className="code-explainer"><SparklesIcon /><p><strong>Live preview</strong><br />Your unsaved edits appear in Preview immediately. Save to keep a new file version.</p></div>
                      </>
                    ) : (
                      <div className="workspace-empty">
                        <DocumentIcon />
                        <strong>No editable files</strong>
                        <p>This project needs a workspace scaffold.</p>
                      </div>
                    )}
                    {fileError && <p className="workspace-error" role="alert">{fileError}</p>}
                  </div>
                </div>
              )}

              {studioTab === "changes" && (
                <div className="changes-view">
                  <div className="changes-header">
                    <div><span className="history-mark"><ClockIcon /></span><div><strong>Version history</strong><small>Real snapshots from manual saves and Muse changes.</small></div></div>
                  </div>
                  {isLoadingVersions ? (
                    <div className="workspace-loading"><ArrowPathIcon /><span>Loading saved versions…</span></div>
                  ) : versionSummaries.length ? (
                    <div className="timeline">
                      {versionSummaries.map((summary, index) => (
                        <div className={index === 0 ? "timeline-item latest" : "timeline-item"} key={summary.id}>
                          <i />
                          <div>
                            <span><strong>v{summary.version} · {summary.title}</strong>{index === 0 && <b>Current</b>}</span>
                            <p>{summary.filesChanged} {summary.filesChanged === 1 ? "file" : "files"} changed <em>+{summary.additions}</em> <del>−{summary.deletions}</del></p>
                            <small>{versionSourceLabel(summary.source)} · {relativeTime(summary.createdAt)}</small>
                          </div>
                          {index === 0 ? (
                            <span className="current-version-check"><CheckIcon /></span>
                          ) : (
                            <button disabled={Boolean(restoringVersionId)} onClick={() => void restoreVersion(summary.id)}>
                              {restoringVersionId === summary.id ? "Restoring…" : "Restore"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="history-empty"><ClockIcon /><strong>No saved versions yet</strong><p>Save a file or ask Muse to make a change. The complete project snapshot will appear here.</p></div>
                  )}
                  {versionError && <p className="workspace-error" role="alert">{versionError}</p>}
                </div>
              )}
            </section>
          </div>

          {showVersions && (
            <div className="popover versions-popover">
              <div><strong>Recent versions</strong><button onClick={() => setShowVersions(false)} aria-label="Close version history"><XMarkIcon /></button></div>
              {versionSummaries.slice(0, 3).map((summary, index) => (
                <button key={summary.id} onClick={() => { setStudioTab("changes"); setShowVersions(false); }}>
                  <i className={index === 0 ? "green-dot" : ""} />
                  <span><strong>v{summary.version} · {summary.title}</strong><small>{relativeTime(summary.createdAt)}{index === 0 ? " · Current" : ""}</small></span>
                </button>
              ))}
              {!versionSummaries.length && <p className="version-popover-empty">No saved versions yet.</p>}
              <button className="view-all" onClick={() => { setStudioTab("changes"); setShowVersions(false); }}>View all versions <ArrowRightIcon /></button>
            </div>
          )}

          {showShare && (
            <div className="modal-backdrop" onClick={() => setShowShare(false)}>
              <div className="share-modal" onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" onClick={() => setShowShare(false)} aria-label="Close share dialog"><XMarkIcon /></button>
                <span className="modal-icon"><ShareIcon /></span>
                <h2>Share your work</h2>
                <p>Invite a classmate or teacher to play and leave feedback.</p>
                <div className="link-box"><LinkIcon /><span>muse.site/p/habitat-heroes</span><button onClick={() => setShowShare(false)}>Copy link</button></div>
                <div className="share-options"><button><span><GlobeAltIcon /></span><strong>Anyone can play</strong><small>No account needed</small></button><button><span><RectangleStackIcon /></span><strong>Portfolio page</strong><small>Show your process</small></button></div>
              </div>
            </div>
          )}

          {isPublished && (
            <div className="publish-toast">
              <span><CheckIcon /></span><div><strong>Your game is live!</strong><small>habitat-heroes.muse.site</small></div><button onClick={() => setShowShare(true)}>View & share <ArrowTopRightOnSquareIcon /></button><button onClick={() => setIsPublished(false)} aria-label="Dismiss"><XMarkIcon /></button>
            </div>
          )}
        </section>
      )}

      {view === "learn" && <LearnView onContinue={() => setView("studio")} />}
      {view === "admin" && <AdminDashboard viewer={viewer} />}
      {view === "projects" && (
        <StudentDashboard
          projects={projects}
          viewer={viewer}
          onCreate={addProject}
          onOpen={openProject}
        />
      )}
    </main>
  );
}

function LearnView({ onContinue }: { onContinue: () => void }) {
  return (
    <section className="page-view learn-view">
      <header><div><span>PROMPTING 101</span><h1>Turn an idea into clear direction.</h1><p>You don’t need technical words. You need a clear goal and a curious mind.</p></div><div className="lesson-progress"><span>Lesson 3 of 5</span><i><b /></i></div></header>
      <div className="lesson-layout">
        <article className="lesson-main">
          <span className="eyebrow">THE PROMPT RECIPE</span>
          <h2>A useful prompt answers three simple questions.</h2>
          <div className="recipe-grid">
            <div><span>1</span><strong>Who is it for?</strong><p>“Kindergarten students”</p></div>
            <div><span>2</span><strong>What should they do?</strong><p>“Match animals to habitats”</p></div>
            <div><span>3</span><strong>Why does it matter?</strong><p>“Learn where animals live”</p></div>
          </div>
          <div className="prompt-example"><span>YOUR STRONG PROMPT</span><p>“Create a game for <mark>kindergarten students</mark> where they <mark>match animals to habitats</mark> so they can <mark>learn where animals live</mark>.”</p></div>
          <div className="lesson-actions"><button><ArrowLeftIcon />Previous</button><button className="button primary" onClick={onContinue}>Try it in the studio <ArrowRightIcon /></button></div>
        </article>
        <aside className="lesson-aside">
          <div className="coach-card"><span className="ai-orb large"><SparklesIcon /></span><h3>Muse’s coaching note</h3><p>A prompt is a starting point, not a test. You can improve it as you learn what your project needs.</p></div>
          <div className="course-list"><span>YOUR PATH</span><div className="done"><CheckIcon /> <p><strong>Ideas AI can help with</strong><small>Completed</small></p></div><div className="done"><CheckIcon /> <p><strong>Talk like a designer</strong><small>Completed</small></p></div><div className="current">3 <p><strong>The prompt recipe</strong><small>4 min</small></p></div><div>4 <p><strong>Review AI’s work</strong><small>5 min</small></p></div><div>5 <p><strong>Share and reflect</strong><small>3 min</small></p></div></div>
        </aside>
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST";
}

function roleLabel(role: Viewer["role"]) {
  return role[0].toUpperCase() + role.slice(1);
}

function formatModelLabel(model: string) {
  if (model === "muse-development-mentor") return "Muse Dev Mentor";
  if (/^deepseek-/i.test(model)) {
    return `DeepSeek ${model
      .replace(/^deepseek-/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())}`;
  }
  return model
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function agentLabel(agent?: AgentMessage["agent"]) {
  return agent ? agent[0].toUpperCase() + agent.slice(1) : "Muse";
}

type VersionSummary = {
  id: string;
  version: number;
  title: string;
  source: ProjectVersion["source"];
  createdAt: string;
  filesChanged: number;
  additions: number;
  deletions: number;
};

function summarizeVersions(versions: ProjectVersion[]): VersionSummary[] {
  return versions.map((version, index) => {
    const previous = versions[index + 1];
    const previousFiles = new Map(
      (previous?.project_version_files ?? []).map((file) => [file.path, file.content]),
    );
    const currentFiles = new Map(
      version.project_version_files.map((file) => [file.path, file.content]),
    );
    const paths = new Set([...previousFiles.keys(), ...currentFiles.keys()]);
    let filesChanged = 0;
    let additions = 0;
    let deletions = 0;

    for (const path of paths) {
      const before = previousFiles.get(path) ?? "";
      const after = currentFiles.get(path) ?? "";
      if (before === after) continue;
      filesChanged += 1;
      const lineChanges = countLineChanges(before, after);
      additions += lineChanges.additions;
      deletions += lineChanges.deletions;
    }

    return {
      id: version.id,
      version: version.version,
      title: version.title,
      source: version.source,
      createdAt: version.created_at,
      filesChanged,
      additions,
      deletions,
    };
  });
}

function countLineChanges(before: string, after: string) {
  const beforeCounts = lineCounts(before);
  const afterCounts = lineCounts(after);
  const lines = new Set([...beforeCounts.keys(), ...afterCounts.keys()]);
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    const previousCount = beforeCounts.get(line) ?? 0;
    const currentCount = afterCounts.get(line) ?? 0;
    additions += Math.max(0, currentCount - previousCount);
    deletions += Math.max(0, previousCount - currentCount);
  }
  return { additions, deletions };
}

function lineCounts(content: string) {
  const counts = new Map<string, number>();
  if (!content) return counts;
  for (const line of content.split("\n")) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

function versionSourceLabel(source: ProjectVersion["source"]) {
  if (source === "agent") return "Created with Muse";
  if (source === "restore") return "Restored snapshot";
  if (source === "initial") return "Project created";
  return "Manual save";
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

function messageTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MarkdownMessage({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const Heading = heading[1].length === 1 ? "h3" : "h4";
      blocks.push(<Heading key={`heading-${index}`}>{renderInlineMarkdown(heading[2])}</Heading>);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(
          <li key={`bullet-${index}`}>
            {renderInlineMarkdown(lines[index].trim().replace(/^[-*]\s+/, ""))}
          </li>,
        );
        index += 1;
      }
      blocks.push(<ul key={`list-${index}`}>{items}</ul>);
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(
          <li key={`number-${index}`}>
            {renderInlineMarkdown(lines[index].trim().replace(/^\d+[.)]\s+/, ""))}
          </li>,
        );
        index += 1;
      }
      blocks.push(<ol key={`ordered-${index}`}>{items}</ol>);
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={`quote-${index}`}>{renderInlineMarkdown(line.slice(2))}</blockquote>,
      );
      index += 1;
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isMarkdownBlock(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>{renderInlineMarkdown(paragraph.join(" "))}</p>,
    );
  }

  return <div className="markdown-message">{blocks}</div>;
}

function isMarkdownBlock(line: string) {
  return /^(#{1,3}\s+|[-*]\s+|\d+[.)]\s+|>\s+)/.test(line);
}

function renderInlineMarkdown(text: string) {
  const tokenPattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={index}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={index}>{token.slice(1, -1)}</code>;
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return <a href={link[2]} key={index} rel="noreferrer" target="_blank">{link[1]}</a>;
    }
    return token;
  });
}

function projectSlug(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "student-project"
  );
}
