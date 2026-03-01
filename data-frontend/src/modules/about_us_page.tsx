import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import proximityLogo from "../assets/proximity.png";
import aboutPhoto from "../assets/PWD_worker.png";
import aboutPhoto2 from "../assets/PWD_choose.png";
import aboutPhoto3 from "../assets/PWD_login.png";
import "../designer/about_us_page.css";

type AboutImage = { src: string; alt: string };

const aboutImages: AboutImage[] = [
  { src: aboutPhoto, alt: "PWD worker collaborating in an inclusive workspace" },
  { src: aboutPhoto2, alt: "PWD job seeker onboarding and support scene" },
  { src: aboutPhoto3, alt: "PWD applicant profile and employment readiness" },
];

function AboutUsPage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [activeAboutSlide, setActiveAboutSlide] = useState(0);
  const [aboutParallaxOffset, setAboutParallaxOffset] = useState(0);
  const aboutSectionRef = useRef<HTMLElement | null>(null);
  const aboutSlideTimerRef = useRef<number | null>(null);
  const aboutObserverRef = useRef<IntersectionObserver | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 10);

        const section = aboutSectionRef.current;
        if (section) {
          const rect = section.getBoundingClientRect();
          const viewportH = window.innerHeight || 1;
          const progress = (viewportH - rect.top) / (viewportH + rect.height);
          const clamped = Math.max(0, Math.min(1, progress));
          const centered = clamped - 0.5;
          setAboutParallaxOffset(centered * 90);
        }

        scrollRafRef.current = null;
      });
    };
    const onGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("keydown", onGlobalKeydown);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("keydown", onGlobalKeydown);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (aboutImages.length <= 1) return;
    if (aboutSlideTimerRef.current !== null) {
      window.clearInterval(aboutSlideTimerRef.current);
    }
    aboutSlideTimerRef.current = window.setInterval(() => {
      setActiveAboutSlide((prev) => (prev + 1) % aboutImages.length);
    }, 4200);

    return () => {
      if (aboutSlideTimerRef.current !== null) {
        window.clearInterval(aboutSlideTimerRef.current);
        aboutSlideTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const section = aboutSectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") {
      setIsAboutVisible(true);
      return;
    }

    aboutObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsAboutVisible(true);
          aboutObserverRef.current?.disconnect();
          aboutObserverRef.current = null;
        }
      },
      { threshold: 0.28 },
    );

    aboutObserverRef.current.observe(section);

    return () => {
      aboutObserverRef.current?.disconnect();
      aboutObserverRef.current = null;
    };
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const stopAboutSlider = () => {
    if (aboutSlideTimerRef.current !== null) {
      window.clearInterval(aboutSlideTimerRef.current);
      aboutSlideTimerRef.current = null;
    }
  };

  const startAboutSlider = () => {
    stopAboutSlider();
    if (aboutImages.length <= 1) return;
    aboutSlideTimerRef.current = window.setInterval(() => {
      setActiveAboutSlide((prev) => (prev + 1) % aboutImages.length);
    }, 4200);
  };

  const aboutFrameClass = (index: number) => {
    const total = aboutImages.length;
    const offset = (index - activeAboutSlide + total) % total;
    if (offset === 0) return "frame-front";
    if (offset === 1) return "frame-middle";
    return "frame-back";
  };

  const goToLandingSection = (hash: string) => {
    closeMobileMenu();
    navigate(`/landingpage${hash}`);
  };

  return (
    <div className="about-page">
      <header className={`navbar landing-navbar landing-floating-navbar ${isScrolled ? "navbar-scrolled" : ""}`}>
        <div className="nav-inner">
          <button className="nav-left" type="button" onClick={() => navigate("/landingpage")}>
            <img src={proximityLogo} className="logo" alt="HireAble logo" />
          </button>

          <nav className="nav-center">
            <Link to="/about-us" className="nav-link">About Us</Link>
            <button type="button" className="nav-link nav-link-btn" onClick={() => goToLandingSection("#tutorial")}>Read First</button>
            <button type="button" className="nav-link nav-link-btn" onClick={() => goToLandingSection("#privacy")}>Privacy</button>
            <button type="button" className="nav-link nav-link-btn" onClick={() => goToLandingSection("#contact")}>Contact Us</button>
          </nav>

          <div className="nav-right">
            <Link to="/login?force=1" className="sign-in-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="8" r="3.25" />
                <path d="M5 19c0-3.1 2.52-5.6 5.63-5.6h.74c3.1 0 5.63 2.5 5.63 5.6" />
                <path d="M19 8h3" />
              </svg>
              Sign In
            </Link>
            <button
              type="button"
              className="mobile-menu-btn"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label="Open navigation menu"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeMobileMenu(); }}>
          <aside id="mobile-nav-drawer" className="mobile-nav-drawer" role="dialog" aria-label="Mobile Navigation">
            <div className="mobile-nav-head">
              <img src={proximityLogo} alt="HireAble logo" className="mobile-nav-logo" />
              <button type="button" className="mobile-nav-close" aria-label="Close navigation menu" onClick={closeMobileMenu}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <nav className="mobile-nav-links">
              <Link to="/about-us" className="mobile-nav-link" onClick={closeMobileMenu}>About Us</Link>
              <button type="button" className="mobile-nav-link" onClick={() => goToLandingSection("#tutorial")}>Read First</button>
              <button type="button" className="mobile-nav-link" onClick={() => goToLandingSection("#privacy")}>Privacy</button>
              <button type="button" className="mobile-nav-link" onClick={() => goToLandingSection("#contact")}>Contact Us</button>
            </nav>

            <Link to="/login?force=1" className="mobile-nav-signin" onClick={closeMobileMenu}>Sign In</Link>
          </aside>
        </div>
      )}

      <main className="about-main">
        <section
          id="about"
          ref={aboutSectionRef}
          className={`section ${isAboutVisible ? "about-visible" : ""}`}
          style={
            {
              ["--about-parallax" as string]: `${aboutParallaxOffset.toFixed(2)}px`,
              ["--about-parallax-soft" as string]: `${(aboutParallaxOffset * 0.35).toFixed(2)}px`,
            } as React.CSSProperties
          }
        >
          <div className="about-panel">
            <div className="about-image-wrap" style={{ transform: `translateY(${(-aboutParallaxOffset).toFixed(2)}px)` }}>
              <div className="about-slider" aria-label="PWD worker highlights" onMouseEnter={stopAboutSlider} onMouseLeave={startAboutSlider}>
                <div className="about-frame">
                  {aboutImages.map((img, index) => (
                    <img key={index} src={img.src} alt={img.alt} className={`about-single-image ${aboutFrameClass(index)}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="about-copy" style={{ transform: `translateY(${(aboutParallaxOffset * 0.65).toFixed(2)}px)` }}>
              <span className="about-badge">Who We Are</span>
              <h3>About Us</h3>
              <p>The Employment Assistance Platform for Persons with Disabilities is designed to connect qualified PWD job seekers with inclusive employers in the City of Dasmarinas.</p>
              <p>With built-in decision support, the system helps make hiring more accessible, fair, and data-guided for both applicants and organizations.</p>
              <p>Employers can post opportunities with clear accessibility details, while applicants receive role recommendations aligned with their capabilities, preferences, and qualifications.</p>
              <p>This approach supports inclusive growth by improving visibility of PWD talent, reducing hiring barriers, and creating a more connected local employment ecosystem.</p>
            </div>
          </div>

          <section className="about-pillars-section" aria-label="Mission and Vision">
            <div className="about-pillars-head">
              <span className="about-pillars-eyebrow">Guiding Principles</span>
              <h4>Our Mission and Vision</h4>
              <p>The principles that guide our platform and inclusive hiring goals.</p>
            </div>
            <div className="about-pillars">
              <article id="mission" className="about-pillar about-pillar-mission">
                <div className="about-pillar-heading">
                  <span className="about-pillar-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M12 3l2.6 5.3L20 11l-5.4 2.7L12 19l-2.6-5.3L4 11l5.4-2.7L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="about-pillar-title-wrap">
                    <h4>Mission</h4>
                    <span className="about-pillar-subtitle">Empowering PWD talent through access</span>
                  </div>
                </div>
                <p>To empower Persons with Disabilities by opening pathways to inclusive employment through an accessible, supportive, and opportunity-driven platform.</p>
              </article>

              <article id="vision" className="about-pillar about-pillar-vision">
                <div className="about-pillar-heading">
                  <span className="about-pillar-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
                      <path d="M3.5 12s3.1-5.7 8.5-5.7S20.5 12 20.5 12s-3.1 5.7-8.5 5.7S3.5 12 3.5 12z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="about-pillar-title-wrap">
                    <h4>Vision</h4>
                    <span className="about-pillar-subtitle">Barrier-free and meaningful employment</span>
                  </div>
                </div>
                <p>A future where every qualified PWD is seen for their strengths and can access fair, meaningful, and sustainable work without barriers.</p>
              </article>
            </div>
          </section>

          <section className="about-gallery" aria-label="PWD success moments">
            <div className="about-gallery-head">
              <h4>In Action</h4>
              <p>Highlights of the platform experience from onboarding to employment readiness.</p>
            </div>
            <div className="about-gallery-grid">
              {aboutImages.map((img, index) => (
                <button
                  key={`gallery-${index}`}
                  type="button"
                  className={`about-gallery-card ${activeAboutSlide === index ? "about-gallery-card-active" : ""}`}
                  onClick={() => setActiveAboutSlide(index)}
                >
                  <img src={img.src} alt={img.alt} className="about-gallery-image" />
                </button>
              ))}
            </div>
          </section>
        </section>
      </main>

      <footer id="privacy" className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <img src={proximityLogo} alt="HireAble Logo" className="footer-logo" />
            <p className="brand-text">
              This site is managed by RCST students as part of the development of a web-based job employment assistance platform for Persons with Disabilities in the City of Dasmarinas with Decision Support System.
            </p>
            <div className="social-wrapper">
              <a href="#" className="social-link" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg></a>
              <a href="#" className="social-link" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg></a>
              <a href="#" className="social-link" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg></a>
            </div>
          </div>

          <div className="footer-nav">
            <div className="nav-group about-group">
              <h3>About PWD Hireable Proximity</h3>
              <p>A powerful job site that aims to connect Persons with Disabilities with companies while promoting awareness of the importance of providing equal and gainful employment opportunities.</p>
            </div>
            <div className="nav-group services-group">
              <h3>Services</h3>
              <ul>
                <li><a href="#">Job Matching</a></li>
                <li><a href="#">DSS Analysis</a></li>
                <li><a href="#">Employer Portal</a></li>
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

export default AboutUsPage;

