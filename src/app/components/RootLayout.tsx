import React from "react";
import { Outlet, Link, useNavigate } from "react-router";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Plus, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { logout } from "../utils/auth";


export function RootLayout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
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
          <div className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#E07B67] to-[#D16A56] shadow-lg shadow-[#E07B67]/20 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer z-50">
            <Plus className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
        </Link>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-50"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}