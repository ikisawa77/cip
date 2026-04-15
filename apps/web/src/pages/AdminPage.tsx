import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [inventoryPayload, setInventoryPayload] = useState("");
  const [inventoryProductId, setInventoryProductId] = useState("");

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
  const orderQuery = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () =>
      apiFetch<Array<{ id: string; status: string; totalCents: number; notes: string | null; createdAt: string }>>("/api/admin/orders"),
    enabled: user?.role === "admin"
  });
  const inventoryQuery = useQuery({
    queryKey: ["admin", "inventory"],
    queryFn: () =>
      apiFetch<Array<{ id: string; name: string; slug: string; type: string; availableStock: number; allocatedStock: number }>>(
        "/api/admin/inventory"
      ),
    enabled: user?.role === "admin"
  });
  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: () =>
      apiFetch<Array<{ id: string; kind: string; status: string; payloadJson: string; updatedAt: string }>>("/api/admin/jobs"),
    enabled: user?.role === "admin"
  });

  const providerMutation = useMutation({
    mutationFn: (providerKey: string) =>
      apiFetch(`/api/admin/providers/${providerKey}`, {
        method: "PUT",
        body: JSON.stringify({
          isEnabled: true,
          config: {
            mode: "sandbox",
            updatedFromUi: true
          }
        })
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "providers"] });
    }
  });

  const inventoryMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ imported: number }>("/api/admin/inventory/import", {
        method: "POST",
        body: JSON.stringify({
          productId: inventoryProductId,
          kind: "code",
          rawText: inventoryPayload
        })
      }),
    onSuccess: async () => {
      setInventoryPayload("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "inventory"] });
    }
  });

  const requeueMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch(`/api/admin/jobs/${jobId}/requeue`, {
        method: "POST",
        body: JSON.stringify({})
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    }
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

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Provider Config</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">สถานะผู้ให้บริการ</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {providerQuery.data?.map((provider) => (
              <button
                className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-left"
                key={provider.id}
                onClick={() => setSelectedProvider(provider.providerKey)}
                type="button"
              >
                <div className="text-sm font-medium uppercase tracking-[0.2em] text-slate-900">{provider.providerKey}</div>
                <div className="mt-2 text-sm text-slate-600">
                  สถานะ:{" "}
                  <span className={provider.isEnabled ? "text-emerald-700" : "text-amber-700"}>
                    {provider.isEnabled ? "เปิดใช้งาน" : "ยังปิดอยู่"}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selectedProvider ? (
            <div className="mt-4 rounded-[1.5rem] bg-slate-950 px-4 py-4 text-sm text-slate-100">
              <div>เลือกแล้ว: {selectedProvider}</div>
              <button
                className="mt-3 rounded-full bg-white px-4 py-2 text-xs text-slate-950"
                onClick={() => void providerMutation.mutate(selectedProvider)}
                type="button"
              >
                เปิดโหมด sandbox scaffold
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Inventory Import</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">นำเข้าสินค้าพร้อมส่ง</h2>
          <p className="mt-2 text-sm text-slate-600">ใส่ `productId` และวางทีละบรรทัดสำหรับ code, download link หรือ account</p>
          <div className="mt-5 space-y-3">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
              onChange={(event) => setInventoryProductId(event.target.value)}
              placeholder="productId"
              value={inventoryProductId}
            />
            <textarea
              className="min-h-40 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 outline-none"
              onChange={(event) => setInventoryPayload(event.target.value)}
              placeholder={"CODE-001\nCODE-002\nCODE-003"}
              value={inventoryPayload}
            />
            <button className="rounded-full bg-slate-950 px-4 py-3 text-sm text-white" onClick={() => void inventoryMutation.mutate()} type="button">
              import inventory
            </button>
            {inventoryMutation.data ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                import สำเร็จ {inventoryMutation.data.imported} รายการ
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="panel rounded-[2.5rem] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Recent Orders</p>
          <div className="mt-4 space-y-3">
            {orderQuery.data?.slice(0, 8).map((order) => (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={order.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{order.id}</div>
                    <div className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString("th-TH")}</div>
                    {order.notes ? <div className="mt-2 text-sm text-slate-600">{order.notes}</div> : null}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">{formatMoney(order.totalCents)}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-teal-700">{order.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-[2.5rem] p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Queue Jobs</p>
          <div className="mt-4 space-y-3">
            {jobsQuery.data?.map((job) => (
              <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={job.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{job.kind}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{job.status}</div>
                    <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">
                      {job.payloadJson}
                    </pre>
                  </div>
                  <button
                    className="rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-700"
                    onClick={() => void requeueMutation.mutate(job.id)}
                    type="button"
                  >
                    requeue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel rounded-[2.5rem] p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-teal-700">Inventory Summary</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {inventoryQuery.data?.map((item) => (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4" key={item.id}>
              <div className="text-sm font-medium text-slate-900">{item.name}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{item.type}</div>
              <div className="mt-3 text-sm text-slate-700">คงเหลือ: {item.availableStock}</div>
              <div className="text-sm text-slate-700">ถูกจ่ายแล้ว: {item.allocatedStock}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
