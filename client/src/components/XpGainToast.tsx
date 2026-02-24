import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useProgress } from "../contexts/ProgressContext";

export default function XpGainToast() {
  const { lastXpGain, clearXpGain } = useProgress();

  // Auto-dismiss after 2.5s
  useEffect(() => {
    if (lastXpGain === null) return;
    const timer = setTimeout(clearXpGain, 2500);
    return () => clearTimeout(timer);
  }, [lastXpGain, clearXpGain]);

  return (
    <AnimatePresence>
      {lastXpGain !== null && lastXpGain > 0 && (
        <motion.div
          className="fixed top-16 right-4 sm:right-6 z-40 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-text-inverted shadow-lg"
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <Sparkles size={14} strokeWidth={2} />
          +{lastXpGain} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
