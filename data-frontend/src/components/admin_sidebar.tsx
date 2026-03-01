import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
// @ts-ignore JS auth helper module
import { signOut } from "../lib/session-auth.js";
import logoWhite from "../assets/whitelogo.png";
import "../designer/admin_sidebar.css";

type MenuItem = {
  to: string;
  icon: string;
  label: string;
};

export default function AdminSidebar(): React.JSX.Element {
  const navigate = useNavigate();

  const adminName = useMemo(() => {
    return (
      String(localStorage.getItem("userName") || "").trim() ||
      String(localStorage.getItem("userEmail") || "").trim() ||
      "System Admin"
    );
  }, []);

  const currentRole = useMemo(
    () => String(localStorage.getItem("userRole") || "").trim().toLowerCase().replace(/-/g, "_"),
    [],
  );

  const isCompanyAdmin = currentRole === "company_admin";
  const basePath = isCompanyAdmin ? "/company-admin" : "/admin";

  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { to: `${basePath}/dashboard`, icon: "bi bi-grid", label: "Dashboard" },
      {
        to: `${basePath}/${isCompanyAdmin ? "add-employee" : "users"}`,
        icon: "bi bi-people",
        label: isCompanyAdmin ? "Add Employee" : "Users",
      },
    ];

    if (!isCompanyAdmin) {
      items.push({
        to: `${basePath}/review-registrations`,
        icon: "bi bi-person-check",
        label: "Review Registrations",
      });
      items.push({
        to: `${basePath}/job-post`,
        icon: "bi bi-briefcase",
        label: "Job Post",
      });
      items.push({
        to: `${basePath}/job-list`,
        icon: "bi bi-card-list",
        label: "Job List",
      });
      items.push({
        to: `${basePath}/company-management`,
        icon: "bi bi-building",
        label: "Company Management",
      });
    }

    items.push({ to: `${basePath}/logs`, icon: "bi bi-journal-text", label: "Logs" });
    return items;
  }, [basePath, isCompanyAdmin]);

  const logout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="admin-sidebar">
      <div className="brand-box">
        <img src={logoWhite} className="logo" alt="System Logo" />
        <div className="brand-text">
          <h4>Admin Panel</h4>
          <small>System center</small>
        </div>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `item${isActive ? " active" : ""}`}>
            <i className={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-box">
        <div className="admin-info">
          <strong>{adminName}</strong>
          <small>Administrator</small>
        </div>
      </div>

      <button type="button" className="logout" onClick={() => void logout()}>
        <i className="bi bi-box-arrow-right" />
        <span>Logout</span>
      </button>
    </aside>
  );
}
