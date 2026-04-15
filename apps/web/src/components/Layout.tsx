import { ArrowUp, Coins, House, LayoutDashboard, Package, ShieldCheck, Tags, UserRound, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../auth";

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

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, openAuth, logout } = useAuth();
  const location = useLocation();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const visibleHeaderItems = headerItems.filter((item) => !item.requiresAdmin || user?.role === "admin");

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0;

      setShowBackToTop(scrollTop > 280);
      setScrollProgress(progress);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
                  <a className="nav-pill nav-pill--menu rounded-full px-4 py-2.5 text-sm" href={item.to} key={item.to}>
                    <Icon className="nav-pill__icon" size={15} />
                    {item.label}
                  </a>
                );
              }

              return (
                <NavLink className="nav-pill nav-pill--menu rounded-full px-4 py-2.5 text-sm" key={item.to} to={item.to}>
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
            <button className="primary-button rounded-full px-4 py-2 text-sm font-medium" onClick={() => openAuth("login")}>
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
            <circle
              className="back-to-top__progress-value"
              cx="16"
              cy="16"
              r="12"
              style={{ strokeDashoffset: progressOffset }}
            />
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

      <footer className="panel-soft mx-auto mt-14 flex max-w-7xl flex-wrap items-center gap-3 rounded-[2rem] px-5 py-4 text-sm muted-text">
        <span className="inline-flex items-center gap-2">
          <Package size={16} /> Digital goods พร้อมส่ง
        </span>
        <span className="inline-flex items-center gap-2">
          <Coins size={16} /> Wallet และ PromptPay
        </span>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={16} /> Auth และ security center
        </span>
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard size={16} /> หลังบ้านภาษาไทยครบ flow
        </span>
      </footer>
    </div>
  );
}
