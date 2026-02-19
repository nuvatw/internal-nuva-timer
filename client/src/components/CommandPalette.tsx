import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  BarChart3,
  Settings,
  Sun,
  Moon,
  Monitor,
  LogOut,
  Search,
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { overlayVariants, modalTransition } from "../lib/motion";

// ─── Types ────────────────────────────────

interface Command {
  id: string;
  label: string;
  section: string;
  icon: LucideIcon;
  keywords: string[];
  action: () => void;
}

// ─── Hook: useCommandPalette ──────────────

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return { open, setOpen };
}

// ─── Component ────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

export default function CommandPalette({ open, onClose, onOpenShortcuts }: CommandPaletteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Shortcut hints displayed on the right side of commands
  const shortcutHints: Record<string, string[]> = {
    "nav-timer": ["g", "t"],
    "nav-review": ["g", "r"],
    "nav-settings": ["g", "s"],
    "shortcuts": ["?"],
  };

  // Build commands list
  const commands: Command[] = useMemo(() => {
    const run = (fn: () => void) => () => {
      fn();
      onClose();
    };

    return [
      // Navigation
      {
        id: "nav-timer",
        label: "Go to Timer",
        section: "Navigation",
        icon: Timer,
        keywords: ["timer", "focus", "start", "home"],
        action: run(() => navigate("/timer")),
      },
      {
        id: "nav-review",
        label: "Go to Review",
        section: "Navigation",
        icon: BarChart3,
        keywords: ["review", "dashboard", "analytics", "sessions", "history"],
        action: run(() => navigate("/review")),
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        section: "Navigation",
        icon: Settings,
        keywords: ["settings", "preferences", "profile", "departments", "projects"],
        action: run(() => navigate("/settings")),
      },
      // Theme
      {
        id: "theme-light",
        label: "Theme: Light",
        section: "Theme",
        icon: Sun,
        keywords: ["theme", "light", "bright", "day"],
        action: run(() => setTheme("light")),
      },
      {
        id: "theme-dark",
        label: "Theme: Dark",
        section: "Theme",
        icon: Moon,
        keywords: ["theme", "dark", "night"],
        action: run(() => setTheme("dark")),
      },
      {
        id: "theme-system",
        label: "Theme: System",
        section: "Theme",
        icon: Monitor,
        keywords: ["theme", "system", "auto", "os"],
        action: run(() => setTheme("system")),
      },
      // General
      ...(onOpenShortcuts
        ? [
            {
              id: "shortcuts",
              label: "Keyboard Shortcuts",
              section: "General",
              icon: Keyboard,
              keywords: ["keyboard", "shortcuts", "hotkeys", "keys", "help"],
              action: run(() => onOpenShortcuts()),
            },
          ]
        : []),
      // Account
      {
        id: "sign-out",
        label: "Sign Out",
        section: "Account",
        icon: LogOut,
        keywords: ["sign out", "logout", "exit"],
        action: run(() => signOut()),
      },
    ];
  }, [navigate, onClose, onOpenShortcuts, setTheme, signOut]);

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q))
    );
  }, [commands, query]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const group = map.get(cmd.section) || [];
      group.push(cmd);
      map.set(cmd.section, group);
    }
    return map;
  }, [filtered]);

  // Reset on open/query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector("[data-selected='true']");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    },
    [filtered, selectedIndex]
  );

  // Determine active state hints
  const getHint = (cmd: Command) => {
    if (cmd.id === "nav-timer" && location.pathname === "/timer") return "Current";
    if (cmd.id === "nav-review" && location.pathname === "/review") return "Current";
    if (cmd.id === "nav-settings" && location.pathname === "/settings") return "Current";
    if (cmd.id === "theme-light" && theme === "light") return "Active";
    if (cmd.id === "theme-dark" && theme === "dark") return "Active";
    if (cmd.id === "theme-system" && theme === "system") return "Active";
    return null;
  };

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] px-4"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={modalTransition}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="relative w-full max-w-lg rounded-xl bg-bg border border-border shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -5 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
                aria-label="Search commands"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
                ESC
              </kbd>
            </div>

            {/* Command list */}
            <div ref={listRef} className="max-h-72 overflow-y-auto py-2" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-text-tertiary text-center">
                  No commands found
                </p>
              ) : (
                Array.from(grouped.entries()).map(([section, cmds]) => (
                  <div key={section}>
                    <p className="px-4 py-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      {section}
                    </p>
                    {cmds.map((cmd) => {
                      flatIndex++;
                      const isSelected = flatIndex === selectedIndex;
                      const hint = getHint(cmd);
                      const Icon = cmd.icon;
                      const idx = flatIndex; // capture for click handler

                      return (
                        <button
                          key={cmd.id}
                          role="option"
                          aria-selected={isSelected}
                          data-selected={isSelected}
                          onClick={() => cmd.action()}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors ${
                            isSelected
                              ? "bg-accent-muted text-accent"
                              : "text-text-secondary hover:bg-surface"
                          }`}
                        >
                          <Icon size={15} strokeWidth={1.75} className="shrink-0" />
                          <span className="flex-1 text-left truncate">{cmd.label}</span>
                          {hint && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              isSelected
                                ? "bg-accent/10 text-accent"
                                : "bg-surface-raised text-text-tertiary"
                            }`}>
                              {hint}
                            </span>
                          )}
                          {shortcutHints[cmd.id] && (
                            <span className="hidden sm:inline-flex items-center gap-0.5">
                              {shortcutHints[cmd.id].map((k, i) => (
                                <kbd
                                  key={i}
                                  className={`inline-flex items-center justify-center min-w-[20px] rounded border px-1 py-0.5 text-[10px] font-mono ${
                                    isSelected
                                      ? "border-accent/20 text-accent"
                                      : "border-border-subtle text-text-tertiary"
                                  }`}
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-text-tertiary">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 font-mono">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border-subtle bg-surface-raised px-1 py-0.5 font-mono">esc</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
