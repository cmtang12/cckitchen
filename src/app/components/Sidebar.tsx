import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { 
  BookOpen, 
  Upload, 
  Calendar, 
  ShoppingBasket, 
  BookmarkCheck,
  ChevronRight,
  ChevronLeft,
  BarChart3
} from "lucide-react";
import { Button } from "./ui/button";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: BookOpen, label: "Recipes" },
  { path: "/meal-plans", icon: Calendar, label: "Meal Plans" },
  { path: "/grocery-list", icon: ShoppingBasket, label: "Grocery List" },
  { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
];

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/recipe");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out z-40 ${
        isExpanded ? "w-56" : "w-16"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-primary">C&C</span>
            </div>
            <span 
              className={`font-semibold text-foreground whitespace-nowrap transition-opacity duration-300 ${
                isExpanded ? "opacity-100" : "opacity-0"
              }`}
            >
              C&C's Kitchen
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <li key={item.path}>
                  <Link to={item.path}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span 
                        className={`whitespace-nowrap transition-opacity duration-300 ${
                          isExpanded ? "opacity-100" : "opacity-0 w-0"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Expand/Collapse Toggle (optional, for manual control) */}
        <div className="p-4 border-t border-border hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-start text-muted-foreground"
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}