import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  FileBarChart,
  ShieldAlert,
  Key,
  BookOpen,
  LogOut,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Početna" },
  { to: "/search", icon: Search, label: "Pretraga" },
  { to: "/finansije", icon: FileBarChart, label: "Finansije" },
  { to: "/blokade", icon: ShieldAlert, label: "Blokade" },
  { to: "/api-keys", icon: Key, label: "API ključevi" },
  { to: "/api-docs", icon: BookOpen, label: "API dokumentacija" },
];

export function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="text-lg font-bold text-foreground">DataValaut</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Odjavi se
        </button>
      </div>
    </aside>
  );
}
