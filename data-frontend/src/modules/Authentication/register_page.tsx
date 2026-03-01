import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/register_page.css";
import titleLogo from "../../assets/proximity.png";
import applicantVisual from "../../assets/PWD_worker.png";
import employerVisual from "../../assets/image2.png";

type ToastKind = "success" | "error" | "warning";

type ToastState = {
  text: string;
  kind: ToastKind;
} | null;

type RoleType = "applicant" | "employer" | "";

const APPLICANT_DEFAULT_PROVINCE = "Cavite";
const APPLICANT_DEFAULT_CITY = "Dasmariñas City";
const DASMA_BARANGAYS = [
  "Burol",
  "Burol I",
  "Burol II",
  "Burol III",
  "Datu Esmael",
  "Emmanuel Bergado I",
  "Emmanuel Bergado II",
  "Fatima I",
  "Fatima II",
  "Fatima III",
  "H-2",
  "Langkaan I",
  "Langkaan II",
  "Luzviminda I",
  "Luzviminda II",
  "Paliparan I",
  "Paliparan II",
  "Paliparan III",
  "Sabang",
  "Salawag",
  "Salitran I",
  "Salitran II",
  "Salitran III",
  "Salitran IV",
  "Sampaloc I",
  "Sampaloc II",
  "Sampaloc III",
  "Sampaloc IV",
  "Sampaloc V",
  "San Agustin I",
  "San Agustin II",
  "San Andres I",
  "San Andres II",
  "San Antonio De Padua I",
  "San Antonio De Padua II",
  "San Dionisio",
  "San Esteban",
  "San Francisco I",
  "San Francisco II",
  "San Isidro Labrador I",
  "San Isidro Labrador II",
  "San Jose",
  "San Juan I",
  "San Juan II",
  "San Lorenzo Ruiz I",
  "San Lorenzo Ruiz II",
  "San Luis I",
  "San Luis II",
  "San Manuel I",
  "San Manuel II",
  "San Mateo",
  "San Miguel",
  "San Nicolas I",
  "San Nicolas II",
  "San Roque",
  "San Simon",
  "Santa Cristina I",
  "Santa Cristina II",
  "Santa Fe",
  "Santa Lucia",
  "Santa Maria",
  "Santo Cristo",
  "Santo Nino I",
  "Santo Nino II",
  "Victoria Reyes",
  "Zone I",
  "Zone I-A",
  "Zone II",
  "Zone III",
  "Zone IV",
];

type PhoneCountryMeta = {
  flag: string;
  country: string;
  codeHint: string;
};

function detectPhoneCountry(value: string): PhoneCountryMeta {
  const raw = String(value || "").trim();
  const compact = raw.replace(/\s+/g, "");
  const digits = compact.replace(/[^\d+]/g, "");

  if (!digits) {
    return { flag: "🇵🇭", country: "Philippines", codeHint: "Use +63 or 09..." };
  }
  if (digits.startsWith("+63") || /^09\d*/.test(digits)) {
    return { flag: "🇵🇭", country: "Philippines", codeHint: "+63" };
  }
  if (digits.startsWith("+1")) {
    return { flag: "🇺🇸", country: "United States / Canada", codeHint: "+1" };
  }
  if (digits.startsWith("+44")) {
    return { flag: "🇬🇧", country: "United Kingdom", codeHint: "+44" };
  }
  if (digits.startsWith("+61")) {
    return { flag: "🇦🇺", country: "Australia", codeHint: "+61" };
  }
  if (digits.startsWith("+81")) {
    return { flag: "🇯🇵", country: "Japan", codeHint: "+81" };
  }

  return { flag: "🌍", country: "Unknown / Other Country", codeHint: "Check country code" };
}

