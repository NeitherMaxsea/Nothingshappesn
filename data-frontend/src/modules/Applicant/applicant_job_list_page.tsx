import { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../../designer/applicant_job_list_page.css";

type JobRow = Record<string, unknown> & {
  id: string;
  title?: string;
  companyName?: string;
  company?: string;
  department?: string;
  description?: string;
  location?: string;
  disabilityType?: string;
  disability?: string;
  type?: string;
  category?: string;
  salary?: string;
  logoUrl?: string;
  imageUrl?: string;
  imageUrl2?: string;
  createdAt?: unknown;
  status?: string;
  statusNormalized?: string;
  financeApprovalNormalized?: string;
};

type AppDoc = Record<string, unknown>;

const DEFAULT_SKILL_OPTIONS = [
  "Cashier",
  "Encoder / Data Entry",
  "Office Staff",
  "Administrative Assistant",
  "Customer Service",
  "Chat Support",
  "Service Crew",
  "Production Worker",
  "Warehouse Assistant",
  "Packing Staff",
  "Sales Associate",
  "Security Guard",
  "Housekeeping",
  "Remote Work",
];

export default function ApplicantJobListPage(): React.JSX.Element {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [jobSearchKeyword, setJobSearchKeyword] = useState("");
  const [jobDisabilityFilter, setJobDisabilityFilter] = useState("all");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [showSkillsOverlay, setShowSkillsOverlay] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const id = String(
      localStorage.getItem("userUid") || localStorage.getItem("uid") || localStorage.getItem("sessionUid") || "",
    ).trim();
    const email = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    let poller = 0;
    const pullData = async () => {
      try {
        const jobsRes = await fetch("/api/jobs");
        const jobsData = jobsRes.ok ? ((await jobsRes.json()) as JobRow[]) : [];
        const normalized = (Array.isArray(jobsData) ? jobsData : [])
          .map((job) => normalizeJob(job))
          .filter((job) => isVisibleToApplicant(job))
          .sort((a, b) => getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt));

        let appUrl = "/api/applications";
        const params = new URLSearchParams();
        if (id) params.set("applicantId", id);
        else if (email) params.set("applicantEmail", email);
        if ([...params.keys()].length) appUrl += `?${params.toString()}`;

        const appsRes = await fetch(appUrl);
        const appsData = appsRes.ok ? ((await appsRes.json()) as AppDoc[]) : [];
        const nextApplied = new Set<string>();
        (Array.isArray(appsData) ? appsData : []).forEach((raw) => {
          const applicationJobId = String(raw.jobId || "").trim();
          if (applicationJobId) nextApplied.add(applicationJobId);
        });

        if (!mountedRef.current) return;
        setJobs(normalized);
        setAppliedJobIds(nextApplied);
        setSelectedJob((prev) => (prev ? normalized.find((j) => j.id === prev.id) || null : prev));
        setIsJobsLoading(false);
      } catch {
        if (!mountedRef.current) return;
        setJobs([]);
        setAppliedJobIds(new Set());
        setIsJobsLoading(false);
      }
    };
    void pullData();
    poller = window.setInterval(() => {
      void pullData();
    }, 4000);

    void runIntroSequence();

    return () => {
      if (poller) window.clearInterval(poller);
    };
  }, []);

  const systemName = "HireAble";
  const welcomeName = useMemo(
    () => String(localStorage.getItem("userName") || localStorage.getItem("name") || "Applicant").trim(),
    [],
  );

  const skillOptions = useMemo(() => {
    const fromJobs = jobs.flatMap((job) => {
      const values: string[] = [];
      const title = String(job.title || "").trim();
      const category = String(job.category || "").trim();
      const disabilityType = String(job.disabilityType || "").trim();
      if (title) values.push(title);
      if (category) values.push(category);
      if (disabilityType) values.push(disabilityType);
      return values;
    });
    return [...new Set([...DEFAULT_SKILL_OPTIONS, ...fromJobs].filter(Boolean))].slice(0, 40);
  }, [jobs]);

  const jobDisabilityOptions = useMemo(
    () =>
      [...new Set(jobs.map((j) => String(j.disabilityType || j.disability || "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [jobs],
  );

  const displayJobs = useMemo(() => {
    const keyword = jobSearchKeyword.trim().toLowerCase();
    const picked = selectedSkills.map((s) => s.toLowerCase());

    const base = jobs.filter((job) => {
      const disabilityValue = String(job.disabilityType || job.disability || "").trim();
      const haystack = [
        job.title,
        job.description,
        job.department,
        job.companyName,
        job.location,
        job.disabilityType,
        job.category,
        job.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const keywordMatch = !keyword || haystack.includes(keyword);
      const disabilityMatch =
        jobDisabilityFilter === "all" || disabilityValue.toLowerCase() === String(jobDisabilityFilter).toLowerCase();

      return keywordMatch && disabilityMatch;
    });

    const filtered = base.filter((job) => {
      const haystack = [
        job.title,
        job.description,
        job.department,
        job.companyName,
        job.location,
        job.disabilityType,
        job.category,
        job.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !picked.length || picked.some((skill) => haystack.includes(skill));
    });

    if (picked.length > 0 && filtered.length === 0) return base;
    return filtered;
  }, [jobs, jobSearchKeyword, jobDisabilityFilter, selectedSkills]);

  useEffect(() => {
    if (selectedJob && !displayJobs.some((j) => j.id === selectedJob.id)) {
      setSelectedJob(null);
      return;
    }
    if (!selectedJob && displayJobs.length) {
      setSelectedJob(displayJobs[0]);
    }
  }, [selectedJob, displayJobs]);

  const mapUrl = useMemo(() => {
    const loc = String(selectedJob?.location || "").trim();
    if (!loc) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(loc)}&output=embed`;
  }, [selectedJob]);

  const hasPendingApplication = useMemo(() => {
    const jobId = String(selectedJob?.id || "").trim();
    return !!jobId && appliedJobIds.has(jobId);
  }, [appliedJobIds, selectedJob]);

  const photoList = useMemo(
    () => [String(selectedJob?.imageUrl || ""), String(selectedJob?.imageUrl2 || "")].filter(Boolean),
    [selectedJob],
  );

  const toggleSkill = (skill: string) => {
    const key = String(skill || "").trim();
    if (!key) return;
    setSelectedSkills((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const continueWithoutSkills = () => {
    setSelectedSkills([]);
    saveSelectedSkills([]);
    setShowSkillsOverlay(false);
  };

  const confirmSkillsSelection = () => {
    if (!selectedSkills.length) {
      showToast("Select at least one skill, or click Show all jobs.", "#f59e0b");
      return;
    }
    saveSelectedSkills(selectedSkills);
    setShowSkillsOverlay(false);
  };

  const selectJob = (job: JobRow) => {
    setSelectedJob(job);
    setCurrentPhotoIndex(0);
  };

  const openGallery = (url: string) => {
    if (!url || !photoList.length) return;
    const idx = photoList.indexOf(url);
    setCurrentPhotoIndex(idx >= 0 ? idx : 0);
    setIsLightboxOpen(true);
  };

  const applyJob = async () => {
    if (!selectedJob) return;
    if (hasPendingApplication) {
      showToast("Application already pending.", "#f59e0b");
      return;
    }

    try {
      const applicantIdValue = String(
        localStorage.getItem("userUid") ||
          localStorage.getItem("uid") ||
          localStorage.getItem("sessionUid") ||
          "",
      ).trim();
      const applicantName = String(localStorage.getItem("userName") || "").trim();
      const applicantEmailValue = String(localStorage.getItem("userEmail") || "").trim();
      const selectedJobId = String(selectedJob.id || "").trim();

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        jobId: selectedJobId,
        jobTitle: String(selectedJob.title || "").trim(),
        applicantId: applicantIdValue || null,
        applicantName: applicantName || "Applicant",
        applicantEmail: applicantEmailValue || null,
        appliedAt: new Date().toISOString(),
        status: "pending",
        }),
      });
      if (!response.ok) {
        let message = "Failed to apply";
        try {
          const data = (await response.json()) as { message?: string };
          if (typeof data.message === "string") message = data.message;
        } catch {
          // keep fallback
        }
        throw new Error(message);
      }

      setAppliedJobIds((prev) => new Set([...prev, selectedJobId]));
      showToast("Application sent!", "#16a34a");
    } catch (err) {
      const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(anyErr?.response?.data?.message || anyErr?.message || "Failed to apply", "#dc2626");
    }
  };

  async function runIntroSequence() {
    const loadedSkills = loadSelectedSkills();
    if (loadedSkills.length) setSelectedSkills(loadedSkills);

    if (hasSeenApplicantIntro()) {
      setShowWelcomeOverlay(false);
      setShowSkillsOverlay(false);
      return;
    }
    setShowWelcomeOverlay(true);
    await wait(1200);
    if (!mountedRef.current) return;
    setShowWelcomeOverlay(false);
    await wait(180);
    if (!mountedRef.current) return;
    setShowSkillsOverlay(true);
    markApplicantIntroSeen();
  }

  return (
    <div className="applicant-job-list-page">
      {showWelcomeOverlay && (
        <div className="intro-overlay">
          <div className="intro-card">
            <p className="intro-eyebrow">Applicant Portal</p>
            <h2>Welcome to {systemName}</h2>
            <p>{welcomeName ? `Hello, ${welcomeName}.` : "Welcome back."} Preparing your job feed...</p>
          </div>
        </div>
      )}

      {showSkillsOverlay && (
        <div className="intro-overlay skills-overlay">
          <div className="skills-picker-card">
            <div className="skills-picker-head">
              <div>
                <p className="intro-eyebrow">Job Preferences</p>
                <h3>Select skills / roles you are looking for</h3>
                <p>Choose one or more. We will show job posts based on your selection.</p>
              </div>
            </div>

            <div className="skills-grid">
              {skillOptions.map((skill) => (
                <label key={skill} className={`skill-option${selectedSkills.includes(skill) ? " active" : ""}`}>
                  <input type="checkbox" checked={selectedSkills.includes(skill)} onChange={() => toggleSkill(skill)} />
                  <span>{skill}</span>
                </label>
              ))}
            </div>

            <div className="skills-actions">
              <button className="skip-btn" type="button" onClick={continueWithoutSkills}>
                Show all jobs
              </button>
              <button className="continue-btn" type="button" onClick={confirmSkillsSelection}>
                Continue ({selectedSkills.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`dashboard${showWelcomeOverlay || showSkillsOverlay ? " intro-locked" : ""}`}>
        <section className="job-list">
          <h2>Available Jobs</h2>

          <div className="list-filters">
            <div className="filter-input-wrap">
              <i className="bi bi-search" />
              <input
                value={jobSearchKeyword}
                onChange={(e) => setJobSearchKeyword(e.target.value)}
                type="text"
                placeholder="Search keywords (job, company, location)"
              />
            </div>

            <select value={jobDisabilityFilter} onChange={(e) => setJobDisabilityFilter(e.target.value)} className="filter-select">
              <option value="all">All disability types</option>
              {jobDisabilityOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {isJobsLoading ? (
            <div className="panel-loading">
              <div className="panel-spinner" />
              <p>Loading job posts...</p>
            </div>
          ) : displayJobs.length === 0 ? (
            <p className="empty">No job posts available</p>
          ) : (
            displayJobs.map((job) => (
              <div key={job.id} className={`job-card${selectedJob?.id === job.id ? " active" : ""}`} onClick={() => selectJob(job)}>
                <div className="logo-wrap">
                  {job.logoUrl ? (
                    <img src={String(job.logoUrl)} alt="Company logo" className="logo-img" />
                  ) : (
                    <div className="logo-fallback">
                      {String(job.companyName || job.company || job.department || "CO")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <div className="card-top">
                    <h3>{String(job.title || "Untitled Job")}</h3>
                    <span className="type-badge">{String(job.type || "Open")}</span>
                  </div>
                  <p className="company-line">{String(job.companyName || "Company")}</p>
                  <p className="dept">{String(job.description || "-")}</p>
                  <div className="meta">
                    <span className="meta-item">
                      <i className="bi bi-geo-alt" />
                      {String(job.location || "Not specified")}
                    </span>
                    <span className="pwd-pill">
                      <i className="bi bi-universal-access" />
                      {String(job.disabilityType || "PWD-friendly")}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="job-preview">
          {isJobsLoading ? (
            <div className="panel-loading right">
              <div className="panel-spinner" />
              <p>Preparing job details...</p>
            </div>
          ) : displayJobs.length === 0 ? (
            <div className="empty">No job posts available</div>
          ) : !selectedJob ? (
            <div className="empty">Select a job to view details</div>
          ) : (
            <div className="job-detail-card map-layout">
              <div className="details-left">
                <div className="detail-header">
                  <div>
                    <div className="company-row">
                      <div className="company-logo">
                        {selectedJob.logoUrl ? (
                          <img src={String(selectedJob.logoUrl)} alt="Company logo" />
                        ) : (
                          <div className="company-logo-fallback">
                            {String(selectedJob.companyName || selectedJob.company || selectedJob.department || "CO")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="company-text">
                        <p className="company-name">
                          {String(selectedJob.companyName || selectedJob.company || selectedJob.department || "Company")}
                        </p>
                        <h2>{String(selectedJob.title || "Untitled Job")}</h2>
                      </div>
                    </div>
                    <div className="badges">
                      <span className="badge">{String(selectedJob.type || "Open")}</span>
                      <span className="pwd-pill">
                        <i className="bi bi-universal-access" />
                        {String(selectedJob.disabilityType || "PWD-friendly")}
                      </span>
                    </div>
                  </div>
                  <span className="location">
                    <i className="bi bi-geo-alt" />
                    {String(selectedJob.location || "Not specified")}
                  </span>
                </div>

                <div className="detail-section grid-2">
                  <div>
                    <h4>Department</h4>
                    <p>{String(selectedJob.department || "Not specified")}</p>
                  </div>
                  <div>
                    <h4>Accessibility</h4>
                    <p>{String(selectedJob.disabilityType || "Not specified")}</p>
                  </div>
                </div>

                <div className="detail-section grid-2">
                  <div>
                    <h4>Salary</h4>
                    <p>{String(selectedJob.salary || "Negotiable")}</p>
                  </div>
                  <div>
                    <h4>Status</h4>
                    <p className="status">Open</p>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{String(selectedJob.description || "No description provided.")}</p>
                </div>
              </div>

              <div className="map-right">
                {selectedJob.location ? (
                  <div
                    className="map-preview-wrap"
                    role="button"
                    tabIndex={0}
                    onClick={() => setShowMapModal(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setShowMapModal(true);
                      }
                    }}
                  >
                    <iframe src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                    <div className="map-click-overlay">
                      <span>Click to view location</span>
                    </div>
                  </div>
                ) : (
                  <p className="empty">No location provided</p>
                )}

                <div className="job-photos">
                  {selectedJob.imageUrl ? (
                    <img
                      src={String(selectedJob.imageUrl)}
                      className="job-photo"
                      alt="Job Photo 1"
                      onClick={() => openGallery(String(selectedJob.imageUrl))}
                    />
                  ) : (
                    <div className="job-photo placeholder">No photo</div>
                  )}
                  {selectedJob.imageUrl2 ? (
                    <img
                      src={String(selectedJob.imageUrl2)}
                      className="job-photo"
                      alt="Job Photo 2"
                      onClick={() => openGallery(String(selectedJob.imageUrl2))}
                    />
                  ) : (
                    <div className="job-photo placeholder">No photo</div>
                  )}
                </div>
              </div>

              <div className="detail-actions bottom">
                <button className={`apply-btn${hasPendingApplication ? " disabled" : ""}`} disabled={hasPendingApplication} onClick={applyJob}>
                  {hasPendingApplication ? "Pending" : "Apply for this Job"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isLightboxOpen && photoList.length > 0 && (
        <div className="lightbox" onClick={(e) => e.currentTarget === e.target && setIsLightboxOpen(false)}>
          <button className="lb-close" onClick={() => setIsLightboxOpen(false)} aria-label="Close" type="button">
            ×
          </button>
          <button
            className="lb-nav left"
            onClick={() => setCurrentPhotoIndex((i) => (i - 1 + photoList.length) % photoList.length)}
            aria-label="Previous photo"
            type="button"
          >
            &lt;
          </button>
          <img src={photoList[currentPhotoIndex]} className="lb-image" alt="Job Photo" />
          <button
            className="lb-nav right"
            onClick={() => setCurrentPhotoIndex((i) => (i + 1) % photoList.length)}
            aria-label="Next photo"
            type="button"
          >
            &gt;
          </button>
          <div className="lb-dots">
            {photoList.map((p, idx) => (
              <span
                key={`${p}-${idx}`}
                className={`dot${idx === currentPhotoIndex ? " active" : ""}`}
                onClick={() => setCurrentPhotoIndex(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {showMapModal && (
        <div className="lightbox map-lightbox" onClick={(e) => e.currentTarget === e.target && setShowMapModal(false)}>
          <div className="map-modal-card">
            <div className="map-modal-head">
              <div>
                <p className="map-modal-label">Job Location</p>
                <h3>{String(selectedJob?.location || "Not specified")}</h3>
              </div>
              <button className="lb-close" onClick={() => setShowMapModal(false)} aria-label="Close map" type="button">
                ×
              </button>
            </div>
            {!!selectedJob?.location && (
              <iframe
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="map-modal-frame"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  function getApplicantSkillPrefKey() {
    const uid = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || localStorage.getItem("sessionUid") || "").trim();
    const email = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    if (uid) return `applicantSkillsPref:${uid}`;
    if (email) return `applicantSkillsPref:${email}`;
    return "applicantSkillsPref";
  }

  function getApplicantIntroSeenKey() {
    const uid = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || localStorage.getItem("sessionUid") || "").trim();
    const email = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    if (uid) return `applicantIntroShown:${uid}`;
    if (email) return `applicantIntroShown:${email}`;
    return "applicantIntroShown";
  }

  function hasSeenApplicantIntro() {
    try {
      return localStorage.getItem(getApplicantIntroSeenKey()) === "1";
    } catch {
      return false;
    }
  }

  function markApplicantIntroSeen() {
    try {
      localStorage.setItem(getApplicantIntroSeenKey(), "1");
    } catch {
      // ignore
    }
  }

  function loadSelectedSkills(): string[] {
    try {
      const raw = localStorage.getItem(getApplicantSkillPrefKey());
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((x) => String(x || "").trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function saveSelectedSkills(list: string[]) {
    try {
      localStorage.setItem(getApplicantSkillPrefKey(), JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}

function normalizeJob(job: JobRow): JobRow {
  const images = Array.isArray(job.images) ? (job.images as unknown[]).filter(Boolean) : [];
  const normalized: JobRow = {
    ...job,
    companyName: String(job.companyName || job.company_name || job.company || job.department || "").trim(),
    imageUrl: String(job.imageUrl || job.imageURL || job.photo1 || images[0] || ""),
    imageUrl2: String(job.imageUrl2 || job.imageURL2 || job.photo2 || images[1] || ""),
  };
  normalized.statusNormalized = normalizeJobStatus(normalized.status);
  normalized.financeApprovalNormalized = normalizeFinanceApproval(normalized);
  return normalized;
}

function getCreatedAtMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === "string") {
    const raw = ts.trim();
    if (!raw) return 0;
    const parsed = Date.parse(raw.includes("T") ? raw : raw.replace(" ", "T"));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof (ts as { toMillis?: () => number })?.toMillis === "function") return (ts as { toMillis: () => number }).toMillis();
  if (typeof (ts as { seconds?: number })?.seconds === "number") return Number((ts as { seconds: number }).seconds) * 1000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

function normalizeJobStatus(status: unknown): string {
  return String(status || "").trim().toLowerCase();
}

function normalizeFinanceApproval(job: Record<string, unknown>): string {
  const direct = String(job.financeApprovalStatus || job.finance_approval_status || "").trim().toLowerCase();
  if (["approved", "rejected", "pending"].includes(direct)) return direct;
  const status = normalizeJobStatus(job.status);
  if (status === "open" || status === "closed") return "approved";
  if (status === "finance_rejected") return "rejected";
  if (status.includes("pending")) return "pending";
  return "pending";
}

function isVisibleToApplicant(job: JobRow): boolean {
  const status = normalizeJobStatus(job.statusNormalized || job.status);
  const approval = normalizeFinanceApproval(job);
  if (["open", "approved", "published", "active"].includes(status)) return true;
  if (status === "closed") return false;
  if (status === "finance_rejected") return false;
  return approval === "approved";
}

function showToast(text: string, backgroundColor: string) {
  void backgroundColor;
  if (typeof window !== "undefined") {
    window.alert(text);
  }
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
