import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL_NAME = "nuva_timer_tab";

interface TabMessage {
  type: "timer_active" | "timer_stopped" | "timer_state_changed";
  tabId: string;
}

const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Detects if another tab has an active timer running.
 * Returns { otherTabActive, notifyStateChanged } — otherTabActive is true
 * if a different tab has a timer; notifyStateChanged() pings other tabs
 * to re-read localStorage immediately.
 */
export function useMultiTab(isTimerActive: boolean) {
  const [otherTabActive, setOtherTabActive] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast our status
  const broadcast = useCallback(
    (type: TabMessage["type"]) => {
      try {
        channelRef.current?.postMessage({ type, tabId } satisfies TabMessage);
      } catch {
        // BroadcastChannel may not be available
      }
    },
    []
  );

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<TabMessage>) => {
      const msg = event.data;
      if (msg.tabId === tabId) return; // Ignore own messages

      if (msg.type === "timer_active") {
        setOtherTabActive(true);

        // Reset timeout — other tab is still active
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setOtherTabActive(false);
        }, 5000); // If no heartbeat in 5s, assume other tab closed
      }

      if (msg.type === "timer_stopped") {
        setOtherTabActive(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }

      // When another tab says state changed, trigger a storage re-read.
      // The storage event only fires in *other* tabs when localStorage is
      // written, but on some browsers (Safari) there can be delays.
      // This message nudges other tabs to re-read immediately.
      if (msg.type === "timer_state_changed") {
        window.dispatchEvent(new StorageEvent("storage", { key: "nuva_timer_state" }));
      }
    };

    return () => {
      channel.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Broadcast timer status periodically
  useEffect(() => {
    if (!isTimerActive) {
      broadcast("timer_stopped");
      return;
    }

    broadcast("timer_active");
    const interval = setInterval(() => broadcast("timer_active"), 3000);
    return () => clearInterval(interval);
  }, [isTimerActive, broadcast]);

  /** Call after any timer state mutation to nudge other tabs. */
  const notifyStateChanged = useCallback(() => {
    broadcast("timer_state_changed");
  }, [broadcast]);

  return { otherTabActive, notifyStateChanged };
}
