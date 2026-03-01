import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/login_page.css";
import "../../designer/approval_status_page.css";
import titleLogo from "../../assets/titlelogo.png";

type ApprovalStatus = "pending" | "approved" | "rejected" | "unknown";

type StatusResponse = {
  found?: boolean;
  status?: string;
  adminNotes?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  message?: string;
};

function normalizeEmail(value: string | null): string {
  return String(value || "").trim().toLowerCase();
}

async function fetchRegistrationStatus(email: string): Promise<StatusResponse> {
  const params = new URLSearchParams({ email });
  const response = await fetch(`/api/auth/registration-status?${params.toString()}`);
  let data: StatusResponse = {};
  try {
    data = (await response.json()) as StatusResponse;
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.message || `Unable to check approval status (${response.status})`);
  }
  return data;
}

export default function ApprovalStatusPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [email] = useState(() => normalizeEmail(search.get("email") || localStorage.getItem("pendingOtpEmail")));
  const [status, setStatus] = useState<ApprovalStatus>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [adminNotes, setAdminNotes] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;
    const poll = async () => {
      try {
        if (active) {
          setLoading(true);
          setError("");
        }
        const data = await fetchRegistrationStatus(email);
        if (!active) return;

        const nextStatus = (data.status || "").toLowerCase();
        if (nextStatus === "pending" || nextStatus === "approved" || nextStatus === "rejected") {
          setStatus(nextStatus);
        } else {
          setStatus("unknown");
        }
        setAdminNotes(typeof data.adminNotes === "string" ? data.adminNotes : "");

        if (nextStatus === "approved" || nextStatus === "rejected") {
          if (nextStatus === "approved") {
            localStorage.removeItem("pendingOtpEmail");
          }
          return;
        }

        timerRef.current = window.setTimeout(() => {
          setPollCount((c) => c + 1);
        }, 4000);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to check approval status.");
        timerRef.current = window.setTimeout(() => {
          setPollCount((c) => c + 1);
        }, 5000);
      } finally {
        if (active) setLoading(false);
      }
    };

    poll();

    return () => {
      active = false;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [email, navigate, pollCount]);

  const statusIcon =
    status === "approved"
      ? "bi-check-circle-fill"
      : status === "rejected"
        ? "bi-x-circle-fill"
        : "bi-hourglass-split";

  const statusTitle =
    status === "approved"
      ? "Your account has been approved"
      : status === "rejected"
        ? "Your registration was rejected"
        : "Waiting for admin approval";

  const statusMessage =
    status === "approved"
      ? "You can now log in to your account."
      : status === "rejected"
        ? "Please review the note below or contact the admin for assistance."
        : "Your OTP is verified. Please keep this page open while the admin reviews your registration.";

  return (
    <div className="auth-page">
      <button className="back-btn" onClick={() => navigate("/login")} aria-label="Back to login">
        <i className="bi bi-arrow-left" />
      </button>

      <div className="container approval-container">
        <div className="right approval-right fade-wrapper show">
          <div className="logo-container">
            <img src={titleLogo} className="logo-img" alt="HireAble logo" />
          </div>

          <span className={`auth-pill approval-pill ${status}`}>
            {status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Pending Review"}
          </span>

          <div className={`approval-card ${status}`}>
            <div className="approval-icon" aria-hidden="true">
              <i className={`bi ${statusIcon}`} />
            </div>
            <h2 className="form-h2 approval-title">{statusTitle}</h2>
            <p className="form-p approval-text">{statusMessage}</p>

            <div className="approval-email">
              <span>Email</span>
              <strong>{email}</strong>
            </div>

            {loading && status !== "approved" && status !== "rejected" && (
              <div className="approval-loader-row" aria-live="polite">
                <span className="approval-dot" />
                <span className="approval-dot" />
                <span className="approval-dot" />
                <small>Checking status...</small>
              </div>
            )}

            {error && status !== "approved" && (
              <p className="approval-error">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> {error}
              </p>
            )}

            {adminNotes && (
              <div className="approval-note">
                <p className="approval-note-label">Admin note</p>
                <p>{adminNotes}</p>
              </div>
            )}

            <div className="approval-actions">
              {status === "pending" || status === "unknown" ? (
                <button
                  type="button"
                  className="btn approval-refresh-btn"
                  onClick={() => setPollCount((c) => c + 1)}
                  disabled={loading}
                >
                  {loading ? "Checking..." : "Refresh Status"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    navigate(status === "rejected" ? "/login?rejected=1" : "/login?approved=1")
                  }
                >
                  Back to Login
                </button>
              )}
            </div>
          </div>

          <p className="auth-link approval-footer-link">
            Need to leave? You can come back later from <Link to="/login">Login</Link> and try again.
          </p>
        </div>
      </div>
    </div>
  );
}

