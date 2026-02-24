import { useEffect, useRef } from "react";
import { useSpring, useTransform, motion, type MotionValue } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  /** Format function applied to the animated value (default: Math.round) */
  format?: (n: number) => string;
  className?: string;
}

/**
 * Animates a number counting up/down when `value` changes.
 * Uses framer-motion spring for smooth interpolation.
 * Includes a visually hidden span for screen reader accessibility.
 */
export default function AnimatedNumber({
  value,
  format,
  className,
}: AnimatedNumberProps) {
  const springValue = useSpring(0, { stiffness: 120, damping: 20 });
  const display = useTransform(springValue, (v) =>
    format ? format(v) : String(Math.round(v)),
  );
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // Skip animation on first render — show value immediately
      springValue.jump(value);
      initialized.current = true;
    } else {
      springValue.set(value);
    }
  }, [value, springValue]);

  const formattedValue = format ? format(value) : String(value);

  return (
    <>
      <motion.span className={className} aria-hidden="true">
        {display as MotionValue<string>}
      </motion.span>
      <span className="sr-only" aria-live="polite">{formattedValue}</span>
    </>
  );
}
