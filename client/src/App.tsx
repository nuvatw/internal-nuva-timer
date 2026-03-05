import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProfileProvider, useProfile } from "./contexts/ProfileContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SfxProvider } from "./contexts/SfxContext";
import { ProgressProvider } from "./contexts/ProgressContext";
import { TodoProvider } from "./contexts/TodoContext";
import { useReducedMotion } from "./hooks/useReducedMotion";
import ErrorBoundary from "./components/ErrorBoundary";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import OnboardingPage from "./pages/OnboardingPage";
import TimerPage from "./pages/TimerPage";

const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const LevelPage = lazy(() => import("./pages/LevelPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function LoadingScreen() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce [animation-delay:300ms]" />
      </div>
      {slow && (
        <p className="text-text-tertiary text-xs animate-fade-in">
          Server is waking up, this may take a moment...
        </p>
      )}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  // Force onboarding if profile is not complete (unless already on onboarding page)
  if (profile && !profile.is_onboarded && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function OnboardedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;

  // If already onboarded, redirect away from onboarding
  if (profile?.is_onboarded) {
    return <Navigate to="/timer" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (session) return <Navigate to="/timer" replace />;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardedRoute>
            <OnboardingPage />
          </OnboardedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/timer" element={<TimerPage />} />
        <Route path="/review" element={<Suspense fallback={<LoadingScreen />}><ReviewPage /></Suspense>} />
        <Route path="/calendar" element={<Suspense fallback={<LoadingScreen />}><CalendarPage /></Suspense>} />
        <Route path="/level" element={<Suspense fallback={<LoadingScreen />}><LevelPage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<LoadingScreen />}><SettingsPage /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/timer" replace />} />
    </Routes>
  );
}

function MotionProvider({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reduced ? "always" : "never"}>
      {children}
    </MotionConfig>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MotionProvider>
          <BrowserRouter>
            <AuthProvider>
              <ProfileProvider>
                <ToastProvider>
                  <SfxProvider>
                    <ProgressProvider>
                      <TodoProvider>
                        <AppRoutes />
                      </TodoProvider>
                    </ProgressProvider>
                  </SfxProvider>
                </ToastProvider>
              </ProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </MotionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
