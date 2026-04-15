import { useEffect } from "react";
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

  useEffect(() => {
    if (!isLoading && !user) {
      openAuth("login", `${location.pathname}${location.search}`);
    }
  }, [isLoading, location.pathname, location.search, openAuth, user]);

  if (isLoading) {
    return <div className="panel rounded-[2rem] p-6 text-sm text-slate-300">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</div>;
  }

  if (!user) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-white">ต้องเข้าสู่ระบบก่อน</p>
        <p className="mt-2 text-sm text-slate-300">เราเปิดหน้าล็อกอินให้แล้ว เพื่อพากลับมายังหน้าที่คุณกำลังจะใช้งานต่ออัตโนมัติ</p>
      </div>
    );
  }

  if (role && user.role !== role) {
    return (
      <div className="panel rounded-[2rem] p-6">
        <p className="text-lg font-semibold text-white">บัญชีนี้ยังไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        <p className="mt-2 text-sm text-slate-300">หากต้องการจัดการคำสั่งซื้อหรือ wallet ให้กลับไปที่หน้าบัญชี ส่วนหลังบ้านจะเปิดเฉพาะแอดมินเท่านั้น</p>
        <Link className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950" to="/account">
          ไปหน้าบัญชี
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
