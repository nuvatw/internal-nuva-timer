import { useCallback, useRef } from "react";

let audioContextUnlocked = false;
let audioContext: AudioContext | null = null;

/**
 * Unlock the AudioContext with a user gesture.
 * Call this from a click handler (e.g. "Start Timer").
 */
function unlockAudio() {
  if (audioContextUnlocked) return;
  try {
    audioContext = new AudioContext();
    // Play a silent buffer to unlock
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    audioContextUnlocked = true;
  } catch {
    // Silently fail — visual alarm is primary
  }
}

export function useAlarm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  /**
   * Call on "Start Timer" click to unlock audio + preload alarm sound.
   */
  const prepare = useCallback(() => {
    unlockAudio();

    // Pre-load the alarm audio element
    if (!audioRef.current) {
      const audio = new Audio("/alarm.mp3");
      audio.loop = true;
      audio.preload = "auto";
      audioRef.current = audio;
    }
  }, []);

  /**
   * Start playing the alarm sound + vibrate.
   */
  const play = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;

    // Resume AudioContext if suspended
    if (audioContext?.state === "suspended") {
      audioContext.resume();
    }

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Audio play blocked — visual alarm is still shown
      });
    }

    // Vibrate if supported (Android only)
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }, []);

  /**
   * Stop the alarm sound.
   */
  const stop = useCallback(() => {
    playingRef.current = false;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (navigator.vibrate) {
      navigator.vibrate(0); // cancel vibration
    }
  }, []);

  return { prepare, play, stop };
}
