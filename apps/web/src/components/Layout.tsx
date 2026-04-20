import { footerContentDefaults, type FooterContent } from "@cip/shared";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUp,
  Coins,
  House,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Sparkles,
  Tags,
  UserRound,
  WalletCards
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";
import { prefetchRouteForPath, preloadRouteChunk } from "../lib/route-prefetch";

type HeaderItem = {
  to: string;
  label: string;
  icon: typeof House;
  requiresAdmin?: boolean;
  isAnchor?: boolean;
};

const headerItems: HeaderItem[] = [
  { to: "/", label: "หน้าหลัก", icon: House },
  { to: "/#store-categories", label: "หมวดหมู่", icon: Tags, isAnchor: true },
  { to: "/topup", label: "เติมเงิน", icon: WalletCards },
  { to: "/account", label: "บัญชีของฉัน", icon: UserRound },
  { to: "/admin", label: "หลังบ้าน", icon: LayoutDashboard, requiresAdmin: true }
];

function renderFooterLink(link: FooterContent["quickLinks"][number]) {
  const isAnchor = link.href.includes("#");

  if (isAnchor) {
    return (
      <a className="footer-link-item" href={link.href} key={`${link.label}-${link.href}`}>
        <span>{link.label}</span>
        <ArrowRight size={15} />
      </a>
    );
  }

  return (
    <Link className="footer-link-item" key={`${link.label}-${link.href}`} to={link.href}>
      <span>{link.label}</span>
      <ArrowRight size={15} />
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, openAuth, logout } = useAuth();
  const location = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const visibleHeaderItems = headerItems.filter((item) => !item.requiresAdmin || user?.role === "admin");
  const showFooter = !location.pathname.startsWith("/admin");
  const footerContentQuery = useQuery({
    queryKey: ["content", "footer"],
    queryFn: () => apiFetch<FooterContent>("/api/content/footer"),
    enabled: showFooter
  });
  const footerContent = footerContentQuery.data ?? footerContentDefaults;

  useEffect(() => {
    let rafId = 0;

    const handleScroll = () => {
      if (rafId) {
        return;
      }

      rafId = window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

        setShowBackToTop((current) => (current !== (scrollTop > 280) ? scrollTop > 280 : current));
        setScrollProgress((current) => (Math.abs(current - progress) > 0.01 ? progress : current));
        rafId = 0;
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleNavigationIntent = (path: string, isAnchor = false) => {
    if (isAnchor) {
      void preloadRouteChunk("category-page");
      return;
    }

    prefetchRouteForPath(path);
  };

  const progressPercent = Math.round(scrollProgress * 100);
  const progressOffset = 75.4 - 75.4 * scrollProgress;
  const pageLabel =
    location.pathname === "/"
      ? "กลับขึ้นไปเลือกเมนูหลัก"
      : location.pathname.startsWith("/product")
        ? "กลับขึ้นไปดูข้อมูลสินค้า"
        : location.pathname.startsWith("/category")
          ? "กลับขึ้นไปดูหมวดหมู่"
          : location.pathname.startsWith("/topup")
            ? "กลับขึ้นไปส่วนเติมเงิน"
            : location.pathname.startsWith("/account")
              ? "กลับขึ้นไปส่วนบัญชี"
              : location.pathname.startsWith("/admin")
                ? "กลับขึ้นไปเมนูแอดมิน"
                : "กลับขึ้นไปด้านบน";

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 md:px-6">
      <div className="ambient-orb ambient-orb--a left-[-6rem] top-[6rem] h-52 w-52" />
      <div className="ambient-orb ambient-orb--b right-[-4rem] top-[14rem] h-44 w-44" />
      <div className="ambient-orb ambient-orb--c bottom-[8rem] left-[18%] h-36 w-36" />

      <header className="panel sticky top-4 z-40 mx-auto mb-8 flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[2.15rem] px-5 py-4">
        <Link className="flex items-center gap-4" to="/">
          <div className="glow-ring rounded-[1.25rem] bg-[var(--text)] px-4 py-3 text-sm font-semibold tracking-[0.24em] text-white">CIP</div>
          <div>
            <div className="section-label">Prompt Commerce UI</div>
            <div className="mt-1 text-sm font-medium text-slate-900 md:text-base">ร้านเติมเกมและดิจิทัลกูดส์โทนสะอาดตา พร้อมใช้งานจริง</div>
          </div>
        </Link>

        <nav className="nav-shell order-3 w-full overflow-x-auto px-2 py-2 lg:order-none lg:w-auto">
          <div className="flex min-w-max items-center gap-2">
            {visibleHeaderItems.map((item) => {
              const Icon = item.icon;

              if (item.isAnchor) {
                return (
                  <a
                    className="nav-pill nav-pill--menu rounded-full px-4 py-2.5 text-sm"
                    href={item.to}
                    key={item.to}
                    onFocus={() => handleNavigationIntent(item.to, true)}
                    onMouseEnter={() => handleNavigationIntent(item.to, true)}
                  >
                    <Icon className="nav-pill__icon" size={15} />
                    {item.label}
                  </a>
                );
              }

              return (
                <NavLink
                  className="nav-pill nav-pill--menu rounded-full px-4 py-2.5 text-sm"
                  key={item.to}
                  onFocus={() => handleNavigationIntent(item.to)}
                  onMouseEnter={() => handleNavigationIntent(item.to)}
                  to={item.to}
                >
                  <Icon className="nav-pill__icon" size={15} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link className="hidden rounded-full border border-[var(--line)] bg-white/90 px-4 py-2 text-sm text-slate-700 md:block" to="/account">
                {user.displayName} · {user.role === "admin" ? "Admin" : "Member"}
              </Link>
              <button className="primary-button rounded-full px-4 py-2 text-sm font-medium" onClick={() => void logout()}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <button
              className="primary-button rounded-full px-4 py-2 text-sm font-medium"
              onClick={() => openAuth("login")}
              onFocus={() => void preloadRouteChunk("auth-dialog")}
              onMouseEnter={() => void preloadRouteChunk("auth-dialog")}
            >
              Login / Register
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl">{children}</main>

      <button
        aria-label="Back to top"
        className={`back-to-top ${showBackToTop ? "back-to-top--visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        type="button"
      >
        <span className="back-to-top__icon">
          <svg aria-hidden="true" className="back-to-top__progress" viewBox="0 0 32 32">
            <circle className="back-to-top__progress-track" cx="16" cy="16" r="12" />
            <circle className="back-to-top__progress-value" cx="16" cy="16" r="12" style={{ strokeDashoffset: progressOffset }} />
          </svg>
          <ArrowUp size={16} />
        </span>
        <span className="back-to-top__copy">
          <span className="back-to-top__label">กลับขึ้นด้านบน</span>
          <span className="back-to-top__meta">
            {pageLabel} · {progressPercent}%
          </span>
        </span>
      </button>

      {showFooter ? (
        <footer className="footer-shell mx-auto mt-14 max-w-7xl overflow-hidden rounded-[2.4rem]">
          <div className="footer-shell__glow" />
          <div className="footer-shell__grid" />
          <div className="footer-shell__content">
            <div className="footer-hero">
              <div className="footer-badge">
                <Sparkles size={14} />
                {footerContent.badge}
              </div>
              <h2 className="footer-title">{footerContent.headline}</h2>
              <p className="footer-description">{footerContent.description}</p>
              <div className="footer-statuses">
                {footerContent.statusPills.map((pill) => (
                  <span className="footer-status-pill" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="footer-links-grid">
              <div className="footer-link-panel">
                <div className="footer-link-title">
                  <Package size={16} />
                  {footerContent.quickLinksTitle}
                </div>
                <div className="footer-link-list">{footerContent.quickLinks.map((link) => renderFooterLink(link))}</div>
              </div>

              <div className="footer-link-panel">
                <div className="footer-link-title">
                  <ShieldCheck size={16} />
                  {footerContent.supportLinksTitle}
                </div>
                <div className="footer-link-list">{footerContent.supportLinks.map((link) => renderFooterLink(link))}</div>
              </div>

              <div className="footer-contact-panel">
                <div className="footer-link-title">
                  <Coins size={16} />
                  {footerContent.contactTitle}
                </div>
                <p className="footer-contact-line">{footerContent.contactLine}</p>
                <p className="footer-contact-subline">{footerContent.contactSubline}</p>
                <div className="footer-contact-actions">
                  <Link className="footer-mini-action" to="/topup">
                    เติมเงิน
                  </Link>
                  <Link className="footer-mini-action" to="/">
                    กลับหน้าหลัก
                  </Link>
                </div>
              </div>
            </div>

            <div className="footer-bottom-bar">
              <div className="footer-bottom-copy">{footerContent.copyright}</div>
              <div className="footer-bottom-note">
                <LayoutDashboard size={14} />
                {user?.role === "admin" ? "แก้ไข footer ได้จาก /admin" : "Footer นี้ดึงข้อความจากระบบหลังบ้าน"}
              </div>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
