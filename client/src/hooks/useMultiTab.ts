import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL_NAME = "nuva_timer_tab";

interface TabMessage {
  type: "heartbeat" | "timer_active" | "timer_stopped";
  tabId: string;
}

const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Detects if another tab has an active timer running.
 * Returns { otherTabActive } — true if a different tab has a timer.
 */
export function useMultiTab(isTimerActive: boolean) {
  const [otherTabActive, setOtherTabActive] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const otherTabTimerRef = useRef(false);
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
        otherTabTimerRef.current = true;
        setOtherTabActive(true);

        // Reset timeout — other tab is still active
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          otherTabTimerRef.current = false;
          setOtherTabActive(false);
        }, 5000); // If no heartbeat in 5s, assume other tab closed
      }

      if (msg.type === "timer_stopped") {
        otherTabTimerRef.current = false;
        setOtherTabActive(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  return { otherTabActive };
}
