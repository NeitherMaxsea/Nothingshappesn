import { BrowserRouter, Route, Routes } from "react-router-dom";
import LandingPage from "./modules/main_landing_pages";
import SearchJobsPage from "./modules/search_jobs_page";
import LoginPage from "./modules/Authentication/login_page";
import SelectRolePage from "./modules/Authentication/select_role_page";
import RegisterPage from "./modules/Authentication/register_page";
import OtpVerificationPage from "./modules/Authentication/otp_verification_page";
import ApprovalStatusPage from "./modules/Authentication/approval_status_page";
import ForgotPasswordPage from "./modules/Authentication/forgot_password_page";
import ResetPasswordPage from "./modules/Authentication/reset_password_page";
import AdminReviewRegistrationsPage from "./modules/Admin/admin_review_registrations_page";
import AdminLayout from "./modules/Admin/admin_layout";
import AdminDashboardPage from "./modules/Admin/admin_dashboard_page";
import AdminJobPostPage from "./modules/Admin/admin_job_post_page";
import AdminJobListPage from "./modules/Admin/admin_job_list_page";
import ApplicantLayout from "./modules/Applicant/applicant_layout";
import ApplicantJobListPage from "./modules/Applicant/applicant_job_list_page";
import { Navigate } from "react-router-dom";

function ApplicantPagePlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 20,
        minHeight: 220,
      }}
    >
      <h3 style={{ margin: 0, color: "#0f172a" }}>{title}</h3>
      <p style={{ margin: "8px 0 0", color: "#64748b" }}>Page content will be added here.</p>
    </div>
  );
}

function AdminPagePlaceholder({ title }: { title: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #d8ece9",
        borderRadius: 12,
        padding: 20,
        minHeight: 200,
      }}
    >
      <h3 style={{ margin: 0, color: "#0f172a" }}>{title}</h3>
      <p style={{ margin: "8px 0 0", color: "#64748b" }}>Page content will be added here.</p>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landingpage" element={<LandingPage />} />
        <Route path="/search-jobs" element={<SearchJobsPage />} />
        <Route path="/about-us" element={<Navigate to="/landingpage" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/role" element={<SelectRolePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/forget-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/verify-otp" element={<OtpVerificationPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/approval-status" element={<ApprovalStatusPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="job-post" element={<AdminJobPostPage />} />
          <Route path="job-list" element={<AdminJobListPage />} />
          <Route path="users" element={<AdminPagePlaceholder title="Users" />} />
          <Route path="company-management" element={<AdminPagePlaceholder title="Company Management" />} />
          <Route path="logs" element={<AdminPagePlaceholder title="Logs" />} />
          <Route path="review-registrations" element={<AdminReviewRegistrationsPage />} />
        </Route>
        <Route path="/applicant" element={<ApplicantLayout />}>
          <Route index element={<Navigate to="job_list" replace />} />
          <Route path="job_list" element={<ApplicantJobListPage />} />
          <Route path="applications" element={<ApplicantPagePlaceholder title="My Applications" />} />
          <Route path="interviews" element={<ApplicantPagePlaceholder title="Interviews" />} />
          <Route path="profile" element={<ApplicantPagePlaceholder title="Profile" />} />
          <Route path="messages" element={<ApplicantPagePlaceholder title="Messages" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
