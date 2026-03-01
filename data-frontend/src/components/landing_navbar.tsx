import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import proximityLogo from "../assets/proximity.png";

type LandingNavbarProps = {
  scrollToId: (id: string) => void;
  hidden?: boolean;
};

export default function LandingNavbar({ scrollToId, hidden = false }: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (window.scrollY || document.documentElement.scrollTop || 0) > 10;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const getScrollTop = () => {
      const scrollingElement = document.scrollingElement as HTMLElement | null;
      return (
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        scrollingElement?.scrollTop ||
        0
      );
    };

    const sync = () => setIsScrolled(getScrollTop() > 10);

    sync();
    window.requestAnimationFrame(sync);
    const t1 = window.setTimeout(sync, 50);
    const t2 = window.setTimeout(sync, 220);
    window.addEventListener("pageshow", sync);
    window.addEventListener("load", sync);
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("scroll", sync, { passive: true, capture: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("load", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      document.removeEventListener("scroll", sync, true);
    };
  }, []);

  useEffect(() => {
    const onGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onGlobalKeydown);
    return () => {
      document.removeEventListener("keydown", onGlobalKeydown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSectionClick = (id: string) => {
    closeMobileMenu();
    scrollToId(id);
  };

  return (
    <header
      className={`navbar landing-navbar landing-floating-navbar ${isScrolled ? "navbar-scrolled" : ""} ${hidden ? "navbar-hidden" : ""}`}
      style={
        isScrolled
          ? {
              background: "rgba(10, 59, 30, 0.95)",
            }
          : undefined
      }
    >
      <div className="nav-inner">
        <button className="nav-left" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img className="logo" src={proximityLogo} alt="HireAble logo" />
        </button>
        <nav className="nav-center">
          <Link to="/about-us" className="nav-link">
            About Us
          </Link>
          <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToId("tutorial")}>
            Read First
          </button>
          <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToId("privacy")}>
            Privacy
          </button>
          <button type="button" className="nav-link nav-link-btn" onClick={() => scrollToId("contact")}>
            Contact Us
          </button>
        </nav>
        <div className="nav-right">
          <Link to="/login" className="sign-in-btn">
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
      {isMobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeMobileMenu(); }}>
          <aside id="mobile-nav-drawer" className="mobile-nav-drawer" role="dialog" aria-label="Mobile Navigation">
            <div className="mobile-nav-head">
              <div className="mobile-nav-brand">
                <img src={proximityLogo} alt="HireAble logo" className="mobile-nav-logo-img" />
              </div>
              <button type="button" className="mobile-nav-close" aria-label="Close navigation menu" onClick={closeMobileMenu}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <nav className="mobile-nav-links">
              <Link to="/about-us" className="mobile-nav-link" onClick={closeMobileMenu}>
                About Us
              </Link>
              <button type="button" className="mobile-nav-link" onClick={() => handleSectionClick("tutorial")}>
                Read First
              </button>
              <button type="button" className="mobile-nav-link" onClick={() => handleSectionClick("privacy")}>
                Privacy
              </button>
              <button type="button" className="mobile-nav-link" onClick={() => handleSectionClick("contact")}>
                Contact Us
              </button>
            </nav>
            <Link to="/login" className="mobile-nav-signin" onClick={closeMobileMenu}>
              Sign In
            </Link>
          </aside>
        </div>
      )}
    </header>
  );
}
