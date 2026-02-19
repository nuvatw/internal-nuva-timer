import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Timer,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  WifiOff,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { pageVariants, pageTransition } from "../lib/motion";
import { useAuth } from "../contexts/AuthContext";
import { useProfile } from "../contexts/ProfileContext";
import { useTheme } from "../contexts/ThemeContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { getAvatarIcon } from "../lib/avatar-icons";
import { useHotkeys, useHotkeySequenceManager } from "../hooks/useHotkeys";
import CommandPalette, { useCommandPalette } from "./CommandPalette";
import KeyboardShortcutsDialog from "./KeyboardShortcutsDialog";

// ─── Tab items (top nav) ─────────────────────

const tabItems: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/timer", label: "Timer", icon: Timer },
  { to: "/review", label: "Review", icon: BarChart3 },
];

// ─── Avatar Dropdown ─────────────────────────

function AvatarDropdown({
  profile,
  AvatarIcon,
  theme,
  setTheme,
  signOut,
}: {
  profile: { display_name: string | null; avatar_emoji: string | null } | null;
  AvatarIcon: React.ElementType;
  theme: string;
  setTheme: (t: "light" | "dark" | "system") => void;
  signOut: () => void;
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
            {/* User info */}
            {profile && (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <div className="h-9 w-9 rounded-lg bg-accent-muted flex items-center justify-center text-accent shrink-0">
                  <AvatarIcon size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {profile.display_name}
                  </p>
                  {/* Level/XP placeholder — wired in Week 6 */}
                  <p className="text-xs text-text-tertiary">Level 1</p>
                </div>
              </div>
            )}

            {/* Settings link */}
            <div className="py-1">
              <button
                onClick={() => { navigate("/settings"); setOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-text-secondary hover:bg-surface-raised transition-colors"
              >
                <Settings size={15} strokeWidth={1.75} />
                Settings
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

// ─── App Layout ─────────────────────────────

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const online = useOnlineStatus();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const AvatarIcon = getAvatarIcon(profile?.avatar_emoji);

  // ─── Keyboard shortcuts ───────────────────

  useHotkeySequenceManager(["g"]);

  useHotkeys("g t", useCallback(() => navigate("/timer"), [navigate]));
  useHotkeys("g r", useCallback(() => navigate("/review"), [navigate]));
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
            <span className="text-base font-bold text-text-primary tracking-tight select-none">
              nuva
            </span>

            <nav className="flex items-center gap-0.5" aria-label="Main navigation">
              {tabItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-text-primary bg-surface-raised"
                        : "text-text-tertiary hover:text-text-secondary hover:bg-surface-raised/50"
                    }`
                  }
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Avatar Dropdown */}
          <div className="flex items-center gap-2">
            {/* Command palette trigger (compact) */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-text-tertiary hover:bg-surface-raised transition-colors"
              aria-label="Search (⌘K)"
            >
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
                ⌘K
              </kbd>
            </button>

            <AvatarDropdown
              profile={profile}
              AvatarIcon={AvatarIcon}
              theme={theme}
              setTheme={setTheme}
              signOut={signOut}
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

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onOpenShortcuts={() => setShortcutsOpen(true)} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
