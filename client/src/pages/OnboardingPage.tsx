import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";
import { api } from "../lib/api";
import { useProfile } from "../contexts/ProfileContext";
import { AVATAR_ICONS, DEFAULT_AVATAR_ICON } from "../lib/avatar-icons";
import { tapScale } from "../lib/motion";

// ─── Steps ────────────────────────────────

type Step = 0 | 1 | 2;

const STEPS = [
  { label: "Welcome", description: "Let's get to know you" },
  { label: "Avatar", description: "Pick an icon that represents you" },
  { label: "Ready", description: "You're all set!" },
];

// ─── Progress Dots ────────────────────────

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-accent"
              : i < current
                ? "w-1.5 bg-accent/40"
                : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Step Wrapper ─────────────────────────

function StepContent({
  stepKey,
  children,
  direction,
}: {
  stepKey: number;
  children: React.ReactNode;
  direction: 1 | -1;
}) {
  return (
    <motion.div
      key={stepKey}
      initial={{ opacity: 0, x: direction * 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction * -40 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useProfile();
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [displayName, setDisplayName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(DEFAULT_AVATAR_ICON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, 2) as Step);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0) as Step);
  };

  const handleFinish = async () => {
    if (!displayName.trim()) {
      setError("Please enter a display name");
      setStep(0);
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.patch("/me", {
        display_name: displayName.trim(),
        avatar_emoji: selectedIcon,
      });
      await api.post("/me/seed");
      await refresh();
      navigate("/timer", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const SelectedIcon = AVATAR_ICONS.find((a) => a.name === selectedIcon)!.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent mb-4">
            <Sparkles size={12} strokeWidth={2} />
            Getting started
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome to nuva
          </h1>
          <p className="mt-1.5 text-sm text-text-tertiary">
            {STEPS[step].description}
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-center mb-8">
          <ProgressDots current={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div className="relative overflow-hidden min-h-[280px]">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <StepContent stepKey={0} direction={direction}>
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2"
                    >
                      What should we call you?
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        setError("");
                      }}
                      placeholder="Your name"
                      maxLength={50}
                      autoFocus
                      className="w-full rounded-xl border border-border bg-bg px-4 py-3.5 text-base text-text-primary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
                    />
                  </div>

                  {/* Preview */}
                  {displayName.trim() && (
                    <motion.div
                      className="flex items-center gap-3 rounded-xl bg-surface p-4"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="h-10 w-10 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                        <SelectedIcon size={20} strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{displayName.trim()}</p>
                        <p className="text-xs text-text-tertiary">Your profile preview</p>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.p
                      className="text-sm text-destructive text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    type="button"
                    onClick={goNext}
                    disabled={!displayName.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
                    whileTap={tapScale}
                  >
                    Continue
                    <ArrowRight size={16} strokeWidth={2} />
                  </motion.button>
                </div>
              </StepContent>
            )}

            {step === 1 && (
              <StepContent stepKey={1} direction={direction}>
                <div className="space-y-5">
                  {/* Current selection */}
                  <div className="flex justify-center">
                    <motion.div
                      className="h-20 w-20 rounded-2xl bg-accent-muted flex items-center justify-center text-accent"
                      key={selectedIcon}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <SelectedIcon size={36} strokeWidth={1.5} />
                    </motion.div>
                  </div>

                  {/* Grid */}
                  <div
                    className="grid grid-cols-8 gap-2"
                    role="radiogroup"
                    aria-label="Choose avatar icon"
                  >
                    {AVATAR_ICONS.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={selectedIcon === name}
                        aria-label={name}
                        onClick={() => setSelectedIcon(name)}
                        className={`flex items-center justify-center h-10 w-10 rounded-lg transition-all ${
                          selectedIcon === name
                            ? "bg-accent-muted ring-2 ring-accent text-accent scale-110"
                            : "bg-surface-raised hover:bg-surface text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        <Icon size={20} strokeWidth={1.75} />
                      </button>
                    ))}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
                    >
                      <ArrowLeft size={16} strokeWidth={2} />
                      Back
                    </button>
                    <motion.button
                      type="button"
                      onClick={goNext}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-text-inverted hover:bg-accent-hover transition-colors"
                      whileTap={tapScale}
                    >
                      Continue
                      <ArrowRight size={16} strokeWidth={2} />
                    </motion.button>
                  </div>
                </div>
              </StepContent>
            )}

            {step === 2 && (
              <StepContent stepKey={2} direction={direction}>
                <div className="space-y-6 text-center">
                  {/* Confirmation card */}
                  <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-2xl bg-accent-muted flex items-center justify-center text-accent">
                        <SelectedIcon size={32} strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-text-primary">{displayName.trim()}</p>
                      <p className="text-xs text-text-tertiary mt-0.5">Ready to focus</p>
                    </div>
                    <div className="flex justify-center">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-success-muted px-3 py-1 text-xs font-medium text-success">
                        <Check size={12} strokeWidth={2.5} />
                        Profile ready
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-text-tertiary">
                    We'll set up some starter departments and projects to get you going. You can customize them later in Settings.
                  </p>

                  {error && (
                    <motion.p
                      className="text-sm text-destructive"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={saving}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-secondary hover:bg-surface disabled:opacity-50 transition-colors"
                    >
                      <ArrowLeft size={16} strokeWidth={2} />
                      Back
                    </button>
                    <motion.button
                      type="button"
                      onClick={handleFinish}
                      disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
                      whileTap={tapScale}
                    >
                      {saving ? "Setting up..." : "Start Focusing"}
                      {!saving && <Sparkles size={16} strokeWidth={2} />}
                    </motion.button>
                  </div>
                </div>
              </StepContent>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
