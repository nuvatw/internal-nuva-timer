import { NavLink, Outlet } from "react-router-dom";
import { useProfile } from "../contexts/ProfileContext";

const navItems = [
  { to: "/timer", label: "Timer", icon: "\u23F1" },
  { to: "/review", label: "Review", icon: "\uD83D\uDCCA" },
  { to: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

export default function AppLayout() {
  const { profile } = useProfile();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">nuva Timer</h1>
        {profile && (
          <span className="text-sm text-gray-600 flex items-center gap-1.5" aria-label={`Signed in as ${profile.display_name}`}>
            <span className="text-base" aria-hidden="true">{profile.avatar_emoji}</span>
            {profile.display_name}
          </span>
        )}
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 w-full max-w-2xl mx-auto lg:max-w-3xl" role="main">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-gray-200 px-4 py-2" aria-label="Main navigation">
        <div className="max-w-2xl mx-auto flex justify-around">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors rounded-lg ${
                  isActive
                    ? "text-indigo-600"
                    : "text-gray-400 hover:text-gray-600"
                }`
              }
            >
              <span className="text-lg" aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
