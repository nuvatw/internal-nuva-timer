import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// ─── Types ──────────────────────────────────

interface SfxContextValue {
  playClick: () => void;
  playStart: () => void;
  playComplete: () => void;
  playLevelUp: () => void;
  playAlarm: () => void;
  stopAlarm: () => void;
  toggleMute: () => void;
  isMuted: boolean;
}

const SfxContext = createContext<SfxContextValue | null>(null);

// ─── Audio cache ────────────────────────────

const SOUNDS = {
  click: "/sfx/clicked.wav",
  start: "/sfx/sectionStart.wav",
  complete: "/sfx/sectionComplete.wav",
  levelUp: "/sfx/levelUp.wav",
} as const;

type SoundKey = keyof typeof SOUNDS;

let audioUnlocked = false;

function unlockAudioContext() {
  if (audioUnlocked) return;
  try {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  } catch {
    // Silently fail
  }
}

// ─── Provider ───────────────────────────────

export function SfxProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("nuva-sfx-muted") === "true";
    } catch {
      return false;
    }
  });

  const audioCache = useRef<Map<SoundKey, HTMLAudioElement>>(new Map());
  const preloaded = useRef(false);

  // Preload all audio files after first user interaction
  const preloadAll = useCallback(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    unlockAudioContext();

    for (const [key, src] of Object.entries(SOUNDS)) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audioCache.current.set(key as SoundKey, audio);
    }
  }, []);

  // Register one-time interaction listener to preload
  useEffect(() => {
    document.addEventListener("click", preloadAll, { once: true });
    document.addEventListener("keydown", preloadAll, { once: true });
    return () => {
      document.removeEventListener("click", preloadAll);
      document.removeEventListener("keydown", preloadAll);
    };
  }, [preloadAll]);

  // Pool of reusable Audio elements for click sounds (avoids memory leak)
  const clickPool = useRef<HTMLAudioElement[]>([]);
  const clickPoolIndex = useRef(0);
  const CLICK_POOL_SIZE = 4;

  // Play a sound by key
  const playSound = useCallback(
    (key: SoundKey) => {
      if (muted) return;
      preloadAll();

      if (key === "click") {
        // Use pooled audio elements to prevent memory leaks
        if (clickPool.current.length < CLICK_POOL_SIZE) {
          const audio = new Audio(SOUNDS.click);
          audio.volume = 0.4;
          clickPool.current.push(audio);
        }
        const audio = clickPool.current[clickPoolIndex.current % CLICK_POOL_SIZE];
        clickPoolIndex.current++;
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }

      const cached = audioCache.current.get(key);
      if (cached) {
        cached.currentTime = 0;
        cached.volume = 0.7;
        cached.play().catch(() => {});
      }
    },
    [muted, preloadAll]
  );

  const playClick = useCallback(() => playSound("click"), [playSound]);
  const playStart = useCallback(() => playSound("start"), [playSound]);
  const playComplete = useCallback(() => playSound("complete"), [playSound]);
  const playLevelUp = useCallback(() => playSound("levelUp"), [playSound]);

  // ─── Alarm: loop completion sound until stopped ──
  const alarmRef = useRef<HTMLAudioElement | null>(null);

  const playAlarm = useCallback(() => {
    if (muted) return;
    preloadAll();

    // Stop any existing alarm first
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current = null;
    }

    const alarm = new Audio(SOUNDS.complete);
    alarm.loop = true;
    alarm.volume = 0.8;
    alarm.play().catch(() => {});
    alarmRef.current = alarm;
  }, [muted, preloadAll]);

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
      alarmRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("nuva-sfx-muted", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ─── Delegated click sound ────────────────
  // Automatically play click sound on interactive element clicks

  const INTERACTIVE_SELECTOR =
    'button, select, a[href], label:has(input[type="radio"], input[type="checkbox"]), [role="button"], [role="radio"], [role="tab"], [role="menuitem"], [data-sfx]';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (muted) return;
      const target = e.target as HTMLElement;
      if (!target?.closest) return;

      if (target.closest(INTERACTIVE_SELECTOR)) {
        playClick();
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [muted, playClick]);

  // Clean up alarm on unmount
  useEffect(() => {
    return () => {
      if (alarmRef.current) {
        alarmRef.current.pause();
        alarmRef.current = null;
      }
    };
  }, []);

  const value = useMemo<SfxContextValue>(
    () => ({ playClick, playStart, playComplete, playLevelUp, playAlarm, stopAlarm, toggleMute, isMuted: muted }),
    [playClick, playStart, playComplete, playLevelUp, playAlarm, stopAlarm, toggleMute, muted],
  );

  return (
    <SfxContext.Provider value={value}>
      {children}
    </SfxContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────

export function useSfx(): SfxContextValue {
  const ctx = useContext(SfxContext);
  if (!ctx) throw new Error("useSfx must be used within SfxProvider");
  return ctx;
}
