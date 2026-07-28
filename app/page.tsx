"use client";

import { useMemo, useState } from "react";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  Bars3BottomLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CloudArrowUpIcon,
  CodeBracketIcon,
  CodeBracketSquareIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DocumentIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  FolderIcon,
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
  StarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type View = "studio" | "learn" | "projects";
type StudioTab = "preview" | "files" | "changes";

const promptStarters = [
  "Add a score and streak",
  "Make the feedback more encouraging",
  "Add an ocean habitat",
];

const habitats = [
  { id: "forest", name: "Forest", icon: "🌲", color: "#e7f4e6" },
  { id: "ocean", name: "Ocean", icon: "🌊", color: "#e4f3f8" },
  { id: "savanna", name: "Savanna", icon: "☀️", color: "#fff1ce" },
];

const animals = [
  { id: "fox", name: "Fox", icon: "🦊", habitat: "forest" },
  { id: "dolphin", name: "Dolphin", icon: "🐬", habitat: "ocean" },
  { id: "lion", name: "Lion", icon: "🦁", habitat: "savanna" },
];

export default function Home() {
  const [view, setView] = useState<View>("studio");
  const [studioTab, setStudioTab] = useState<StudioTab>("preview");
  const [message, setMessage] = useState("");
  const [stage, setStage] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState("fox");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("Choose the fox’s habitat");
  const [isPublished, setIsPublished] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const currentAnimal = useMemo(
    () => animals.find((animal) => animal.id === selectedAnimal) ?? animals[0],
    [selectedAnimal],
  );

  function sendPrompt(text = message) {
    if (!text.trim()) return;
    setMessage("");
    setStage(2);
  }

  function applyChange() {
    setStage(3);
    setStudioTab("preview");
  }

  function chooseHabitat(habitat: string) {
    if (habitat === currentAnimal.habitat) {
      setScore((value) => value + 10);
      setFeedback(`Great thinking! ${currentAnimal.name}s belong here.`);
      const nextIndex = (animals.findIndex((animal) => animal.id === currentAnimal.id) + 1) % animals.length;
      window.setTimeout(() => {
        setSelectedAnimal(animals[nextIndex].id);
        setFeedback(`Now find the ${animals[nextIndex].name.toLowerCase()}’s habitat`);
      }, 900);
    } else {
      setFeedback("Not quite — look for a clue in the habitat.");
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
        </nav>

        <div className="sidebar-section">
          <div className="section-label"><span>MY PROJECTS</span><button className="bare-icon-button" aria-label="New project"><PlusIcon /></button></div>
          <button className={view === "studio" ? "project-row active" : "project-row"} onClick={() => setView("studio")}>
            <span className="project-icon">🌎</span>
            <span><strong>Habitat Heroes</strong><small>Edited just now</small></span>
            <EllipsisHorizontalIcon className="row-more" />
          </button>
          <button className="project-row muted">
            <span className="project-icon lavender"><SparklesIcon /></span>
            <span><strong>My first idea</strong><small>Draft</small></span>
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="learning-card">
            <div className="learning-card-top"><span>Weekly spark</span><span>3 day streak</span></div>
            <div className="spark-row"><span>W</span><span className="filled">T</span><span className="filled">F</span><span className="today">S</span><span>S</span></div>
          </div>
          <button className="profile-row">
            <span className="avatar">AL</span>
            <span><strong>Alex Lee</strong><small>Student workspace</small></span>
            <ChevronDownIcon className="profile-chevron" />
          </button>
        </div>
      </aside>

      {view === "studio" && (
        <section className="workspace">
          <header className="topbar">
            <div className="title-group">
              <button className="back-button" onClick={() => setView("projects")} aria-label="Back to projects"><ChevronLeftIcon /></button>
              <div>
                <div className="project-title">Habitat Heroes <span className="status-dot">Saved</span></div>
                <div className="breadcrumb">Game prototype <span>/</span> main</div>
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
                <button className="icon-button small" aria-label="New conversation"><PlusIcon /></button>
              </div>

              <div className="chat-scroll">
                <div className="lesson-banner">
                  <span className="lesson-icon"><LightBulbIcon /></span>
                  <div><span>PROMPT TIP · 2 MIN</span><strong>Great prompts describe who, what, and why.</strong></div>
                  <button onClick={() => setView("learn")}>Review</button>
                </div>

                <div className="date-label">TODAY</div>
                <div className="user-message">
                  <p>I want a game where kindergarteners match animals with their habitats.</p>
                  <span>10:42 AM</span>
                </div>

                <div className="assistant-message">
                  <div className="message-avatar"><SparklesIcon /></div>
                  <div className="message-body">
                    <p>That’s a lovely idea. Before we build, let’s make sure every choice helps your learner.</p>
                    <div className="thinking-card">
                      <div className="thinking-title"><span>Game plan</span><span className="ready-tag">Ready</span></div>
                      <dl>
                        <div><dt>Name</dt><dd>Habitat Heroes</dd></div>
                        <div><dt>For</dt><dd>Ages 4–6</dd></div>
                        <div><dt>Learning goal</dt><dd>Connect animals to where they live</dd></div>
                        <div><dt>Player action</dt><dd>Choose an animal, then its habitat</dd></div>
                        <div><dt>Feedback</dt><dd>Gentle hints + celebration</dd></div>
                      </dl>
                    </div>
                    <p className="mentor-question">What would make a child want to try one more round?</p>
                  </div>
                </div>

                {stage === 1 && (
                  <div className="suggestion-block">
                    <span>TRY A FOLLOW-UP</span>
                    {promptStarters.map((prompt) => (
                      <button key={prompt} onClick={() => sendPrompt(prompt)}>{prompt}<ArrowUpRightIcon /></button>
                    ))}
                  </div>
                )}

                {stage >= 2 && (
                  <>
                    <div className="user-message compact">
                      <p>Add a score and streak so players feel progress.</p>
                      <span>10:44 AM</span>
                    </div>
                    <div className="assistant-message">
                      <div className="message-avatar"><SparklesIcon /></div>
                      <div className="message-body">
                        <p>Good instinct. A visible score rewards progress without interrupting play. I’ll add:</p>
                        <ul className="change-list">
                          <li><CheckCircleIcon /> 10 points for a correct match</li>
                          <li><CheckCircleIcon /> A friendly progress streak</li>
                          <li><CheckCircleIcon /> Encouraging, specific feedback</li>
                        </ul>
                        {stage === 2 && <button className="apply-button" onClick={applyChange}><SparklesIcon /> Apply 3 changes</button>}
                        {stage >= 3 && <div className="applied-note"><span><CheckIcon /></span><div><strong>Changes applied</strong><small>Saved as version 3 · just now</small></div><button onClick={() => setStudioTab("changes")}>View <ChevronRightIcon /></button></div>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="composer-wrap">
                <div className="composer">
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell Muse what you want to change…" onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendPrompt();
                    }
                  }} />
                  <div className="composer-footer">
                    <div><button className="composer-icon" title="Attach"><PaperClipIcon /></button><span>Plan first</span><button className="toggle on" aria-label="Plan first enabled"><i /></button></div>
                    <button className="send-button" onClick={() => sendPrompt()} aria-label="Send message"><ArrowUpIcon /></button>
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
                      {tab === "changes" && stage >= 3 && <span className="change-badge">3</span>}
                    </button>
                  ))}
                </div>
                <div className="device-actions"><button className="active" aria-label="Desktop preview"><ComputerDesktopIcon /></button><button aria-label="Mobile preview"><DevicePhoneMobileIcon /></button><span /><button aria-label="Refresh"><ArrowPathIcon /></button><button aria-label="Open preview"><ArrowTopRightOnSquareIcon /></button></div>
              </div>

              {studioTab === "preview" && (
                <div className="preview-stage">
                  <div className="browser-frame">
                    <div className="browser-bar"><div><i /><i /><i /></div><span>habitat-heroes.muse.site</span><span>⋮</span></div>
                    <div className="game">
                      <div className="game-header">
                        <div className="game-logo"><span>🌍</span><div><strong>Habitat Heroes</strong><small>Where does each animal belong?</small></div></div>
                        {stage >= 3 && <div className="game-score"><StarIcon /><div><small>SCORE</small><strong>{score}</strong></div><i /><div><small>STREAK</small><strong>{score > 0 ? "1 🔥" : "0"}</strong></div></div>}
                      </div>
                      <div className="game-progress"><span style={{ width: `${34 + score}%` }} /></div>
                      <div className="game-content">
                        <div className="round-label">ROUND 1 OF 3</div>
                        <h2>Where does the <em>{currentAnimal.name.toLowerCase()}</em> live?</h2>
                        <p>{feedback}</p>
                        <div className="animal-card"><span>{currentAnimal.icon}</span><strong>{currentAnimal.name}</strong><small>Tap a habitat below</small></div>
                        <div className="habitat-grid">
                          {habitats.map((habitat) => (
                            <button key={habitat.id} onClick={() => chooseHabitat(habitat.id)} style={{ background: habitat.color }}>
                              <span>{habitat.icon}</span><strong>{habitat.name}</strong>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="preview-footer"><span><i /> Preview is live</span><span>Last updated just now</span></div>
                </div>
              )}

              {studioTab === "files" && (
                <div className="files-view">
                  <div className="files-sidebar">
                    <span>PROJECT FILES</span>
                    <button className="active"><ChevronDownIcon /> <b>habitat-heroes</b></button>
                    <button><FolderIcon /> app</button>
                    <button><RectangleStackIcon /> components</button>
                    <button><CodeBracketIcon /> game.tsx</button>
                    <button><DocumentIcon /> styles.css</button>
                    <button><BookOpenIcon /> README.md</button>
                  </div>
                  <div className="code-card">
                    <div className="code-title"><span>game.tsx</span><span>Saved</span></div>
                    <pre><code>{`export function HabitatGame() {\n  const [score, setScore] = useState(0)\n\n  function checkMatch(animal, habitat) {\n    if (animal.habitat === habitat) {\n      setScore(score + 10)\n      celebrate("Great thinking!")\n    }\n  }\n\n  return <GameBoard onMatch={checkMatch} />\n}`}</code></pre>
                    <div className="code-explainer"><SparklesIcon /><p><strong>What this does</strong><br />This keeps track of the player’s score and celebrates every correct match.</p></div>
                  </div>
                </div>
              )}

              {studioTab === "changes" && (
                <div className="changes-view">
                  <div className="changes-header"><div><span className="github-mark"><CodeBracketSquareIcon /></span><div><strong>Version history</strong><small>Every change is saved — no Git knowledge needed.</small></div></div><button>Open in GitHub <ArrowTopRightOnSquareIcon /></button></div>
                  <div className="timeline">
                    <div className="timeline-item latest"><i /><div><span><strong>v3 · Add score and streak</strong><b>Current</b></span><p>3 files changed <em>+42</em> <del>−8</del></p><small>Created with Muse · just now</small></div><button aria-label="Version actions"><EllipsisHorizontalIcon /></button></div>
                    <div className="timeline-item"><i /><div><strong>v2 · Improve animal feedback</strong><p>2 files changed <em>+18</em> <del>−4</del></p><small>Created with Muse · 6 minutes ago</small></div><button>Restore</button></div>
                    <div className="timeline-item"><i /><div><strong>v1 · First playable version</strong><p>5 files changed <em>+126</em></p><small>Project created · 12 minutes ago</small></div><button>Restore</button></div>
                  </div>
                  <div className="github-card"><span className="github-mark dark"><CodeBracketSquareIcon /></span><div><strong>Backed up to GitHub</strong><p>Your work is safely synced to <b>alex-lee/habitat-heroes</b></p></div><span className="sync-status"><CloudArrowUpIcon /> Synced</span></div>
                </div>
              )}
            </section>
          </div>

          {showVersions && (
            <div className="popover versions-popover">
              <div><strong>Recent versions</strong><button onClick={() => setShowVersions(false)} aria-label="Close version history"><XMarkIcon /></button></div>
              <button onClick={() => { setStudioTab("changes"); setShowVersions(false); }}><i className="green-dot" /><span><strong>v3 · Score and streak</strong><small>Just now · Current</small></span></button>
              <button><i /><span><strong>v2 · Better feedback</strong><small>6 minutes ago</small></span></button>
              <button><i /><span><strong>v1 · First version</strong><small>12 minutes ago</small></span></button>
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
      {view === "projects" && <ProjectsView onOpen={() => setView("studio")} />}
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

function ProjectsView({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="page-view projects-view">
      <header className="projects-header"><div><span>Good afternoon, Alex</span><h1>What will you create today?</h1></div><button className="button primary"><PlusIcon />New project</button></header>
      <div className="project-hero">
        <div><span className="eyebrow">CONTINUE CREATING</span><h2>Habitat Heroes</h2><p>A matching game that helps young learners discover where animals live.</p><div className="hero-meta"><span>🌎 Game prototype</span><span>3 versions</span><span>Edited just now</span></div><button className="button primary" onClick={onOpen}>Open studio →</button></div>
        <div className="mini-game"><span className="mini-sun">☀</span><span className="mini-tree">♣</span><span className="mini-lion">🦁</span><span className="mini-wave">≈≈≈</span><b>Habitat Heroes</b></div>
      </div>
      <div className="section-title"><div><h2>Start with an idea</h2><p>Muse handles the setup. You focus on what you want to make.</p></div><button>View all templates <ArrowRightIcon /></button></div>
      <div className="template-grid">
        <button><span className="template-visual coral">🎮</span><div><strong>Game prototype</strong><p>Turn a learning idea into a playable game.</p><small>Popular · 10–15 min</small></div></button>
        <button><span className="template-visual blue"><Bars3BottomLeftIcon /></span><div><strong>Research story</strong><p>Explore a question and share what you find.</p><small>15–20 min</small></div></button>
        <button className="coming"><span className="template-visual green"><SparklesIcon /></span><div><strong>Start from scratch</strong><p>Describe anything you can imagine.</p><small>Coming soon</small></div></button>
      </div>
    </section>
  );
}
