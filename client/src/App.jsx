import React from "react";
import ReactDOM from "react-dom";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  LogOut,
  Plus,
  Shield,
  Trash2,
  Users,
  MessageSquare,
  Send,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Timer,
  Play,
  Square,
  Clock
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./state/AuthContext.jsx";

const statuses = ["Todo", "In Progress", "Done"];
const priorities = ["Low", "Medium", "High"];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// Format seconds into HH:MM:SS
function formatSeconds(totalSecs) {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// Format seconds into readable "Xh Ym" string
function formatDuration(totalSecs) {
  if (!totalSecs || totalSecs === 0) return "0m";
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// Parse manual time input like "1h 30m", "45m", "2h" into seconds
function parseManualTime(input) {
  const hMatch = input.match(/(\d+)\s*h/i);
  const mMatch = input.match(/(\d+)\s*m/i);
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const m = mMatch ? parseInt(mMatch[1]) : 0;
  return (h * 3600) + (m * 60);
}

// ─── Portal Dropdown ─────────────────────────────────────────────────────────
// Renders children into document.body so parent overflow/transform never clips.
function PortalDropdown({ anchorRect, children, onClose }) {
  if (!anchorRect) return null;
  const DROPDOWN_WIDTH = 260;

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const style = {
    position: "fixed",
    top: anchorRect.bottom + 6,
    left: Math.max(8, anchorRect.right - DROPDOWN_WIDTH),
    width: DROPDOWN_WIDTH,
    zIndex: 9999,
  };
  return ReactDOM.createPortal(
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        className="custom-multiselect-dropdown inline-edit-dropdown"
        style={style}
      >
        {children}
      </div>
    </>,
    document.body
  );
}


function AuthPage() {
  const { login, signup, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Member"
  });
  const [error, setError] = useState("");

  if (user) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await signup(form);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Team Task Manager</p>
          <h1>Run projects with clear ownership.</h1>
          <p className="subtle">Create projects, assign work, and track overdue tasks from one role-aware dashboard.</p>
        </div>

        <div className="auth-card">
          <div className="segmented">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
          </div>

          <form onSubmit={submit} className="stack">
            {mode === "signup" && (
              <>
                <label>
                  Name
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label>
                  Select Role
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                    <option value="Member">Member</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </label>
              </>
            )}
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" type="submit">{mode === "login" ? "Login" : "Create account"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();

  const scrollToSection = useCallback((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${sectionId}`);
    }
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <FolderKanban size={28} />
          <div>
            <strong>TaskFlow</strong>
            <span>{user.role}</span>
          </div>
        </div>
        <nav>
          <a href="#dashboard" onClick={(e) => { e.preventDefault(); scrollToSection("dashboard"); }}><BarChart3 size={18} />Dashboard</a>
          <a href="#projects" onClick={(e) => { e.preventDefault(); scrollToSection("projects"); }}><Users size={18} />Projects</a>
          <a href="#tasks" onClick={(e) => { e.preventDefault(); scrollToSection("tasks"); }}><ClipboardList size={18} />Tasks</a>
          {user.role === "Admin" && (
            <>
              <a href="#directory" onClick={(e) => { e.preventDefault(); scrollToSection("directory"); }}><Users size={18} />User Directory</a>
              <a href="#audit" onClick={(e) => { e.preventDefault(); scrollToSection("audit"); }}><Shield size={18} />Audit Logs</a>
            </>
          )}
          <a href="#calendar" onClick={(e) => { e.preventDefault(); scrollToSection("calendar"); }}><CalendarClock size={18} />Task Calendar</a>
        </nav>
        <button className="ghost logout" onClick={logout}><LogOut size={18} />Logout</button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <article className={cx("stat", tone)}>
      <Icon size={24} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Dashboard({ summary }) {
  return (
    <section id="dashboard" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Work overview</h2>
        </div>
      </div>
      <div className="stats-grid">
        <Stat icon={ClipboardList} label="Total tasks" value={summary?.totalTasks || 0} tone="blue" />
        <Stat icon={CalendarClock} label="Overdue" value={summary?.overdueCount || 0} tone="red" />
        <Stat icon={CheckCircle2} label="Done" value={summary?.byStatus?.Done || 0} tone="green" />
        <Stat icon={Shield} label="In progress" value={summary?.byStatus?.["In Progress"] || 0} tone="amber" />
      </div>
    </section>
  );
}

function Projects({ projects, users, currentUser, onUpdateMembers, onCreateProject, onDeleteProject }) {
  const [form, setForm] = useState({ name: "", description: "", members: [] });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeProjectDropdownId, setActiveProjectDropdownId] = useState(null);
  const [dropdownAnchorRect, setDropdownAnchorRect] = useState(null);
  const triggerRefs = useRef({});
  const canCreateProject = currentUser.role === "Admin" || currentUser.role === "Manager";

  const submit = async (event) => {
    event.preventDefault();
    await onCreateProject(form);
    setForm({ name: "", description: "", members: [] });
    setDropdownOpen(false);
  };

  return (
    <section id="projects" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Projects</p>
          <h2>Team spaces</h2>
        </div>
      </div>
      {canCreateProject && (
        <form className="project-form" onSubmit={submit}>
          <div className="project-form-inputs">
            <input placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          
          <div className="custom-multiselect-container">
            <button 
              type="button" 
              className="custom-multiselect-trigger" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {form.members.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Select Members</span>
                  <span className={`trigger-arrow ${dropdownOpen ? "open" : ""}`}>▼</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-primary)" }}>
                      Selected Members ({form.members.length})
                    </span>
                    <span className={`trigger-arrow ${dropdownOpen ? "open" : ""}`}>▼</span>
                  </div>
                  <div className="selected-pills-container" style={{ display: "flex", flexWrap: "wrap", gap: "4px", overflowY: "auto", flexGrow: 1, paddingRight: "4px" }}>
                    {form.members.map((memberId) => {
                      const u = users.find(user => user._id === memberId);
                      if (!u) return null;
                      return (
                        <span 
                          key={memberId} 
                          className="selected-member-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm({ ...form, members: form.members.filter(id => id !== memberId) });
                          }}
                          title="Click to remove member"
                        >
                          {u.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </button>

            {dropdownOpen && (
              <>
                <div className="multiselect-overlay" onClick={() => setDropdownOpen(false)} />
                <div className="custom-multiselect-dropdown">
                  {users.map((u) => {
                    const isSelected = form.members.includes(u._id);
                    return (
                      <label key={u._id} className={`multiselect-option ${isSelected ? "selected" : ""}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                            let updated;
                            if (isSelected) {
                              updated = form.members.filter(id => id !== u._id);
                            } else {
                              updated = [...form.members, u._id];
                            }
                            setForm({ ...form, members: updated });
                          }}
                        />
                        <div className="option-user-info">
                          <span className="user-name">{u.name}</span>
                          <span className="user-role-pipe">|</span>
                          <span className="user-role">{u.role}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          <button className="primary" type="submit"><Plus size={17} />Project</button>
        </form>
      )}
      <div className="project-grid">
        {projects.map((project) => {
          const isOwner = String(project.owner?._id || project.owner) === String(currentUser.id);
          const canManageMembers = currentUser.role === "Admin" || isOwner;

          return (
            <article className="card" key={project._id}>
              <div className="card-head">
                <h3>{project.name}</h3>
                <span>{project.taskCount} tasks</span>
              </div>
              <p>{project.description || "No description yet."}</p>
              
              {(() => {
                const total = project.taskCount || 0;
                const completed = project.completedCount || 0;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                return (
                  <div className="project-progress">
                    <div className="progress-label">
                      <span>Progress</span>
                      <strong>{percentage}% ({completed}/{total})</strong>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {project.totalLoggedSeconds > 0 && (
                <div className="project-time-chip">
                  <Clock size={11} />
                  {formatDuration(project.totalLoggedSeconds)} logged
                </div>
              )}
              
              <div className="project-members-section">
                <div className="avatars">
                  {project.members?.map((member) => (
                    <span key={member._id} title={`${member.name} (${member.role})`}>
                      {member.name.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </div>
                
                {canManageMembers && (
                  <div className="inline-members-edit" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div className="inline-members-edit-container">
                      <button
                        type="button"
                        className="members-toggle-trigger"
                        ref={(el) => { triggerRefs.current[project._id] = el; }}
                        onClick={() => {
                          if (activeProjectDropdownId === project._id) {
                            setActiveProjectDropdownId(null);
                            setDropdownAnchorRect(null);
                          } else {
                            const el = triggerRefs.current[project._id];
                            if (el) setDropdownAnchorRect(el.getBoundingClientRect());
                            setActiveProjectDropdownId(project._id);
                          }
                        }}
                      >
                        <span>⚙ Edit Workspace</span>
                        <span className={`trigger-arrow ${activeProjectDropdownId === project._id ? "open" : ""}`}>▼</span>
                      </button>

                      {activeProjectDropdownId === project._id && (
                        <PortalDropdown
                          anchorRect={dropdownAnchorRect}
                          onClose={() => { setActiveProjectDropdownId(null); setDropdownAnchorRect(null); }}
                        >
                          {users.map((u) => {
                            const isAlreadyMember = project.members.some((m) => m._id === u._id);
                            const isOwner = String(project.owner?._id || project.owner) === String(u._id);
                            return (
                              <label
                                key={u._id}
                                className={`multiselect-option ${isAlreadyMember ? "selected" : ""} ${isOwner ? "owner-option" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAlreadyMember}
                                  disabled={isOwner}
                                  onChange={() => {
                                    const currentMembers = project.members.map((m) => m._id);
                                    let updatedMembers;
                                    if (isAlreadyMember) {
                                      if (isOwner) return;
                                      updatedMembers = currentMembers.filter((m) => m !== u._id);
                                    } else {
                                      updatedMembers = [...currentMembers, u._id];
                                    }
                                    onUpdateMembers(project._id, updatedMembers);
                                  }}
                                />
                                <div className="option-user-info">
                                  <span className="user-name">{u.name}</span>
                                  <span className="user-role-pipe">|</span>
                                  <span className="user-role">{u.role}</span>
                                  {isOwner && <span className="owner-badge">Owner</span>}
                                </div>
                              </label>
                            );
                          })}
                        </PortalDropdown>
                      )}
                    </div>
                    <button 
                      className="delete-btn" 
                      title="Delete Project"
                      onClick={() => onDeleteProject(project._id)}
                      style={{ height: "30px", width: "30px" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Tasks({ tasks, projects, users, currentUser, onCreateTask, onUpdateStatus, onDeleteTask, onOpenComments }) {
  const [form, setForm] = useState({
    title: "",
    project: "",
    assignee: "",
    dueDate: "",
    priority: "Medium"
  });

  const canCreateTask = currentUser.role === "Admin" || currentUser.role === "Manager";

  const projectMembers = useMemo(() => {
    const project = projects.find((item) => item._id === form.project);
    return project?.members || users;
  }, [form.project, projects, users]);

  const submit = async (event) => {
    event.preventDefault();
    await onCreateTask(form);
    setForm({ title: "", project: "", assignee: "", dueDate: "", priority: "Medium" });
  };

  return (
    <section id="tasks" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Tasks</p>
          <h2>Assignments</h2>
        </div>
      </div>
      {canCreateTask && (
        <form className="task-form" onSubmit={submit}>
          <div className="task-form-group">
            <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value, assignee: "" })} required>
              <option value="">Select Project</option>
              {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
            </select>
          </div>
          <div className="task-form-group">
            <select value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} required>
              <option value="">Select Assignee</option>
              {projectMembers.map((user) => <option key={user._id} value={user._id}>{user.name}{"\u00A0\u00A0|\u00A0\u00A0"}{user.role}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
          </div>
          <div className="task-form-group">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
            <button className="primary" type="submit"><Plus size={17} />Task</button>
          </div>
        </form>
      )}
      <div className="task-list">
        {tasks.map((task) => {
          const isAssignee = String(task.assignee?._id || task.assignee) === String(currentUser.id);
          const project = projects.find((p) => p._id === (task.project?._id || task.project));
          const isProjectMember = project?.members?.some((m) => String(m._id || m) === String(currentUser.id));
          const hasCommentAccess = currentUser.role === "Admin" || isProjectMember;

          // Role controls
          const isDetailsManager = currentUser.role === "Admin" || (currentUser.role === "Manager" && isProjectMember);
          const isStatusOnly = isAssignee && isProjectMember;
          const canEditStatus = isDetailsManager || isStatusOnly;

          return (
            <article className="task-row" key={task._id}>
              <div 
                className={cx("task-info-block", hasCommentAccess && "clickable")}
                onClick={() => hasCommentAccess && onOpenComments(task)}
                title={hasCommentAccess ? "Click to view comments & activity feed" : "Only project members can view comments"}
              >
                <div className="task-title-row">
                  {hasCommentAccess && <MessageSquare size={14} className="comment-icon-indicator" />}
                  <strong>{task.title}</strong>
                  {task.totalLoggedSeconds > 0 && (
                    <span className="task-time-badge">
                      <Clock size={10} />
                      {formatDuration(task.totalLoggedSeconds)}
                    </span>
                  )}
                </div>
                <span>{task.project?.name} • Assigned to: {task.assignee?.name} • Due {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
              <span className={cx("pill", task.priority.toLowerCase())}>{task.priority}</span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select 
                  value={task.status} 
                  disabled={!canEditStatus}
                  onChange={(e) => onUpdateStatus(task._id, e.target.value)}
                  style={{ flexGrow: 1 }}
                >
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                {isDetailsManager && (
                  <button 
                    className="delete-btn" 
                    title="Delete Task"
                    onClick={() => onDeleteTask(task._id)}
                    style={{ 
                      height: "36px", 
                      width: "36px",
                      flexShrink: 0
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CommentsDrawer({
  isOpen,
  task,
  comments,
  commentText,
  setCommentText,
  loading,
  error,
  onSubmit,
  onClose,
  // Time tracking props
  timeLogs,
  loadingTimeLogs,
  timerRunning,
  timerSeconds,
  timerNote,
  setTimerNote,
  onStartTimer,
  onStopTimer,
  onLogManualTime,
  canLogTime
}) {
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState("");
  const [showTimeLogs, setShowTimeLogs] = useState(true);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleManualLog = () => {
    const secs = parseManualTime(manualInput);
    if (!secs || secs < 60) {
      setManualError("Enter a valid time e.g. \"1h 30m\" or \"45m\" (min 1 minute)");
      return;
    }
    setManualError("");
    onLogManualTime(secs, timerNote);
    setManualInput("");
  };

  const totalLogged = timeLogs.reduce((sum, l) => sum + l.duration, 0);

  if (!task) return null;

  return (
    <>
      <div 
        className={cx("comments-drawer-backdrop", isOpen && "open")} 
        onClick={onClose}
      />
      <aside className={cx("comments-drawer", isOpen && "open")}>
        <div className="drawer-header">
          <div className="drawer-header-title">
            <p className="eyebrow">Task Context</p>
            <h2>{task.title}</h2>
            <span className="task-meta">
              Project: <strong>{task.project?.name || "N/A"}</strong> • Assignee: <strong>{task.assignee?.name || "N/A"}</strong>
            </span>
          </div>
          <button className="close-drawer-btn" onClick={onClose} title="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* ─── TIME TRACKING PANEL ─────────────────────────────── */}
        {canLogTime && (
          <div className="timer-panel">
            <div className="timer-panel-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Timer size={14} className="timer-icon" />
                <span className="timer-panel-title">Time Tracker</span>
              </div>
              {totalLogged > 0 && (
                <span className="time-total-bar">
                  <Clock size={10} /> Total: {formatDuration(totalLogged)}
                </span>
              )}
            </div>

            {/* Stopwatch */}
            <div className={cx("timer-display", timerRunning && "running")}>
              {formatSeconds(timerSeconds)}
            </div>

            <div className="timer-controls">
              {!timerRunning ? (
                <button className="timer-start-btn" onClick={onStartTimer}>
                  <Play size={13} fill="currentColor" /> Start Timer
                </button>
              ) : (
                <button className="timer-stop-btn" onClick={() => onStopTimer(timerNote)}>
                  <Square size={13} fill="currentColor" /> Stop & Save
                </button>
              )}
            </div>

            {/* Note field */}
            <input
              className="timer-note-input"
              placeholder="Optional note (e.g. Fixed login bug)..."
              value={timerNote}
              onChange={(e) => setTimerNote(e.target.value)}
              maxLength={200}
            />

            {/* Manual entry row */}
            <div className="manual-time-row">
              <input
                className="manual-time-input"
                placeholder='e.g. "1h 30m" or "45m"'
                value={manualInput}
                onChange={(e) => { setManualInput(e.target.value); setManualError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleManualLog()}
              />
              <button className="manual-log-btn" onClick={handleManualLog}>
                Log Time
              </button>
            </div>
            {manualError && <p className="timer-error">{manualError}</p>}
          </div>
        )}

        {/* ─── ACTIVITY & COMMENTS FEED ─────────────────────────── */}
        <div className="drawer-comments-feed">
          {loading ? (
            <div className="comments-empty-state">
              <span className="spinner">⌛</span>
              <p>Loading comments...</p>
            </div>
          ) : error ? (
            <div className="comments-empty-state">
              <span className="error">⚠️</span>
              <p>{error}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty-state">
              <MessageSquare size={36} />
              <p>No comments or activity yet.</p>
              <span style={{ fontSize: "12px", opacity: 0.7 }}>Be the first to post a status update!</span>
            </div>
          ) : (
            comments.map((comment) => {
              const initials = comment.author?.name
                ? comment.author.name.slice(0, 2).toUpperCase()
                : "??";
              return (
                <article className="comment-bubble-wrapper" key={comment._id}>
                  <div className="comment-avatar" title={`${comment.author?.name} (${comment.author?.role})`}>
                    {initials}
                  </div>
                  <div className="comment-content-box">
                    <div className="comment-header">
                      <span className="comment-author-name">
                        {comment.author?.name || "Unknown"}
                        <span className={cx("role-badge-small", comment.author?.role?.toLowerCase())}>
                          {comment.author?.role || "Member"}
                        </span>
                      </span>
                      <span className="comment-time">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="comment-body">{comment.content}</p>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* ─── TIME LOG HISTORY ─────────────────────────────────── */}
        {timeLogs.length > 0 && (
          <div className="time-log-section">
            <button 
              className="time-log-toggle"
              onClick={() => setShowTimeLogs(!showTimeLogs)}
            >
              <Clock size={13} />
              Time Log ({timeLogs.length} {timeLogs.length === 1 ? "entry" : "entries"} · {formatDuration(totalLogged)} total)
              <span className={`trigger-arrow ${showTimeLogs ? "open" : ""}`} style={{ fontSize: "9px" }}>▼</span>
            </button>
            {showTimeLogs && (
              <div className="time-log-list">
                {loadingTimeLogs ? (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>Loading...</p>
                ) : (
                  timeLogs.map((log) => {
                    const initials = log.user?.name ? log.user.name.slice(0, 2).toUpperCase() : "??";
                    return (
                      <div className="time-log-entry" key={log._id}>
                        <div className="time-log-avatar" title={`${log.user?.name} (${log.user?.role})`}>
                          {initials}
                        </div>
                        <div className="time-log-body">
                          <div className="time-log-meta">
                            <span className="time-log-user">{log.user?.name || "Unknown"}</span>
                            <span className="time-log-duration">{formatDuration(log.duration)}</span>
                          </div>
                          {log.note && <p className="time-log-note">{log.note}</p>}
                          <span className="time-log-date">{formatDate(log.loggedAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        <div className="drawer-footer">
          <form onSubmit={onSubmit} className="comment-form">
            <textarea
              className="comment-input"
              placeholder="Add a status update, question, or note..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              required
            />
            <div className="comment-submit-row">
              <button 
                type="submit" 
                className="comment-submit-btn"
                disabled={!commentText.trim()}
              >
                <Send size={14} />
                Post Note
              </button>
            </div>
          </form>
        </div>
      </aside>
    </>
  );
}

function Calendar({ tasks, currentUser, onOpenComments }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthYearString = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  const cells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const totalDays = new Date(year, month + 1, 0).getDate();
    const totalDaysPrev = new Date(year, month, 0).getDate();

    const result = [];

    // Prev Month Overflows
    for (let i = startOfWeek - 1; i >= 0; i--) {
      result.push({
        date: new Date(year, month - 1, totalDaysPrev - i),
        isCurrentMonth: false
      });
    }

    // Current Month Days
    for (let i = 1; i <= totalDays; i++) {
      result.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next Month Overflows (fit exactly 42 cells)
    const remaining = 42 - result.length;
    for (let i = 1; i <= remaining; i++) {
      result.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return result;
  }, [currentMonth]);

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getCellTasks = useCallback((cellDate) => {
    const localCellStr = cellDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format safely
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const localTaskStr = new Date(task.dueDate).toLocaleDateString("en-CA");
      return localTaskStr === localCellStr;
    });
  }, [tasks]);

  const isToday = (cellDate) => {
    const today = new Date();
    return (
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <section id="calendar" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Visual Schedule</p>
          <h2>Task Calendar</h2>
        </div>
      </div>

      <div className="card calendar-card">
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={prevMonth} title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <h3 className="calendar-month-title">{monthYearString}</h3>
          <button className="calendar-nav-btn" onClick={nextMonth} title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="calendar-weekdays">
          {weekdays.map((day) => (
            <div key={day} className="weekday-label">
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell, idx) => {
            const dayTasks = getCellTasks(cell.date);
            const cellIsToday = isToday(cell.date);
            return (
              <div
                key={idx}
                className={cx(
                  "calendar-cell",
                  !cell.isCurrentMonth && "outside",
                  cellIsToday && "today"
                )}
              >
                <span className="cell-day-num">{cell.date.getDate()}</span>
                <div className="calendar-cell-tasks">
                  {dayTasks.map((task) => (
                    <div
                      key={task._id}
                      className={cx("calendar-task-item", task.priority.toLowerCase())}
                      onClick={() => onOpenComments(task)}
                      title={`Task: ${task.title}\nPriority: ${task.priority}\nStatus: ${task.status}\nClick to view notes`}
                    >
                      <span className="task-item-title">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function UserDirectory({ users, currentUser, onUpdateRole }) {
  return (
    <section id="directory" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>User Directory & Roles</h2>
        </div>
      </div>
      <div className="card admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Current Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => {
              const isSelf = String(item._id) === String(currentUser.id);
              return (
                <tr key={item._id}>
                  <td><strong>{item.name}</strong> {isSelf && "(You)"}</td>
                  <td>{item.email}</td>
                  <td>
                    <span className={cx("role-badge-small", item.role.toLowerCase())}>{item.role}</span>
                  </td>
                  <td>
                    <select
                      className="role-selector"
                      value={item.role}
                      disabled={isSelf}
                      onChange={(e) => onUpdateRole(item._id, e.target.value)}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Member">Member</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AuditLogsFeed({ logs }) {
  return (
    <section id="audit" className="section">
      <div className="section-title">
        <div>
          <p className="eyebrow">Security</p>
          <h2>Access & Audit Logs</h2>
        </div>
      </div>
      <div className="audit-feed card">
        {logs.length === 0 ? (
          <p className="subtle-text">No security events logged yet.</p>
        ) : (
          logs.map((log) => (
            <div className="audit-row" key={log._id}>
              <div className="audit-header">
                <span className={cx("audit-action-badge", log.action.toLowerCase().replace(/\s+/g, "-"))}>
                  {log.action}
                </span>
                <span className="audit-time">
                  {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="audit-details">{log.details}</p>
              <div className="audit-actor">
                <span>Triggered by: <strong>{log.actor?.name || "System"}</strong> ({log.actor?.role || "System"})</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Home() {
  const { user } = useAuth();
  const [state, setState] = useState({ users: [], projects: [], tasks: [], summary: null });
  const [auditLogs, setAuditLogs] = useState([]);
  const [error, setError] = useState("");

  const [activeTask, setActiveTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Time tracking state
  const [timeLogs, setTimeLogs] = useState([]);
  const [loadingTimeLogs, setLoadingTimeLogs] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerNote, setTimerNote] = useState("");
  const timerIntervalRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const loadNotifications = async () => {
    // Don't poll when the tab is hidden (saves API calls)
    if (document.visibilityState === "hidden") return;
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
      const unread = res.data.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch {
      // Silent fail — notifications are non-critical
    }
  };

  const markAllNotifsRead = async () => {
    try {
      await api.post("/notifications/mark-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  };

  const markSingleNotifRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  };

  const openComments = async (task) => {
    setActiveTask(task);
    setDrawerOpen(true);
    setLoadingComments(true);
    setCommentError("");
    setComments([]);
    setTimeLogs([]);
    setLoadingTimeLogs(true);
    try {
      const [commentsRes, timeRes] = await Promise.all([
        api.get(`/tasks/${task._id}/comments`),
        api.get(`/tasks/${task._id}/time`).catch(() => ({ data: { logs: [], totalSeconds: 0 } }))
      ]);
      setComments(commentsRes.data);
      setTimeLogs(timeRes.data.logs || []);
    } catch (err) {
      setCommentError(err.response?.data?.message || "Failed to load comments");
    } finally {
      setLoadingComments(false);
      setLoadingTimeLogs(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTask) return;
    try {
      const res = await api.post(`/tasks/${activeTask._id}/comments`, { content: commentText });
      setComments((prev) => [...prev, res.data]);
      setCommentText("");
      if (user.role === "Admin") {
        const logsRes = await api.get("/audit-logs");
        setAuditLogs(logsRes.data);
      }
    } catch (err) {
      setCommentError(err.response?.data?.message || "Failed to post comment");
    }
  };

  const closeComments = () => {
    // Stop and discard any running timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerRunning(false);
    setTimerSeconds(0);
    setTimerNote("");
    setDrawerOpen(false);
    setTimeout(() => {
      setActiveTask(null);
      setComments([]);
      setCommentText("");
      setCommentError("");
      setTimeLogs([]);
    }, 300);
  };

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((s) => s + 1);
    }, 1000);
  };

  const stopTimer = async (note) => {
    if (!timerRunning || !activeTask) return;
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
    setTimerRunning(false);
    const duration = timerSeconds;
    setTimerSeconds(0);
    setTimerNote("");
    if (duration < 60) return; // discard entries under 1 minute
    try {
      await api.post(`/tasks/${activeTask._id}/time`, { duration, note });
      const res = await api.get(`/tasks/${activeTask._id}/time`);
      setTimeLogs(res.data.logs || []);
      await load();
    } catch {
      setCommentError("Failed to save time entry. Please try again.");
    }
  };

  const logManualTime = async (duration, note) => {
    if (!activeTask) return;
    try {
      await api.post(`/tasks/${activeTask._id}/time`, { duration, note });
      const res = await api.get(`/tasks/${activeTask._id}/time`);
      setTimeLogs(res.data.logs || []);
      setTimerNote("");
      await load();
    } catch {
      setCommentError("Failed to log time entry. Please try again.");
    }
  };

  const load = async () => {
    const promises = [
      api.get("/users"),
      api.get("/projects"),
      api.get("/tasks"),
      api.get("/dashboard")
    ];

    if (user.role === "Admin") {
      promises.push(api.get("/audit-logs"));
    }

    const results = await Promise.all(promises);
    setState({
      users: results[0].data,
      projects: results[1].data,
      tasks: results[2].data,
      summary: results[3].data
    });

    if (user.role === "Admin" && results[4]) {
      setAuditLogs(results[4].data);
    }

    await loadNotifications();
  };

  // ── Timer interval cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // ── Initial data load + notification polling ─────────────────────────────────
  useEffect(() => {
    load().catch((err) => setError(err.response?.data?.message || "Could not load dashboard"));
    loadNotifications();

    // Poll every 15s; pause when tab is hidden via visibilityState check inside loadNotifications
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const createProject = async (payload) => {
    setError("");
    try {
      await api.post("/projects", payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create project");
    }
  };

  const updateProjectMembers = async (projectId, members) => {
    setError("");
    try {
      await api.patch(`/projects/${projectId}/members`, { members });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update project members");
    }
  };

  const updateRole = async (userId, role) => {
    setError("");
    try {
      await api.patch(`/users/${userId}/role`, { role });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update user role");
    }
  };

  const createTask = async (payload) => {
    setError("");
    try {
      await api.post("/tasks", payload);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create task");
    }
  };

  const updateStatus = async (taskId, status) => {
    setError("");
    try {
      await api.patch(`/tasks/${taskId}`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update task");
    }
  };

  const deleteProject = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project? This will also delete all tasks associated with it!")) return;
    setError("");
    try {
      await api.delete(`/projects/${projectId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete project");
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    setError("");
    try {
      await api.delete(`/tasks/${taskId}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete task");
    }
  };

  return (
    <Layout>
      <header className="topbar">
        <div>
          <p className="eyebrow">Welcome back, {user.name}</p>
          <h1>Team Workspace</h1>
        </div>
        <div className="topbar-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div className="notifications-container" style={{ position: "relative" }}>
            <button 
              className={cx("bell-button", unreadCount > 0 && "glowing")} 
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>

            {notifDropdownOpen && (
              <>
                <div className="notif-overlay" onClick={() => setNotifDropdownOpen(false)} />
                <div className="notifications-dropdown">
                  <div className="notif-header">
                    <h3>Notifications</h3>
                    {unreadCount > 0 && (
                      <button className="ghost-btn-small" onClick={markAllNotifsRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="notif-body">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={28} className="empty-bell" />
                        <p>All caught up!</p>
                        <span>No new alerts.</span>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        const senderInitials = notif.sender?.name
                          ? notif.sender.name.slice(0, 2).toUpperCase()
                          : "??";
                        const formattedTime = new Date(notif.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        return (
                          <div 
                            key={notif._id} 
                            className={cx("notif-item", !notif.read && "unread")}
                            onClick={() => !notif.read && markSingleNotifRead(notif._id)}
                          >
                            <div className="notif-avatar">
                              {senderInitials}
                            </div>
                            <div className="notif-content">
                              <p className="notif-message">{notif.message}</p>
                              <div className="notif-footer">
                                <span className="notif-time">{formattedTime}</span>
                                {!notif.read && <span className="unread-dot" title="Unread" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="role-badge">{user.role}</span>
        </div>
      </header>
      {error && <p className="error banner">{error}</p>}
      
      <Dashboard summary={state.summary} />
      
      <Projects 
        projects={state.projects} 
        users={state.users} 
        currentUser={user} 
        onUpdateMembers={updateProjectMembers}
        onCreateProject={createProject} 
        onDeleteProject={deleteProject}
      />
      
      <Tasks 
        tasks={state.tasks} 
        projects={state.projects} 
        users={state.users} 
        currentUser={user} 
        onCreateTask={createTask} 
        onUpdateStatus={updateStatus} 
        onDeleteTask={deleteTask}
        onOpenComments={openComments}
      />

      {user.role === "Admin" && (
        <>
          <UserDirectory 
            users={state.users} 
            currentUser={user} 
            onUpdateRole={updateRole} 
          />
          <AuditLogsFeed 
            logs={auditLogs} 
          />
        </>
      )}

      <Calendar 
        tasks={state.tasks} 
        currentUser={user} 
        onOpenComments={openComments} 
      />

      <CommentsDrawer
        isOpen={drawerOpen}
        task={activeTask}
        comments={comments}
        commentText={commentText}
        setCommentText={setCommentText}
        loading={loadingComments}
        error={commentError}
        onSubmit={submitComment}
        onClose={closeComments}
        timeLogs={timeLogs}
        loadingTimeLogs={loadingTimeLogs}
        timerRunning={timerRunning}
        timerSeconds={timerSeconds}
        timerNote={timerNote}
        setTimerNote={setTimerNote}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        onLogManualTime={logManualTime}
        canLogTime={!!activeTask && (
          user.role === "Admin" ||
          (user.role === "Manager" && state.projects.find(p => p._id === (activeTask.project?._id || activeTask.project))?.members?.some(m => String(m._id || m) === String(user.id))) ||
          (user.role === "Member" && String(activeTask.assignee?._id || activeTask.assignee) === String(user.id))
        )}
      />
    </Layout>
  );
}

export default function App() {
  const { user } = useAuth();
  return user ? <Home /> : <AuthPage />;
}

