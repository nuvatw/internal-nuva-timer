import type { Variants, Transition } from "framer-motion";

// ─── Shared Transitions ──────────────────────

export const spring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

export const springGentle: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

export const easeOut: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

// ─── Page Transitions ────────────────────────

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

export const pageTransition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1] as const,
  exit: { duration: 0.15 },
};

// ─── Modal / Overlay ─────────────────────────

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 5 },
};

export const modalTransition: Transition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

// ─── Completion Modal (celebratory entrance) ─

/** Alias for overlayVariants -- kept for semantic clarity in completion flow. */
export const completionOverlayVariants = overlayVariants;

export const completionModalVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 40 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 },
};

export const completionModalTransition: Transition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1],
};

// ─── List Stagger ────────────────────────────

export const listVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

// ─── Card Grid Stagger ──────────────────────

export const cardGridVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const cardGridItemVariants: Variants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Section Cascade ────────────────────────

export const sectionStaggerVariants: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06 },
  },
};

export const sectionItemVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Chart Enter ────────────────────────────

export const chartEnterVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─── Fade In ─────────────────────────────────

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Scale Tap ───────────────────────────────

export const tapScale = { scale: 0.97 };
export const tapScaleSmall = { scale: 0.95 };

// ─── Timer State Transitions ────────────────

/** Idle form fields stagger-fade out (top-down). */
export const idleExitVariants: Variants = {
  animate: {},
  exit: { transition: { staggerChildren: 0.04, staggerDirection: 1 } },
};

export const idleExitChildVariants: Variants = {
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: {
    opacity: 0,
    y: 10,
    filter: "blur(2px)",
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Running state orchestrated entrance. */
export const runningEnterVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Completion modal backdrop + modal with spring. */
export const completionBackdropVariants: Variants = {
  initial: { opacity: 0, backdropFilter: "blur(0px)" },
  animate: { opacity: 1, backdropFilter: "blur(8px)" },
  exit: { opacity: 0, backdropFilter: "blur(0px)" },
};

export const completionSpringTransition: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 22,
};
