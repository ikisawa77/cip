import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { preloadRouteChunk } from "./lib/route-prefetch";
import { HomePage } from "./pages/HomePage";

const AuthDialog = lazy(async () => {
  const module = (await preloadRouteChunk("auth-dialog")) as typeof import("./components/AuthDialog");
  return { default: module.AuthDialog };
});

const CategoryPage = lazy(async () => {
  const module = (await preloadRouteChunk("category-page")) as typeof import("./pages/CategoryPage");
  return { default: module.CategoryPage };
});

const ProductPage = lazy(async () => {
  const module = (await preloadRouteChunk("product-page")) as typeof import("./pages/ProductPage");
  return { default: module.ProductPage };
});

const TopupPage = lazy(async () => {
  const module = (await preloadRouteChunk("topup-page")) as typeof import("./pages/TopupPage");
  return { default: module.TopupPage };
});

const AccountPage = lazy(async () => {
  const module = (await preloadRouteChunk("account-page")) as typeof import("./pages/AccountPage");
  return { default: module.AccountPage };
});

const AdminPage = lazy(async () => {
  const module = (await preloadRouteChunk("admin-page")) as typeof import("./pages/AdminPage");
  return { default: module.AdminPage };
});

function PageFallback({ label }: { label: string }) {
  return <div className="panel rounded-[2rem] p-6 text-sm muted-text">{label}</div>;
}

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route
            element={
              <Suspense fallback={<PageFallback label="กำลังโหลดหมวดหมู่..." />}>
                <CategoryPage />
              </Suspense>
            }
            path="/category/:slug"
          />
          <Route
            element={
              <Suspense fallback={<PageFallback label="กำลังโหลดรายละเอียดสินค้า..." />}>
                <ProductPage />
              </Suspense>
            }
            path="/product/:slug"
          />
          <Route
            element={
              <Suspense fallback={<PageFallback label="กำลังโหลดหน้าท็อปอัพ..." />}>
                <TopupPage />
              </Suspense>
            }
            path="/topup"
          />
          <Route
            element={
              <Suspense fallback={<PageFallback label="กำลังโหลดหน้าบัญชี..." />}>
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              </Suspense>
            }
            path="/account"
          />
          <Route
            element={
              <Suspense fallback={<PageFallback label="กำลังโหลดหน้าหลังบ้าน..." />}>
                <ProtectedRoute role="admin">
                  <AdminPage />
                </ProtectedRoute>
              </Suspense>
            }
            path="/admin"
          />
        </Routes>
      </Layout>
      <Suspense fallback={null}>
        <AuthDialog />
      </Suspense>
    </AuthProvider>
  );
}
