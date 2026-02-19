import { useEffect, useRef } from "react";

/**
 * Lightweight global keyboard shortcut hook.
 *
 * Supports:
 * - Single keys:     useHotkeys("?", callback)
 * - Modifier combos: useHotkeys("mod+k", callback)   (Cmd on Mac, Ctrl elsewhere)
 * - Key sequences:   useHotkeys("g t", callback)      (press g, then t within 800ms)
 *
 * Automatically ignores shortcuts when the user is focused on an input, textarea,
 * select, or any element with [contenteditable].
 */

type Handler = (e: KeyboardEvent) => void;

interface HotkeyOptions {
  /** Allow the shortcut even when focus is in an input/textarea */
  enableOnFormFields?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

// Shared sequence state across all hook instances
let pendingPrefix: string | null = null;
let prefixTimer: ReturnType<typeof setTimeout> | null = null;

function clearPrefix() {
  pendingPrefix = null;
  if (prefixTimer) {
    clearTimeout(prefixTimer);
    prefixTimer = null;
  }
}

function isFormField(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace("escape", "esc").replace(" ", "space");
}

export function useHotkeys(
  combo: string,
  handler: Handler,
  options: HotkeyOptions = {},
  deps: unknown[] = []
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const parts = combo.toLowerCase().split(" ");
    const isSequence = parts.length === 2 && !parts[0].includes("+");

    const listener = (e: KeyboardEvent) => {
      // Skip form fields unless explicitly enabled
      if (!optsRef.current.enableOnFormFields && isFormField(e.target)) return;

      const key = normalizeKey(e.key);

      // ─── Sequence shortcuts (e.g. "g t") ───
      if (isSequence) {
        const [prefix, suffix] = parts;

        // If we're waiting for a second key
        if (pendingPrefix === prefix && key === suffix) {
          clearPrefix();
          if (optsRef.current.preventDefault) e.preventDefault();
          handlerRef.current(e);
          return;
        }

        // Check if this keystroke starts a new prefix
        if (key === prefix && !e.metaKey && !e.ctrlKey && !e.altKey) {
          // Don't set prefix here — let the shared handler below do it
        }

        return;
      }

      // ─── Modifier combos (e.g. "mod+k") ───
      if (combo.includes("+")) {
        const segments = parts[0].split("+");
        const mainKey = segments[segments.length - 1];
        const needsMod = segments.includes("mod");
        const needsShift = segments.includes("shift");
        const needsAlt = segments.includes("alt");

        const modPressed = e.metaKey || e.ctrlKey;

        if (
          key === mainKey &&
          (!needsMod || modPressed) &&
          (!needsShift || e.shiftKey) &&
          (!needsAlt || e.altKey)
        ) {
          if (optsRef.current.preventDefault) e.preventDefault();
          handlerRef.current(e);
        }
        return;
      }

      // ─── Single key shortcuts (e.g. "?", "space") ───
      if (key === parts[0] && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't fire single-key shortcut if a sequence prefix is pending
        if (pendingPrefix) return;
        if (optsRef.current.preventDefault) e.preventDefault();
        handlerRef.current(e);
      }
    };

    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combo, ...deps]);
}

/**
 * Must be called once at the app root to manage sequence prefixes.
 * Listens for known prefix keys and sets the shared pendingPrefix.
 */
export function useHotkeySequenceManager(prefixes: string[] = ["g"]) {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (isFormField(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = normalizeKey(e.key);

      if (prefixes.includes(key)) {
        clearPrefix();
        pendingPrefix = key;
        prefixTimer = setTimeout(clearPrefix, 800);
      } else if (pendingPrefix) {
        // A non-prefix key was pressed — the sequence handler in useHotkeys
        // will pick it up. Clear after a tick so all listeners can check.
        setTimeout(clearPrefix, 10);
      }
    };

    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [prefixes]);
}
