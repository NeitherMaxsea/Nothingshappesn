import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/login_page.css";
import "../../designer/otp_verification_page.css";
import forgotVisual from "../../assets/forgot password.gif";

type ToastKind = "success" | "error";
type ToastState = { text: string; kind: ToastKind } | null;

async function sendOtpRequest(email: string): Promise<void> {
  const response = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: "reset" }),
  });

  let data: { message?: string } = {};
  try {
    data = (await response.json()) as { message?: string };
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Failed to send OTP");
  }
}

export default function ForgotPasswordPage(): React.JSX.Element {
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "error" ? 2600 : 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (text: string, kind: ToastKind) => setToast({ text, kind });

  const sendReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      emailInputRef.current?.setCustomValidity("Please fill out this field.");
      emailInputRef.current?.reportValidity();
      return;
    }

    setLoading(true);
    try {
      await sendOtpRequest(normalizedEmail);
      localStorage.setItem("pendingOtpEmail", normalizedEmail);
      notify("OTP sent to your email.", "success");

      window.setTimeout(() => {
        navigate(`/auth/verify-otp?email=${encodeURIComponent(normalizedEmail)}&mode=reset`);
      }, 350);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to send OTP", "error");
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
          <div
            className="otp-anim-wrap"
            aria-hidden="true"
            style={{ marginTop: 2, width: "min(420px, 96%)", minHeight: 190 }}
          >
            <img
              src={forgotVisual}
              alt=""
              className="otp-anim-gif"
              style={{ width: "min(400px, 100%)", height: 190 }}
            />
          </div>

          <h2 className="form-h2">Forgot Password</h2>
          <p className="form-p">
            Enter your email and we&apos;ll send you a one-time password (OTP).
          </p>

          <div className="form-group">
            <label className="field-label" htmlFor="forgot-email">
              Email
            </label>
            <div className="icon-group">
              <i className="bi bi-envelope-fill input-icon" />
              <input
                ref={emailInputRef}
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                autoComplete="email"
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setEmail(e.target.value);
                }}
                onKeyUp={(e) => e.key === "Enter" && void sendReset()}
              />
            </div>
          </div>

          <button className="btn" type="button" onClick={() => void sendReset()} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <span>Send OTP</span>}
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

