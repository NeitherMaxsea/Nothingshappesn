import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import "../../designer/admin_job_list_page.css";

type JobRow = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  category: string;
  type: string;
  salary: string;
  disabilityType: string;
  status: string;
  createdAt: string;
  __localOnly?: boolean;
};

const LOCAL_JOB_POSTS_KEY = "adminLocalJobPosts";

export default function AdminJobListPage(): React.JSX.Element {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<JobRow | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const aMs = Date.parse(a.createdAt || "");
        const bMs = Date.parse(b.createdAt || "");
        return (Number.isFinite(bMs) ? bMs : 0) - (Number.isFinite(aMs) ? aMs : 0);
      }),
    [jobs],
  );

  useEffect(() => {
    void loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      let apiRows: JobRow[] = [];
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = (await res.json()) as Array<Record<string, unknown>>;
          if (Array.isArray(data)) {
            apiRows = data.map(normalizeJob).filter(Boolean) as JobRow[];
          }
        }
      } catch {
        apiRows = [];
      }

      let localRows: JobRow[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
        const parsed = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
        if (Array.isArray(parsed)) {
          localRows = parsed.map(normalizeJob).filter(Boolean) as JobRow[];
        }
      } catch {
        localRows = [];
      }

      const map = new Map<string, JobRow>();
      [...localRows, ...apiRows].forEach((job) => {
        map.set(job.id, job);
      });
      setJobs(Array.from(map.values()));
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (job: JobRow) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete job post?",
      text: `Are you sure you want to delete "${job.title}"?`,
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    if (job.__localOnly || job.id.startsWith("local-job-")) {
      const raw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
      const parsed = raw ? (JSON.parse(raw) as JobRow[]) : [];
      const next = parsed.filter((x) => String(x.id) !== job.id);
      localStorage.setItem(LOCAL_JOB_POSTS_KEY, JSON.stringify(next));
      setJobs((prev) => prev.filter((x) => x.id !== job.id));
      await Swal.fire({ icon: "success", title: "Deleted", text: "Local job post removed.", confirmButtonText: "OK" });
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(job.id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job.");
      setJobs((prev) => prev.filter((x) => x.id !== job.id));
      await Swal.fire({ icon: "success", title: "Deleted", text: "Job post deleted.", confirmButtonText: "OK" });
    } catch {
      await Swal.fire({ icon: "error", title: "Delete failed", text: "Unable to delete this job post.", confirmButtonText: "OK" });
    }
  };

  const onSaveEdit = async () => {
    if (!editingJob) return;
    if (!editingJob.title.trim() || !editingJob.companyName.trim()) {
      await Swal.fire({ icon: "warning", title: "Missing fields", text: "Title and Company are required.", confirmButtonText: "OK" });
      return;
    }
    setSaving(true);
    try {
      if (editingJob.__localOnly || editingJob.id.startsWith("local-job-")) {
        const raw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
        const parsed = raw ? (JSON.parse(raw) as JobRow[]) : [];
        const next = parsed.map((x) => (String(x.id) === editingJob.id ? { ...x, ...editingJob } : x));
        localStorage.setItem(LOCAL_JOB_POSTS_KEY, JSON.stringify(next));
        setJobs((prev) => prev.map((x) => (x.id === editingJob.id ? { ...x, ...editingJob } : x)));
      } else {
        const res = await fetch(`/api/jobs/${encodeURIComponent(editingJob.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editingJob.title,
            companyName: editingJob.companyName,
            location: editingJob.location,
            category: editingJob.category,
            type: editingJob.type,
            salary: editingJob.salary,
            disabilityType: editingJob.disabilityType,
            status: editingJob.status,
          }),
        });
        if (!res.ok) throw new Error();
        setJobs((prev) => prev.map((x) => (x.id === editingJob.id ? { ...x, ...editingJob } : x)));
      }

      setEditingJob(null);
      await Swal.fire({ icon: "success", title: "Updated", text: "Job post updated.", confirmButtonText: "OK" });
    } catch {
      await Swal.fire({ icon: "error", title: "Update failed", text: "Unable to update job post.", confirmButtonText: "OK" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-job-list-page">
      <div className="job-list-head">
        <h2>Posted Jobs</h2>
        <button type="button" onClick={() => void loadJobs()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="job-list-empty">Loading jobs...</p>
      ) : sortedJobs.length === 0 ? (
        <p className="job-list-empty">No posted jobs yet.</p>
      ) : (
        <div className="job-list-table-wrap">
          <table className="job-list-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Company</th>
                <th>Location</th>
                <th>Status</th>
                <th>Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.title}</td>
                  <td>{job.companyName}</td>
                  <td>{job.location}</td>
                  <td>
                    <span className={`status-pill ${job.status.toLowerCase()}`}>{job.status || "open"}</span>
                  </td>
                  <td>{job.salary || "-"}</td>
                  <td>
                    <div className="job-actions">
                      <button type="button" className="edit" onClick={() => setEditingJob(job)}>
                        Edit
                      </button>
                      <button type="button" className="delete" onClick={() => void onDelete(job)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingJob && (
        <div className="job-edit-backdrop" onClick={(e) => e.currentTarget === e.target && setEditingJob(null)}>
          <div className="job-edit-modal">
            <h3>Edit Job Post</h3>
            <div className="job-edit-grid">
              <label>
                Title
                <input
                  value={editingJob.title}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                />
              </label>
              <label>
                Company
                <input
                  value={editingJob.companyName}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, companyName: e.target.value } : prev))}
                />
              </label>
              <label>
                Location
                <input
                  value={editingJob.location}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, location: e.target.value } : prev))}
                />
              </label>
              <label>
                Category
                <input
                  value={editingJob.category}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
                />
              </label>
              <label>
                Type
                <input
                  value={editingJob.type}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, type: e.target.value } : prev))}
                />
              </label>
              <label>
                Salary
                <input
                  value={editingJob.salary}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, salary: e.target.value } : prev))}
                />
              </label>
              <label>
                Disability
                <input
                  value={editingJob.disabilityType}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, disabilityType: e.target.value } : prev))}
                />
              </label>
              <label>
                Status
                <select
                  value={editingJob.status}
                  onChange={(e) => setEditingJob((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="pending">Pending</option>
                </select>
              </label>
            </div>

            <div className="job-edit-actions">
              <button type="button" className="cancel" onClick={() => setEditingJob(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="save" onClick={() => void onSaveEdit()} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeJob(raw: Record<string, unknown>): JobRow | null {
  const id = String(raw.id || "").trim();
  if (!id) return null;
  return {
    id,
    title: String(raw.title || "Untitled Job"),
    companyName: String(raw.companyName || raw.company || "Company"),
    location: String(raw.location || "Not specified"),
    category: String(raw.category || "General"),
    type: String(raw.type || "Open"),
    salary: String(raw.salary || "Negotiable"),
    disabilityType: String(raw.disabilityType || raw.disability || "PWD-friendly"),
    status: String(raw.status || "open"),
    createdAt: String(raw.createdAt || ""),
    __localOnly: Boolean(raw.__localOnly),
  };
}
