import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Droplets, 
  UtensilsCrossed, 
  Clock, 
  Settings 
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useTranslation('common');

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t('nav.dashboard'), testId: "nav-dashboard" },
    { path: "/water", icon: Droplets, label: t('nav.water'), testId: "nav-water" },
    { path: "/log", icon: UtensilsCrossed, label: t('nav.log'), testId: "nav-log" },
    { path: "/timeline", icon: Clock, label: t('nav.timeline'), testId: "nav-timeline" },
    { path: "/settings", icon: Settings, label: t('nav.settings'), testId: "nav-settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-card-border safe-area-inset-bottom z-50">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <button
                data-testid={item.testId}
                className={`flex flex-col items-center justify-center gap-1 min-w-[60px] h-12 rounded-md transition-colors hover-elevate active-elevate-2 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon 
                  className="w-6 h-6" 
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
