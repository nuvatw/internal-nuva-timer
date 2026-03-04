import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Timer,
  BarChart3,
  CalendarDays,
  Trophy,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  WifiOff,
  ChevronDown,
  Volume2,
  VolumeX,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSfx } from "../contexts/SfxContext";
import { useProgress } from "../contexts/ProgressContext";
import { getLevelTitle } from "@nuva/shared/game";
import { getLevelTierColors } from "../lib/tier-colors";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { getAvatarIcon } from "../lib/avatar-icons";
import { useHotkeys, useHotkeySequenceManager } from "../hooks/useHotkeys";
import CommandPalette, { useCommandPalette } from "./CommandPalette";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";
import LevelBadge from "./LevelBadge";
import XpGainToast from "./XpGainToast";

const LevelUpOverlay = lazy(() => import("./LevelUpOverlay"));

// ─── Tab items (top nav) ─────────────────────

const tabItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/review", label: "Review", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/level", label: "Level", icon: Trophy },
];

// ─── Avatar Dropdown ─────────────────────────

function AvatarDropdown({
  profile,
  AvatarIcon,
  theme,
  setTheme,
  signOut,
  isMuted,
  toggleMute,
  levelInfo,
}: {
  profile: { display_name: string | null; avatar_emoji: string | null } | null;
  AvatarIcon: React.ElementType;
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  signOut: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  levelInfo: { level: number; title: string; xpInLevel: number; xpNeeded: number; dailyXp: number; streak: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-raised"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="h-7 w-7 rounded-lg bg-accent-muted flex items-center justify-center text-accent">
          <AvatarIcon size={14} strokeWidth={1.75} />
        </div>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`text-text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-bg shadow-lg z-50 overflow-hidden"
          >
            {/* User info + Level */}
            {profile && (
              <div className="px-4 py-3 border-b border-border space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent shrink-0">
                    <AvatarIcon size={18} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {profile.display_name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {levelInfo ? `Level ${levelInfo.level} · ${levelInfo.title}` : "Level 1"}
                    </p>
                  </div>
                </div>
                {levelInfo && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-surface-raised overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-accent"
                        initial={false}
                        animate={{ width: `${levelInfo.xpNeeded > 0 ? (levelInfo.xpInLevel / levelInfo.xpNeeded) * 100 : 0}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                      <span>{levelInfo.xpInLevel} / {levelInfo.xpNeeded} XP</span>
                      <span className="flex items-center gap-1.5">
                        {levelInfo.streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-amber-500">
                            <Flame size={10} strokeWidth={2.5} />
                            {levelInfo.streak}d
                          </span>
                        )}
                        {levelInfo.dailyXp > 0 && <span>+{levelInfo.dailyXp} today</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings + Sound */}
            <div className="py-1">
              <button
                onClick={() => { navigate("/settings"); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
              >
                <Settings size={15} strokeWidth={1.75} />
                Settings
              </button>
              <button
                onClick={toggleMute}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
              >
                {isMuted ? <VolumeX size={15} strokeWidth={1.75} /> : <Volume2 size={15} strokeWidth={1.75} />}
                <span className="flex-1 text-left">Sound</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isMuted ? "bg-destructive-muted text-destructive" : "bg-success-muted text-success"}`}>
                  {isMuted ? "Off" : "On"}
                </span>
              </button>
            </div>

            {/* Theme toggle */}
            <div className="px-4 py-2 border-t border-border">
              <p className="text-xs font-medium text-text-tertiary mb-2">Theme</p>
              <div className="flex items-center gap-0.5 rounded-lg bg-surface-raised p-0.5" role="radiogroup" aria-label="Theme">
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={theme === value}
                    aria-label={label}
                    onClick={() => setTheme(value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      theme === value
                        ? "bg-bg text-text-primary shadow-sm"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <div className="border-t border-border py-1">
              <button
                onClick={() => { signOut(); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-tertiary hover:bg-surface-raised hover:text-destructive transition-colors"
              >
                <LogOut size={15} strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Nav XP Bar (memoized) ──────────────────

const NavXpBar = memo(function NavXpBar({ progress }: { progress: NonNullable<ReturnType<typeof useProgress>["progress"]> }) {
  const xpIn = progress.total_xp - progress.xp_current_level;
  const xpNeed = progress.xp_next_level - progress.xp_current_level;
  const pct = xpNeed > 0 ? Math.min(1, xpIn / xpNeed) : 0;
  const t = getLevelTierColors(progress.current_level);

  return (
    <Link
      to="/level"
      className="hidden sm:flex items-center gap-2.5 group relative"
      aria-label={`Level ${progress.current_level} — ${xpIn} of ${xpNeed} XP to next level`}
    >
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${t.text} ${t.bg}`}>
        Lv.{progress.current_level}
      </span>
      <div className="w-40 h-2 rounded-full bg-surface-raised overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${t.bar}`}
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-text-tertiary tabular-nums opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {xpNeed - xpIn} XP to Lv.{progress.current_level + 1}
      </span>
    </Link>
  );
});

