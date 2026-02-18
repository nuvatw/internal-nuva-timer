import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useProfile } from "../contexts/ProfileContext";

const EMOJI_OPTIONS = [
  "😊", "🚀", "🎯", "💡", "🔥", "🌟", "📚", "💪",
  "🧠", "🎨", "🌱", "⚡", "🏆", "🎵", "🐱", "☕",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { refresh } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("🎯");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter a display name");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.patch("/me", {
        display_name: displayName.trim(),
        avatar_emoji: selectedEmoji,
      });
      await api.post("/me/seed");
      await refresh();
      navigate("/timer", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to nuva!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up your profile to get started
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-colors"
          />
        </div>

        {/* Emoji Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose your avatar emoji
          </label>
          <div className="grid grid-cols-8 gap-2" role="radiogroup" aria-label="Avatar emoji">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="radio"
                aria-checked={selectedEmoji === emoji}
                aria-label={`Emoji ${emoji}`}
                onClick={() => setSelectedEmoji(emoji)}
                className={`flex items-center justify-center h-10 w-10 rounded-lg text-xl transition-all ${
                  selectedEmoji === emoji
                    ? "bg-indigo-100 ring-2 ring-indigo-500 scale-110"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Selected: <span className="text-lg">{selectedEmoji}</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save & Continue"}
        </button>
      </form>
    </div>
  );
}
