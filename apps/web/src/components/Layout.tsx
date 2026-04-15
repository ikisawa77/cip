import { Link, NavLink } from "react-router-dom";
import { Coins, LayoutDashboard, Package, ShieldCheck } from "lucide-react";

import { useAuth } from "../auth";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, openAuth, logout } = useAuth();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <header className="panel sticky top-4 z-40 mx-auto mb-6 flex w-full max-w-7xl items-center justify-between rounded-[2rem] px-5 py-4">
        <Link className="flex items-center gap-3" to="/">
          <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">CIP</div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-teal-700">Node Hosting Ready</div>
            <div className="text-sm font-semibold text-slate-900">เว็บเติมเกม Full-Option</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-3 md:flex">
          <NavLink className="chip rounded-full px-4 py-2 text-sm text-slate-700" to="/">
            หน้าหลัก
          </NavLink>
          <NavLink className="chip rounded-full px-4 py-2 text-sm text-slate-700" to="/account">
            บัญชีของฉัน
          </NavLink>
          <NavLink className="chip rounded-full px-4 py-2 text-sm text-slate-700" to="/admin">
            หลังบ้าน
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm md:block">
                {user.displayName}
              </div>
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm text-white" onClick={() => void logout()}>
                ออกจากระบบ
              </button>
            </>
          ) : (
            <button className="rounded-full bg-slate-950 px-4 py-2 text-sm text-white" onClick={openAuth}>
              Login / Register
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl">{children}</main>

      <footer className="mx-auto mt-12 flex max-w-7xl flex-wrap items-center gap-3 rounded-[2rem] border border-slate-200 bg-white/80 px-5 py-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2"><Package size={16} /> ดิจิทัลกูดส์พร้อมส่ง</span>
        <span className="inline-flex items-center gap-2"><Coins size={16} /> Wallet และ PromptPay</span>
        <span className="inline-flex items-center gap-2"><ShieldCheck size={16} /> พร้อม Nokhosting Node.js</span>
        <span className="inline-flex items-center gap-2"><LayoutDashboard size={16} /> หลังบ้านภาษาไทย</span>
      </footer>
    </div>
  );
}
