import { useEffect, useRef } from "react";

interface AlarmOverlayProps {
  departmentName: string;
  projectCode: string | null;
  projectName: string;
  plannedTitle: string;
  onStop: () => void;
}

export default function AlarmOverlay({
  departmentName,
  projectCode,
  projectName,
  plannedTitle,
  onStop,
}: AlarmOverlayProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the stop button
  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center alarm-bg"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alarm-title"
      aria-live="assertive"
    >
      <div className="text-center space-y-6 p-8">
        <p className="text-5xl" aria-hidden="true">
          &#9200;
        </p>
        <h2
          id="alarm-title"
          className="text-3xl font-bold text-white"
        >
          Time&apos;s Up!
        </h2>
        <div>
          <p className="text-white/80 text-sm">
            {departmentName} &rsaquo; {projectCode ?? projectName}
          </p>
          <p className="text-white/90 text-sm mt-1 italic">
            &ldquo;{plannedTitle}&rdquo;
          </p>
        </div>
        <button
          ref={buttonRef}
          onClick={onStop}
          className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-indigo-700 shadow-lg hover:bg-gray-100 focus:ring-4 focus:ring-white/50 outline-none transition-colors"
        >
          Stop Alarm &#10003;
        </button>
      </div>

      <style>{`
        .alarm-bg {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          animation: alarm-pulse 1s ease-in-out infinite;
        }
        @keyframes alarm-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @media (prefers-reduced-motion: reduce) {
          .alarm-bg { animation: none; }
        }
      `}</style>
    </div>
  );
}
