import { Coins, LayoutDashboard, Package, ShieldCheck } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { useAuth } from "../auth";

const navItems = [
  { to: "/", label: "หน้าหลัก" },
  { to: "/account", label: "บัญชีของฉัน" },
  { to: "/admin", label: "หลังบ้าน" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, openAuth, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 md:px-6">
      <div className="ambient-orb ambient-orb--a left-[-6rem] top-[7rem] h-52 w-52" />
      <div className="ambient-orb ambient-orb--b right-[-4rem] top-[18rem] h-44 w-44" />

      <header className="panel-strong sticky top-4 z-40 mx-auto mb-8 flex w-full max-w-7xl items-center justify-between rounded-[2rem] px-4 py-4 md:px-6">
        <Link className="flex items-center gap-4" to="/">
          <div className="glow-ring rounded-[1.35rem] bg-black px-4 py-3 text-sm font-bold tracking-[0.28em] text-white">CIP</div>
          <div>
            <div className="eyebrow">Digital Arcade Commerce</div>
            <div className="mt-1 text-sm font-medium text-slate-100 md:text-base">ร้านเติมเกม Full-Option สำหรับงานขายจริง</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm transition ${
                  isActive ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 md:block" to="/account">
                {user.displayName} · {user.role === "admin" ? "Admin" : "Member"}
              </Link>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950" onClick={() => void logout()}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950" onClick={() => openAuth("login")}>
              Login / Register
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl">{children}</main>

      <footer className="mx-auto mt-14 flex max-w-7xl flex-wrap gap-3 rounded-[2rem] border border-white/8 bg-white/4 px-5 py-4 text-sm text-slate-300 backdrop-blur-xl">
        <span className="inline-flex items-center gap-2">
          <Package size={16} /> Digital goods พร้อมส่ง
        </span>
        <span className="inline-flex items-center gap-2">
          <Coins size={16} /> Wallet และ PromptPay
        </span>
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={16} /> Session-based auth พร้อม security center
        </span>
        <span className="inline-flex items-center gap-2">
          <LayoutDashboard size={16} /> หลังบ้านภาษาไทยครบ flow
        </span>
      </footer>
    </div>
  );
}
