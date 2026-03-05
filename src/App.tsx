import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useAuth, useAuthProvider, AuthContext } from "./hooks/use-auth";
import { DashboardLayout } from "./components/layout/dashboard-layout";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard/page";
import { SearchPage } from "./pages/search/page";
import { FinansijePage } from "./pages/finansije/page";
import { BlokadePage } from "./pages/blokade/page";
import { ApiKeysPage } from "./pages/api-keys/page";
import { ApiDocsPage } from "./pages/api-docs/page";

function LoginWrapper() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    await login(username, password);
    navigate("/");
  };

  return <LoginPage onLogin={handleLogin} />;
}

function AppRoutes() {
  const { loading, logout, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Učitavanje...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginWrapper />
      } />

      {isAuthenticated ? (
        <Route element={<DashboardLayout onLogout={logout} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/finansije" element={<FinansijePage />} />
          <Route path="/blokade" element={<BlokadePage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/api-docs" element={<ApiDocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  const auth = useAuthProvider();

  return (
    <AuthContext.Provider value={auth}>
      <AppRoutes />
    </AuthContext.Provider>
  );
}
