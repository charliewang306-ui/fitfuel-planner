import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedWithOnboarding } from "@/components/ProtectedWithOnboarding";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Water from "@/pages/Water";
import LogFood from "@/pages/LogFood";
import Timeline from "@/pages/Timeline";
import Settings from "@/pages/Settings";
import Weight from "@/pages/Weight";
import Onboarding from "@/pages/Onboarding";
import MealPlanning from "@/pages/MealPlanning";
import AIMealPlan from "@/pages/AIMealPlan";
import AICoach from "@/pages/AICoach";
import ScanBarcode from "@/pages/ScanBarcode";
import UpgradePro from "@/pages/UpgradeProNew";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminUsers from "@/pages/AdminUsers";
import AdminSubscriptions from "@/pages/AdminSubscriptions";
import AdminAIUsage from "@/pages/AdminAIUsage";
import AdminAuditLogs from "@/pages/AdminAuditLogs";
import Streak from "@/pages/Streak";
import ContactSupport from "@/pages/ContactSupport";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import LanguageTest from "@/pages/LanguageTest";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { localDateKey, msUntilNextLocalMidnight, getLocalTimeZone } from "@/utils/dateLocal";

function Router() {
  const [location] = useLocation();

  const isAdminRoute = location.startsWith('/admin');
  const isLegalRoute = ['/contact', '/privacy', '/terms'].includes(location);
  const showBottomNav = !['/onboarding', '/scan', '/upgrade-pro', '/upgrade', '/login'].includes(location) && !isAdminRoute && !isLegalRoute;

  return (
    <div className="relative">
      <Switch>
        {/* Public route - Login (no authentication required) */}
        <Route path="/login" component={Login} />
        
        {/* Protected routes - require authentication */}
        <Route path="/onboarding">
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        </Route>

        <Route path="/">
          <ProtectedWithOnboarding>
            <Dashboard />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/water">
          <ProtectedWithOnboarding>
            <Water />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/log">
          <ProtectedWithOnboarding>
            <LogFood />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/timeline">
          <ProtectedWithOnboarding>
            <Timeline />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/settings">
          <ProtectedWithOnboarding>
            <Settings />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/weight">
          <ProtectedWithOnboarding>
            <Weight />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/meal-plan">
          <ProtectedWithOnboarding>
            <MealPlanning />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/ai-meal-planner">
          <ProtectedWithOnboarding>
            <AIMealPlan />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/ai-coach">
          <ProtectedWithOnboarding>
            <AICoach />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/scan">
          <ProtectedWithOnboarding>
            <ScanBarcode />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/upgrade-pro">
          <ProtectedWithOnboarding>
            <UpgradePro />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/upgrade">
          <ProtectedWithOnboarding>
            <UpgradePro />
          </ProtectedWithOnboarding>
        </Route>

        <Route path="/admin">
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/admin/users">
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        </Route>

        <Route path="/admin/subscriptions">
          <ProtectedRoute>
            <AdminSubscriptions />
          </ProtectedRoute>
        </Route>

        <Route path="/admin/ai-usage">
          <ProtectedRoute>
            <AdminAIUsage />
          </ProtectedRoute>
        </Route>

        <Route path="/admin/audit-logs">
          <ProtectedRoute>
            <AdminAuditLogs />
          </ProtectedRoute>
        </Route>

        <Route path="/streak">
          <ProtectedWithOnboarding>
            <Streak />
          </ProtectedWithOnboarding>
        </Route>

        {/* Public legal/support pages */}
        <Route path="/contact" component={ContactSupport} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />

        <Route path="/language-test">
          <ProtectedRoute>
            <LanguageTest />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
      
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  // Local timezone-aware date rollover system
  useEffect(() => {
    const ensureNewDayAndReset = () => {
      const todayKey = localDateKey();
      const tz = getLocalTimeZone();
      const lastKey = localStorage.getItem('lastDateKey');
      const lastTz = localStorage.getItem('lastTimeZone');

      // Timezone changed - trigger day rollover for safety
      const tzChanged = lastTz && lastTz !== tz;

      if (!lastKey || lastKey !== todayKey || tzChanged) {
        console.log('[App] Day rollover detected:', {
          lastKey,
          todayKey,
          lastTz,
          currentTz: tz,
          tzChanged
        });

        // Invalidate all date-dependent queries to fetch fresh data for new day
        queryClient.invalidateQueries({ queryKey: ['/api/summary/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/foodlogs/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/waterlogs/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reminders/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/weights/check'] });
        queryClient.invalidateQueries({ queryKey: ['/api/daily-status/today'] });
        queryClient.invalidateQueries({ queryKey: ['/api/daily-status/streak'] });
        
        // Invalidate monthly calendar queries (key prefix match)
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey[0];
            return typeof key === 'string' && key.startsWith('/api/daily-status/month');
          }
        });

        // Update stored date and timezone
        localStorage.setItem('lastDateKey', todayKey);
        localStorage.setItem('lastTimeZone', tz);
      }
    };

    const bootDailyRollover = () => {
      // Track active timeout to prevent leaks
      let activeMidnightTimeout: number | null = null;

      // 1) Check on app startup
      ensureNewDayAndReset();

      // 2) Check when page becomes visible (user returns from background)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log('[App] Page visible - checking for day change');
          ensureNewDayAndReset();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 3) Schedule check at next local midnight (DST-aware)
      const scheduleMidnightTick = () => {
        // Clear any existing timeout first
        if (activeMidnightTimeout !== null) {
          window.clearTimeout(activeMidnightTimeout);
        }

        const ms = msUntilNextLocalMidnight();
        console.log('[App] Scheduling midnight check in', Math.round(ms / 1000 / 60), 'minutes');
        
        activeMidnightTimeout = window.setTimeout(() => {
          console.log('[App] Midnight reached - triggering day rollover');
          ensureNewDayAndReset();
          scheduleMidnightTick(); // Schedule next midnight
        }, ms + 500); // +500ms safety margin
      };
      scheduleMidnightTick();

      // 4) Fallback: check every 5 minutes (handles sleep/missed setTimeout)
      const fallbackInterval = window.setInterval(() => {
        console.log('[App] Fallback check triggered');
        ensureNewDayAndReset();
      }, 5 * 60 * 1000);

      // Cleanup
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (activeMidnightTimeout !== null) {
          window.clearTimeout(activeMidnightTimeout);
        }
        window.clearInterval(fallbackInterval);
      };
    };

    return bootDailyRollover();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <InstallPrompt />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
