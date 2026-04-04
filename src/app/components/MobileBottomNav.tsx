import React from "react";
import { Link, useLocation } from "react-router";
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  ShoppingBasket, 
  BookmarkCheck,
  BarChart3
} from "lucide-react";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: BookOpen, label: "Recipes" },
  { path: "/import", icon: Plus, label: "Import" },
  { path: "/meal-plans", icon: Calendar, label: "Plans" },
  { path: "/grocery-list", icon: ShoppingBasket, label: "Grocery" },
  { path: "/dashboard", icon: BarChart3, label: "Stats" },
];

export function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/recipe");
    }
    return location.pathname.startsWith(path);
  };

  // Separate import from other nav items
  const leftNavItems = [
    { path: "/", icon: BookOpen, label: "Recipes" },
    { path: "/grocery-list", icon: ShoppingBasket, label: "Grocery" },
  ];
  
  const rightNavItems = [
    { path: "/meal-plans", icon: Calendar, label: "Plans" },
    { path: "/dashboard", icon: BarChart3, label: "Stats" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-inset-bottom">
      <div className="flex items-end justify-between px-6 py-2 relative">
        {/* Left Nav Items */}
        <div className="flex items-center gap-4 flex-1 justify-around">
          {leftNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link 
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 py-2"
              >
                <div
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Center Add Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <Link to="/import">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E07B67] to-[#D16A56] shadow-lg shadow-[#E07B67]/20 flex items-center justify-center hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
          </Link>
        </div>

        {/* Right Nav Items */}
        <div className="flex items-center gap-4 flex-1 justify-around">
          {rightNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link 
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 py-2"
              >
                <div
                  className={`flex flex-col items-center gap-1 transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}