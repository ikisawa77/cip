import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth";
import { AuthDialog } from "./components/AuthDialog";
import { Layout } from "./components/Layout";
import { AccountPage } from "./pages/AccountPage";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { ProductPage } from "./pages/ProductPage";

export function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<ProductPage />} path="/product/:slug" />
          <Route element={<AccountPage />} path="/account" />
          <Route element={<AdminPage />} path="/admin" />
        </Routes>
      </Layout>
      <AuthDialog />
    </AuthProvider>
  );
}
