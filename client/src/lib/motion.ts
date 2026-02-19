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
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1],
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

// ─── List Stagger ────────────────────────────

export const listVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.04 },
  },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
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
