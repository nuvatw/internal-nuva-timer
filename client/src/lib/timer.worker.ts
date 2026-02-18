let intervalId: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent<{ command: "start" | "stop" }>) => {
  if (e.data.command === "start") {
    if (intervalId !== null) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage({ type: "tick" });
    }, 1000);
  } else if (e.data.command === "stop") {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
