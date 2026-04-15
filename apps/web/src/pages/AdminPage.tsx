import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth";
import { apiFetch } from "../lib/api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB"
  }).format(cents / 100);
}

export function AdminPage() {
  const { user, openAuth } = useAuth();
  const dashboardQuery = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () =>
      apiFetch<{
        ordersCount: number;
        revenueCents: number;
        usersCount: number;
        pendingJobs: number;
      }>("/api/admin/dashboard"),
    enabled: user?.role === "admin"
  });
  const providerQuery = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () =>
      apiFetch<Array<{ id: string; providerKey: string; isEnabled: boolean; configJson: string }>>("/api/admin/providers"),
    enabled: user?.role === "admin"
  });

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">เข้าสู่ระบบแอดมินก่อน</p>
        <button className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm text-white" onClick={openAuth}>
          Login
        </button>
      </div>
    );
  }

  if (user.role !== "admin") {
    return <div className="panel rounded-[2rem] p-6">บัญชีนี้ยังไม่ใช่ผู้ดูแลระบบ</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["จำนวนออเดอร์", String(dashboardQuery.data?.ordersCount ?? 0)],
          ["รายได้รวม", formatMoney(dashboardQuery.data?.revenueCents ?? 0)],
          ["ผู้ใช้งาน", String(dashboardQuery.data?.usersCount ?? 0)],
          ["งานค้างในคิว", String(dashboardQuery.data?.pendingJobs ?? 0)]
        ].map(([label, value]) => (
          <div className="panel rounded-[2rem] p-5" key={label}>
            <div className="text-sm uppercase tracking-[0.3em] text-teal-700">{label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
          </div>
        ))}
      </section>

      <section className="panel rounded-[2.5rem] p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Provider Config</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">สถานะผู้ให้บริการ</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {providerQuery.data?.map((provider) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={provider.id}>
              <div className="text-sm font-medium uppercase tracking-[0.2em] text-slate-900">{provider.providerKey}</div>
              <div className="mt-2 text-sm text-slate-600">
                สถานะ:{" "}
                <span className={provider.isEnabled ? "text-emerald-700" : "text-amber-700"}>
                  {provider.isEnabled ? "เปิดใช้งาน" : "ยังปิดอยู่"}
                </span>
              </div>
              <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">
                {provider.configJson}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
