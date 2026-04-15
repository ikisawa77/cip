import { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../auth";

export function ProtectedRoute({
  children,
  role
}: {
  children: React.ReactNode;
  role?: "customer" | "admin";
}) {
  const { isLoading, user, openAuth } = useAuth();
  const location = useLocation();
  const promptedPathRef = useRef<string | null>(null);
  const currentPath = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);

  useEffect(() => {
    if (user) {
      promptedPathRef.current = null;
      return;
    }

    if (!isLoading && promptedPathRef.current !== currentPath) {
      promptedPathRef.current = currentPath;
      openAuth("login", currentPath);
    }
  }, [currentPath, isLoading, openAuth, user]);

  if (isLoading) {
    return <div className="panel rounded-[2rem] p-6 text-sm muted-text">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</div>;
  }

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2 text-sm muted-text">
          เราเปิดหน้าล็อกอินให้แล้ว ถ้าปิดหน้าต่างไป คุณสามารถกดเปิดใหม่ได้จากปุ่มด้านล่าง หรือกลับไปหน้าแรกก่อนได้
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="primary-button rounded-full px-4 py-2 text-sm" onClick={() => openAuth("login", currentPath)} type="button">
            เปิดหน้าล็อกอินอีกครั้ง
          </button>
          <Link className="secondary-button inline-flex rounded-full px-4 py-2 text-sm" to="/">
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  if (role && user.role !== role) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-slate-950">บัญชีนี้ยังไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="mt-2 text-sm muted-text">
          หากต้องการจัดการคำสั่งซื้อหรือ wallet ให้กลับไปที่หน้าบัญชี ส่วนหลังบ้านจะเปิดเฉพาะแอดมินเท่านั้น
        </p>
        <Link className="primary-button mt-4 inline-flex rounded-full px-4 py-2 text-sm font-medium" to="/account">
          ไปหน้าบัญชี
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
