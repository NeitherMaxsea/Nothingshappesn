import { useEffect, useMemo, useState } from "react";
import "../../designer/admin_dashboard_page.css";

type UserRow = {
  uid: string;
  email: string;
  name: string;
  role: string;
  createdAtMs: number;
  lastLoginAtMs: number;
  lastSeenAt: unknown;
  status: unknown;
  isActive: unknown;
  active: unknown;
  disabledAt: unknown;
  deactivatedAt: unknown;
};

type ApplicationRow = {
  id: string;
  timestampMs: number;
  applicantLabel: string;
  jobTitle: string;
  status: string;
  statusLabel: string;
};

type JobActivityRow = {
  id: string;
  timestampMs: number;
  title: string;
};

type Stats = {
  totalUsers: number;
  totalApplicants: number;
  totalEmployers: number;
  totalActive: number;
  totalInactive: number;
};

export default function AdminDashboardPage(): React.JSX.Element {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalApplicants: 0,
    totalEmployers: 0,
    totalActive: 0,
    totalInactive: 0,
  });
  const [usersLower, setUsersLower] = useState<UserRow[]>([]);
  const [usersUpper, setUsersUpper] = useState<UserRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [jobs, setJobs] = useState<JobActivityRow[]>([]);

  const combinedUsers = useMemo(() => {
    const map = new Map<string, UserRow>();
    [...usersLower, ...usersUpper].forEach((user) => {
      const key = String(user.uid || user.email || `${user.name}-${user.role}`).toLowerCase();
      if (!key) return;
      map.set(key, user);
    });
    return Array.from(map.values());
  }, [usersLower, usersUpper]);

  const recentApplications = useMemo(
    () => [...applications].sort((a, b) => b.timestampMs - a.timestampMs).slice(0, 8),
    [applications],
  );

  const systemActivity = useMemo(() => {
    const userActivity = combinedUsers.flatMap((user) => {
      const items: Array<{ id: string; timestampMs: number; label: string }> = [];
      if (user.createdAtMs) {
        items.push({
          id: `user-created-${user.uid || user.email}-${user.createdAtMs}`,
          timestampMs: user.createdAtMs,
          label: `${user.name} account created`,
        });
      }
      if (user.lastLoginAtMs) {
        items.push({
          id: `user-login-${user.uid || user.email}-${user.lastLoginAtMs}`,
          timestampMs: user.lastLoginAtMs,
          label: `${user.name} signed in`,
        });
      }
      return items;
    });

    const jobActivity = jobs.map((job) => ({
      id: `job-${job.id}-${job.timestampMs}`,
      timestampMs: job.timestampMs,
      label: `Job posted: ${job.title}`,
    }));

    const appActivity = applications.map((app) => ({
      id: `application-${app.id}-${app.timestampMs}`,
      timestampMs: app.timestampMs,
      label: `Application: ${app.applicantLabel} for ${app.jobTitle}`,
    }));

    return [...userActivity, ...jobActivity, ...appActivity]
      .filter((item) => item.timestampMs > 0)
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 10);
  }, [applications, combinedUsers, jobs]);

  const recentVisitors = useMemo(() => {
    return combinedUsers
      .map((user) => {
        const visitAtMs = toMillis(user.lastSeenAt || user.lastLoginAtMs);
        const role = String(user.role || "").toLowerCase();
        return {
          id: `${user.uid || user.email || user.name}-${visitAtMs}`,
          name: user.name || "Unknown User",
          email: user.email || "",
          role,
          roleLabel:
            role === "applicant"
              ? "Applicant"
              : role === "company_admin"
                ? "Company Admin"
                : role === "employer"
                  ? "Employer"
                  : "User",
          visitAtMs,
        };
      })
      .filter((user) => user.visitAtMs > 0)
      .sort((a, b) => b.visitAtMs - a.visitAtMs)
      .slice(0, 10);
  }, [combinedUsers]);

  useEffect(() => {
    let alive = true;
    let timer = 0;

    const pull = async () => {
      const usersMain = normalizeUsers(await fetchArray("/api/users"));
      const usersAlt = normalizeUsers(await fetchArray("/api/Users"));
      if (!alive) return;
      setUsersLower(usersMain);
      setUsersUpper(usersAlt);
      setStatsFromUsers(dedupeUsers([...usersMain, ...usersAlt]), setStats);

      const appRows = (await fetchArray("/api/applications"))
        .map((data: Record<string, unknown>, idx: number) => {
          const status = String(data.status || "pending").toLowerCase();
          return {
            id: String(data.id || `app-${idx + 1}`),
            timestampMs: toMillis(data.appliedAt || data.createdAt),
            applicantLabel: firstNonEmpty(
              data.applicantName,
              data.applicantEmail,
              data.userName,
              data.userEmail,
              data.email,
              "Unknown applicant",
            ),
            jobTitle: firstNonEmpty(data.jobTitle, data.title, "Unknown job"),
            status,
            statusLabel: capitalize(status),
          };
        })
        .filter((entry: ApplicationRow) => entry.timestampMs > 0);
      if (!alive) return;
      setApplications(appRows);

      const jobRows = (await fetchArray("/api/jobs"))
        .map((data: Record<string, unknown>, idx: number) => ({
          id: String(data.id || `job-${idx + 1}`),
          timestampMs: toMillis(data.createdAt),
          title: firstNonEmpty(data.title, "Untitled job"),
        }))
        .filter((entry: JobActivityRow) => entry.timestampMs > 0);
      if (!alive) return;
      setJobs(jobRows);
    };

    void pull();
    timer = window.setInterval(() => void pull(), 5000);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="admin-dashboard-page">
      <div className="header">
        <h2>Admin Dashboard</h2>
        <p>System Overview</p>
      </div>

      <div className="stats">
        <div className="card">
          <h3>Total Users</h3>
          <p className="number">{stats.totalUsers}</p>
        </div>
        <div className="card">
          <h3>Total Applicants</h3>
          <p className="number">{stats.totalApplicants}</p>
        </div>
        <div className="card">
          <h3>Total Employers</h3>
          <p className="number">{stats.totalEmployers}</p>
        </div>
        <div className="card">
          <h3>Total Active</h3>
          <p className="number active-number">{stats.totalActive}</p>
        </div>
        <div className="card">
          <h3>Total Inactive</h3>
          <p className="number inactive-number">{stats.totalInactive}</p>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>Recent Applications</h3>
          {recentApplications.length ? (
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Job</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => (
                  <tr key={app.id}>
                    <td>{app.applicantLabel}</td>
                    <td>{app.jobTitle}</td>
                    <td className={statusClass(app.status)}>{app.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="panel-empty">No application records yet.</p>
          )}
        </div>

        <div className="panel">
          <h3>System Activity</h3>
          {systemActivity.length ? (
            <ul className="activity">
              {systemActivity.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{formatDateTime(item.timestampMs)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">No activity yet.</p>
          )}
        </div>

        <div className="panel visitors-panel">
          <h3>Recent Visitors</h3>
          {recentVisitors.length ? (
            <ul className="visitor-list">
              {recentVisitors.map((visitor) => (
                <li key={visitor.id}>
                  <div className="visitor-main">
                    <strong>{visitor.name}</strong>
                    <span className="visitor-meta">{visitor.email || "No email"}</span>
                  </div>
                  <div className="visitor-side">
                    <span className={`role-pill ${visitor.role}`}>{visitor.roleLabel}</span>
                    <span className="visit-time">{formatDateTime(visitor.visitAtMs)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-empty">No visitor records yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchArray(path: string): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

function normalizeUsers(rawUsers: Array<Record<string, unknown>>): UserRow[] {
  return rawUsers
    .map((user) => ({
      uid: String(user.uid || user.id || "").trim(),
      email: String(user.email || "").trim().toLowerCase(),
      name: String(user.username || user.name || user.email || "Unknown User").trim(),
      role: String(user.role || "").toLowerCase(),
      createdAtMs: toMillis(user.createdAt),
      lastLoginAtMs: toMillis(user.lastLoginAt || user.lastSeenAt),
      lastSeenAt: user.lastSeenAt,
      status: user.status,
      isActive: user.isActive,
      active: user.active,
      disabledAt: user.disabledAt,
      deactivatedAt: user.deactivatedAt,
    }))
    .filter((user) => ["applicant", "employer", "company_admin"].includes(user.role));
}

function setStatsFromUsers(users: UserRow[], setStats: (value: Stats) => void) {
  const totalApplicants = users.filter((user) => user.role === "applicant").length;
  const totalEmployers = users.filter((user) => user.role === "employer" || user.role === "company_admin").length;
  const totalActive = users.filter((user) => resolveStatus(user) === "active").length;
  const totalInactive = users.length - totalActive;

  setStats({
    totalUsers: users.length,
    totalApplicants,
    totalEmployers,
    totalActive,
    totalInactive,
  });
}

function resolveStatus(user: UserRow) {
  const rawStatus = String(user.status || "").toLowerCase();
  const lastSeenMs = toMillis(user.lastSeenAt || user.lastLoginAtMs);
  const activeWindowMs = 15 * 60 * 1000;

  if (["inactive", "disabled", "suspended"].includes(rawStatus)) return "inactive";
  if (rawStatus === "active") return "active";
  if (typeof user.isActive === "boolean") return user.isActive ? "active" : "inactive";
  if (typeof user.active === "boolean") return user.active ? "active" : "inactive";
  if (user.disabledAt || user.deactivatedAt) return "inactive";
  if (lastSeenMs && Date.now() - lastSeenMs <= activeWindowMs) return "active";
  return "inactive";
}

function statusClass(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  return "pending";
}

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toMillis(value: unknown) {
  if (!value) return 0;
  if (typeof (value as { toMillis?: () => number })?.toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function capitalize(value: string) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dedupeUsers(users: UserRow[]) {
  const map = new Map<string, UserRow>();
  users.forEach((user) => {
    const key = String(user.uid || user.email || `${user.name}-${user.role}`).toLowerCase();
    if (!key) return;
    map.set(key, user);
  });
  return Array.from(map.values());
}
