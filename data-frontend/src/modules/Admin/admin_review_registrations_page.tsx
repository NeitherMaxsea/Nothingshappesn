import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/admin_review_registrations_page.css";
import sampleVisual from "../../assets/PWD_worker.png";

type ReviewStatus = "pending" | "approved" | "rejected";

type AdminApplicantItem = {
  id: number;
  type: "applicant";
  reference: string;
  submittedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  sex: string | null;
  birthDate: string | null;
  disabilityType: string | null;
  email: string;
  username: string;
  status: ReviewStatus;
  addressProvince: string | null;
  addressCity: string | null;
  addressBarangay: string | null;
  pwdIdNumber: string | null;
  pwdIdImageName: string | null;
  adminNotes: string | null;
};

type AdminListResponse = {
  items?: AdminApplicantItem[];
};

type AdminToast = {
  kind: "success" | "error";
  text: string;
} | null;

async function fetchApplicantRegistrations(): Promise<AdminApplicantItem[]> {
  const response = await fetch("/api/admin/registrations?type=applicant");
  const data = (await response.json()) as AdminListResponse;
  if (!response.ok) {
    throw new Error("Failed to load registrations.");
  }
  return (data.items || []).filter((item): item is AdminApplicantItem => item?.type === "applicant");
}

async function submitDecision(id: number, decision: "approve" | "reject", adminNotes: string): Promise<void> {
  const response = await fetch(`/api/admin/registrations/applicant/${id}/${decision}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminNotes }),
  });
  if (!response.ok) {
    let message = "Failed to update registration status.";
    try {
      const data = (await response.json()) as { message?: string };
      if (data.message) message = data.message;
    } catch {
      // no-op
    }
    throw new Error(message);
  }
}

async function updateRegistrationAccount(
  id: number,
  type: "applicant",
  payload: { username: string; email: string },
): Promise<{ username: string; email: string; message?: string }> {
  const response = await fetch(`/api/admin/registrations/${type}/${id}/account`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: { username?: string; email?: string; message?: string } = {};
  try {
    data = (await response.json()) as typeof data;
  } catch {
    // no-op
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to update account.");
  }

  return {
    username: data.username || payload.username,
    email: data.email || payload.email,
    message: data.message,
  };
}

async function deleteRegistrationAccount(id: number, type: "applicant"): Promise<{ message?: string }> {
  const response = await fetch(`/api/admin/registrations/${type}/${id}/account`, {
    method: "DELETE",
  });

  let data: { message?: string } = {};
  try {
    data = (await response.json()) as { message?: string };
  } catch {
    // no-op
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete account.");
  }

  return data;
}

function formatDateTime(value: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatSex(value: string | null): string {
  if (!value) return "N/A";
  if (value === "prefer_not_say") return "Prefer not to say";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function computeAgeFromBirthDate(value: string | null): string {
  if (!value) return "N/A";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "N/A";
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age >= 0 ? String(age) : "N/A";
}

export default function AdminReviewRegistrationsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [toast, setToast] = useState<AdminToast>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [showAccountView, setShowAccountView] = useState(false);
  const [showAccountEdit, setShowAccountEdit] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: "", email: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const fetched = await fetchApplicantRegistrations();
        if (!active) return;
        setItems(fetched);
        setSelectedId((prev) => (prev && fetched.some((x) => x.id === prev) ? prev : (fetched[0]?.id ?? null)));
      } catch (error) {
        if (!active) return;
        setToast({ kind: "error", text: error instanceof Error ? error.message : "Failed to load registrations." });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setReviewNotes(selected.adminNotes || "");
    setAccountForm({
      username: selected.username || "",
      email: selected.email || "",
    });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = items.filter((item) => item.status === "pending").length;

  const updateStatus = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setActionLoading(status === "approved" ? "approve" : "reject");
    try {
      await submitDecision(selected.id, status === "approved" ? "approve" : "reject", reviewNotes.trim());
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? { ...item, status, adminNotes: reviewNotes.trim() || null }
            : item,
        ),
      );
      setToast({
        kind: "success",
        text:
          status === "approved"
            ? `${selected.firstName || selected.name || selected.email} approved.`
            : `${selected.firstName || selected.name || selected.email} rejected.`,
      });
      setRefreshTick((x) => x + 1);
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to update status.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccountAction = (action: "view" | "edit" | "delete") => {
    if (!selected) return;
    if (action === "view") {
      setShowAccountView(true);
      return;
    }
    if (action === "edit") {
      setAccountForm({ username: selected.username || "", email: selected.email || "" });
      setShowAccountEdit(true);
      return;
    }
    setShowDeleteConfirm(true);
  };

  const submitAccountEdit = async () => {
    if (!selected) return;

    const username = accountForm.username.trim();
    const email = accountForm.email.trim().toLowerCase();
    if (!username || !email) {
      setToast({ kind: "error", text: "Username and email are required." });
      return;
    }

    setAccountSaving(true);
    try {
      const result = await updateRegistrationAccount(selected.id, "applicant", { username, email });
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id ? { ...item, username: result.username, email: result.email } : item,
        ),
      );
      setShowAccountEdit(false);
      setToast({ kind: "success", text: result.message || "Account updated." });
      setRefreshTick((x) => x + 1);
    } catch (error) {
      setToast({ kind: "error", text: error instanceof Error ? error.message : "Failed to update account." });
    } finally {
      setAccountSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (!selected) return;
    setDeleteLoading(true);
    try {
      const result = await deleteRegistrationAccount(selected.id, "applicant");
      setItems((prev) => prev.filter((item) => item.id !== selected.id));
      setSelectedId((prev) => (prev === selected.id ? null : prev));
      setShowAccountView(false);
      setShowAccountEdit(false);
      setShowDeleteConfirm(false);
      setToast({ kind: "success", text: result.message || "Registration account deleted." });
      setRefreshTick((x) => x + 1);
    } catch (error) {
      setToast({
        kind: "error",
        text: error instanceof Error ? error.message : "Failed to delete account.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="adm-review-page">
      {toast && <div className={`adm-review-toast ${toast.kind}`}>{toast.text}</div>}
      <div className="adm-review-shell">
        <header className="adm-review-header">
          <div>
            <p className="adm-review-eyebrow">Admin Review</p>
            <h1>Pending Applicant Registrations</h1>
            <p className="adm-review-subtext">
              Review PWD ID image and registration details before approval.
            </p>
          </div>
          <div className="adm-review-header-actions">
            <span className="adm-review-count">{pendingCount} pending</span>
            <button
              type="button"
              className="adm-review-link"
              onClick={() => setRefreshTick((x) => x + 1)}
              style={{ border: 0, background: "transparent", cursor: "pointer" }}
            >
              Refresh
            </button>
            <Link to="/login" className="adm-review-link">
              Back to Login
            </Link>
          </div>
        </header>

        <div className="adm-review-grid">
          <aside className="adm-review-list-panel">
            <div className="adm-review-list-title">Queue</div>
            <div className="adm-review-list">
              {loading && items.length === 0 && (
                <div className="adm-review-empty">Loading registrations...</div>
              )}

              {!loading && items.length === 0 && (
                <div className="adm-review-empty">No applicant registrations found.</div>
              )}

              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`adm-review-list-item ${selected?.id === item.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(item.id);
                    setReviewNotes(item.adminNotes ?? "");
                  }}
                >
                  <div className="adm-review-list-top">
                    <strong>
                      {(item.firstName || item.name || "").trim()} {(item.lastName || "").trim()}
                    </strong>
                    <span className={`adm-status ${item.status}`}>{item.status}</span>
                  </div>
                  <p>{item.disabilityType || "N/A"}</p>
                  <small>
                    {item.reference} • {formatDateTime(item.submittedAt)}
                  </small>
                </button>
              ))}
            </div>
          </aside>

          <section className="adm-review-detail-panel">
            {!selected ? (
              <div className="adm-review-empty">No registration selected.</div>
            ) : (
              <>
                <div className="adm-review-detail-header">
                  <div>
                    <h2>
                      {(selected.firstName || selected.name || "").trim()} {(selected.lastName || "").trim()}
                    </h2>
                    <p>
                      {selected.reference} • Submitted {formatDateTime(selected.submittedAt)}
                    </p>
                  </div>
                  <span className={`adm-status ${selected.status}`}>{selected.status}</span>
                </div>

                <div className="adm-review-detail-grid">
                  <div className="adm-review-card">
                    <h3>Applicant Information</h3>
                    <div className="adm-review-fields">
                      <div><span>Disability</span><strong>{selected.disabilityType || "N/A"}</strong></div>
                      <div><span>Sex</span><strong>{formatSex(selected.sex)}</strong></div>
                      <div><span>Age</span><strong>{computeAgeFromBirthDate(selected.birthDate)}</strong></div>
                      <div><span>Email</span><strong>{selected.email}</strong></div>
                      <div><span>Username</span><strong>{selected.username}</strong></div>
                      <div><span>Province</span><strong>{selected.addressProvince || "N/A"}</strong></div>
                      <div><span>City</span><strong>{selected.addressCity || "N/A"}</strong></div>
                      <div><span>Barangay</span><strong>{selected.addressBarangay || "N/A"}</strong></div>
                      <div><span>PWD ID Number</span><strong>{selected.pwdIdNumber || "N/A"}</strong></div>
                    </div>
                  </div>

                  <div className="adm-review-card">
                    <h3>PWD ID Attachment</h3>
                    <div className="adm-review-image-wrap">
                      <img
                        src={sampleVisual}
                        alt={`PWD ID placeholder for ${selected.firstName || selected.name || selected.email}`}
                      />
                    </div>
                    <p className="adm-review-image-note">
                      Current backend stores file name only: <strong>{selected.pwdIdImageName || "No file uploaded"}</strong>
                    </p>
                  </div>
                </div>

                <div className="adm-review-card adm-review-actions-card">
                  <h3>Review Decision</h3>
                  <label className="adm-review-notes-label" htmlFor="adm-review-notes">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    id="adm-review-notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes before approving/rejecting..."
                    rows={3}
                  />
                  <div className="adm-review-actions">
                    <button
                      type="button"
                      className="adm-btn adm-btn-reject"
                      disabled={selected.status === "rejected" || actionLoading !== null}
                      onClick={() => updateStatus("rejected")}
                    >
                      <i className="bi bi-x-circle" /> {actionLoading === "reject" ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-approve"
                      disabled={selected.status === "approved" || actionLoading !== null}
                      onClick={() => updateStatus("approved")}
                    >
                      <i className="bi bi-check-circle" /> {actionLoading === "approve" ? "Approving..." : "Approve"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="adm-account-panel">
            <div className="adm-account-card">
              <div className="adm-account-head">
                <div>
                  <p className="adm-review-eyebrow">User Account</p>
                  <h3>Account Management</h3>
                </div>
                {selected && <span className={`adm-status ${selected.status}`}>{selected.status}</span>}
              </div>

              {!selected ? (
                <div className="adm-review-empty">Select an applicant to manage account details.</div>
              ) : (
                <>
                  <div className="adm-account-fields">
                    <div>
                      <span>Username</span>
                      <strong>{selected.username}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <strong>{selected.email}</strong>
                    </div>
                    <div>
                      <span>Password</span>
                      <strong className="adm-password-hidden">Hidden (Hashed)</strong>
                    </div>
                    <div>
                      <span>Reference</span>
                      <strong>{selected.reference}</strong>
                    </div>
                  </div>

                  <p className="adm-account-note">
                    Passwords are securely hashed and cannot be viewed in plain text.
                  </p>

                  <div className="adm-account-actions">
                    <button type="button" className="adm-btn adm-btn-neutral" onClick={() => handleAccountAction("view")}>
                      <i className="bi bi-eye" /> View
                    </button>
                    <button type="button" className="adm-btn adm-btn-neutral" onClick={() => handleAccountAction("edit")}>
                      <i className="bi bi-pencil-square" /> Edit
                    </button>
                    <button type="button" className="adm-btn adm-btn-reject" onClick={() => handleAccountAction("delete")}>
                      <i className="bi bi-trash" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {showAccountView && selected && (
        <div
          className="adm-account-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="User account details"
          onClick={() => setShowAccountView(false)}
        >
          <div className="adm-account-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-account-modal-head">
              <h3>Account Details</h3>
              <button type="button" className="adm-account-close" onClick={() => setShowAccountView(false)} aria-label="Close">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="adm-account-fields">
              <div><span>Full Name</span><strong>{`${(selected.firstName || selected.name || "").trim()} ${(selected.lastName || "").trim()}`.trim() || "N/A"}</strong></div>
              <div><span>Username</span><strong>{selected.username}</strong></div>
              <div><span>Email</span><strong>{selected.email}</strong></div>
              <div><span>Status</span><strong>{selected.status}</strong></div>
              <div><span>Password</span><strong className="adm-password-hidden">Hidden (Hashed)</strong></div>
              <div><span>Role</span><strong>Applicant</strong></div>
            </div>
            <p className="adm-account-note">
              Plain passwords are not stored and cannot be displayed.
            </p>
          </div>
        </div>
      )}

      {showAccountEdit && selected && (
        <div
          className="adm-account-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Edit user account details"
          onClick={() => !accountSaving && setShowAccountEdit(false)}
        >
          <div className="adm-account-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-account-modal-head">
              <h3>Edit Account</h3>
              <button
                type="button"
                className="adm-account-close"
                onClick={() => setShowAccountEdit(false)}
                aria-label="Close"
                disabled={accountSaving}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="adm-account-form">
              <label>
                <span>Username</span>
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                  disabled={accountSaving}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={accountSaving}
                />
              </label>
            </div>

            <div className="adm-review-actions" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="adm-btn adm-btn-neutral"
                onClick={() => setShowAccountEdit(false)}
                disabled={accountSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-approve"
                onClick={() => void submitAccountEdit()}
                disabled={accountSaving}
              >
                <i className="bi bi-save" /> {accountSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && selected && (
        <div
          className="adm-confirm-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Delete account confirmation"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div className="adm-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-confirm-icon" aria-hidden="true">
              <i className="bi bi-exclamation-triangle-fill" />
            </div>
            <h3>Delete account?</h3>
            <p>
              Are you sure you want to delete <strong>{selected.username || selected.email}</strong>?
              This action cannot be undone.
            </p>
            <div className="adm-confirm-actions">
              <button
                type="button"
                className="adm-btn adm-btn-neutral"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-reject"
                onClick={() => void confirmDeleteAccount()}
                disabled={deleteLoading}
              >
                <i className="bi bi-trash" /> {deleteLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