// ─── App Layout ─────────────────────────────

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const online = useOnlineStatus();
  const { isMuted, toggleMute } = useSfx();
  const { progress, levelChanged, clearLevelUp } = useProgress();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const AvatarIcon = getAvatarIcon(profile?.avatar_emoji);

  // ─── Page transitions (simple vertical fade) ─

  // Compute level info for avatar dropdown
  const levelInfo = progress
    ? {
        level: progress.current_level,
        title: getLevelTitle(progress.current_level),
        xpInLevel: progress.total_xp - progress.xp_current_level,
        xpNeeded: progress.xp_next_level - progress.xp_current_level,
        dailyXp: progress.daily_xp,
        streak: progress.current_streak,
      }
    : null;

  // ─── Keyboard shortcuts ───────────────────

  useHotkeySequenceManager(["g"]);

  useHotkeys("g t", useCallback(() => navigate("/timer"), [navigate]));
  useHotkeys("g r", useCallback(() => navigate("/review"), [navigate]));
  useHotkeys("g c", useCallback(() => navigate("/calendar"), [navigate]));
  useHotkeys("g l", useCallback(() => navigate("/level"), [navigate]));
  useHotkeys("g s", useCallback(() => navigate("/settings"), [navigate]));

  useHotkeys("?", useCallback(() => {
    setShortcutsOpen((prev) => !prev);
  }, []));

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-accent focus:text-text-inverted focus:px-4 focus:py-2 focus:rounded-md focus:text-sm"
      >
        Skip to main content
      </a>

      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 sm:px-6">
          {/* Left: Logo + Tabs */}
          <div className="flex items-center gap-6">
            <span className="text-base font-bold font-serif text-text-primary tracking-tight select-none">
              nuva
            </span>

            <nav className="flex items-center gap-0.5 relative" aria-label="Main navigation">
              {tabItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-text-primary"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-surface-raised/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div
                          className="absolute inset-0 rounded-lg bg-surface-raised"
                          style={{ animation: "nav-indicator 200ms ease-out both" }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <Icon size={16} strokeWidth={1.75} />
                        <span className="hidden sm:inline">{label}</span>
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: XP bar + Avatar */}
          <div className="flex items-center gap-3">
            {/* XP progress — links to Level page */}
            {!progress ? (
              <div className="hidden sm:flex items-center gap-2.5">
                <div className="h-5 w-8 rounded bg-surface-raised animate-pulse" />
                <div className="w-40 h-2 rounded-full bg-surface-raised animate-pulse" />
              </div>
            ) : (
              <NavXpBar progress={progress} />
            )}

            {/* Mobile-only compact badge */}
            <Link to="/level" className="sm:hidden">
              <LevelBadge />
            </Link>

            <AvatarDropdown
              profile={profile}
              AvatarIcon={AvatarIcon}
              theme={theme}
              setTheme={setTheme}
              signOut={signOut}
              isMuted={isMuted}
              toggleMute={toggleMute}
              levelInfo={levelInfo}
            />
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main
        id="main-content"
        className="flex-1 min-w-0 overflow-y-auto"
        role="main"
      >
        {/* Offline banner */}
        <AnimatePresence>
          {!online && (
            <motion.div
              className="flex items-center justify-center gap-2 bg-warning-muted border-b border-amber-300 px-4 py-2 text-sm text-amber-800"
              role="status"
              aria-live="polite"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <WifiOff size={14} strokeWidth={2} className="shrink-0" />
              You're offline. The timer still works, but syncing is paused.
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`mx-auto ${location.pathname === "/calendar" ? "max-w-6xl" : "max-w-3xl"}`}>
          <Outlet />
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenShortcuts={() => setShortcutsOpen(true)} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <XpGainToast />

      <AnimatePresence>
        {levelChanged && (
          <Suspense fallback={null}>
            <LevelUpOverlay levelChanged={levelChanged} onDismiss={clearLevelUp} />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}
