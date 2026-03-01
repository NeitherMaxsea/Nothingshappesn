import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";
import "../../designer/login_page.css";
import titleLogo from "../../assets/proximity.png";
import supportVisual from "../../assets/workerlogin.png";

export default function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPageLoader, setShowPageLoader] = useState(true);
  const [pageLoaderFadingOut, setPageLoaderFadingOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showCompanyVerificationModal, setShowCompanyVerificationModal] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showSessionInUseModal, setShowSessionInUseModal] = useState(false);
  const [sessionInUseMessage] = useState(
    "This account is currently in use on another device.",
  );
  const [sessionInUseActionLoading, setSessionInUseActionLoading] = useState(false);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fadeStartTimer = window.setTimeout(() => {
      setPageLoaderFadingOut(true);
      setIsVisible(true);
    }, 500);
    const hideTimer = window.setTimeout(() => {
      setShowPageLoader(false);
    }, 760);
    return () => {
      window.clearTimeout(fadeStartTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("rejected") === "1") {
      void showLoginAlert(
        "error",
        "Registration Rejected",
        "We're sorry. Your registration was rejected because your PWD ID was not found.",
      );
    }
  }, [location.search]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const swalTransitionClass = {
    showClass: { popup: "pwd-apply-swal-show" },
    hideClass: { popup: "pwd-apply-swal-hide" },
  } as const;

  const showLoginAlert = (
    icon: "success" | "error" | "warning" | "info",
    title: string,
    text: string,
  ) => {
    const iconHtmlByType: Record<"success" | "error" | "warning" | "info", string> = {
      success: '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>',
      error: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
      info: '<i class="bi bi-info-circle-fill" aria-hidden="true"></i>',
    };

    return Swal.fire({
      ...swalTransitionClass,
      target: document.body,
      icon,
      iconHtml: iconHtmlByType[icon],
      title,
      text,
      confirmButtonText: "Okay",
      showCloseButton: true,
      customClass: {
        container: "pwd-apply-swal-container",
        popup: "pwd-apply-swal-popup",
        title: "pwd-apply-swal-title",
        htmlContainer: "pwd-apply-swal-text",
        confirmButton: "pwd-apply-swal-confirm",
        icon: "pwd-apply-swal-icon",
      },
      buttonsStyling: false,
      background: "#f2f2f2",
      color: "#1f2937",
      backdrop: "rgba(6, 24, 14, 0.58)",
      heightAuto: false,
      scrollbarPadding: false,
    });
  };

  const goBack = () => navigate("/landingpage");
  const goRegister = () => navigate("/role?force=1");

  const login = async () => {
    if (!email.trim()) {
      identifierInputRef.current?.setCustomValidity("Please fill out this field.");
      identifierInputRef.current?.reportValidity();
      return;
    }

    if (!password) {
      passwordInputRef.current?.setCustomValidity("Please fill out this field.");
      passwordInputRef.current?.reportValidity();
      return;
    }

    setLoading(true);
    setShowSessionInUseModal(false);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: email.trim(),
          password,
        }),
      });

      let data: Record<string, unknown> = {};
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message = typeof data.message === "string" ? data.message : "Login failed";
        await showLoginAlert("error", "Login Failed", message);
        return;
      }

      const user = (data.user && typeof data.user === "object") ? (data.user as Record<string, unknown>) : {};
      const userId = String(user.id || "").trim();
      const userName = String(user.name || "").trim();
      const username = String(user.username || "").trim();
      const userEmail = String(user.email || normalizedEmail || "").trim().toLowerCase();
      const userRole = String(user.role || "").trim().toLowerCase();
      const registrationType = String(user.registrationType || "").trim().toLowerCase();

      if (userId) {
        localStorage.setItem("userUid", userId);
        localStorage.setItem("uid", userId);
        localStorage.setItem("sessionUid", userId);
      }
      if (userName) {
        localStorage.setItem("userName", userName);
        localStorage.setItem("name", userName);
      }
      if (username) {
        localStorage.setItem("username", username);
      }
      if (userEmail) {
        localStorage.setItem("userEmail", userEmail);
        localStorage.setItem("email", userEmail);
      }
      if (userRole) {
        localStorage.setItem("userRole", userRole);
      }
      localStorage.setItem("userCollection", registrationType === "company" ? "admins" : "users");

      const nextPath = userRole === "applicant" ? "/applicant/job_list" : "/applicant/job_list";
      await showLoginAlert("success", "Login Successful", "Login successful!");
      navigate(nextPath);
    } catch {
      await showLoginAlert("error", "Connection Error", "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const confirmCompanyVerification = async () => {
    if (!verificationCode.trim()) {
      await showLoginAlert("warning", "Verification Code Required", "Please enter the verification code.");
      return;
    }
    setVerificationLoading(true);
    window.setTimeout(() => {
      setVerificationLoading(false);
      setShowCompanyVerificationModal(false);
      void showLoginAlert("success", "Login Successful", "Login successful!").then(() => navigate("/applicant/job_list"));
    }, 900);
  };

  const forceLoginAfterSessionInUse = async () => {
    if (!email.trim() || !password) {
      await showLoginAlert("warning", "Credentials Required", "Please enter your credentials again.");
      return;
    }
    setSessionInUseActionLoading(true);
    window.setTimeout(() => {
      setSessionInUseActionLoading(false);
      setShowSessionInUseModal(false);
      if (normalizedEmail.includes("company") || normalizedEmail.includes("admin")) {
        setShowCompanyVerificationModal(true);
        return;
      }
      void showLoginAlert("success", "Login Successful", "Login successful!").then(() => navigate("/applicant/job_list"));
    }, 900);
  };

  return (
    <div className="auth-page">
      <button type="button" className="back-btn" onClick={goBack} aria-label="Back to landing">
        <i className="bi bi-arrow-left" />
      </button>

      {showPageLoader && (
        <div className={`page-loading-fade ${pageLoaderFadingOut ? "hide" : "show"}`} aria-hidden={!showPageLoader}>
          <div className="page-loading">
            <div className="login-landing-loader" aria-hidden="true" />
          </div>
        </div>
      )}

      <div className="container">
        <div className={`right fade-wrapper ${isVisible ? "show" : ""}`}>
          <div className="logo-container">
            <img src={titleLogo} className="logo-img" alt="HireAble logo" />
          </div>

          <span className="auth-pill">Secure Sign In</span>
          <h2 className="form-h2">Welcome Back</h2>
          <p className="form-p">Your journey to meaningful and inclusive employment starts here.</p>

          <div className="form-group">
            <label className="field-label" htmlFor="login-identifier">
              Email or Username
            </label>
            <div className="icon-group">
              <i className="bi bi-envelope-fill input-icon" />
              <input
                ref={identifierInputRef}
                id="login-identifier"
                type="text"
                placeholder="Enter email or username"
                value={email}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setEmail(e.target.value);
                }}
                autoComplete="username"
                required
                onKeyUp={(e) => e.key === "Enter" && login()}
              />
            </div>
          </div>

          <div className="form-group password-group">
            <label className="field-label" htmlFor="login-password">
              Password
            </label>
            <div className="password-wrapper icon-group">
              <i className="bi bi-lock-fill input-icon" />
              <input
                ref={passwordInputRef}
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setPassword(e.target.value);
                }}
                autoComplete="current-password"
                required
                onKeyUp={(e) => e.key === "Enter" && login()}
              />
              {!!password && (
                <button type="button" className="toggle-eye" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                  <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                </button>
              )}
            </div>

            <div className="forgot-password">
              <Link to="/auth/forget-password">Forgot password?</Link>
            </div>
          </div>

          <button className="btn" type="button" onClick={login} disabled={loading}>
            {loading ? <span className="spinner" aria-hidden="true" /> : <span>Log In</span>}
          </button>

          <p className="auth-link">
            Don&apos;t have an account? <a href="#" onClick={(e) => { e.preventDefault(); goRegister(); }}>Register here</a>
          </p>

          <div className="divider">
            <span>OR</span>
          </div>

          <button className="google-btn" type="button" disabled>
            Continue with Google (coming soon)
          </button>
        </div>

        <aside className="auth-visual" aria-label="Community support visual">
          <img src={supportVisual} alt="Supportive community assistance" className="auth-visual-img" />
          <div className="auth-visual-copy">
            <span className="auth-visual-badge">
              <i className="bi bi-universal-access-circle" /> Inclusive Employment
            </span>
            <p className="auth-visual-quote">
              “HireAble helps connect PWD jobseekers with inclusive employers and accessible opportunities.”
            </p>
            <div className="auth-visual-person">
              <strong>HireAble Platform</strong>
              <span>PWD Employment Assistance</span>
            </div>
          </div>
        </aside>
      </div>

      {showCompanyVerificationModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Company Admin Verification">
          <div className="company-modal">
            <h3>Company Admin Verification</h3>
            <p className="modal-text">Enter your 6-digit company admin verification code.</p>
            <div className="modal-input-wrap">
              <input
                className="modal-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter verification code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => { setShowCompanyVerificationModal(false); setVerificationCode(""); }} disabled={verificationLoading}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={confirmCompanyVerification} disabled={verificationLoading}>
                {verificationLoading ? <span className="spinner" aria-hidden="true" /> : <span>Verify &amp; Login</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSessionInUseModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Account In Use">
          <div className="company-modal">
            <h3>Account In Use</h3>
            <p className="modal-text">{sessionInUseMessage}</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowSessionInUseModal(false)} disabled={sessionInUseActionLoading}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={forceLoginAfterSessionInUse} disabled={sessionInUseActionLoading}>
                {sessionInUseActionLoading ? <span className="spinner" aria-hidden="true" /> : <span>Log Out Other Device</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}










