import { motion } from "framer-motion";

interface CircularProgressProps {
  /** 0 to 1 — how much time has elapsed (0 = full ring, 1 = empty ring) */
  progress: number;
  /** Diameter in pixels */
  size?: number;
  /** Ring thickness in pixels */
  strokeWidth?: number;
  /** Whether paused (amber) or running (accent) */
  paused?: boolean;
  /** Accessible label for screen readers */
  label?: string;
  children?: React.ReactNode;
}

export default function CircularProgress({
  progress,
  size = 280,
  strokeWidth = 8,
  paused = false,
  label,
  children,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  // offset increases as progress grows → ring depletes clockwise from 12 o'clock
  const offset = circumference * clamped;

  const gradientId = "progress-gradient";
  const glowId = "progress-glow-filter";

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round((1 - clamped) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        <defs>
          {/* Gradient for the progress stroke */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor={paused ? "var(--color-warning)" : "var(--color-accent)"}
            />
            <stop
              offset="100%"
              stopColor={paused ? "var(--color-warning-light, #fbbf24)" : "var(--color-accent-light, #fbbf24)"}
            />
          </linearGradient>
          {/* Blur filter for glow */}
          <filter id={glowId}>
            <feGaussianBlur stdDeviation="4" result="blur" />
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-raised)"
          strokeWidth={strokeWidth}
        />

        {/* Glow layer (behind progress arc) */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={paused ? "var(--color-warning)" : "var(--color-accent)"}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter={`url(#${glowId})`}
          animate={
            paused
              ? { opacity: 0.15 }
              : { opacity: [0.15, 0.35, 0.15] }
          }
          transition={
            paused
              ? { duration: 0.4 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>

      {/* Content inside the ring */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>
    </motion.div>
  );
}
