import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth";
import { AuthDialog } from "./components/AuthDialog";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";
import { TopupPage } from "./pages/TopupPage";

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<ProductPage />} path="/product/:slug" />
          <Route element={<TopupPage />} path="/topup" />
          <Route
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
            path="/account"
          />
          <Route
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
            path="/admin"
          />
        </Routes>
      </Layout>
      <AuthDialog />
    </AuthProvider>
  );
}
