import React from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { CatMark } from "./CatMark";
import { MobileBottomNav } from "./MobileBottomNav";
import { Plus, LogOut } from "lucide-react";
import { logout } from "../utils/auth";


export function RootLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-clip">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar onLogout={handleLogout} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
        {/* Mobile top bar - in normal document flow so it never overlaps page content */}
        <div
          className="md:hidden sticky top-0 z-40 bg-background border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center justify-between h-12 px-4">
          <Link to="/" className="flex items-center gap-2">
            <CatMark className="w-7 h-7 text-[#9c5434]" counter={false} />
            <span className="wordmark text-[22px]">C&amp;C's Kitchen</span>
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 -mr-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        </div>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>

      {/* Floating Action Button - Desktop only */}
      <div className="hidden md:block">
        <Link to="/import">
          <div className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-primary shadow-[0_6px_16px_rgba(120,60,30,0.25)] flex items-center justify-center cursor-pointer z-30" title="Add a recipe">
            <Plus className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
        </Link>
      </div>
    </div>
  );
}