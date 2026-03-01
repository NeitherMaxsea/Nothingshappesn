import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/select_role_page.css";
import titleLogo from "../../assets/proximity.png";
import applicantPreview from "../../assets/fetch02.png";
import employerPreview from "../../assets/fetch01.png";
import applicantRoleGif from "../../assets/original-25e8092dd2021f67a388b22526804904.gif";
import employerRoleGif from "../../assets/original-d96c6518a378c7e273a6ebb4980bd7d7.gif";

export default function SelectRolePage(): React.JSX.Element {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [hoveredRole, setHoveredRole] = useState<"applicant" | "employer" | null>(null);
  const [language, setLanguage] = useState<"fil" | "en">("fil");
  const timerRef = useRef<number | null>(null);
  const isEnglish = language === "en";

  useEffect(() => {
    localStorage.removeItem("selectedRole");
    const savedLanguage = (localStorage.getItem("uiLanguage") || "").trim().toLowerCase();
    if (savedLanguage === "en" || savedLanguage === "fil") {
      setLanguage(savedLanguage);
    }
    timerRef.current = window.setTimeout(() => setIsVisible(true), 0);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const runExitThen = (next: () => void) => {
    if (isFading) return;
    setIsFading(true);
    setIsVisible(false);
    timerRef.current = window.setTimeout(next, 300);
  };

  const goRegister = (role: "applicant" | "employer") => {
    localStorage.setItem("selectedRole", role);
    localStorage.setItem("uiLanguage", language);
    runExitThen(() => {
      navigate({
        pathname: "/register",
        search: `?role=${role}&force=1`,
      });
    });
  };

  const goBack = () => {
    localStorage.removeItem("selectedRole");
    localStorage.setItem("uiLanguage", language);
    runExitThen(() => navigate("/login"));
  };

  return (
    <div className="role-auth-page">
      <div className="role-auth-container">
        <div
          className={[
            "role-auth-right",
            isVisible ? "is-visible" : "",
            isFading ? "is-fading" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="role-logo-container">
            <img src={titleLogo} className="role-logo-img" alt="HireAble logo" />
          </div>

          <h2 className="role-form-h2">{isEnglish ? "Choose Your Role" : "Piliin ang Iyong Role"}</h2>
          <p className="role-form-p">
            {isEnglish
              ? "Select the account type you will use in the system."
              : "Piliin ang uri ng account na gagamitin mo sa system."}
          </p>

          <div className="role-card-grid">
            <button
              className="role-option-card applicant"
              type="button"
              disabled={isFading}
              onMouseEnter={() => setHoveredRole("applicant")}
              onMouseLeave={() => setHoveredRole((prev) => (prev === "applicant" ? null : prev))}
              onFocus={() => setHoveredRole("applicant")}
              onBlur={() => setHoveredRole((prev) => (prev === "applicant" ? null : prev))}
              onClick={() => goRegister("applicant")}
            >
              <span className="role-option-media" aria-hidden="true">
                <img src={applicantPreview} alt="" className="role-option-image" />
                <span className="role-option-media-overlay" />
              </span>
              <span className="role-option-content">
                <span className="role-option-icon-wrap applicant" aria-hidden="true">
                  <img
                    src={hoveredRole === "applicant" ? applicantRoleGif : applicantPreview}
                    alt=""
                    className="role-option-icon-gif"
                  />
                </span>
                <span className="role-option-header">
                  <span className="role-option-title">{isEnglish ? "Applicant" : "Aplikante"}</span>
                  <span className="role-option-desc">
                    {isEnglish
                      ? "Use this account to view job posts and submit applications."
                      : "Gamitin ang account na ito para makita ang job posts at mag-apply."}
                  </span>
                </span>
                <span className="role-option-divider" aria-hidden="true" />
                <ul
                  className="role-option-benefits"
                  aria-label={isEnglish ? "Applicant benefits" : "Mga benepisyo ng aplikante"}
                >
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish ? "View available job listings" : "Tingnan ang mga available na trabaho"}
                  </li>
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish ? "Submit job applications" : "Magsumite ng job application"}
                  </li>
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish
                      ? "Check application and interview status"
                      : "Tingnan ang status ng application at interview"}
                  </li>
                </ul>
                <span className="role-option-cta">
                  {isEnglish ? "Continue as Applicant" : "Magpatuloy bilang Aplikante"}{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </span>
              </span>
            </button>

            <button
              className="role-option-card employer"
              type="button"
              disabled={isFading}
              onMouseEnter={() => setHoveredRole("employer")}
              onMouseLeave={() => setHoveredRole((prev) => (prev === "employer" ? null : prev))}
              onFocus={() => setHoveredRole("employer")}
              onBlur={() => setHoveredRole((prev) => (prev === "employer" ? null : prev))}
              onClick={() => goRegister("employer")}
            >
              <span className="role-option-media" aria-hidden="true">
                <img src={employerPreview} alt="" className="role-option-image" />
                <span className="role-option-media-overlay" />
              </span>
              <span className="role-option-content">
                <span className="role-option-icon-wrap employer" aria-hidden="true">
                  <img
                    src={hoveredRole === "employer" ? employerRoleGif : employerPreview}
                    alt=""
                    className="role-option-icon-gif"
                  />
                </span>
                <span className="role-option-header">
                  <span className="role-option-title">Employer</span>
                  <span className="role-option-desc">
                    {isEnglish
                      ? "Use this account to post jobs and review applicants."
                      : "Gamitin ang account na ito para mag-post ng trabaho at mag-review ng aplikante."}
                  </span>
                </span>
                <span className="role-option-divider" aria-hidden="true" />
                <ul
                  className="role-option-benefits"
                  aria-label={isEnglish ? "Employer benefits" : "Mga benepisyo ng employer"}
                >
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish ? "Create and manage job posts" : "Gumawa at mag-manage ng job posts"}
                  </li>
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish ? "Review applicant records" : "I-review ang records ng aplikante"}
                  </li>
                  <li>
                    <i className="bi bi-check2-circle" aria-hidden="true" />{" "}
                    {isEnglish
                      ? "Update hiring status and interview schedules"
                      : "I-update ang hiring status at iskedyul ng interview"}
                  </li>
                </ul>
                <span className="role-option-cta">
                  {isEnglish ? "Continue as Employer" : "Magpatuloy bilang Employer"}{" "}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </span>
              </span>
            </button>
          </div>

          <p className="role-auth-alt">
            {isEnglish ? "Already have an account?" : "May account ka na?"}{" "}
            <button type="button" className="role-auth-alt-link" onClick={goBack}>
              {isEnglish ? "Sign In" : "Mag-login"}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}

