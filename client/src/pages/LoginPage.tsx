import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { ChevronLeft } from "lucide-react";

type Step = "email" | "otp";

const OTP_LENGTH = 8;
const RESEND_COOLDOWN = 60;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const sendOtp = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({ email });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
      setResendTimer(RESEND_COOLDOWN);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const verifyOtp = useCallback(
    async (code: string) => {
      setLoading(true);
      setError("");

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      setLoading(false);
      if (error) {
        setError(error.message);
        setOtp([...EMPTY_OTP]);
        inputRefs.current[0]?.focus();
      }
    },
    [email]
  );

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === OTP_LENGTH - 1 && next.every((d) => d !== "")) {
      verifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = [...EMPTY_OTP];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);

    if (pasted.length === OTP_LENGTH) {
      verifyOtp(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleResend = () => {
    if (resendTimer > 0) return;
    setOtp([...EMPTY_OTP]);
    setError("");
    sendOtp();
  };

  const handleBack = () => {
    setStep("email");
    setOtp([...EMPTY_OTP]);
    setError("");
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <motion.div
        className="w-full max-w-sm space-y-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">nuva</h1>
          <p className="mt-1 text-lg text-text-tertiary">Focus Timer</p>
        </div>

        <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-border bg-bg px-4 py-3 text-sm font-medium text-text-secondary shadow-sm hover:bg-surface transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-bg px-4 text-text-tertiary">or</span>
              </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-secondary mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-border px-4 py-3 text-sm focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-text-inverted hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send Verification Code"}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Back button */}
            <div>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                <ChevronLeft size={16} strokeWidth={2} />
                Back
              </button>
            </div>

            {/* OTP verification */}
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Enter the 8-digit code sent to
                </p>
                <p className="text-sm font-medium text-text-primary mt-1">
                  {email}
                </p>
              </div>

              <div
                className="flex justify-center gap-2"
                onPaste={handleOtpPaste}
              >
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={loading}
                    className="h-12 w-9 rounded-lg border border-border text-center text-lg font-semibold text-text-primary focus:border-accent focus:ring-2 focus:ring-accent-subtle outline-none transition-colors disabled:opacity-50"
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>

              {loading && (
                <p className="text-sm text-text-tertiary text-center">
                  Verifying...
                </p>
              )}

              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-text-tertiary">
                    Resend code in {resendTimer}s
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {error && (
          <motion.p
            className="text-sm text-destructive text-center"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
