import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";
import Swal from "sweetalert2";
import "../designer/main_landing_pages.css";
import LandingNavbar from "../components/landing_navbar";
import proximityLogo from "../assets/proximity.png";
import heroSealLogo from "../assets/logoproximity.png";
import heroBgMain from "../assets/bg.jpg";
import heroBgWorker from "../assets/PWD_worker.png";
import heroBgChoose from "../assets/PWD_choose.png";
import heroBgLogin from "../assets/PWD_login.png";

type FeaturedJob = {
  title: string;
  company: string;
  companyInitials: string;
  description: string;
  category: string;
  type: string;
  location: string;
  setup: string;
  vacancies: number;
  salary: string;
  disabilityFit: string;
  postedDate: string;
  preferredAgeRange: string;
  languages: string[];
  companyRating: number;
  companyRatingCount: number;
  qualifications: string[];
  responsibilities: string[];
};

type ApiJob = Record<string, unknown>;

type Tutorial = { q: string; a: string; videoSrc: string };
type Faq = { q: string; a: string };
const FEATURED_JOB_SKELETON_MS = 950;
const SECTION_SKELETON_HOLD_MS = 900;
const SECTION_SKELETON_FADE_MS = 320;
const LOCAL_JOB_POSTS_KEY = "adminLocalJobPosts";

function getDisabilityIconClass(disabilityFit: string): string {
  const text = String(disabilityFit || "").toLowerCase();
  if (text.includes("hearing")) return "bi-ear";
  if (text.includes("speech")) return "bi-chat-square-text";
  if (text.includes("visual") || text.includes("vision")) return "bi-eye";
  if (text.includes("physical") || text.includes("mobility") || text.includes("wheelchair")) return "bi-person-wheelchair";
  if (text.includes("learning")) return "bi-book";
  if (text.includes("intellectual")) return "bi-lightbulb";
  if (text.includes("autism")) return "bi-stars";
  if (text.includes("psychosocial") || text.includes("chronic")) return "bi-heart-pulse";
  return "bi-accessibility";
}

