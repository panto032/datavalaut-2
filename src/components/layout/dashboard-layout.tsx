import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";

export function DashboardLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
