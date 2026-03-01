import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../designer/applicant_sidebar.css";
// @ts-ignore JS auth helper module
import { signOut } from "../lib/session-auth.js";

type ApplicantSidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

export default function ApplicantSidebar({
  mobileOpen = false,
  onCloseMobile,
}: ApplicantSidebarProps): React.JSX.Element {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const applicantName = useMemo(() => {
    return String(localStorage.getItem("userName") || localStorage.getItem("name") || "Applicant").trim() || "Applicant";
  }, []);

  const applicantEmail = useMemo(() => {
    return String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "No email").trim() || "No email";
  }, []);

  const applicantInitial = useMemo(() => {
    const base = applicantName || applicantEmail || "A";
    return String(base).trim().charAt(0).toUpperCase() || "A";
  }, [applicantEmail, applicantName]);

  const closeMobile = () => {
    onCloseMobile?.();
  };

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const logout = async () => {
    setLogoutLoading(true);
    try {
      await signOut();
      // Keep legacy keys in sync for pages that still read these names.
      ["name", "email", "selectedRole"].forEach((key) => localStorage.removeItem(key));

      setShowLogoutConfirm(false);
      closeMobile();
      navigate("/login?force=1", { replace: true });
    } finally {
      setLogoutLoading(false);
    }
  };

  const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
    `menu-item${isActive ? " router-link-active" : ""}`;

  const logoutModal =
    showLogoutConfirm && typeof document !== "undefined"
      ? createPortal(
          <div className="logout-modal-backdrop" onClick={(e) => e.currentTarget === e.target && setShowLogoutConfirm(false)}>
            <div className="logout-modal" role="dialog" aria-modal="true" aria-label="Log out confirmation">
              <h3>Log out?</h3>
              <p>Are you sure you want to log out?</p>
              <div className="logout-modal-actions">
                <button
                  type="button"
                  className="logout-modal-btn cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={logoutLoading}
                >
                  No
                </button>
                <button
                  type="button"
                  className="logout-modal-btn confirm"
                  onClick={() => void logout()}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? "Logging out..." : "Yes"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <aside className={`sidebar${isCollapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          {!isCollapsed ? (
            <>
              <p className="applicant-name">{applicantName}</p>
              <p className="applicant-email">{applicantEmail}</p>
            </>
          ) : (
            <div className="mini-user-badge" title={applicantName}>
              {applicantInitial}
            </div>
          )}
        </div>

        <nav className="menu">
          <NavLink to="/applicant/job_list" className={menuLinkClass} onClick={closeMobile}>
            <i className="bi bi-briefcase icon" />
            {!isCollapsed && <span>Job Listings</span>}
          </NavLink>

          <NavLink to="/applicant/applications" className={menuLinkClass} onClick={closeMobile}>
            <i className="bi bi-file-earmark-text icon" />
            {!isCollapsed && <span>My Applications</span>}
          </NavLink>

          <NavLink to="/applicant/interviews" className={menuLinkClass} onClick={closeMobile}>
            <i className="bi bi-calendar-check icon" />
            {!isCollapsed && <span>Interviews</span>}
          </NavLink>

          <NavLink to="/applicant/profile" className={menuLinkClass} onClick={closeMobile}>
            <i className="bi bi-person icon" />
            {!isCollapsed && <span>Profile</span>}
          </NavLink>

          <NavLink to="/applicant/messages" className={menuLinkClass} onClick={closeMobile}>
            <i className="bi bi-chat-dots icon" />
            {!isCollapsed && <span>Messages</span>}
          </NavLink>
        </nav>

        <div className="footer">
          <button type="button" className="collapse" onClick={toggleSidebar}>
            <i className={`bi ${isCollapsed ? "bi-layout-sidebar" : "bi-layout-sidebar-inset"}`} />
            {!isCollapsed && <span>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>}
          </button>

          <button type="button" className="logout" onClick={() => setShowLogoutConfirm(true)}>
            <i className="bi bi-box-arrow-right icon" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      {logoutModal}
    </>
  );
}