function mapApiJobToFeaturedJob(raw: ApiJob): FeaturedJob | null {
  const status = String(raw.status || "").trim().toLowerCase();
  if (status && !["open", "approved", "published", "active"].includes(status)) return null;

  const title = String(raw.title || "").trim();
  const company = String(raw.companyName || raw.company || raw.department || "Company").trim();
  if (!title) return null;

  const location = String(raw.location || "Not specified").trim();
  const description = String(raw.description || "No description provided.").trim();
  const category = String(raw.category || "General").trim();
  const type = String(raw.type || "Open").trim();
  const setup = String(raw.setup || "On-site").trim();
  const vacanciesRaw = Number(raw.vacancies || 1);
  const vacancies = Number.isFinite(vacanciesRaw) && vacanciesRaw > 0 ? vacanciesRaw : 1;
  const salary = String(raw.salary || "Negotiable").trim();
  const disabilityFit = String(raw.disabilityType || raw.disability || "PWD-friendly").trim();
  const preferredAgeRange = String(raw.preferredAgeRange || "18 - 60 years old").trim();

  const languages = Array.isArray(raw.languages)
    ? raw.languages.map((x) => String(x || "").trim()).filter(Boolean)
    : String(raw.languages || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

  const qualifications = Array.isArray(raw.qualifications)
    ? raw.qualifications.map((x) => String(x || "").trim()).filter(Boolean)
    : String(raw.qualifications || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

  const responsibilities = Array.isArray(raw.responsibilities)
    ? raw.responsibilities.map((x) => String(x || "").trim()).filter(Boolean)
    : String(raw.responsibilities || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

  const createdAtRaw = String(raw.createdAt || raw.postedAt || "").trim();
  const createdAtMs = createdAtRaw ? Date.parse(createdAtRaw) : 0;
  const postedDate = Number.isFinite(createdAtMs) && createdAtMs > 0
    ? `Posted: ${new Date(createdAtMs).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`
    : `Posted: ${new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`;

  return {
    title,
    company,
    companyInitials: company
      .split(" ")
      .map((x) => x.trim().charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CO",
    description,
    category,
    type,
    location,
    setup,
    vacancies,
    salary,
    disabilityFit,
    postedDate,
    preferredAgeRange,
    languages: languages.length ? languages : ["English"],
    companyRating: 4.7,
    companyRatingCount: 12,
    qualifications: qualifications.length ? qualifications : ["Role-specific requirements will be discussed during screening."],
    responsibilities: responsibilities.length ? responsibilities : ["Perform assigned tasks based on the role and team needs."],
  };
}

export default function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();
 
  const [showPageLoader, setShowPageLoader] = useState(true);
  const [pageLoaderFadingOut, setPageLoaderFadingOut] = useState(false);
  const [heroSearchLoading, setHeroSearchLoading] = useState(false);
  const heroParallaxY = 0;
  const [heroBgIndex, setHeroBgIndex] = useState(0);
  const [heroPrevBgIndex, setHeroPrevBgIndex] = useState<number | null>(null);
  const [selectedFeaturedJobIndex, setSelectedFeaturedJobIndex] = useState(0);
  const [featuredJobLoading, setFeaturedJobLoading] = useState(false);
  const [sectionSkeletonVisible, setSectionSkeletonVisible] = useState(false);
  const [sectionSkeletonFadingOut, setSectionSkeletonFadingOut] = useState(false);
  const [selectedTutorialIndex, setSelectedTutorialIndex] = useState<number | null>(null);
  const [tutorialVideoLoaded, setTutorialVideoLoaded] = useState(false);
  const [tutorialModalClosing, setTutorialModalClosing] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [heroKeyword, setHeroKeyword] = useState("");
  const [heroCategory, setHeroCategory] = useState("");
  const [heroDisability, setHeroDisability] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [contactComment, setContactComment] = useState("");
  const [featuredJobPosts, setFeaturedJobPosts] = useState<FeaturedJob[]>([]);
  const featuredJobTimerRef = useRef<number | null>(null);
  const sectionSkeletonFadeTimerRef = useRef<number | null>(null);
  const sectionSkeletonHideTimerRef = useRef<number | null>(null);
  const sectionSkeletonPlayedRef = useRef(false);
  const heroSearchNavTimerRef = useRef<number | null>(null);
  const tutorialModalCloseTimerRef = useRef<number | null>(null);

  const aboutRef = useRef<HTMLElement | null>(null);
  const tutorialRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);

  const heroDisabilities = useMemo(
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
  const heroCategories = useMemo(
    () => ["Administrative", "Customer Service", "IT / Software", "Retail", "Operations", "Clerical"],
    []
  );

  const heroSlides = useMemo(
    () => [heroBgMain, heroBgWorker, heroBgChoose, heroBgLogin],
    []
  );

  const tutorials: Tutorial[] = useMemo(
    () => [
      {
        q: "How do I register as a PWD job seeker?",
        a: "Open the Register page, choose the PWD applicant option, complete your details, upload requirements, then submit for verification.",
        videoSrc: "https://www.youtube.com/embed/J1Ip2sC_lss",
      },
      {
        q: "How do I register as an employer?",
        a: "Select employer registration, provide company info and contacts, then wait for admin approval before posting job openings.",
        videoSrc: "https://www.youtube.com/embed/J1Ip2sC_lss",
      },
      {
        q: "How do I log in and update my profile?",
        a: "Use your email and password, then open profile settings to update contact info, skills, and work preferences.",
        videoSrc: "https://www.youtube.com/embed/J1Ip2sC_lss",
      },
      {
        q: "How do I apply for a job listing?",
        a: "Go to Find Jobs, review requirements and accessibility details, then click Apply. Keep your resume updated.",
        videoSrc: "https://www.youtube.com/embed/J1Ip2sC_lss",
      },
      {
        q: "How do employers review and shortlist applicants?",
        a: "Employers can open posted jobs, check candidate profiles, and use DSS recommendations to shortlist based on role fit.",
        videoSrc: "https://www.youtube.com/embed/J1Ip2sC_lss",
      },
    ],
    []
  );

  const faqs: Faq[] = useMemo(
    () => [
      {
        q: "What is this system all about?",
        a: "This is a web-based job employment assistance platform to help PWDs find inclusive opportunities in Dasmarinas using a Decision Support System.",
      },
      {
        q: "Who are the intended users of the system?",
        a: "PWD applicants, employers, and administrators who manage job postings and applicant matching.",
      },
      {
        q: "What is the purpose of the Decision Support System?",
        a: "To analyze applicants' skills/preferences and recommend suitable job opportunities.",
      },
      {
        q: "How does the system help PWD job seekers?",
        a: "It lets PWDs create profiles, upload resumes, and receive job recommendations based on abilities/skills.",
      },
      {
        q: "How does the system help employers?",
        a: "Employers can post vacancies and view recommended PWD applicants who match job requirements.",
      },
      { q: "Is the system free to use?", a: "Yes. Free for PWD job seekers and registered employers." },
    ],
    []
  );

  const selectedFeaturedJob = featuredJobPosts[selectedFeaturedJobIndex] ?? null;
  const swalTransitionClass = {
    showClass: { popup: "pwd-apply-swal-show" },
    hideClass: { popup: "pwd-apply-swal-hide" },
  } as const;

  const handleFeaturedJobSave = async () => {
    if (!selectedFeaturedJob) return;

    const saveConfirm = await Swal.fire({
      ...swalTransitionClass,
      target: document.body,
      icon: "question",
      iconHtml: '<i class="bi bi-bookmark-heart-fill" aria-hidden="true"></i>',
      title: "Save This Job?",
      text: `Are you sure you want to favorite ${selectedFeaturedJob.company} - ${selectedFeaturedJob.location}?`,
      heightAuto: false,
      scrollbarPadding: false,
      confirmButtonText: "Yes, Save",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      showCloseButton: true,
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
        heightAuto: false,
        scrollbarPadding: false,
        confirmButtonText: "Go to Login",
        showCloseButton: true,
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
      text: `${selectedFeaturedJob.company} has been added to your favorites.`,
      heightAuto: false,
      scrollbarPadding: false,
      confirmButtonText: "Okay",
      showCloseButton: true,
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
  };

  const handleFeaturedJobApply = async () => {
    const applicantId = String(localStorage.getItem("userUid") || localStorage.getItem("uid") || "").trim();
    const applicantEmail = String(localStorage.getItem("userEmail") || localStorage.getItem("email") || "").trim();
    const userRole = String(localStorage.getItem("userRole") || "").trim().toLowerCase();
    const profileCompleted = String(localStorage.getItem("userProfileCompleted") || "").trim().toLowerCase() === "true";

    const showApplyAlert = async ({
      icon,
      title,
      text,
    }: {
      icon: "success" | "error" | "warning" | "info";
      title: string;
      text: string;
    }) => {
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
      await showApplyAlert({
        icon: "warning",
        title: "Complete Your Profile",
        text: "Please complete your account information first.",
      });
      return;
    }

    await showApplyAlert({
      icon: "success",
      title: "Application Sent",
      text: `Nice! Naipasa na ang application mo for ${selectedFeaturedJob?.title || "this job"}.`,
    });
  };

  useEffect(() => {
    let alive = true;
    let timer = 0;

    const pullJobs = async () => {
      try {
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
          const localRaw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
          const parsed = localRaw ? (JSON.parse(localRaw) as unknown) : [];
          if (Array.isArray(parsed)) localRows = parsed;
        } catch {
          localRows = [];
        }

        const rows = [...localRows, ...apiRows];
        const mapped = rows
          .map((row) => mapApiJobToFeaturedJob(row as ApiJob))
          .filter((row): row is FeaturedJob => !!row);
        if (!alive) return;
        setFeaturedJobPosts(mapped);
      } catch {
        // keep current featured list
      }
    };

    void pullJobs();
    timer = window.setInterval(() => {
      void pullJobs();
    }, 8000);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (selectedFeaturedJobIndex < featuredJobPosts.length) return;
    setSelectedFeaturedJobIndex(0);
  }, [featuredJobPosts.length, selectedFeaturedJobIndex]);

  useEffect(() => {
    const minLoaderMs = 800;
    const fadeMs = 300;
    const startedAt = Date.now();
    let fadeStartTimer: number | null = null;
    let hideTimer: number | null = null;

    const startFadeOut = () => {
      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(0, minLoaderMs - elapsed);

      fadeStartTimer = window.setTimeout(() => {
        setPageLoaderFadingOut(true);
        hideTimer = window.setTimeout(() => setShowPageLoader(false), fadeMs);
      }, waitMs);
    };

    if (document.readyState === "complete") {
      startFadeOut();
    } else {
      window.addEventListener("load", startFadeOut, { once: true });
    }

    return () => {
      window.removeEventListener("load", startFadeOut);
      if (fadeStartTimer !== null) window.clearTimeout(fadeStartTimer);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const shouldLockScroll = showPageLoader || heroSearchLoading;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (shouldLockScroll) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showPageLoader, heroSearchLoading]);

  useEffect(() => {
    return () => {
      if (featuredJobTimerRef.current !== null) {
        window.clearTimeout(featuredJobTimerRef.current);
      }
      if (sectionSkeletonFadeTimerRef.current !== null) {
        window.clearTimeout(sectionSkeletonFadeTimerRef.current);
      }
      if (sectionSkeletonHideTimerRef.current !== null) {
        window.clearTimeout(sectionSkeletonHideTimerRef.current);
      }
      if (heroSearchNavTimerRef.current !== null) {
        window.clearTimeout(heroSearchNavTimerRef.current);
      }
      if (tutorialModalCloseTimerRef.current !== null) {
        window.clearTimeout(tutorialModalCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroBgIndex((prev) => {
        setHeroPrevBgIndex(prev);
        return (prev + 1) % heroSlides.length;
      });
    }, 5200);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  useEffect(() => {
    document.body.style.overflow = selectedTutorialIndex !== null && !tutorialModalClosing ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedTutorialIndex, tutorialModalClosing]);

  useEffect(() => {
    const triggerSectionSkeleton = () => {
      if (sectionSkeletonPlayedRef.current) return;
      sectionSkeletonPlayedRef.current = true;
      setSectionSkeletonVisible(true);
      setSectionSkeletonFadingOut(false);

      if (sectionSkeletonFadeTimerRef.current !== null) {
        window.clearTimeout(sectionSkeletonFadeTimerRef.current);
      }
      if (sectionSkeletonHideTimerRef.current !== null) {
        window.clearTimeout(sectionSkeletonHideTimerRef.current);
      }

      sectionSkeletonFadeTimerRef.current = window.setTimeout(() => {
        setSectionSkeletonFadingOut(true);
      }, SECTION_SKELETON_HOLD_MS);

      sectionSkeletonHideTimerRef.current = window.setTimeout(() => {
        setSectionSkeletonVisible(false);
        setSectionSkeletonFadingOut(false);
        sectionSkeletonFadeTimerRef.current = null;
        sectionSkeletonHideTimerRef.current = null;
      }, SECTION_SKELETON_HOLD_MS + SECTION_SKELETON_FADE_MS);
    };

    const aboutEl = aboutRef.current;
    const tutEl = tutorialRef.current;
    const faqEl = faqRef.current;
    if (!("IntersectionObserver" in window)) {
      setAboutVisible(true);
      triggerSectionSkeleton();
      setTutorialVisible(true);
      setFaqVisible(true);
      return;
    }

    const aboutObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setAboutVisible(true);
          triggerSectionSkeleton();
          aboutObs.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    const tutObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setTutorialVisible(true);
      },
      { threshold: 0.35 }
    );

    const faqObs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setFaqVisible(true);
          faqObs.disconnect();
        }
      },
      { threshold: 0.18 }
    );

    if (aboutEl) aboutObs.observe(aboutEl);
    if (tutEl) tutObs.observe(tutEl);
    if (faqEl) faqObs.observe(faqEl);

    return () => {
      aboutObs.disconnect();
      tutObs.disconnect();
      faqObs.disconnect();
    };
  }, []);

  const submitHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearchLoading) return;
    setHeroSearchLoading(true);
    if (heroSearchNavTimerRef.current !== null) {
      window.clearTimeout(heroSearchNavTimerRef.current);
      heroSearchNavTimerRef.current = null;
    }
    const params = new URLSearchParams();
    const keyword = heroKeyword.trim();
    const category = heroCategory.trim();
    const disability = heroDisability.trim();

    if (keyword) params.set("location", keyword);
    if (category) params.set("keyword", category);
    if (disability) params.set("category", disability);

    heroSearchNavTimerRef.current = window.setTimeout(() => {
      navigate({
        pathname: "/search-jobs",
        search: params.toString() ? `?${params.toString()}` : "",
      });
      heroSearchNavTimerRef.current = null;
    }, 1000);
  };

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const openTutorialVideo = (index: number) => {
    if (tutorialModalCloseTimerRef.current !== null) {
      window.clearTimeout(tutorialModalCloseTimerRef.current);
      tutorialModalCloseTimerRef.current = null;
    }
    setTutorialModalClosing(false);
    setTutorialVideoLoaded(false);
    setSelectedTutorialIndex(index);
  };

  const closeTutorialVideo = () => {
    if (selectedTutorialIndex === null) return;
    if (tutorialModalCloseTimerRef.current !== null) {
      window.clearTimeout(tutorialModalCloseTimerRef.current);
    }
    setTutorialModalClosing(true);
    tutorialModalCloseTimerRef.current = window.setTimeout(() => {
      setSelectedTutorialIndex(null);
      setTutorialVideoLoaded(false);
      setTutorialModalClosing(false);
      tutorialModalCloseTimerRef.current = null;
    }, 220);
  };

  const onSelectFeaturedJob = (index: number) => {
    if (index === selectedFeaturedJobIndex || featuredJobLoading || sectionSkeletonVisible) return;
    if (featuredJobTimerRef.current !== null) {
      window.clearTimeout(featuredJobTimerRef.current);
    }
    setFeaturedJobLoading(true);
    featuredJobTimerRef.current = window.setTimeout(() => {
      setSelectedFeaturedJobIndex(index);
      setFeaturedJobLoading(false);
      featuredJobTimerRef.current = null;
    }, FEATURED_JOB_SKELETON_MS);
  };

  const submitContactForm = async (e: React.FormEvent) => {
    e.preventDefault();

    await Swal.fire({
      ...swalTransitionClass,
      target: document.body,
      icon: "success",
      iconHtml: '<i class="bi bi-check-circle-fill" aria-hidden="true"></i>',
      title: "Message Sent",
      text: "Thank you. Our support team will contact you soon.",
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

    setContactName("");
    setContactEmail("");
    setContactMobile("");
    setContactComment("");
  };

  const heroParallaxStyle: React.CSSProperties = {
    backgroundPosition: `calc(50% + 34px) calc(79% + ${heroParallaxY}px)`,
  };
  const showJobDetailSkeleton = featuredJobLoading || sectionSkeletonVisible;
  const showFeaturedListSkeleton = sectionSkeletonVisible;

  return (
    <div className={`landing-page page ${!showPageLoader ? "page-ready" : ""}`}>
      {(showPageLoader || heroSearchLoading) && (
        <div
          className={`page-loader-overlay ${heroSearchLoading ? "" : `landing-loader-overlay ${pageLoaderFadingOut ? "is-fading-out" : ""}`}`.trim()}
          role="status"
          aria-live="polite"
          aria-label={heroSearchLoading ? "Loading search results" : "Loading landing page"}
        >
          {heroSearchLoading ? (
            <div className="search-loading-card">
              <div className="search-loading-icon" aria-hidden="true">
                <span className="search-loading-spinner-ring" />
                <span className="search-loading-spinner-core" />
              </div>
              <div className="search-loading-copy">
                <p className="search-loading-title">Finding the best job matches</p>
                <p className="search-loading-subtitle">Please wait while we fetch fresh openings for you.</p>
                <div className="search-loading-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : (
            <div className="landing-loader" aria-hidden="true" />
          )}
        </div>
      )}

      <LandingNavbar scrollToId={scrollToId} />


      <section id="home" className="hero" style={heroParallaxStyle}>
        <div className="hero-bg-slideshow" aria-hidden="true">
          {heroSlides.map((src, index) => (
            <div
              key={src}
              className={`hero-bg-slide ${index === heroBgIndex ? "is-active" : ""} ${
                index === heroPrevBgIndex ? "is-prev" : ""
              }`}
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: `calc(50% + 34px) calc(79% + ${heroParallaxY}px)`,
              }}
            />
          ))}
        </div>
        <div className="hero-shell">
          <div className="hero-content">
            <h1>
              Employment Assistance Platform for Persons with Disabilities in The City of Dasmariñas with Decision Support
              System
            </h1>
            <p className="hero-desc">
              Helping Persons with Disabilities discover opportunities that match their skills and potential.
            </p>

          </div>

          <div className="hero-logo-wrap">
            <div className="hero-seal">
              <div className="hero-seal-stack">
                <img className="hero-seal-img hero-seal-img-main" src={heroSealLogo} alt="HireAble Proximity Development logo" />
              </div>
            </div>
            <div className="hero-seal-status" aria-label="Active applicant status">
              <i className="bi bi-person-check-fill" aria-hidden="true" />
              <span>1 Active Applicant</span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        ref={(el) => {
          aboutRef.current = el;
        }}
        className={`section about-cta-section ${aboutVisible ? "about-visible" : ""}`}
      >
        <div className="about-cta-shell">
          <h3 className="about-cta-title">Inclusive Work Opportunities</h3>
          <p>
            Explore sample job opportunities and disability-friendly roles that can be matched with inclusive
            companies.
          </p>

          <form className="hero-search about-cta-search" onSubmit={submitHeroSearch}>
            <label className="search-field">
              <i className="bi bi-search search-field-icon" aria-hidden="true" />
              <input
                value={heroKeyword}
                onChange={(e) => setHeroKeyword(e.target.value)}
                placeholder="What opportunities are you looking for?"
                aria-label="What opportunities are you looking for?"
              />
            </label>

            <label className="search-field search-field-select">
              <select value={heroCategory} onChange={(e) => setHeroCategory(e.target.value)} aria-label="Job category">
                <option value="">All Categories</option>
                {heroCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="search-field search-field-select">
              <select
                value={heroDisability}
                onChange={(e) => setHeroDisability(e.target.value)}
                aria-label="Disability type"
              >
                <option value="">All Disability Types</option>
                {heroDisabilities.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="search-submit" disabled={heroSearchLoading}>
              {heroSearchLoading ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="about-cta-content">
            <div className="about-cta-panel about-cta-actions about-cta-jobs-list">
              <h4>
                <i className="bi bi-stars" aria-hidden="true" /> Featured Job Posts
              </h4>
              <p className="about-cta-actions-copy">
                Preview the job posts applicants can explore, including work setup details and key role information.
              </p>
              <div className={`landing-job-preview-list ${featuredJobPosts.length === 0 ? "is-empty" : ""}`}>
                {featuredJobPosts.map((job, idx) => (
                  <button
                    key={`${job.title}-${job.company}-${job.postedDate}`}
                    className={`landing-job-card ${idx === selectedFeaturedJobIndex ? "is-active" : ""}`}
                    onClick={() => onSelectFeaturedJob(idx)}
                    type="button"
                    disabled={featuredJobLoading || sectionSkeletonVisible}
                  >
                    <div className="landing-job-card-top">
                      <span className="landing-job-badge">
                        <i className="bi bi-patch-check-fill" aria-hidden="true" /> Featured
                      </span>
                      <span className="landing-job-posted">
                        <i className="bi bi-clock-history" aria-hidden="true" /> {job.postedDate.replace("Posted: ", "")}
                      </span>
                    </div>
                    <div className="landing-job-head">
                      <div className="landing-job-logo" aria-hidden="true">
                        {job.companyInitials}
                      </div>
                      <div className="landing-job-title-wrap">
                        <h5>{job.title}</h5>
                        <p className="landing-company-line">
                          <i className="bi bi-building" aria-hidden="true" />
                          <span>{job.company}</span>
                        </p>
                      </div>
                    </div>
                    <p className="landing-job-desc">{job.description}</p>
                    <div className="landing-job-meta">
                      <span className="landing-job-chip chip-location"><i className="bi bi-geo-alt" aria-hidden="true" /> {job.location}</span>
                      <span className="landing-job-chip chip-category"><i className="bi bi-briefcase" aria-hidden="true" /> {job.category}</span>
                      <span className="landing-job-chip chip-setup"><i className="bi bi-laptop" aria-hidden="true" /> {job.setup}</span>
                      <span className="landing-job-chip chip-vacancies"><i className="bi bi-people" aria-hidden="true" /> {job.vacancies} Vacancies</span>
                      <span className="landing-job-chip chip-type"><i className="bi bi-clock" aria-hidden="true" /> {job.type}</span>
                    </div>
                  </button>
                ))}
                {!showFeaturedListSkeleton && featuredJobPosts.length === 0 && (
                  <div className="landing-jobs-empty-state" role="status" aria-live="polite">
                    <i className="bi bi-briefcase-fill" aria-hidden="true" />
                    <p>No job posts available yet</p>
                  </div>
                )}
                {showFeaturedListSkeleton && (
                  <div
                    className={`landing-job-preview-list-loading ${sectionSkeletonFadingOut ? "is-fading-out" : ""}`}
                    aria-live="polite"
                    aria-label="Loading featured job posts"
                  >
                    <div className="landing-job-list-skel-card">
                      <div className="landing-job-list-skel-top">
                        <div className="landing-job-list-skel-pill" />
                        <div className="landing-job-list-skel-line date" />
                      </div>
                      <div className="landing-job-list-skel-head">
                        <div className="landing-job-list-skel-logo" />
                        <div className="landing-job-list-skel-head-copy">
                          <div className="landing-job-list-skel-line title" />
                          <div className="landing-job-list-skel-line company" />
                        </div>
                      </div>
                      <div className="landing-job-list-skel-line text" />
                      <div className="landing-job-list-skel-line text short" />
                      <div className="landing-job-list-skel-chip-row">
                        <span className="landing-job-list-skel-chip" />
                        <span className="landing-job-list-skel-chip" />
                        <span className="landing-job-list-skel-chip short" />
                      </div>
                      <div className="landing-job-list-skel-divider" />
                      <div className="landing-job-list-skel-line salary" />
                      <div className="landing-job-list-skel-line suitable" />
                    </div>
                    <div className="landing-job-list-skel-card">
                      <div className="landing-job-list-skel-top">
                        <div className="landing-job-list-skel-pill" />
                        <div className="landing-job-list-skel-line date short" />
                      </div>
                      <div className="landing-job-list-skel-head">
                        <div className="landing-job-list-skel-logo" />
                        <div className="landing-job-list-skel-head-copy">
                          <div className="landing-job-list-skel-line title" />
                          <div className="landing-job-list-skel-line company" />
                        </div>
                      </div>
                      <div className="landing-job-list-skel-line text" />
                      <div className="landing-job-list-skel-line text short" />
                      <div className="landing-job-list-skel-chip-row">
                        <span className="landing-job-list-skel-chip" />
                        <span className="landing-job-list-skel-chip short" />
                        <span className="landing-job-list-skel-chip" />
                      </div>
                      <div className="landing-job-list-skel-divider" />
                      <div className="landing-job-list-skel-line salary" />
                      <div className="landing-job-list-skel-line suitable short" />
                    </div>
                    <div className="landing-job-list-skel-card">
                      <div className="landing-job-list-skel-top">
                        <div className="landing-job-list-skel-pill" />
                        <div className="landing-job-list-skel-line date" />
                      </div>
                      <div className="landing-job-list-skel-head">
                        <div className="landing-job-list-skel-logo" />
                        <div className="landing-job-list-skel-head-copy">
                          <div className="landing-job-list-skel-line title" />
                          <div className="landing-job-list-skel-line company" />
                        </div>
                      </div>
                      <div className="landing-job-list-skel-line text" />
                      <div className="landing-job-list-skel-line text short" />
                      <div className="landing-job-list-skel-chip-row">
                        <span className="landing-job-list-skel-chip short" />
                        <span className="landing-job-list-skel-chip" />
                        <span className="landing-job-list-skel-chip short" />
                      </div>
                      <div className="landing-job-list-skel-divider" />
                      <div className="landing-job-list-skel-line salary short" />
                      <div className="landing-job-list-skel-line suitable" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`about-cta-panel about-cta-actions landing-job-detail-panel ${showJobDetailSkeleton ? "is-loading" : ""}`}>
              <h4>
                <i className="bi bi-file-earmark-text" aria-hidden="true" /> Job Details
              </h4>

              {selectedFeaturedJob ? (
                <>
                  <div className={`landing-job-detail-content ${showJobDetailSkeleton ? "is-loading" : ""}`}>
                  <div className="landing-job-detail-head">
                    <div className="landing-job-detail-head-main">
                      <div className="landing-job-logo landing-job-logo-lg" aria-hidden="true">
                        {selectedFeaturedJob.companyInitials}
                      </div>
                      <div className="landing-job-title-wrap">
                        <h5>{selectedFeaturedJob.title}</h5>
                        <p className="landing-company-line">
                          <i className="bi bi-building" aria-hidden="true" />
                          <span>{selectedFeaturedJob.company}</span>
                        </p>
                        <p className="landing-job-detail-meta-inline" aria-label="Job metadata">
                          <span className="meta-location"><i className="bi bi-geo-alt" aria-hidden="true" /> {selectedFeaturedJob.location}</span>
                          <span className="meta-category"><i className="bi bi-briefcase" aria-hidden="true" /> {selectedFeaturedJob.category}</span>
                          <span className="meta-type"><i className="bi bi-clock" aria-hidden="true" /> {selectedFeaturedJob.type}</span>
                          <span className="meta-vacancies"><i className="bi bi-people" aria-hidden="true" /> {selectedFeaturedJob.vacancies} Vacancies</span>
                        </p>
                        <div
                          className="landing-job-rating-row landing-job-rating-row-inline"
                          aria-label={`Company rating ${selectedFeaturedJob.companyRating} out of 5`}
                        >
                          <div className="landing-job-rating-stars" aria-hidden="true">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <i
                                key={`star-inline-${index}`}
                                className={`bi ${index < Math.round(selectedFeaturedJob.companyRating) ? "bi-star-fill" : "bi-star"}`}
                              />
                            ))}
                          </div>
                          <span className="landing-job-rating-score">{selectedFeaturedJob.companyRating.toFixed(1)} / 5</span>
                          <span className="landing-job-rating-count">({selectedFeaturedJob.companyRatingCount} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <div className="landing-job-detail-head-side">
                      <span className="landing-job-posted-detail">
                        <i className="bi bi-clock-history" aria-hidden="true" /> {selectedFeaturedJob.postedDate.replace("Posted: ", "")}
                      </span>
                      <a
                        className="landing-job-view-map-btn"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedFeaturedJob.location)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="bi bi-map" aria-hidden="true" />
                        View Map
                      </a>
                    </div>
                  </div>
                  <div className="landing-job-detail-block landing-job-detail-block-inline">
                    <h6><i className="bi bi-file-text" aria-hidden="true" /> Job Description</h6>
                    <p className="landing-job-detail-desc landing-job-detail-desc-inline">{selectedFeaturedJob.description}</p>
                  </div>
                  <div className="landing-job-detail-block landing-job-detail-block-inline">
                    <h6><i className="bi bi-translate" aria-hidden="true" /> Language and Age Preference</h6>
                    <div className="landing-job-preference-lines">
                      <p>
                        <i className="bi bi-chat-left-text" aria-hidden="true" />
                        <span><strong>Languages:</strong> {selectedFeaturedJob.languages.join(", ")}</span>
                      </p>
                      <p>
                        <i className="bi bi-person-badge" aria-hidden="true" />
                        <span><strong>Preferred Age:</strong> {selectedFeaturedJob.preferredAgeRange}</span>
                      </p>
                    </div>
                  </div>
                  <div className="landing-job-detail-grid">
                    <div className="landing-job-detail-block">
                      <h6><i className="bi bi-check2-circle" aria-hidden="true" /> Qualifications</h6>
                      <ul>
                        {selectedFeaturedJob.qualifications.map((x) => (
                          <li key={`q-${x}`}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="landing-job-detail-block">
                      <h6><i className="bi bi-list-task" aria-hidden="true" /> Responsibilities</h6>
                      <ul>
                        {selectedFeaturedJob.responsibilities.map((x) => (
                          <li key={`r-${x}`}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="landing-job-salary-banner" aria-label={`Salary ${selectedFeaturedJob.salary}`}>
                    <div className="landing-job-salary-icon" aria-hidden="true">
                      <i className="bi bi-cash-stack" />
                    </div>
                    <div className="landing-job-salary-copy">
                      <span>Salary Range</span>
                      <strong>{selectedFeaturedJob.salary}</strong>
                    </div>
                  </div>
                  <div className="landing-job-disability-banner" aria-label={`Suitable for ${selectedFeaturedJob.disabilityFit}`}>
                    <div className="landing-job-disability-icon" aria-hidden="true">
                      <i className={`bi ${getDisabilityIconClass(selectedFeaturedJob.disabilityFit)}`} />
                    </div>
                    <div className="landing-job-disability-copy">
                      <span>Suitable For</span>
                      <strong>{selectedFeaturedJob.disabilityFit}</strong>
                    </div>
                  </div>
                  <div className="landing-job-detail-actions-wrap">
                    <div className="landing-job-detail-actions">
                      <button type="button" className="landing-job-action-secondary" onClick={() => void handleFeaturedJobSave()}>
                        <i className="bi bi-bookmark-plus" aria-hidden="true" /> Save
                      </button>
                      <button
                        type="button"
                        className="landing-job-action-primary"
                        onClick={() => void handleFeaturedJobApply()}
                      >
                        <i className="bi bi-send-check" aria-hidden="true" /> Apply Now
                      </button>
                    </div>
                    <p className="landing-job-apply-note">
                      <i className="bi bi-people" aria-hidden="true" /> {selectedFeaturedJob.vacancies} Vacancies Available
                    </p>
                  </div>
                  </div>
                  {showJobDetailSkeleton && (
                    <div
                      className={`landing-job-detail-loading ${sectionSkeletonVisible && sectionSkeletonFadingOut ? "is-fading-out" : ""}`}
                      aria-live="polite"
                      aria-label="Loading selected job details"
                    >
                      <div className="landing-job-detail-skeleton" aria-hidden="true">
                        <div className="landing-job-skel-head-card">
                          <div className="landing-job-skel-head">
                            <div className="landing-job-skel-logo" />
                            <div className="landing-job-skel-col">
                              <div className="landing-job-skel-line title" />
                              <div className="landing-job-skel-line text" />
                              <div className="landing-job-skel-line meta" />
                              <div className="landing-job-skel-line rating" />
                            </div>
                          </div>
                          <div className="landing-job-skel-head-side">
                            <div className="landing-job-skel-line posted" />
                            <div className="landing-job-skel-map-btn" />
                          </div>
                        </div>

                        <div className="landing-job-skel-section-card">
                          <div className="landing-job-skel-line heading" />
                          <div className="landing-job-skel-line desc" />
                        </div>

                        <div className="landing-job-skel-pref-card">
                          <div className="landing-job-skel-line pref heading" />
                          <div className="landing-job-skel-line pref" />
                          <div className="landing-job-skel-line pref short" />
                        </div>

                        <div className="landing-job-skel-grid">
                          <div className="landing-job-skel-panel">
                            <div className="landing-job-skel-line panel-heading" />
                            <div className="landing-job-skel-line panel-line" />
                            <div className="landing-job-skel-line panel-line short" />
                            <div className="landing-job-skel-line panel-line" />
                          </div>
                          <div className="landing-job-skel-panel">
                            <div className="landing-job-skel-line panel-heading" />
                            <div className="landing-job-skel-line panel-line" />
                            <div className="landing-job-skel-line panel-line short" />
                            <div className="landing-job-skel-line panel-line" />
                          </div>
                        </div>

                        <div className="landing-job-skel-banner salary">
                          <span className="landing-job-skel-banner-icon" />
                          <div className="landing-job-skel-banner-copy">
                            <span className="landing-job-skel-line banner-label" />
                            <span className="landing-job-skel-line banner-value" />
                          </div>
                        </div>
                        <div className="landing-job-skel-banner short">
                          <span className="landing-job-skel-banner-icon" />
                          <div className="landing-job-skel-banner-copy">
                            <span className="landing-job-skel-line banner-label" />
                            <span className="landing-job-skel-line banner-value short" />
                          </div>
                        </div>
                        <div className="landing-job-skel-actions">
                          <span className="landing-job-skel-btn secondary" />
                          <span className="landing-job-skel-btn primary" />
                        </div>
                        <div className="landing-job-skel-note" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="landing-jobs-empty-state for-detail" role="status" aria-live="polite">
                  <i className="bi bi-briefcase-fill" aria-hidden="true" />
                  <p>No job posts available yet</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      <section
        id="tutorial"
        ref={(el) => {
          tutorialRef.current = el;
        }}
        className={`tutorial-section ${tutorialVisible ? "tutorial-visible" : ""}`}
      >
        <div className="tutorial-card">
          <div className="video-pane">
            <div className="video-placeholder">
              <div className="tutorial-video tutorial-video-blank" aria-label="Blank tutorial area" />
            </div>
          </div>
          <div className="tutorial-pane">
            <div className="tutorial-header">
              <span className="faq-badge">Quick Guide</span>
              <h2>System Tutorial Videos</h2>
              <p>Step-by-step video guides for learning how applicants and employers use the platform.</p>
            </div>

            {tutorials.map((item, index) => (
              <button
                key={item.q}
                className="tutorial-step"
                onClick={() => {
                  openTutorialVideo(index);
                }}
                type="button"
              >
                <span className="step-dot">{index + 1}</span>
                <div>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTutorialIndex !== null && (
          <div
            className={`tutorial-modal-overlay ${tutorialModalClosing ? "is-closing" : ""}`}
            onClick={closeTutorialVideo}
          >
            <button
              type="button"
              className="tutorial-modal-close"
              onClick={() => {
                closeTutorialVideo();
              }}
              aria-label="Close tutorial video"
            >
              ×
            </button>
            <div className={`tutorial-modal ${tutorialModalClosing ? "is-closing" : ""}`} onClick={(e) => e.stopPropagation()}>
              <div className={`tutorial-video-fade-wrap ${tutorialVideoLoaded ? "is-loaded" : ""}`}>
                {!tutorialVideoLoaded && <div className="tutorial-video-loading" aria-hidden="true" />}
                <iframe
                  key={`tutorial-video-${selectedTutorialIndex}`}
                  className="tutorial-modal-video"
                  src={`${tutorials[selectedTutorialIndex].videoSrc}?autoplay=1&mute=0&playsinline=1&rel=0`}
                  title={tutorials[selectedTutorialIndex].q}
                  onLoad={() => setTutorialVideoLoaded(true)}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        id="contact"
        className="contact-support-section"
      >
        <div className="contact-support-shell">
          <div className="contact-support-header">
            <span className="faq-badge">Contact Us</span>
            <h2>Need Help Getting Started?</h2>
            <p>
              Reach out to our support desk for account concerns, job matching guidance, and employer onboarding
              assistance.
            </p>
          </div>
          <div className="contact-support-grid">
            <article className="contact-support-card">
              <span className="contact-support-icon" aria-hidden="true">
                <i className="bi bi-telephone" />
              </span>
              <h3>Call Support</h3>
              <p>Available Monday to Friday, 8:00 AM to 5:00 PM.</p>
              <a href="tel:+639123456789">+63 912 345 6789</a>
            </article>

            <article className="contact-support-card">
              <span className="contact-support-icon" aria-hidden="true">
                <i className="bi bi-envelope" />
              </span>
              <h3>Email Desk</h3>
              <p>For verification, profile updates, and application concerns.</p>
              <a href="mailto:support@pwdhireable.com">support@pwdhireable.com</a>
            </article>

            <article className="contact-support-card">
              <span className="contact-support-icon" aria-hidden="true">
                <i className="bi bi-geo-alt" />
              </span>
              <h3>Visit Office</h3>
              <p>PDAO - City Government of Dasmarinas, Cavite.</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=PDAO%20Dasmarinas%20Cavite"
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps
              </a>
            </article>
          </div>
          <form className="contact-support-form" onSubmit={submitContactForm}>
            <div className="contact-support-form-grid">
              <label className="contact-field">
                <span>Name</span>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </label>
              <label className="contact-field">
                <span>Email</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </label>
              <label className="contact-field">
                <span>Mobile Number</span>
                <input
                  type="tel"
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value)}
                  placeholder="e.g. 09123456789"
                  required
                />
              </label>
              <label className="contact-field contact-field-comment">
                <span>Comment</span>
                <textarea
                  value={contactComment}
                  onChange={(e) => setContactComment(e.target.value)}
                  placeholder="Tell us how we can help you..."
                  rows={4}
                  required
                />
              </label>
            </div>
            <div className="contact-support-form-actions">
              <button type="submit" className="contact-support-submit-btn">
                <i className="bi bi-send-check" aria-hidden="true" /> Submit Message
              </button>
            </div>
          </form>
        </div>
      </section>

      <section
        id="faq"
        ref={(el) => {
          faqRef.current = el;
        }}
        className={`faq-section ${faqVisible ? "faq-visible" : ""}`}
      >
        <div className="faq-shell">
          <div className="faq-header">
            <span className="faq-badge">Frequently Asked Questions</span>
            <h2>Common Questions & Answers</h2>
            <p>Everything you need to know about our platform</p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={faq.q} className="faq-item">
                  <button type="button" className="faq-question" onClick={() => setActiveFaq(isOpen ? null : index)}>
                    <span>{faq.q}</span>
                    <span className={`arrow ${isOpen ? "open" : ""}`} aria-hidden="true">
                      <i className="bi bi-chevron-down" />
                    </span>
                  </button>
                  <div className={`faq-answer-wrap ${isOpen ? "open" : ""}`}>
                    <div className="faq-answer">
                      <div className="faq-answer-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 10v6" />
                          <path d="M12 7.5h.01" />
                        </svg>
                      </div>
                      <p className="faq-answer-text">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer id="privacy" className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img className="footer-logo-img" src={proximityLogo} alt="HireAble Logo" />
            <p className="brand-text">
              This site is managed by RCST students as part of the development of a web-based job employment assistance
              platform for Persons with Disabilities in the City of Dasmarinas with Decision Support System.
            </p>
            <div className="brand-badges">
              <span className="brand-badge">Dasmarinas, Cavite</span>
              <span className="brand-badge">Inclusive Hiring</span>
              <span className="brand-badge">Research Project</span>
            </div>
          </div>

          <div className="footer-nav">
            <div className="nav-group about-group">
              <h3>About PWD Hireable Proximity</h3>
              <p>
                A job site that aims to connect PWDs with companies while promoting awareness of the importance of equal
                and gainful employment opportunities.
              </p>
            </div>

            <div className="nav-group services-group">
              <h3>Services</h3>
              <ul>
                <li>
                  <a href="#">Job Matching</a>
                </li>
                <li>
                  <a href="#">DSS Analysis</a>
                </li>
                <li>
                  <a href="#">Employer Portal</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="bottom-inner">
            <p>© 2026 PWD Employment Assistance Platform. Developed for Research Purposes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