export default function RegisterPage(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [disabilityType, setDisabilityType] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [manualAge, setManualAge] = useState("");
  const [addressProvince, setAddressProvince] = useState(APPLICANT_DEFAULT_PROVINCE);
  const [addressCity, setAddressCity] = useState(APPLICANT_DEFAULT_CITY);
  const [addressBarangay, setAddressBarangay] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [pwdIdNumber, setPwdIdNumber] = useState("");
  const [pwdIdImageFile, setPwdIdImageFile] = useState<File | null>(null);
  const [pwdIdImagePreview, setPwdIdImagePreview] = useState("");
  const [applicantStep, setApplicantStep] = useState<1 | 2 | 3>(1);
  const [stepTransitionLoading, setStepTransitionLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const birthDateInputRef = useRef<HTMLInputElement | null>(null);
  const pwdIdImageInputRef = useRef<HTMLInputElement | null>(null);
  const [showPwdIdPreviewModal, setShowPwdIdPreviewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("");
  const [uiLanguage, setUiLanguage] = useState<"fil" | "en">("fil");
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [toastClosing, setToastClosing] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const savedLanguage = (localStorage.getItem("uiLanguage") || "").trim().toLowerCase();
    if (savedLanguage === "en" || savedLanguage === "fil") {
      setUiLanguage(savedLanguage);
    }
    const query = new URLSearchParams(location.search);
    const queryRole = (query.get("role") || "").trim().toLowerCase();
    const roleFromQuery: RoleType =
      queryRole === "employer" || queryRole === "applicant" ? (queryRole as RoleType) : "";
    const roleFromStorage = (localStorage.getItem("selectedRole") || "").trim().toLowerCase();
    const storageRole: RoleType =
      roleFromStorage === "employer" || roleFromStorage === "applicant" ? (roleFromStorage as RoleType) : "";
    const role = roleFromQuery || storageRole;

    if (!role) {
      navigate("/role", { replace: true });
      return;
    }

    localStorage.setItem("selectedRole", role);
    setSelectedRole(role);
    const id = window.requestAnimationFrame(() => setIsVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, [location.search, navigate]);

  const isEnglish = uiLanguage === "en";

  const notify = (text: string, kind: ToastKind) => {
    setToastClosing(false);
    setToast({ text, kind });
  };

  const closeNotify = () => {
    if (!toast || toastClosing) return;
    setToastClosing(true);
    window.setTimeout(() => {
      setToast(null);
      setToastClosing(false);
    }, 180);
  };

  const inferPwdIdFromFileName = (fileName: string) => {
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const match = baseName.match(/([A-Za-z0-9-]{6,})/g);
    if (!match?.length) return "";

    // Prefer token with digits (common in IDs), fallback to longest token.
    const withDigits = match
      .filter((token) => /\d/.test(token))
      .sort((a, b) => b.length - a.length)[0];

    if (withDigits) return withDigits;
    return match.sort((a, b) => b.length - a.length)[0] || "";
  };


  const isEmployerRegistration = selectedRole === "employer";
  const isApplicantRegistration = selectedRole === "applicant";

  useEffect(() => {
    if (isApplicantRegistration) {
      setAddressProvince(APPLICANT_DEFAULT_PROVINCE);
      setAddressCity(APPLICANT_DEFAULT_CITY);
    }
  }, [isApplicantRegistration]);

  useEffect(() => {
    if (!pwdIdImageFile) {
      setPwdIdImagePreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(pwdIdImageFile);
    setPwdIdImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pwdIdImageFile]);

  const roleLabel = isEmployerRegistration
    ? (isEnglish ? "company admin" : "company admin")
    : isEnglish
      ? selectedRole || "applicant"
      : selectedRole === "applicant"
        ? "aplikante"
        : selectedRole || "aplikante";
  const registerSideVisual = isEmployerRegistration ? employerVisual : applicantVisual;

  const normalizedBirthDate = useMemo(() => birthDate, [birthDate]);

  const computedAge = useMemo(() => {
    if (!normalizedBirthDate) return "";
    const dob = new Date(normalizedBirthDate);
    if (Number.isNaN(dob.getTime())) return "";

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const dayDiff = today.getDate() - dob.getDate();

    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
    }

    if (age < 0) return "";
    return String(age);
  }, [normalizedBirthDate]);

  const displayedAge = normalizedBirthDate ? computedAge : manualAge;
  const contactPhoneMeta = useMemo(() => detectPhoneCountry(contactNumber), [contactNumber]);

  const passwordChecks = useMemo(
    () => ({
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    }),
    [password],
  );

  const rules = useMemo(() => {
    const companyOk = isEmployerRegistration
      ? !!companyName.trim() && !!companyAddress.trim() && !!companyIndustry.trim()
      : true;
    const applicantProfileOk = isApplicantRegistration
      ? !!disabilityType.trim() &&
        !!firstName.trim() &&
        !!lastName.trim() &&
        !!sex &&
        !!normalizedBirthDate &&
        !!addressProvince.trim() &&
        !!addressCity.trim() &&
        !!addressBarangay.trim() &&
        !!contactNumber.trim() &&
        !!preferredLanguage.trim() &&
        !!pwdIdNumber.trim() &&
        !!pwdIdImageFile
      : true;

    return {
      filled:
        !!username.trim() &&
        !!email.trim() &&
        companyOk &&
        applicantProfileOk &&
        !!password &&
        !!confirmPassword,
      length: password.length >= 8,
      categoriesMet: [passwordChecks.lower, passwordChecks.upper, passwordChecks.number, passwordChecks.special].filter(Boolean).length >= 3,
      noTripleRepeat: !/(.)\1\1/.test(password),
      match: password === confirmPassword && password.length > 0,
    };
  }, [
    isEmployerRegistration,
    isApplicantRegistration,
    companyName,
    companyAddress,
    companyIndustry,
    disabilityType,
    firstName,
    lastName,
    sex,
    normalizedBirthDate,
    addressProvince,
    addressCity,
    addressBarangay,
    contactNumber,
    preferredLanguage,
    pwdIdNumber,
    pwdIdImageFile,
    username,
    email,
    password,
    confirmPassword,
    passwordChecks,
  ]);

  const allValid = Object.values(rules).every(Boolean);

  const listMissingApplicantFields = (step: 1 | 2 | 3) => {
    if (step === 1) {
      const missing: string[] = [];
      if (!disabilityType.trim()) missing.push("Disability");
      if (!firstName.trim()) missing.push("First Name");
      if (!lastName.trim()) missing.push("Last Name");
      if (!sex) missing.push("Sex");
      if (!normalizedBirthDate) missing.push("Birth Date");
      if (!addressProvince.trim()) missing.push("Address Province");
      if (!addressCity.trim()) missing.push("City / Municipality");
      if (!addressBarangay.trim()) missing.push("Barangay");
      return missing;
    }

    if (step === 2) {
      const missing: string[] = [];
      if (!contactNumber.trim()) missing.push("Contact Number");
      if (!preferredLanguage.trim()) missing.push("Language");
      if (!pwdIdNumber.trim()) missing.push("PWD ID Number");
      if (!pwdIdImageFile) missing.push("PWD ID Image");
      return missing;
    }

    if (step === 3) {
      const missing: string[] = [];
      if (!email.trim()) missing.push("Email");
      if (!username.trim()) missing.push("Username");
      if (!password) missing.push("Password");
      if (!confirmPassword) missing.push("Confirm Password");
      return missing;
    }

    return [];
  };

  const validateRequiredFields = () => {
    if (isApplicantRegistration) {
      if (applicantStep === 1) {
        if (!disabilityType.trim() || !firstName.trim() || !lastName.trim() || !sex || !normalizedBirthDate || !addressProvince.trim() || !addressCity.trim() || !addressBarangay.trim()) {
          notify("Please complete all Step 1 fields.", "error");
          return false;
        }
      }
      if (applicantStep === 2) {
        if (!contactNumber.trim() || !preferredLanguage.trim() || !pwdIdNumber.trim() || !pwdIdImageFile) {
          notify("Please provide contact number, language, PWD ID number, and upload PWD ID image.", "error");
          return false;
        }
      }
    }

    if (!username.trim()) {
      firstInputRef.current?.setCustomValidity("Please fill out this field.");
      firstInputRef.current?.reportValidity();
      return false;
    }
    if (!email.trim()) {
      notify("Please enter your email.", "error");
      return false;
    }
    if (isEmployerRegistration && (!companyName.trim() || !companyAddress.trim() || !companyIndustry.trim())) {
      notify("Please complete all company details.", "error");
      return false;
    }
    return true;
  };

  const validateApplicantStep = (step: 1 | 2 | 3) => {
    const missing = listMissingApplicantFields(step);
    if (missing.length) {
      const labels = {
        1: "Personal Details",
        2: "PWD ID",
        3: "Account",
      } as const;
      notify(`Step ${step} (${labels[step]}): Please complete all required fields before proceeding.`, "error");
      return false;
    }
    return true;
  };

  const nextApplicantStep = () => {
    if (stepTransitionLoading) return;
    setStepTransitionLoading(true);
    window.setTimeout(() => {
      if (!validateApplicantStep(applicantStep)) {
        setStepTransitionLoading(false);
        return;
      }
      const nextStep = applicantStep < 3 ? ((applicantStep + 1) as 1 | 2 | 3) : applicantStep;
      setApplicantStep(nextStep);
      setStepTransitionLoading(false);
    }, 500);
  };

  const prevApplicantStep = () => {
    setApplicantStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  const register = async () => {
    if (!validateRequiredFields()) return;

    if (!allValid) {
      notify("Please meet all password requirements", "error");
      return;
    }

    setLoading(true);
    try {
      const normalizedRole = isEmployerRegistration ? "company_admin" : selectedRole;
      const payload = {
        name: username.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: normalizedRole,
        disabilityType: isApplicantRegistration ? disabilityType.trim() : null,
        firstName: isApplicantRegistration ? firstName.trim() : null,
        lastName: isApplicantRegistration ? lastName.trim() : null,
        sex: isApplicantRegistration ? sex : null,
        birthDate: isApplicantRegistration ? normalizedBirthDate || null : null,
        addressProvince: isApplicantRegistration ? addressProvince.trim() : null,
        addressCity: isApplicantRegistration ? addressCity.trim() : null,
        addressBarangay: isApplicantRegistration ? addressBarangay.trim() : null,
        contactNumber: isApplicantRegistration ? contactNumber.trim() : null,
        preferredLanguage: isApplicantRegistration ? preferredLanguage.trim() : null,
        pwdIdNumber: isApplicantRegistration ? pwdIdNumber.trim() : null,
        pwdIdImageName: isApplicantRegistration && pwdIdImageFile ? pwdIdImageFile.name : null,
        companyName: isEmployerRegistration ? companyName.trim() : null,
        companyAddress: isEmployerRegistration ? companyAddress.trim() : null,
        companyIndustry: isEmployerRegistration ? companyIndustry.trim() : null,
      };

      // Best-effort API call; fallback to demo success if backend route is unavailable.
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: Record<string, unknown> = {};
      let rawText = "";
      try {
        data = (await response.json()) as Record<string, unknown>;
      } catch {
        try {
          rawText = await response.text();
        } catch {
          rawText = "";
        }
        data = {};
      }

      if (!response.ok) {
        const validationErrors =
          data && typeof data === "object" && "errors" in data && data.errors && typeof data.errors === "object"
            ? (data.errors as Record<string, unknown>)
            : null;
        const firstValidationMessage = validationErrors
          ? Object.values(validationErrors)
              .flatMap((value) => (Array.isArray(value) ? value : [value]))
              .find((value) => typeof value === "string")
          : null;
        const message =
          (typeof firstValidationMessage === "string" && firstValidationMessage) ||
          (typeof data.message === "string" && data.message) ||
          (rawText ? `Server error (${response.status})` : "") ||
          "Registration failed";
        throw new Error(message);
      }

      const normalizedEmail = email.trim().toLowerCase();
      localStorage.removeItem("selectedRole");
      localStorage.setItem("pendingOtpEmail", normalizedEmail);

      if (!isEmployerRegistration) {
        localStorage.setItem("newApplicantNeedsProfileFill", normalizedEmail);
      } else {
        localStorage.removeItem("newApplicantNeedsProfileFill");
      }

      const otpRequired = data.otpRequired !== false;

      setWaitingApproval(true);

      window.setTimeout(() => {
        if (!otpRequired) {
          navigate("/login?force=1", { replace: true });
          return;
        }
        const params = new URLSearchParams({
          email: normalizedEmail,
          mode: "register",
        });
        if (data.otpSent === false) {
          params.set("otpSendFailed", "1");
        }
        navigate(`/auth/verify-otp?${params.toString()}`, { replace: true });
      }, 500);
    } catch (error) {
      setWaitingApproval(false);
      const message = error instanceof Error ? error.message : "Registration failed";
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-page">
      <button
        className="reg-back-btn"
        onClick={() => navigate("/role")}
        aria-label={isEnglish ? "Back to choose role" : "Bumalik sa pagpili ng role"}
      >
        <i className="bi bi-arrow-left" />
      </button>

      {toast && (
        <div
          className={`reg-notify-backdrop ${toastClosing ? "is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? "Notification" : "Abiso"}
        >
          <div className={`reg-notify-modal ${toast.kind} ${toastClosing ? "is-closing" : ""}`}>
            <button
              type="button"
              className="reg-notify-close"
               aria-label={isEnglish ? "Close notification" : "Isara ang abiso"}
              onClick={closeNotify}
            >
              <i className="bi bi-x-lg" />
            </button>

            <div className={`reg-notify-icon ${toast.kind}`} aria-hidden="true">
              <i
                className={`bi ${
                  toast.kind === "success"
                    ? "bi-check-circle"
                    : toast.kind === "warning"
                      ? "bi-exclamation-triangle"
                      : "bi-exclamation-triangle"
                }`}
              />
            </div>
            <h3 className="reg-notify-title">
              {toast.kind === "success"
                ? isEnglish
                  ? "Success"
                  : "Tagumpay"
                : toast.kind === "warning"
                  ? isEnglish
                    ? "Warning"
                    : "Babala"
                  : isEnglish
                    ? "Error"
                    : "Error"}
            </h3>
            <p className="reg-notify-message">{toast.text}</p>

            <div className="reg-notify-actions">
              <button
                type="button"
                className={`reg-notify-ok ${toast.kind === "success" ? "success" : toast.kind === "warning" ? "warning" : "error"}`}
                onClick={closeNotify}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {(loading || waitingApproval) && (
        <div
          className="reg-alert-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? "Registration status" : "Status ng rehistro"}
        >
          <div className="reg-alert-card reg-alert-card-loading">
            <div className="reg-bubble-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3 className="reg-alert-title">
              {waitingApproval
                ? isEnglish
                  ? "Registration submitted"
                  : "Naipasa na ang rehistro"
                : isEnglish
                  ? "Submitting registration"
                  : "Ipinapasa ang rehistro"}
            </h3>
            <p className="reg-alert-text">
              {waitingApproval
                ? isEnglish
                  ? "Please wait while your account is being reviewed and accepted by admin."
                  : "Maghintay habang nire-review at inaaprubahan ng admin ang iyong account."
                : isEnglish
                  ? "Please wait while we process your registration details..."
                  : "Maghintay habang pinoproseso ang iyong registration details..."}
            </p>
          </div>
        </div>
      )}

      {stepTransitionLoading && !loading && !waitingApproval && (
        <div
          className="reg-alert-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? "Step transition loading" : "Loading ng susunod na hakbang"}
        >
          <div className="reg-alert-card reg-alert-card-loading">
            <div className="reg-bubble-loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h3 className="reg-alert-title">{isEnglish ? "Please wait" : "Sandali lang"}</h3>
            <p className="reg-alert-text">
              {isEnglish
                ? `Proceeding to Step ${Math.min(applicantStep + 1, 3)}...`
                : `Pumupunta sa Hakbang ${Math.min(applicantStep + 1, 3)}...`}
            </p>
          </div>
        </div>
      )}

      <div
        className={`reg-container ${isApplicantRegistration ? `reg-applicant-step-${applicantStep}` : ""} ${
          stepTransitionLoading ? "reg-is-transitioning" : ""
        }`}
      >
        <div className={`reg-left ${isApplicantRegistration ? `reg-applicant-step-${applicantStep}` : ""}`}>
          <img
            src={registerSideVisual}
            alt={isEmployerRegistration ? "Employer registration visual" : "Applicant registration visual"}
            className="reg-worker"
          />
          {isApplicantRegistration && applicantStep === 3 && (
            <div className="reg-left-rules">
              <div className="reg-rules reg-rules-image">
                <strong>Your password must contain:</strong>
                <ul>
                  <li className={rules.length ? "valid" : ""}>At least 8 characters</li>
                  <li className={rules.categoriesMet ? "valid" : ""}>At least 3 of the following:</li>
                </ul>
                <ul className="sub-rules">
                  <li className={passwordChecks.lower ? "valid" : ""}>Lower case letters (a-z)</li>
                  <li className={passwordChecks.upper ? "valid" : ""}>Upper case letters (A-Z)</li>
                  <li className={passwordChecks.number ? "valid" : ""}>Numbers (0-9)</li>
                  <li className={passwordChecks.special ? "valid" : ""}>Special characters (e.g. !@#$%^&*)</li>
                </ul>
                <ul>
                  <li className={rules.noTripleRepeat ? "valid" : ""}>No more than 2 identical characters in a row</li>
                  <li className={rules.match ? "valid" : ""}>Passwords match</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div
          className={`reg-right ${isVisible ? "fade-in" : ""} ${
            isApplicantRegistration ? `reg-applicant-step-${applicantStep}` : ""
          }`}
        >
          <div className="reg-logo-container">
            <img src={titleLogo} className="reg-logo-img" alt="HireAble logo" />
          </div>

          <h2 className="reg-form-h2">{isEnglish ? "Create Account" : "Gumawa ng Account"}</h2>
          <p className="reg-form-p">
            {isEnglish
              ? "Create your account and start your journey to meaningful and inclusive employment."
              : "Gumawa ng account at simulan ang iyong paglalakbay tungo sa makabuluhan at inclusive na trabaho."}
          </p>

          <p className="reg-form-p reg-role-copy">
            {isEnglish ? "Registering as:" : "Nagrerehistro bilang:"}
            <span className={`reg-role-label ${selectedRole}`}> {roleLabel}</span>
          </p>

          {isApplicantRegistration && (
            <>
              <div className="reg-stepper" aria-label={isEnglish ? "Applicant registration steps" : "Mga hakbang sa rehistro ng aplikante"}>
                {[1, 2, 3].map((step) => {
                  const isDone = applicantStep > step;
                  const isActive = applicantStep === step;
                  return (
                  <button
                    key={step}
                    type="button"
                    className={`reg-step-chip ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    disabled={stepTransitionLoading}
                    onClick={() => {
                      if (step < applicantStep || validateApplicantStep(applicantStep)) {
                        setApplicantStep(step as 1 | 2 | 3);
                      }
                    }}
                  >
                    <span>{isDone ? <i className="bi bi-check-lg" aria-hidden="true" /> : step}</span>
                    <small>
                      {step === 1 ? (isEnglish ? "Details" : "Detalye") : step === 2 ? "PWD ID" : isEnglish ? "Account" : "Account"}
                    </small>
                  </button>
                  );
                })}
              </div>

              <div className={`reg-step-panel step-${applicantStep} ${stepTransitionLoading ? "is-transitioning" : ""}`}>
              {applicantStep === 1 && (
                <>
                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-disability">{isEnglish ? "Disability" : "Kapansanan"}</label>
                    <div className="reg-input-wrapper reg-icon-group reg-select-wrap">
                      <i className="bi bi-universal-access reg-input-icon" />
                      <select
                        id="reg-disability"
                        value={disabilityType}
                        onChange={(e) => setDisabilityType(e.target.value)}
                        className="reg-select"
                      >
                        <option value="">{isEnglish ? "Select disability" : "Piliin ang kapansanan"}</option>
                        <option value="visual impairment">Visual Impairment</option>
                        <option value="hearing impairment">Hearing Impairment</option>
                        <option value="speech impairment">Speech Impairment</option>
                        <option value="physical disability">Physical Disability</option>
                        <option value="psychosocial disability">Psychosocial Disability</option>
                        <option value="intellectual disability">Intellectual Disability</option>
                        <option value="learning disability">Learning Disability</option>
                        <option value="multiple disability">Multiple Disability</option>
                        <option value="rare disease">Rare Disease</option>
                      </select>
                    </div>
                  </div>

                  <div className="reg-grid-2">
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-first-name">{isEnglish ? "First Name" : "Pangalan"}</label>
                      <div className="reg-input-wrapper reg-icon-group">
                        <i className="bi bi-person-fill reg-input-icon" />
                        <input id="reg-first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={isEnglish ? "First name" : "Ilagay ang pangalan"} />
                      </div>
                    </div>
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-last-name">{isEnglish ? "Last Name" : "Apelyido"}</label>
                      <div className="reg-input-wrapper reg-icon-group">
                        <i className="bi bi-person-badge-fill reg-input-icon" />
                        <input id="reg-last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={isEnglish ? "Last name" : "Ilagay ang apelyido"} />
                      </div>
                    </div>
                  </div>

                  <div className="reg-grid-3">
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-sex">{isEnglish ? "Sex" : "Kasarian"}</label>
                      <div className="reg-input-wrapper reg-icon-group reg-select-wrap">
                        <i className="bi bi-gender-ambiguous reg-input-icon" />
                        <select id="reg-sex" value={sex} onChange={(e) => setSex(e.target.value)} className="reg-select">
                          <option value="">{isEnglish ? "Select sex" : "Piliin ang kasarian"}</option>
                          <option value="male">{isEnglish ? "Male" : "Lalaki"}</option>
                          <option value="female">{isEnglish ? "Female" : "Babae"}</option>
                          <option value="prefer_not_say">{isEnglish ? "Prefer not to say" : "Mas gustong hindi sabihin"}</option>
                        </select>
                      </div>
                    </div>
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-age">{isEnglish ? "Age" : "Edad"}</label>
                      <div className="reg-input-wrapper reg-icon-group">
                        <i className="bi bi-person-lines-fill reg-input-icon" />
                          <input
                            id="reg-age"
                            type="text"
                            value={displayedAge}
                            placeholder={normalizedBirthDate ? (isEnglish ? "Auto" : "Awtomatiko") : isEnglish ? "Enter age" : "Ilagay ang edad"}
                            readOnly={!!normalizedBirthDate}
                            aria-readonly={!!normalizedBirthDate}
                            inputMode="numeric"
                            onFocus={(e) => {
                              if (normalizedBirthDate) {
                                e.currentTarget.blur();
                              }
                            }}
                            onChange={(e) => {
                              if (normalizedBirthDate) return;
                              setManualAge(e.target.value.replace(/[^\d]/g, "").slice(0, 3));
                            }}
                          />
                      </div>
                    </div>
                      <div className="reg-form-group">
                        <label className="reg-field-label" htmlFor="reg-birth-date">{isEnglish ? "Birth Date" : "Araw ng Kapanganakan"}</label>
                        <div className="reg-input-wrapper reg-icon-group">
                          <button
                            type="button"
                            className="reg-input-icon-btn"
                            aria-label={isEnglish ? "Open birth date calendar" : "Buksan ang kalendaryo ng kapanganakan"}
                            onClick={() => {
                              const input = birthDateInputRef.current;
                              if (!input) return;
                              input.focus();
                              (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                            }}
                          >
                            <i className="bi bi-calendar-event-fill reg-input-icon" />
                          </button>
                          <input
                            id="reg-birth-date"
                            type="date"
                            ref={birthDateInputRef}
                            value={birthDate}
                            max={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="reg-grid-2">
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-province">{isEnglish ? "Address Province" : "Probinsya"}</label>
                      <div className="reg-input-wrapper reg-icon-group">
                        <i className="bi bi-pin-map-fill reg-input-icon" />
                          <input
                            id="reg-province"
                            type="text"
                            value={addressProvince}
                            readOnly
                            aria-readonly="true"
                            onFocus={(e) => e.currentTarget.blur()}
                          />
                      </div>
                    </div>
                    <div className="reg-form-group">
                      <label className="reg-field-label" htmlFor="reg-city">{isEnglish ? "City / Municipality" : "Lungsod / Munisipalidad"}</label>
                      <div className="reg-input-wrapper reg-icon-group">
                        <i className="bi bi-geo-alt-fill reg-input-icon" />
                          <input
                            id="reg-city"
                            type="text"
                            value={addressCity}
                            readOnly
                            aria-readonly="true"
                            onFocus={(e) => e.currentTarget.blur()}
                          />
                      </div>
                    </div>
                  </div>

                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-barangay">Barangay (Dasmariñas)</label>
                    <div className="reg-input-wrapper reg-icon-group reg-select-wrap">
                      <i className="bi bi-signpost-split-fill reg-input-icon" />
                      <select
                        id="reg-barangay"
                        value={addressBarangay}
                        onChange={(e) => setAddressBarangay(e.target.value)}
                        className="reg-select"
                      >
                        <option value="">{isEnglish ? "Select barangay" : "Piliin ang barangay"}</option>
                        {DASMA_BARANGAYS.map((barangay) => (
                          <option key={barangay} value={barangay}>
                            {barangay}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {applicantStep === 2 && (
                <>
                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-contact-number">{isEnglish ? "Contact Number" : "Numero ng Telepono"}</label>
                    <div className="reg-input-wrapper reg-icon-group">
                      <i className="bi bi-telephone-fill reg-input-icon" />
                      <input
                        id="reg-contact-number"
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value.replace(/[^\d+]/g, "").slice(0, 15))}
                        placeholder={isEnglish ? "Enter contact number" : "Ilagay ang numero ng telepono"}
                        inputMode="tel"
                      />
                    </div>
                    <p className="reg-field-help">
                      <span style={{ marginRight: 6 }}>{contactPhoneMeta.flag}</span>
                      {contactPhoneMeta.country} {contactPhoneMeta.codeHint ? `(${contactPhoneMeta.codeHint})` : ""}
                    </p>
                  </div>

                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-pwd-id-number">{isEnglish ? "PWD ID Number" : "PWD ID Number"}</label>
                    <div className="reg-input-wrapper reg-icon-group">
                      <i className="bi bi-credit-card-2-front-fill reg-input-icon" />
                      <input id="reg-pwd-id-number" type="text" value={pwdIdNumber} onChange={(e) => setPwdIdNumber(e.target.value)} placeholder={isEnglish ? "Enter PWD ID number" : "Ilagay ang PWD ID number"} />
                    </div>
                  </div>

                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-language">{isEnglish ? "Language" : "Wika"}</label>
                    <div className="reg-input-wrapper reg-icon-group reg-select-wrap">
                      <i className="bi bi-translate reg-input-icon" />
                      <select
                        id="reg-language"
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="reg-select"
                      >
                        <option value="">{isEnglish ? "Select language" : "Piliin ang wika"}</option>
                        <option value="Filipino">Filipino</option>
                        <option value="English">English</option>
                        <option value="Filipino & English">Filipino & English</option>
                        <option value="Bisaya/Cebuano">Bisaya/Cebuano</option>
                        <option value="Ilocano">Ilocano</option>
                        <option value="Other">{isEnglish ? "Other" : "Iba pa"}</option>
                      </select>
                    </div>
                  </div>

                  <div className="reg-form-group">
                    <label className="reg-field-label" htmlFor="reg-pwd-id-image">
                      {isEnglish ? "Attachment Upload (PWD ID Image)" : "Pag-upload ng Attachment (Larawan ng PWD ID)"}
                    </label>
                      <label className="reg-upload-box" htmlFor="reg-pwd-id-image">
                        <input
                          ref={pwdIdImageInputRef}
                          id="reg-pwd-id-image"
                          type="file"
                          accept="image/*"
                        className="reg-hidden-file"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setPwdIdImageFile(file);

                          if (!file) return;
                          if (pwdIdNumber.trim()) return;

                          const inferred = inferPwdIdFromFileName(file.name);
                          if (inferred) {
                            setPwdIdNumber(inferred);
                            notify(isEnglish ? "PWD ID number auto-filled from uploaded file name." : "Awtomatikong nailagay ang PWD ID number mula sa pangalan ng file.", "success");
                          }
                        }}
                      />
                      <i className="bi bi-cloud-arrow-up-fill" />
                      <span>{pwdIdImageFile ? pwdIdImageFile.name : isEnglish ? "Upload PWD ID image" : "Mag-upload ng larawan ng PWD ID"}</span>
                      </label>
                    </div>
  
                    {pwdIdImageFile && (
                      <div className="reg-upload-file-actions" role="group" aria-label={isEnglish ? "Uploaded PWD ID image actions" : "Mga aksyon sa PWD ID image"}>
                        <button
                          type="button"
                          className="reg-upload-file-btn"
                          onClick={() => {
                            if (!pwdIdImagePreview) return;
                            setShowPwdIdPreviewModal(true);
                          }}
                          disabled={!pwdIdImagePreview}
                        >
                          <i className="bi bi-eye" /> {isEnglish ? "View" : "Tingnan"}
                        </button>
                        <button
                          type="button"
                          className="reg-upload-file-btn danger"
                          onClick={() => {
                            setPwdIdImageFile(null);
                            setPwdIdImagePreview("");
                            if (pwdIdImageInputRef.current) {
                              pwdIdImageInputRef.current.value = "";
                            }
                          }}
                        >
                          <i className="bi bi-trash" /> {isEnglish ? "Delete" : "Tanggalin"}
                        </button>
                      </div>
                    )}
                  </>
                )}

              {applicantStep === 3 && (
                <>
                  <div className="reg-step-3-layout">
                    <div className="reg-step-3-fields">
                      <div className="reg-form-group">
                        <label className="reg-field-label" htmlFor="reg-email">{isEnglish ? "Email" : "Email"}</label>
                        <div className="reg-input-wrapper reg-icon-group">
                          <i className="bi bi-envelope-fill reg-input-icon" />
                          <input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isEnglish ? "Enter email" : "Ilagay ang email"}
                            autoComplete="email"
                          />
                        </div>
                      </div>

                      <div className="reg-form-group">
                        <label className="reg-field-label" htmlFor="reg-username">{isEnglish ? "Username" : "Username"}</label>
                        <div className="reg-input-wrapper reg-icon-group">
                          <i className="bi bi-person-fill reg-input-icon" />
                          <input
                            ref={firstInputRef}
                            id="reg-username"
                            type="text"
                            value={username}
                            onChange={(e) => {
                              e.currentTarget.setCustomValidity("");
                              setUsername(e.target.value);
                            }}
                            placeholder={isEnglish ? "Enter username" : "Ilagay ang username"}
                            autoComplete="username"
                          />
                        </div>
                      </div>

                      <div className="reg-form-group">
                        <label className="reg-field-label" htmlFor="reg-password">{isEnglish ? "Password" : "Password"}</label>
                        <div className="reg-password-wrapper reg-icon-group">
                          <i className="bi bi-lock-fill reg-input-icon" />
                          <input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEnglish ? "Enter password" : "Ilagay ang password"} autoComplete="new-password" />
                          {!!password && (
                            <button type="button" className="reg-toggle-eye" onClick={() => setShowPassword((v) => !v)} aria-label={isEnglish ? "Toggle password visibility" : "Ipakita/itago ang password"}>
                              <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="reg-form-group">
                        <label className="reg-field-label" htmlFor="reg-confirm-password">{isEnglish ? "Confirm Password" : "Kumpirmahin ang Password"}</label>
                        <div className="reg-password-wrapper reg-icon-group">
                          <i className="bi bi-shield-lock-fill reg-input-icon" />
                          <input id="reg-confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={isEnglish ? "Confirm password" : "Kumpirmahin ang password"} autoComplete="new-password" />
                          {!!confirmPassword && (
                            <button type="button" className="reg-toggle-eye" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={isEnglish ? "Toggle confirm password visibility" : "Ipakita/itago ang kumpirmang password"}>
                              <i className={showConfirmPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                            </button>
                          )}
                        </div>
                        <p className="reg-field-help">{isEnglish ? "Make sure your password and confirm password match." : "Siguraduhing magkapareho ang password at kumpirmang password."}</p>
                      </div>
                    </div>

                    <div className="reg-rules reg-rules-side">
                      <strong>Your password must contain:</strong>
                      <ul>
                        <li className={rules.length ? "valid" : ""}>At least 8 characters</li>
                        <li className={rules.categoriesMet ? "valid" : ""}>At least 3 of the following:</li>
                      </ul>
                      <ul className="sub-rules">
                        <li className={passwordChecks.lower ? "valid" : ""}>Lower case letters (a-z)</li>
                        <li className={passwordChecks.upper ? "valid" : ""}>Upper case letters (A-Z)</li>
                        <li className={passwordChecks.number ? "valid" : ""}>Numbers (0-9)</li>
                        <li className={passwordChecks.special ? "valid" : ""}>Special characters (e.g. !@#$%^&*)</li>
                      </ul>
                      <ul>
                        <li className={rules.noTripleRepeat ? "valid" : ""}>No more than 2 identical characters in a row</li>
                        <li className={rules.match ? "valid" : ""}>Passwords match</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
              </div>

              <div className="reg-step-actions">
                {applicantStep > 1 && (
                  <button type="button" className="reg-btn reg-btn-secondary" onClick={prevApplicantStep}>
                    {isEnglish ? "Back" : "Bumalik"}
                  </button>
                )}
                {applicantStep < 3 ? (
                  <button type="button" className="reg-btn" onClick={nextApplicantStep} disabled={stepTransitionLoading}>
                    {stepTransitionLoading ? (
                      <span>{isEnglish ? "Loading..." : "Naglo-load..."}</span>
                    ) : (
                      <span>{isEnglish ? "Next Step" : "Susunod na Hakbang"}</span>
                    )}
                  </button>
                ) : (
                  <button className="reg-btn" type="button" onClick={register} disabled={loading}>
                    {loading ? (
                      <span><i className="bi bi-hourglass-split" /> {isEnglish ? "Creating account..." : "Ginagawa ang account..."}</span>
                    ) : (
                      <span><i className="bi bi-person-plus-fill" /> {isEnglish ? "Register" : "Mag-register"}</span>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {isEmployerRegistration && (
            <>
              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-email">{isEnglish ? "Email" : "Email"}</label>
                <div className="reg-input-wrapper reg-icon-group">
                  <i className="bi bi-envelope-fill reg-input-icon" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isEnglish ? "Enter email" : "Ilagay ang email"}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-username">{isEnglish ? "Username" : "Username"}</label>
                <div className="reg-input-wrapper reg-icon-group">
                  <i className="bi bi-person-fill reg-input-icon" />
                  <input
                    ref={firstInputRef}
                    id="reg-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      e.currentTarget.setCustomValidity("");
                      setUsername(e.target.value);
                    }}
                    placeholder={isEnglish ? "Enter username" : "Ilagay ang username"}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-company-name">{isEnglish ? "Company Name" : "Pangalan ng Kumpanya"}</label>
                <div className="reg-input-wrapper reg-icon-group">
                  <i className="bi bi-building-fill reg-input-icon" />
                  <input
                    id="reg-company-name"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={isEnglish ? "Enter company name" : "Ilagay ang pangalan ng kumpanya"}
                  />
                </div>
              </div>

              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-company-address">{isEnglish ? "Company Address" : "Address ng Kumpanya"}</label>
                <div className="reg-input-wrapper reg-icon-group">
                  <i className="bi bi-geo-alt-fill reg-input-icon" />
                  <input
                    id="reg-company-address"
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder={isEnglish ? "Enter company address" : "Ilagay ang address ng kumpanya"}
                  />
                </div>
              </div>

              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-company-industry">{isEnglish ? "Industry" : "Industriya"}</label>
                <div className="reg-input-wrapper reg-icon-group">
                  <i className="bi bi-briefcase-fill reg-input-icon" />
                  <input
                    id="reg-company-industry"
                    type="text"
                    value={companyIndustry}
                    onChange={(e) => setCompanyIndustry(e.target.value)}
                    placeholder={isEnglish ? "Enter company industry" : "Ilagay ang industriya ng kumpanya"}
                  />
                </div>
              </div>
              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-password">{isEnglish ? "Password" : "Password"}</label>
                <div className="reg-password-wrapper reg-icon-group">
                  <i className="bi bi-lock-fill reg-input-icon" />
                  <input id="reg-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEnglish ? "Enter password" : "Ilagay ang password"} autoComplete="new-password" />
                  {!!password && (
                    <button type="button" className="reg-toggle-eye" onClick={() => setShowPassword((v) => !v)} aria-label={isEnglish ? "Toggle password visibility" : "Ipakita/itago ang password"}>
                      <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                    </button>
                  )}
                </div>
              </div>

              <div className="reg-form-group">
                <label className="reg-field-label" htmlFor="reg-confirm-password">{isEnglish ? "Confirm Password" : "Kumpirmahin ang Password"}</label>
                <div className="reg-password-wrapper reg-icon-group">
                  <i className="bi bi-shield-lock-fill reg-input-icon" />
                  <input id="reg-confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={isEnglish ? "Confirm password" : "Kumpirmahin ang password"} autoComplete="new-password" />
                  {!!confirmPassword && (
                    <button type="button" className="reg-toggle-eye" onClick={() => setShowConfirmPassword((v) => !v)} aria-label={isEnglish ? "Toggle confirm password visibility" : "Ipakita/itago ang kumpirmang password"}>
                      <i className={showConfirmPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"} />
                    </button>
                  )}
                </div>
              </div>

              <div className="reg-rules">
                <strong>Your password must contain:</strong>
                <ul>
                  <li className={rules.length ? "valid" : ""}>At least 8 characters</li>
                  <li className={rules.categoriesMet ? "valid" : ""}>At least 3 of the following:</li>
                </ul>
                <ul className="sub-rules">
                  <li className={passwordChecks.lower ? "valid" : ""}>Lower case letters (a-z)</li>
                  <li className={passwordChecks.upper ? "valid" : ""}>Upper case letters (A-Z)</li>
                  <li className={passwordChecks.number ? "valid" : ""}>Numbers (0-9)</li>
                  <li className={passwordChecks.special ? "valid" : ""}>Special characters (e.g. !@#$%^&*)</li>
                </ul>
                <ul>
                  <li className={rules.noTripleRepeat ? "valid" : ""}>No more than 2 identical characters in a row</li>
                  <li className={rules.match ? "valid" : ""}>Passwords match</li>
                </ul>
              </div>

              <button className="reg-btn" type="button" onClick={register} disabled={loading}>
                {loading ? (
                    <span><i className="bi bi-hourglass-split" /> {isEnglish ? "Creating account..." : "Ginagawa ang account..."}</span>
                  ) : (
                    <span><i className="bi bi-person-plus-fill" /> {isEnglish ? "Register" : "Mag-register"}</span>
                  )}
              </button>
            </>
          )}

          <p className="reg-auth-link">
            {isEnglish ? "Already have an account? " : "May account ka na? "}
            <Link to="/login">{isEnglish ? "Login here" : "Mag-login dito"}</Link>
          </p>
        </div>
      </div>

      {showPwdIdPreviewModal && pwdIdImagePreview && (
        <div
          className="reg-file-preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="PWD ID image preview"
          onClick={() => setShowPwdIdPreviewModal(false)}
        >
          <div className="reg-file-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reg-file-preview-head">
              <h3>PWD ID Image Preview</h3>
              <button
                type="button"
                className="reg-file-preview-close"
                onClick={() => setShowPwdIdPreviewModal(false)}
                aria-label="Close preview"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="reg-file-preview-body">
              <img src={pwdIdImagePreview} alt="PWD ID preview" className="reg-file-preview-image" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

