import { Outlet } from "react-router-dom";
import { useMemo } from "react";
import AdminSidebar from "../../components/admin_sidebar";
import "../../designer/admin_layout.css";

export default function AdminLayout(): React.JSX.Element {
  const adminName = useMemo(() => {
    return (
      String(localStorage.getItem("userName") || "").trim() ||
      String(localStorage.getItem("userEmail") || "").trim() ||
      "System Admin"
    );
  }, []);

  const currentDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      }),
    [],
  );

  return (
    <div className="admin-layout">
      <div className="body">
        <AdminSidebar />
        <section className="main-shell">
          <header className="topbar">
            <div className="title-wrap">
              <h1>Admin Console</h1>
              <p>System control center</p>
            </div>
            <div className="meta-wrap">
              <span className="date-chip">{currentDateLabel}</span>
              <div className="admin-chip">
                <i className="bi bi-person-circle" />
                <span>{adminName}</span>
              </div>
            </div>
          </header>
          <main className="content">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}
