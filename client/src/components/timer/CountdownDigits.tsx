import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CountdownDigitsProps {
  /** Total remaining seconds */
  seconds: number;
  paused?: boolean;
}

/** Format seconds to [M, M, S, S] digit array. */
function toDigits(totalSeconds: number): [string, string, string, string] {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return [mm[0], mm[1], ss[0], ss[1]];
}

const digitVariants = {
  initial: { y: -12, opacity: 0, filter: "blur(2px)" },
  animate: { y: 0, opacity: 1, filter: "blur(0px)" },
  exit: { y: 12, opacity: 0, filter: "blur(2px)" },
};

const digitTransition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const };

const Digit = memo(function Digit({
  value,
  position,
}: {
  value: string;
  position: number;
}) {
  return (
    <span className="relative inline-block w-[0.62em] overflow-hidden text-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${position}-${value}`}
          variants={digitVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={digitTransition}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

export default memo(function CountdownDigits({
  seconds,
  paused = false,
}: CountdownDigitsProps) {
  const [m1, m2, s1, s2] = toDigits(seconds);

  return (
    <span
      className={`text-7xl font-serif font-bold tabular-nums tracking-tighter transition-colors duration-300 ${
        paused ? "text-warning" : "text-text-primary"
      }`}
    >
      <Digit value={m1} position={0} />
      <Digit value={m2} position={1} />
      {/* Pulsing colon */}
      <motion.span
        className="inline-block w-[0.35em] text-center relative -top-[0.05em]"
        animate={
          paused
            ? { opacity: 1 }
            : { opacity: [1, 0.25, 1] }
        }
        transition={
          paused
            ? { duration: 0.3 }
            : { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        :
      </motion.span>
      <Digit value={s1} position={2} />
      <Digit value={s2} position={3} />
    </span>
  );
});
