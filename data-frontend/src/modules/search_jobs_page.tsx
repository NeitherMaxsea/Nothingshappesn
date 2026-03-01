import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";
import footerLogo from "../assets/proximity.png";
import "../designer/search_jobs_page.css";
import LandingNavbar from "../components/landing_navbar";

type Job = {
  id: string;
  title: string;
  companyName: string;
  location: string;
  category: string;
  type: string;
  description: string;
  setup: string;
  vacancies: number;
  salary: string;
  disabilityFit: string;
  postedDate: string;
  status: "open" | "closed";
};

const LOCAL_JOB_POSTS_KEY = "adminLocalJobPosts";

type ApiJob = Record<string, unknown>;

function getCompanyInitials(name: string): string {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return "CO";
  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

function mapApiJobToSearchJob(raw: ApiJob): Job | null {
  const id = String(raw.id || "").trim();
  const title = String(raw.title || "").trim();
  if (!id || !title) return null;

  const statusRaw = String(raw.status || "open").trim().toLowerCase();
  const status: "open" | "closed" = statusRaw === "closed" ? "closed" : "open";
  if (status !== "open") return null;

  const companyName = String(raw.companyName || raw.company || raw.department || "Company").trim();
  const location = String(raw.location || "Not specified").trim();
  const category = String(raw.category || "General").trim();
  const type = String(raw.type || "Open").trim();
  const description = String(raw.description || "No description provided.").trim();
  const setup = String(raw.setup || type || "On-site").trim();
  const vacanciesRaw = Number(raw.vacancies || 1);
  const vacancies = Number.isFinite(vacanciesRaw) && vacanciesRaw > 0 ? vacanciesRaw : 1;
  const salary = String(raw.salary || "Negotiable").trim();
  const disabilityFit = String(raw.disabilityType || raw.disability || "PWD-friendly").trim();
  const createdAtRaw = String(raw.createdAt || "").trim();
  const createdAtMs = createdAtRaw ? Date.parse(createdAtRaw) : 0;
  const postedDate = Number.isFinite(createdAtMs) && createdAtMs > 0
    ? `Posted: ${new Date(createdAtMs).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`
    : `Posted: ${new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`;

  return {
    id,
    title,
    companyName,
    location,
    category,
    type,
    description,
    setup,
    vacancies,
    salary,
    disabilityFit,
    postedDate,
    status,
  };
}

function getDisabilityIconClass(disabilityText: string): string {
  const text = String(disabilityText || "").toLowerCase();
  if (/(hearing|deaf)/.test(text)) return "bi-ear";
  if (/(speech|language)/.test(text)) return "bi-chat-dots";
  if (/(visual|blind|vision)/.test(text)) return "bi-eye";
  if (/(physical|orthopedic|mobility|wheelchair)/.test(text)) return "bi-person-wheelchair";
  if (/(learning)/.test(text)) return "bi-book";
  if (/(intellectual)/.test(text)) return "bi-lightbulb";
  if (/(autism)/.test(text)) return "bi-stars";
  if (/(psychosocial|mental)/.test(text)) return "bi-heart-pulse";
  if (/(chronic|illness)/.test(text)) return "bi-shield-plus";
  return "bi-universal-access-circle";
}

function getMockCompanyRating(job: Pick<Job, "id" | "companyName">) {
  const seed = String(job?.id || job?.companyName || "job");
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  const rating = 4 + ((sum % 8) / 10); // 4.0 - 4.7
  const reviews = 42 + (sum % 97);
  return { rating: Number(rating.toFixed(1)), reviews };
}

function getMockJobPreferences(job: Pick<Job, "category" | "type" | "id">) {
  const category = String(job.category || "").toLowerCase();
  const baseLanguages = ["Filipino", "English"];
  if (category.includes("customer")) return { languages: [...baseLanguages, "English"], preferredAge: "21 - 40 years old" };
  if (category.includes("it")) return { languages: baseLanguages, preferredAge: "20 - 38 years old" };
  if (category.includes("admin")) return { languages: baseLanguages, preferredAge: "21 - 40 years old" };
  return { languages: baseLanguages, preferredAge: "21 - 40 years old" };
}

function getMockJobDetailsContent(job: Pick<Job, "category" | "title">) {
  const category = String(job.category || "").toLowerCase();
  const title = String(job.title || "").toLowerCase();

  if (category.includes("customer") || title.includes("support")) {
    return {
      qualifications: [
        "Basic computer literacy and typing skills",
        "Can communicate clearly through text-based channels",
        "Can follow documented response workflows",
      ],
      responsibilities: [
        "Handle chat inquiries and support concerns",
        "Organize ticket notes and update tracking sheets",
        "Coordinate escalations with admin or team lead",
      ],
    };
  }

  if (category.includes("it") || title.includes("qa")) {
    return {
      qualifications: [
        "Basic software testing or QA awareness",
        "Attention to detail in checking issues",
        "Can write clear bug observations",
      ],
      responsibilities: [
        "Encode and verify daily test records",
        "Organize files and update tracking sheets",
        "Coordinate with admin team on release checks",
      ],
    };
  }

  return {
    qualifications: [
      "Basic computer literacy and typing skills",
      "Attention to detail in data checking",
      "Can follow written instructions and task lists",
    ],
    responsibilities: [
      "Encode and verify daily records",
      "Organize files and update tracking sheets",
      "Coordinate with admin team on routine tasks",
    ],
  };
}

function SearchJobsPageContent(): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const [navbarHidden, setNavbarHidden] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoadingOverlayVisible, setDetailLoadingOverlayVisible] = useState(false);
  const [detailLoadingOverlayHiding, setDetailLoadingOverlayHiding] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [applySubmittingJobId, setApplySubmittingJobId] = useState("");
  const [searchSubmitting, setSearchSubmitting] = useState(false);
  const searchLoadingTimerRef = useRef<number | null>(null);
  const detailLoadingTimerRef = useRef<number | null>(null);
  const detailLoadingOverlayHideTimerRef = useRef<number | null>(null);
  const detailClosingTimerRef = useRef<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [quickFilters, setQuickFilters] = useState({
    remoteOnly: false,
    multiVacancy: false,
    accessibilityPriority: false,
  });
  const [selectedBarangay, setSelectedBarangay] = useState("");

  const disabilityOptions = useMemo(
    () => [
      "Visual Impairment",
      "Hearing Impairment",
      "Speech and Language Impairment",
      "Physical Disability / Orthopedic",
      "Psychosocial Disability",
      "Intellectual Disability",
      "Learning Disability",
      "Autism Spectrum Disorder",
      "Chronic Illness",
      "Multiple Disabilities",
    ],
    []
  );
  const jobCategoryOptions = useMemo(
    () => Array.from(new Set(allJobs.map((job) => String(job.category || "").trim()).filter(Boolean))),
    [allJobs]
  );
  const dasmaBarangayOptions = useMemo(
    () => [
      "Salawag",
      "San Agustin",
      "San Jose",
      "San Simon",
      "Sampaloc I",
      "Sampaloc II",
      "Sampaloc III",
      "Sampaloc IV",
      "Paliparan I",
      "Paliparan II",
      "Paliparan III",
      "Sabang",
      "Burol I",
      "Burol II",
      "Burol III",
      "Langkaan I",
      "Langkaan II",
      "Zone I",
      "Zone II",
      "Zone III",
      "Zone IV",
    ],
    []
  );

  const queryFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      keyword: String(params.get("keyword") || "").trim(),
      location: String(params.get("location") || "").trim(),
      category: String(params.get("category") || "").trim(),
    };
  }, [location.search]);

  const filteredJobs = useMemo(() => {
    const keyword = queryFilters.keyword.toLowerCase();
    const filterLocation = queryFilters.location.toLowerCase();
    const disability = queryFilters.category.toLowerCase();

    return allJobs.filter((job) => {
      const title = String(job.title || "").toLowerCase();
      const desc = String(job.description || "").toLowerCase();
      const company = String(job.companyName || "").toLowerCase();
      const jobLocation = String(job.location || "").toLowerCase();
      const jobCategory = String(job.category || job.type || "").toLowerCase();
      const jobDisabilityFit = String(job.disabilityFit || "").toLowerCase();
      const jobSetup = String(job.setup || job.type || "").toLowerCase();

      const keywordMatch =
        !keyword || title.includes(keyword) || desc.includes(keyword) || company.includes(keyword) || jobCategory.includes(keyword);
      const locationMatch = !filterLocation || jobLocation.includes(filterLocation);
      const categoryMatch = !disability || jobDisabilityFit === disability;
      const remoteMatch = !quickFilters.remoteOnly || jobSetup.includes("remote");
      const multiVacancyMatch = !quickFilters.multiVacancy || Number(job.vacancies || 0) >= 3;
      const accessibilityPriorityMatch =
        !quickFilters.accessibilityPriority ||
        /(hearing|visual|physical|mobility|speech|learning|intellectual|autism|psychosocial)/i.test(
          String(job.disabilityFit || "")
        );
      const barangayNeedle = String(selectedBarangay || "").trim().toLowerCase();
      const barangayMatch = !barangayNeedle || jobLocation.includes(barangayNeedle);

      return (
        keywordMatch &&
        locationMatch &&
        categoryMatch &&
        remoteMatch &&
        multiVacancyMatch &&
        accessibilityPriorityMatch &&
        barangayMatch
      );
    });
  }, [allJobs, queryFilters, quickFilters, selectedBarangay]);

  const selectedJobRating = useMemo(() => {
    if (!selectedJob) return null;
    return getMockCompanyRating({ id: selectedJob.id, companyName: selectedJob.companyName });
  }, [selectedJob]);

  const selectedJobPreferences = useMemo(() => {
    if (!selectedJob) return null;
    return getMockJobPreferences({ id: selectedJob.id, category: selectedJob.category, type: selectedJob.type });
  }, [selectedJob]);

  const selectedJobDetailsContent = useMemo(() => {
    if (!selectedJob) return null;
    return getMockJobDetailsContent({ category: selectedJob.category, title: selectedJob.title });
  }, [selectedJob]);

  const initialOpenJobsCount = useMemo(() => Math.max(1, allJobs.filter((job) => job.status === "open").length), [allJobs]);
  const skeletonCardCount = useMemo(() => {
    if (!jobsLoading) return 0;
    if (allJobs.length === 0) return Math.max(4, Math.min(6, initialOpenJobsCount || 6));
    return Math.max(3, Math.min(6, filteredJobs.length || allJobs.length));
  }, [allJobs.length, filteredJobs.length, initialOpenJobsCount, jobsLoading]);

  const showToast = useCallback((text: string) => {
    window.alert(text);
  }, []);

  const closeJobDetailsImmediate = useCallback(() => {
    if (detailLoadingTimerRef.current !== null) {
      window.clearTimeout(detailLoadingTimerRef.current);
      detailLoadingTimerRef.current = null;
    }
    if (detailClosingTimerRef.current !== null) {
      window.clearTimeout(detailClosingTimerRef.current);
      detailClosingTimerRef.current = null;
    }
    if (detailLoadingOverlayHideTimerRef.current !== null) {
      window.clearTimeout(detailLoadingOverlayHideTimerRef.current);
      detailLoadingOverlayHideTimerRef.current = null;
    }
    setDetailLoading(false);
    setDetailLoadingOverlayHiding(false);
    setDetailLoadingOverlayVisible(false);
    setDetailClosing(false);
    setSelectedJob(null);
  }, []);

  const closeJobDetails = useCallback(() => {
    if (!selectedJob) return;
    if (detailClosing) return;
    setDetailClosing(true);
    if (detailClosingTimerRef.current !== null) {
      window.clearTimeout(detailClosingTimerRef.current);
    }
    detailClosingTimerRef.current = window.setTimeout(() => {
      closeJobDetailsImmediate();
    }, 220);
  }, [closeJobDetailsImmediate, detailClosing, selectedJob]);

  const openJobDetails = useCallback((job: Job) => {
    if (detailClosingTimerRef.current !== null) {
      window.clearTimeout(detailClosingTimerRef.current);
      detailClosingTimerRef.current = null;
    }
    setDetailClosing(false);
    if (detailLoadingTimerRef.current !== null) {
      window.clearTimeout(detailLoadingTimerRef.current);
      detailLoadingTimerRef.current = null;
    }
    setDetailLoading(true);
    setSelectedJob(job);
    detailLoadingTimerRef.current = window.setTimeout(() => {
      setDetailLoading(false);
      detailLoadingTimerRef.current = null;
    }, 260);
  }, []);

  const startJobsFeed = useCallback((withSkeleton = true) => {
    if (withSkeleton) setJobsLoading(true);
    window.setTimeout(() => {
      void (async () => {
        let apiRows: unknown[] = [];
        try {
          const res = await fetch("/api/jobs");
          if (res.ok) {
            const rows = (await res.json()) as unknown;
            if (Array.isArray(rows)) apiRows = rows;
          }
        } catch {
          apiRows = [];
        }

        let localRows: unknown[] = [];
        try {
          const raw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          if (Array.isArray(parsed)) localRows = parsed;
        } catch {
          localRows = [];
        }

        const mergedMap = new Map<string, Job>();
        [...localRows, ...apiRows]
          .map((row) => mapApiJobToSearchJob(row as ApiJob))
          .filter((row): row is Job => !!row)
          .forEach((job) => {
            mergedMap.set(job.id, job);
          });

        setAllJobs(Array.from(mergedMap.values()).filter((job) => job.status === "open"));
        if (withSkeleton) setJobsLoading(false);
      })();
    }, 220);
  }, []);

  const triggerSearchLoading = useCallback(() => {
    if (searchLoadingTimerRef.current !== null) {
      window.clearTimeout(searchLoadingTimerRef.current);
      searchLoadingTimerRef.current = null;
    }
    setSearchSubmitting(true);
    searchLoadingTimerRef.current = window.setTimeout(() => {
      setSearchSubmitting(false);
      searchLoadingTimerRef.current = null;
    }, 420);
  }, []);

  const applySearchFilters = useCallback(
    (next: { keyword?: string; location?: string; category?: string }) => {
      const params = new URLSearchParams();
      const keyword = String(next.keyword ?? searchKeyword).trim();
      const locationValue = String(next.location ?? searchLocation).trim();
      const categoryValue = String(next.category ?? searchCategory).trim();

      if (keyword) params.set("keyword", keyword);
      if (locationValue) params.set("location", locationValue);
      if (categoryValue) params.set("category", categoryValue);

      triggerSearchLoading();
      navigate({
        pathname: "/search-jobs",
        search: params.toString() ? `?${params.toString()}` : "",
      });
    },
    [navigate, searchCategory, searchKeyword, searchLocation, triggerSearchLoading]
  );

  const applyToJob = useCallback(
    async (job: Job | null, options?: { showSuccessAlert?: boolean }) => {
      const targetJob = job || selectedJob;
      const jobId = String(targetJob?.id || "").trim();
      const useSweetAlert = Boolean(options?.showSuccessAlert);
      const swalTransitionClass = {
        showClass: { popup: "pwd-apply-swal-show" },
        hideClass: { popup: "pwd-apply-swal-hide" },
      } as const;

      const notifyApply = async ({
        icon,
        title,
        text,
      }: {
        icon: "success" | "error" | "warning" | "info";
        title: string;
        text: string;
      }) => {
        if (!useSweetAlert) {
          showToast(text);
          return;
        }

        const iconHtmlByType: Record<"success" | "error" | "warning" | "info", string> = {
          success: '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>',
          error: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
          warning: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
          info: '<i class="bi bi-info-circle-fill" aria-hidden="true"></i>',
        };

        await Swal.fire({
          ...swalTransitionClass,
          target: document.body,
          icon,
          iconHtml: iconHtmlByType[icon],
          title,
          text,
          confirmButtonText: "Okay",
          showCloseButton: true,
          heightAuto: false,
          scrollbarPadding: false,
          buttonsStyling: false,
          background: "#f2f2f2",
          color: "#1f2937",
          backdrop: "rgba(6, 24, 14, 0.58)",
          customClass: {
            container: "pwd-apply-swal-container",
            popup: "pwd-apply-swal-popup",
            title: "pwd-apply-swal-title",
            htmlContainer: "pwd-apply-swal-text",
            confirmButton: "pwd-apply-swal-confirm",
            icon: "pwd-apply-swal-icon",
          },
        });
      };

      if (!jobId) {
        await notifyApply({
          icon: "warning",
          title: "Invalid Job",
          text: "Invalid job selection.",
        });
        return;
      }

      const applicantId = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || "").trim();
      const applicantEmail = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim();
      const applicantName = String(
        localStorage.getItem("userName") || localStorage.getItem("fullName") || localStorage.getItem("name") || ""
      ).trim();
      const userRole = String(localStorage.getItem("userRole") || "").trim().toLowerCase();
      const profileCompleted =
        String(localStorage.getItem("userProfileCompleted") || "").trim().toLowerCase() === "true";

      if (!applicantId && !applicantEmail) {
        const loginPrompt = await Swal.fire({
          ...swalTransitionClass,
          target: document.body,
          icon: "warning",
          iconHtml: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
          title: "Login Required",
          text: "Please create an applicant account first before applying for this job.",
          confirmButtonText: "Go to Login",
          showCloseButton: true,
          heightAuto: false,
          scrollbarPadding: false,
          buttonsStyling: false,
          background: "#f2f2f2",
          color: "#1f2937",
          backdrop: "rgba(6, 24, 14, 0.58)",
          customClass: {
            container: "pwd-apply-swal-container",
            popup: "pwd-apply-swal-popup",
            title: "pwd-apply-swal-title",
            htmlContainer: "pwd-apply-swal-text",
            confirmButton: "pwd-apply-swal-confirm",
            icon: "pwd-apply-swal-icon",
          },
        });
        if (loginPrompt.isConfirmed) {
          navigate("/login");
        }
        return;
      }

      if (userRole === "applicant" && !profileCompleted) {
        await notifyApply({
          icon: "warning",
          title: "Complete Your Profile",
          text: "Please complete your account information first.",
        });
        return;
      }

      setApplySubmittingJobId(jobId);
      try {
        const existing = JSON.parse(localStorage.getItem("applications") || "[]") as unknown[];
        const next = [
          ...existing,
          {
            jobId,
            jobTitle: String(targetJob?.title || "Untitled Job").trim(),
            applicantId: applicantId || null,
            applicantName: applicantName || applicantEmail || "Applicant",
            applicantEmail: applicantEmail || null,
            appliedAt: new Date().toISOString(),
            status: "pending",
          },
        ];
        localStorage.setItem("applications", JSON.stringify(next));
        await notifyApply({
          icon: "success",
          title: "Application Sent",
          text: `Nice! Naipasa na ang application mo for ${String(targetJob?.title || "this job")}.`,
        });
      } catch {
        await notifyApply({
          icon: "error",
          title: "Submission Failed",
          text: "Failed to submit application.",
        });
      } finally {
        setApplySubmittingJobId("");
      }
    },
    [location.pathname, location.search, navigate, selectedJob, showToast]
  );

  const saveJobToFavorites = useCallback(
    async (job: Job | null) => {
      const targetJob = job || selectedJob;
      if (!targetJob) return;
      const swalTransitionClass = {
        showClass: { popup: "pwd-apply-swal-show" },
        hideClass: { popup: "pwd-apply-swal-hide" },
      } as const;

      const saveConfirm = await Swal.fire({
        ...swalTransitionClass,
        target: document.body,
        icon: "question",
        iconHtml: '<i class="bi bi-bookmark-heart-fill" aria-hidden="true"></i>',
        title: "Save This Job?",
        text: `Are you sure you want to favorite ${String(targetJob.companyName || "this company")} - ${String(
          targetJob.location || "this branch"
        )}?`,
        confirmButtonText: "Yes, Save",
        cancelButtonText: "Cancel",
        showCancelButton: true,
        showCloseButton: true,
        heightAuto: false,
        scrollbarPadding: false,
        buttonsStyling: false,
        background: "#f2f2f2",
        color: "#1f2937",
        backdrop: "rgba(6, 24, 14, 0.58)",
        customClass: {
          container: "pwd-apply-swal-container",
          popup: "pwd-apply-swal-popup pwd-save-confirm-popup",
          title: "pwd-apply-swal-title",
          htmlContainer: "pwd-apply-swal-text",
          confirmButton: "pwd-apply-swal-confirm",
          cancelButton: "pwd-apply-swal-cancel",
          icon: "pwd-apply-swal-icon",
        },
      });

      if (!saveConfirm.isConfirmed) return;

      const userId = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || "").trim();
      const userEmail = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim();

      if (!userId && !userEmail) {
        const loginPrompt = await Swal.fire({
          ...swalTransitionClass,
          target: document.body,
          icon: "warning",
          iconHtml: '<i class="bi bi-exclamation-triangle-fill pwd-alert-triangle" aria-hidden="true"></i>',
          title: "Login Required",
          text: "Please log in first before saving a favorite company or branch.",
          confirmButtonText: "Go to Login",
          showCloseButton: true,
          heightAuto: false,
          scrollbarPadding: false,
          buttonsStyling: false,
          background: "#f2f2f2",
          color: "#1f2937",
          backdrop: "rgba(6, 24, 14, 0.58)",
          customClass: {
            container: "pwd-apply-swal-container",
            popup: "pwd-apply-swal-popup",
            title: "pwd-apply-swal-title",
            htmlContainer: "pwd-apply-swal-text",
            confirmButton: "pwd-apply-swal-confirm",
            icon: "pwd-apply-swal-icon",
          },
        });
        if (loginPrompt.isConfirmed) {
          navigate("/login");
        }
        return;
      }

      await Swal.fire({
        ...swalTransitionClass,
        target: document.body,
        icon: "success",
        iconHtml: '<i class="bi bi-bookmark-check-fill" aria-hidden="true"></i>',
        title: "Saved to Favorites",
        text: `${String(targetJob.companyName || "This company")} has been added to your favorites.`,
        confirmButtonText: "Okay",
        showCloseButton: true,
        heightAuto: false,
        scrollbarPadding: false,
        buttonsStyling: false,
        background: "#f2f2f2",
        color: "#1f2937",
        backdrop: "rgba(6, 24, 14, 0.58)",
        customClass: {
          container: "pwd-apply-swal-container",
          popup: "pwd-apply-swal-popup pwd-save-success-popup",
          title: "pwd-apply-swal-title",
          htmlContainer: "pwd-apply-swal-text",
          confirmButton: "pwd-apply-swal-confirm",
          icon: "pwd-apply-swal-icon",
        },
      });
    },
    [navigate, selectedJob]
  );

  useEffect(() => {
    startJobsFeed(true);
    const timer = window.setInterval(() => {
      startJobsFeed(false);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [startJobsFeed]);

  useEffect(() => {
    let lastY = window.scrollY || 0;
    const onScroll = () => {
      const currentY = window.scrollY || 0;

      if (currentY <= 12) {
        setNavbarHidden(false);
      } else {
        const delta = currentY - lastY;
        if (delta > 6 && currentY > 90) setNavbarHidden(true);
        if (delta < -3) setNavbarHidden(false);
      }

      lastY = currentY;
    };
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedJob) {
        closeJobDetails();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeydown);
    onScroll();

    return () => {
      if (searchLoadingTimerRef.current !== null) {
        window.clearTimeout(searchLoadingTimerRef.current);
        searchLoadingTimerRef.current = null;
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeydown);
    };
  }, [closeJobDetails, selectedJob]);

  useEffect(() => {
    if (detailLoading) {
      if (detailLoadingOverlayHideTimerRef.current !== null) {
        window.clearTimeout(detailLoadingOverlayHideTimerRef.current);
        detailLoadingOverlayHideTimerRef.current = null;
      }
      setDetailLoadingOverlayVisible(true);
      setDetailLoadingOverlayHiding(false);
      return;
    }

    if (!detailLoadingOverlayVisible) return;

    setDetailLoadingOverlayHiding(true);
    detailLoadingOverlayHideTimerRef.current = window.setTimeout(() => {
      setDetailLoadingOverlayVisible(false);
      setDetailLoadingOverlayHiding(false);
      detailLoadingOverlayHideTimerRef.current = null;
    }, 180);
  }, [detailLoading, detailLoadingOverlayVisible]);

  useEffect(() => {
    if (!selectedJob) {
      if (detailLoadingOverlayHideTimerRef.current !== null) {
        window.clearTimeout(detailLoadingOverlayHideTimerRef.current);
        detailLoadingOverlayHideTimerRef.current = null;
      }
      setDetailLoadingOverlayHiding(false);
      setDetailLoadingOverlayVisible(false);
    }
  }, [selectedJob]);

  useEffect(() => {
    return () => {
      if (detailLoadingTimerRef.current !== null) {
        window.clearTimeout(detailLoadingTimerRef.current);
        detailLoadingTimerRef.current = null;
      }
      if (detailLoadingOverlayHideTimerRef.current !== null) {
        window.clearTimeout(detailLoadingOverlayHideTimerRef.current);
        detailLoadingOverlayHideTimerRef.current = null;
      }
      if (detailClosingTimerRef.current !== null) {
        window.clearTimeout(detailClosingTimerRef.current);
        detailClosingTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const modalOpen = selectedJob !== null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    if (modalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overscrollBehavior = "none";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [selectedJob]);

  const goToLandingSection = (hash: string) => {
    navigate(`/landingpage${hash}`);
  };

  const submitPageSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    const locationValue = searchLocation.trim();
    const categoryValue = searchCategory.trim();

    applySearchFilters({
      keyword,
      location: locationValue,
      category: categoryValue,
    });
  };

  useEffect(() => {
    setSearchKeyword(queryFilters.keyword);
    setSearchLocation(queryFilters.location);
    setSearchCategory(queryFilters.category);
  }, [queryFilters]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return (
    <div className="search-page">
      {searchSubmitting && (
        <div className="loading-overlay search-submit-overlay" role="status" aria-live="polite" aria-label="Searching jobs">
          <div className="search-submit-loading-card">
            <div className="search-submit-loading-icon" aria-hidden="true">
              <span className="search-submit-loading-spinner-ring" />
              <span className="search-submit-loading-spinner-core" />
            </div>
            <div className="search-submit-loading-copy">
              <p className="search-submit-loading-title">Searching jobs for you</p>
              <p className="search-submit-loading-subtitle">Please wait while we update the job results.</p>
              <div className="search-submit-loading-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      )}
      <LandingNavbar scrollToId={(id) => goToLandingSection(`#${id}`)} hidden={navbarHidden} />

      <main className="results-main">
        <section className="results-shell">
          <button type="button" className="page-back-btn" onClick={() => navigate("/landingpage")}>
            <i className="bi bi-arrow-left-circle" aria-hidden="true" />
            Back to Home
          </button>

          <div className="results-head">
            <h1>Job Search Results</h1>
            <p>Showing results based on your filters from the landing page.</p>
          </div>

          <form className="results-search-form" onSubmit={submitPageSearch}>
            <div className="results-search-fields">
              <label className="results-search-field">
                <i className="bi bi-search results-search-field-icon" aria-hidden="true" />
                <input
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="What opportunies are you looking for?"
                  aria-label="Job title"
                />
              </label>
              <label className="results-search-field results-search-field-select">
                <select
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                  }}
                  aria-label="Category"
                >
                  <option value="">All Categories</option>
                  {jobCategoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="results-search-field results-search-field-select">
                <select
                  value={searchCategory}
                  onChange={(e) => {
                    setSearchCategory(e.target.value);
                  }}
                  aria-label="Disabilities"
                >
                  <option value="">All Disabilities Types</option>
                  {disabilityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="results-search-submit" disabled={searchSubmitting}>
                Search
              </button>
            </div>
          </form>

          <div className="results-content-shell">
            <div className="results-layout">
              <aside
                className="results-filters-panel"
                aria-label="Quick filters"
              >
                <div className="results-filters-card">
                  <p className="results-filters-title">Quick Filters</p>
                  <label className="results-check-row">
                    <input
                      type="checkbox"
                      checked={quickFilters.remoteOnly}
                      onChange={(e) =>
                        setQuickFilters((prev) => ({
                          ...prev,
                          remoteOnly: e.target.checked,
                        }))
                      }
                    />
                    <span>Remote setup only</span>
                  </label>
                  <label className="results-check-row">
                    <input
                      type="checkbox"
                      checked={quickFilters.multiVacancy}
                      onChange={(e) =>
                        setQuickFilters((prev) => ({
                          ...prev,
                          multiVacancy: e.target.checked,
                        }))
                      }
                    />
                    <span>3+ vacancies</span>
                  </label>
                  <label className="results-check-row">
                    <input
                      type="checkbox"
                      checked={quickFilters.accessibilityPriority}
                      onChange={(e) =>
                        setQuickFilters((prev) => ({
                          ...prev,
                          accessibilityPriority: e.target.checked,
                        }))
                      }
                    />
                    <span>PWD support prioritized</span>
                  </label>

                  <div className="results-filter-subgroup">
                    <p className="results-filter-subtitle">Barangay / Area</p>
                    <label className="results-filter-select-wrap">
                      <span className="sr-only">Select Dasmarinas barangay</span>
                      <select
                        value={selectedBarangay}
                        onChange={(e) => {
                          setSelectedBarangay(e.target.value);
                          triggerSearchLoading();
                        }}
                        aria-label="Select Dasmarinas barangay"
                      >
                        <option value="">All Dasmarinas Barangays</option>
                        {dasmaBarangayOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </aside>

              <div
                className={`results-list-area${jobsLoading ? " is-skeleton" : ""}${!jobsLoading && filteredJobs.length >= 5 ? " has-scroll" : ""}`}
              >
                {!jobsLoading && filteredJobs.length === 0 && (
                  <div className="empty-card">
                    <i className="bi bi-briefcase-fill empty-card-icon" aria-hidden="true" />
                    <h2>No matching jobs found</h2>
                    <p>
                      {selectedBarangay
                        ? `No job posts available in ${selectedBarangay} yet. Try another barangay or clear your filters.`
                        : "No job posts match your current filters. Try adjusting your search."}
                    </p>
                  </div>
                )}

                {jobsLoading && (
                  <div className="results-grid skeleton-grid" aria-hidden="true">
                    {Array.from({ length: skeletonCardCount }).map((_, idx) => (
                  <article key={`skeleton-${idx}`} className="result-card skeleton-card">
                    <div className="result-card-top">
                      <div className="skeleton-line skeleton-status" />
                      <div className="skeleton-line skeleton-posted" />
                    </div>
                    <div className="result-head">
                      <div className="skeleton-logo" />
                          <div className="skeleton-head-copy">
                            <div className="skeleton-line skeleton-title" />
                            <div className="skeleton-line skeleton-company" />
                          </div>
                    </div>
                    <div className="skeleton-line skeleton-desc" />
                    <div className="skeleton-line skeleton-desc short" />
                    <div className="result-meta-inline result-meta-inline-skeleton">
                      <div className="skeleton-line skeleton-meta-inline" />
                    </div>
                    <div className="result-info-simple result-info-simple-skeleton">
                      <div className="skeleton-line skeleton-info-line" />
                      <div className="skeleton-line skeleton-info-line long" />
                    </div>
                    <div className="result-actions">
                      <div className="skeleton-btn" />
                          <div className="skeleton-btn" />
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {!jobsLoading && filteredJobs.length > 0 && (
                  <div className="results-grid">
                    {filteredJobs.map((job) => (
                      <article
                        key={job.id}
                        className={`result-card result-card-clickable ${selectedJob?.id === job.id ? "is-active" : ""}`.trim()}
                        role="button"
                        tabIndex={0}
                        onClick={() => openJobDetails(job)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openJobDetails(job);
                          }
                        }}
                    aria-label={`View details for ${job.title || "job"} at ${job.companyName || "company"}`}
                  >
                    <span className="result-card-side-label" aria-hidden="true">View details</span>
                    <div className="result-card-top">
                      <span className="result-status-inline">
                        <i className="bi bi-dot" aria-hidden="true" /> Open
                      </span>
                      <span className="result-posted-inline">
                        <i className="bi bi-clock-history" aria-hidden="true" />
                        {String(job.postedDate || "Posted: Recently").replace("Posted: ", "")}
                      </span>
                    </div>
                        <div className="result-head">
                          <div className="result-logo" aria-hidden="true">
                            {getCompanyInitials(job.companyName || "Company")}
                          </div>
                          <div className="result-title-wrap">
                            <h3>{job.title || "Untitled Role"}</h3>
                            <p className="result-company-line">
                              <i className="bi bi-building" aria-hidden="true" />
                              <span>{job.companyName || "Company"}</span>
                            </p>
                          </div>
                    </div>
                    <p className="desc">{job.description || "No description provided."}</p>
                    <div className="result-meta-inline" aria-label="Job metadata">
                      <span className="result-meta-chip chip-location">
                        <i className="bi bi-geo-alt" aria-hidden="true" />
                        {job.location || "Location not specified"}
                      </span>
                      <span className="result-meta-chip chip-category">
                        <i className="bi bi-briefcase" aria-hidden="true" />
                        {job.category || "Category"}
                      </span>
                      <span className="result-meta-chip chip-setup">
                        <i className="bi bi-laptop" aria-hidden="true" />
                        {job.setup || job.type || "Open"}
                      </span>
                      <span className="result-meta-chip chip-vacancies">
                        <i className="bi bi-people" aria-hidden="true" />
                        {job.vacancies || 1} Vacancies
                      </span>
                      {String(job.type || "").trim() &&
                        String(job.type || "").trim().toLowerCase() !== String(job.setup || "").trim().toLowerCase() && (
                          <span className="result-meta-chip chip-type">
                            <i className="bi bi-clock" aria-hidden="true" />
                            {job.type}
                          </span>
                        )}
                    </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {selectedJob && (
        <div className={`detail-modal-overlay${detailClosing ? " is-closing" : ""}`} onClick={closeJobDetails}>
          <article className={`detail-modal${detailClosing ? " is-closing" : ""}`} onClick={(e) => e.stopPropagation()}>
            {detailLoadingOverlayVisible && (
              <div
                className={`detail-loading-overlay${detailLoadingOverlayHiding ? " is-hiding" : ""}`}
                role="status"
                aria-live="polite"
                aria-label="Loading job details"
              >
                <div className="detail-loading-bubble">
                  <span className="detail-loading-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
            <div className="detail-head">
              <div className="detail-head-card">
                <button
                  type="button"
                  className="detail-close-btn detail-close-btn-inline"
                  onClick={closeJobDetails}
                  aria-label="Close job details"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                  <span>Close</span>
                </button>
                <div className="detail-head-main">
                  <div className="detail-logo" aria-hidden="true">
                    {getCompanyInitials(selectedJob.companyName || "Company")}
                  </div>
                  <div className="detail-head-copy">
                    <div className="detail-head-badges">
                      <span className="detail-status-inline">
                        <i className="bi bi-dot" aria-hidden="true" /> Open
                      </span>
                      <span className="detail-posted-inline">
                        <i className="bi bi-clock-history" aria-hidden="true" />{" "}
                        {String(selectedJob.postedDate || "Posted: Recently").replace("Posted: ", "")}
                      </span>
                    </div>
                    <h2>{selectedJob.title || "Untitled Role"}</h2>
                    <p className="detail-company">
                      <i className="bi bi-building" aria-hidden="true" />
                      <span>{selectedJob.companyName || "Company"}</span>
                    </p>
                    {selectedJobRating && (
                      <div
                        className="detail-rating-row"
                        aria-label={`Company rating ${selectedJobRating.rating} out of 5 from ${selectedJobRating.reviews} reviews`}
                      >
                        <div className="detail-rating-stars" aria-hidden="true">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <i
                              key={`detail-rating-star-${index}`}
                              className={`bi ${index < Math.round(selectedJobRating.rating) ? "bi-star-fill" : "bi-star"}`}
                            />
                          ))}
                        </div>
                        <span className="detail-rating-score">{selectedJobRating.rating.toFixed(1)} / 5</span>
                        <span className="detail-rating-count">({selectedJobRating.reviews} reviews)</span>
                      </div>
                    )}
                    <p className="detail-meta-inline" aria-label="Job metadata">
                      <span className="meta-location"><i className="bi bi-geo-alt" aria-hidden="true" /> {selectedJob.location || "Location not specified"}</span>
                      <span className="meta-category"><i className="bi bi-briefcase" aria-hidden="true" /> {selectedJob.category || "Not specified"}</span>
                      <span className="meta-type"><i className="bi bi-clock" aria-hidden="true" /> {selectedJob.type || selectedJob.setup || "Open"}</span>
                      <span className="meta-vacancies"><i className="bi bi-people" aria-hidden="true" /> {selectedJob.vacancies || 1} Vacancies</span>
                    </p>
                  </div>
                </div>
                <a
                  className="detail-view-map-btn"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.location || "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-map" aria-hidden="true" /> View Map
                </a>
              </div>
            </div>
            <div className="detail-body">
              <section className="detail-panel detail-panel-full">
                <h3>
                  <i className="bi bi-file-text" aria-hidden="true" /> Job Description
                </h3>
                <p>{selectedJob.description || "No description provided."}</p>
              </section>
              {selectedJobPreferences && (
                <section className="detail-pref-panel" aria-label="Language and age preference">
                  <h3>
                    <i className="bi bi-person-lines-fill" aria-hidden="true" /> Language and Age Preference
                  </h3>
                  <div className="detail-pref-lines">
                    <p>
                      <i className="bi bi-translate" aria-hidden="true" />
                      <span><strong>Languages:</strong> {Array.from(new Set(selectedJobPreferences.languages)).join(", ")}</span>
                    </p>
                    <p>
                      <i className="bi bi-person-badge" aria-hidden="true" />
                      <span><strong>Preferred Age:</strong> {selectedJobPreferences.preferredAge}</span>
                    </p>
                  </div>
                </section>
              )}
              <div className="detail-panels">
                <section className="detail-panel">
                  <h3>
                    <i className="bi bi-check2-circle" aria-hidden="true" /> Qualifications
                  </h3>
                  <ul className="detail-list">
                    {(selectedJobDetailsContent?.qualifications || []).map((item) => (
                      <li key={`qual-${item}`}>
                        <i className="bi bi-dot" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="detail-panel">
                  <h3>
                    <i className="bi bi-list-task" aria-hidden="true" /> Responsibilities
                  </h3>
                  <ul className="detail-list">
                    {(selectedJobDetailsContent?.responsibilities || []).map((item) => (
                      <li key={`resp-${item}`}>
                        <i className="bi bi-dot" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <div className="detail-info-compact" aria-label="Salary and suitability information">
                <div className="detail-info-compact-row detail-info-compact-row-salary">
                  <div className="detail-salary-icon" aria-hidden="true">
                    <i className="bi bi-cash-stack" />
                  </div>
                  <div className="detail-salary-copy">
                    <span>Salary Range</span>
                    <strong>{selectedJob.salary || "Salary not specified"}</strong>
                  </div>
                </div>
                <div className="detail-info-compact-divider" aria-hidden="true" />
                <div className="detail-info-compact-row">
                  <div className="detail-suitable-icon" aria-hidden="true">
                    <i className={`bi ${getDisabilityIconClass(selectedJob.disabilityFit || "")}`} />
                  </div>
                  <div className="detail-suitable-copy">
                    <span>Suitable For</span>
                    <strong>{selectedJob.disabilityFit || "PWD Friendly"}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="detail-actions-wrap">
              <div className="detail-actions">
                <button type="button" className="action-btn detail-secondary-btn" onClick={() => void saveJobToFavorites(selectedJob)}>
                  <i className="bi bi-bookmark-plus" aria-hidden="true" /> Save
                </button>
                <button
                  type="button"
                  className="action-btn detail-primary-btn"
                  disabled={!selectedJob || applySubmittingJobId === String(selectedJob.id || "")}
                  onClick={() => void applyToJob(selectedJob, { showSuccessAlert: true })}
                >
                  <i className="bi bi-bookmark-plus" aria-hidden="true" />
                  {applySubmittingJobId === String(selectedJob?.id || "") ? "Applying..." : "Apply Now"}
                </button>
              </div>
              <p className="detail-apply-note">
                <i className="bi bi-people" aria-hidden="true" /> {selectedJob.vacancies || 1} Vacancies Available
              </p>
            </div>
          </article>
        </div>
      )}

      <footer id="privacy" className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img src={footerLogo} alt="HireAble Logo" className="footer-logo" />
            <p className="brand-text">
              This site is managed by RCST students as part of the development of a web-based job employment assistance
              platform for Persons with Disabilities in the City of Dasmarinas with Decision Support System.
            </p>
          </div>

          <div className="footer-nav">
            <div className="nav-group">
              <h3>About PWD Hireable Proximity</h3>
              <p>
                A powerful job site that aims to connect Persons with Disabilities with companies while promoting
                awareness of the importance of providing equal and gainful employment opportunities.
              </p>
            </div>

            <div className="nav-group">
              <h3>Services</h3>
              <ul>
                <li>Job Matching</li>
                <li>DSS Analysis</li>
                <li>Employer Portal</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="bottom-inner">
            <p>&copy; 2026 PWD Employment Assistance Platform. Developed for Research Purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SearchJobsPageModule(): React.JSX.Element {
  return (
    <Routes>
      <Route path="*" element={<SearchJobsPageContent />} />
    </Routes>
  );
}


