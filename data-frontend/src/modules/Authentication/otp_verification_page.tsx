import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/login_page.css";
import "../../designer/otp_verification_page.css";
import titleLogo from "../../assets/titlelogo.png";
import otpVerificationGif from "../../assets/Verification Code - OTP.gif";

type ToastKind = "success" | "error" | "warning";

type ToastState = {
  text: string;
  kind: ToastKind;
} | null;

type VerifyOtpResponse = {
  valid?: boolean;
  success?: boolean;
  message?: string;
};

function normalizeEmail(value: string | null): string {
  return String(value || "").trim().toLowerCase();
}

async function verifyOtpRequest(email: string, otp: string, mode: string): Promise<VerifyOtpResponse> {
  const response = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, mode }),
  });

  let data: VerifyOtpResponse = {};
  try {
    data = (await response.json()) as VerifyOtpResponse;
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || "Incorrect or expired OTP");
    (error as Error & { responseData?: VerifyOtpResponse }).responseData = data;
    throw error;
  }

  return data;
}

async function sendOtpRequest(email: string, mode?: string): Promise<void> {
  const response = await fetch("/api/auth/send-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: mode || undefined }),
  });

  if (!response.ok) {
    throw new Error("Failed to resend OTP");
  }
}

export default function OtpVerificationPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const search = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [email] = useState(() =>
    normalizeEmail(search.get("email") || localStorage.getItem("pendingOtpEmail")),
  );
  const mode = (search.get("mode") || "").trim().toLowerCase();

  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [otpStatus, setOtpStatus] = useState<"idle" | "error" | "success">("idle");
  const [redirecting, setRedirecting] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const maxResend = 2;
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const notify = (text: string, kind: ToastKind) => setToast({ text, kind });

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    clearTimer();
    setCanResend(false);
    setCountdown(60);

    timerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearTimer();
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    const enterId = window.requestAnimationFrame(() => setPageReady(true));

    if (!email) {
      notify("Missing OTP email. Please request OTP again.", "error");
      window.setTimeout(() => navigate("/login", { replace: true }), 400);
      return () => window.cancelAnimationFrame(enterId);
    }

    localStorage.setItem("pendingOtpEmail", email);

    if (search.get("otpSendFailed") === "1") {
      notify("OTP not sent earlier. Click Resend OTP.", "warning");
    }

    startTimer();
    const focusId = window.setTimeout(() => otpRefs.current[0]?.focus(), 30);

    return () => {
      window.cancelAnimationFrame(enterId);
      window.clearTimeout(focusId);
      clearTimer();
    };
  }, [email, navigate, search]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.kind === "error" ? 2600 : 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleVerify = async () => {
    const otpValue = otpDigits.join("");
    if (otpValue.length !== 6) {
      setOtpStatus("error");
      notify("Invalid OTP", "error");
      return;
    }

    setLoading(true);
    let willRedirect = false;

    try {
      const res = await verifyOtpRequest(email, otpValue, mode);
      const isValid = res.valid === true || res.success === true;

      if (!isValid) {
        throw new Error(res.message || "Incorrect or expired OTP");
      }

      setOtpStatus("success");
      notify("Email verified successfully.", "success");
      localStorage.removeItem("pendingOtpEmail");
      await new Promise((resolve) => window.setTimeout(resolve, 550));

      if (mode === "reset") {
        willRedirect = true;
        setRedirecting(true);
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`);
        return;
      }

      if (mode === "register") {
        willRedirect = true;
        setRedirecting(true);
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        navigate(`/auth/approval-status?email=${encodeURIComponent(email)}`, { replace: true });
        return;
      }

      willRedirect = true;
      setRedirecting(true);
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      navigate("/login?verified=1", { replace: true });
    } catch (error) {
      setOtpStatus("error");
      const message =
        error instanceof Error
          ? error.message
          : "Incorrect or expired OTP";
      notify(message, "error");
    } finally {
      if (!willRedirect) {
        setLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (!canResend || resendCount >= maxResend || !email) return;

    try {
      await sendOtpRequest(email, mode || undefined);
      setResendCount((prev) => prev + 1);
      setOtpStatus("idle");
      startTimer();
      notify("OTP resent", "success");
    } catch {
      notify("Failed to resend OTP. Check backend PHPMailer/SMTP settings.", "error");
    }
  };

  const onOtpInput = (value: string, index: number) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (otpStatus !== "idle") {
      setOtpStatus("idle");
    }

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const onOtpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === "Enter") {
      handleVerify();
    }
  };

  const onOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
    setOtpDigits(next);
    if (otpStatus !== "idle") {
      setOtpStatus("idle");
    }

    const nextIndex = Math.min(pasted.length, 5);
    window.setTimeout(() => otpRefs.current[nextIndex]?.focus(), 0);
    event.preventDefault();
  };

  return (
    <div className="auth-page">
      <button className="back-btn" onClick={() => navigate("/login")} aria-label="Back to login">
        <i className="bi bi-arrow-left" />
      </button>

      {toast && <div className={`auth-toast ${toast.kind === "warning" ? "success" : toast.kind}`}>{toast.text}</div>}

      {redirecting && (
        <div className="otp-page-loading" role="status" aria-live="polite">
          <div className="loader" aria-hidden="true" />
        </div>
      )}

      <div className="container otp-container">
        <div className={`right otp-right fade-wrapper ${pageReady ? "show" : ""}`}>
          <div className="logo-container">
            <img src={titleLogo} className="logo-img" alt="HireAble logo" />
          </div>

          <span className="auth-pill otp-pill">Security Check</span>
          <div className="otp-anim-wrap" aria-hidden="true">
            <img src={otpVerificationGif} alt="" className="otp-anim-gif" />
          </div>
          <h2 className="form-h2">OTP Verification</h2>
          <p className="form-p">
            We sent a 6-digit code to <strong>{email || "your email"}</strong>
          </p>

          <p className="otp-helper-text">Paste or type the 6 digits we sent to your email.</p>

          <div className="otp-group">
            <label className="otp-label" htmlFor="otp-digit-0">
              OTP Code
            </label>
            <div
              className={`otp-inputs ${otpStatus === "error" ? "otp-error" : ""} ${
                otpStatus === "success" ? "otp-success" : ""
              }`}
            >
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-digit-${index}`}
                  className="otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onOtpInput(e.target.value, index)}
                  onKeyDown={(e) => onOtpKeyDown(e, index)}
                  onPaste={onOtpPaste}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <p className={`otp-inline-status ${otpStatus}`}>
            {otpStatus === "error" && "Incorrect code. Please try again."}
            {otpStatus === "success" && "Code accepted. Redirecting..."}
            {otpStatus === "idle" && "Tip: You can paste the full 6-digit code."}
          </p>

          <button className="btn" type="button" onClick={handleVerify} disabled={loading}>
            {loading ? (redirecting ? "Loading..." : "Verifying...") : "Verify OTP"}
          </button>

          <div className="otp-resend-card">
            <p className="auth-link otp-auth-link">
            <span className="otp-resend-prompt">Didn&apos;t receive the code? </span>
            {resendCount < maxResend ? (
              <>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleResend();
                  }}
                  style={{
                    pointerEvents: canResend ? "auto" : "none",
                    opacity: canResend ? 1 : 0.5,
                  }}
                >
                  Resend OTP
                </a>
                {!canResend && <span> (wait {countdown}s)</span>}
              </>
            ) : (
              <span className="otp-limit">Resend limit reached</span>
            )}
            </p>
          </div>

          <p className="auth-link otp-footer-link">
            Wrong email? <Link to="/register">Go back to registration</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

