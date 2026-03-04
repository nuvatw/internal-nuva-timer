import { memo, useRef } from "react";

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

const Digit = memo(function Digit({
  value,
  position,
}: {
  value: string;
  position: number;
}) {
  const prevRef = useRef(value);
  const changed = prevRef.current !== value;
  prevRef.current = value;

  return (
    <span className="relative inline-block w-[0.62em] overflow-hidden text-center">
      <span
        key={`${position}-${value}`}
        className="inline-block"
        style={changed ? { animation: "digit-enter 250ms cubic-bezier(0.16,1,0.3,1) both" } : undefined}
      >
        {value}
      </span>
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
      <span
        className="inline-block w-[0.35em] text-center relative -top-[0.05em]"
        style={
          paused
            ? { opacity: 1 }
            : { animation: "colon-pulse 1.2s ease-in-out infinite" }
        }
      >
        :
      </span>
      <Digit value={s1} position={2} />
      <Digit value={s2} position={3} />
    </span>
  );
});
