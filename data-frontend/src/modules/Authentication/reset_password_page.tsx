import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/login_page.css";
import titleLogo from "../../assets/proximity.png";

type ToastKind = "success" | "error";
type ToastState = { text: string; kind: ToastKind } | null;

type ResetPasswordResponse = {
  message?: string;
};

function normalizeEmail(value: string | null): string {
  return String(value || "").trim().toLowerCase();
}

async function resetPasswordRequest(email: string, password: string): Promise<ResetPasswordResponse> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let data: ResetPasswordResponse = {};
  try {
    data = (await response.json()) as ResetPasswordResponse;
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to reset password. Verify OTP first.");
  }

  return data;
}

export default function ResetPasswordPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [email] = useState(() => normalizeEmail(search.get("email") || localStorage.getItem("pendingOtpEmail")));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPageLoading(false);
      setIsVisible(true);
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!email) {
      navigate("/auth/forget-password", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 2600 : 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (text: string, kind: ToastKind) => setToast({ text, kind });

  const resetPassword = async () => {
    if (!password || !confirmPassword) {
      notify("Please fill in all fields", "error");
      return;
    }

    if (password !== confirmPassword) {
      notify("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordRequest(email, password);
      notify(res.message || "Password updated successfully.", "success");
      localStorage.removeItem("pendingOtpEmail");
      window.setTimeout(() => navigate("/login?reset=1"), 450);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to reset password. Verify OTP first.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="back-btn" onClick={() => navigate("/login")} aria-label="Back to login">
        <i className="bi bi-arrow-left" />
      </button>

      {toast && <div className={`auth-toast ${toast.kind}`}>{toast.text}</div>}

      <div className={`page-loading-fade ${pageLoading ? "show" : "hide"}`} aria-hidden={!pageLoading}>
        {pageLoading && (
          <div className="page-loading">
            <div className="loader" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="container" style={{ gridTemplateColumns: "minmax(0, 1fr)", width: "min(620px, 100%)" }}>
        <div className={`right fade-wrapper ${isVisible ? "show" : ""}`} style={{ borderRight: 0 }}>
          <div className="logo-container">
            <img src={titleLogo} className="logo-img" alt="HireAble logo" />
          </div>

          <h2 className="form-h2">Reset Password</h2>
          <p className="form-p">
            Create a new password for <strong>{email || "your account"}</strong>
          </p>

          <div className="form-group password-group">
            <label className="field-label" htmlFor="reset-password">
              New Password
            </label>
            <div className="password-wrapper icon-group">
              <i className="bi bi-lock-fill input-icon" />
              <input
                id="reset-password"
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Enter new password"
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              {!!password && (
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                </button>
              )}
            </div>
          </div>

          <div className="form-group password-group">
            <label className="field-label" htmlFor="reset-confirm-password">
              Confirm Password
            </label>
            <div className="password-wrapper icon-group">
              <i className="bi bi-shield-lock-fill input-icon" />
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                placeholder="Confirm new password"
                autoComplete="new-password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyUp={(e) => e.key === "Enter" && void resetPassword()}
              />
              {!!confirmPassword && (
                <button
                  type="button"
                  className="toggle-eye"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label="Toggle confirm password visibility"
                >
                  <i className={showConfirmPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                </button>
              )}
            </div>
          </div>

          <button className="btn" type="button" onClick={() => void resetPassword()} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <span>Update Password</span>}
          </button>

          <p className="auth-link">
            Remember your password?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              Back to login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

