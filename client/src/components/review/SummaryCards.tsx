import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, Hash, TrendingUp, CheckCircle2 } from "lucide-react";
import { formatMinutes } from "../../lib/dates";
import { cardGridVariants, cardGridItemVariants } from "../../lib/motion";
import type { Summary, Session } from "../../types/models";

const SummaryCards = memo(function SummaryCards({ summary, sessions }: { summary: Summary; sessions: Session[] }) {
  const { completionRate, avgMinutes } = useMemo(() => {
    const completedCount = sessions.filter((s) => s.status === "completed_yes").length;
    return {
      completionRate: sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0,
      avgMinutes: summary.session_count > 0 ? Math.round(summary.total_minutes / summary.session_count) : 0,
    };
  }, [sessions, summary.session_count, summary.total_minutes]);

  const cards = [
    { label: "Focus Time", value: formatMinutes(summary.total_minutes), icon: Clock },
    { label: "Sessions", value: String(summary.session_count), icon: Hash },
    { label: "Avg Session", value: avgMinutes > 0 ? `${avgMinutes}m` : "—", icon: TrendingUp },
    { label: "Completion", value: sessions.length > 0 ? `${completionRate}%` : "—", icon: CheckCircle2 },
  ];

  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      variants={cardGridVariants}
      initial="initial"
      animate="animate"
    >
      {cards.map(({ label, value, icon: Icon }) => (
        <motion.div
          key={label}
          variants={cardGridItemVariants}
          className="rounded-lg border border-border bg-bg p-4"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Icon size={13} strokeWidth={1.75} className="text-text-tertiary" />
            <p className="text-xs text-text-tertiary uppercase tracking-wider">{label}</p>
          </div>
          <p className="text-2xl font-bold text-text-primary tabular-nums font-serif">{value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
});

export default SummaryCards;
