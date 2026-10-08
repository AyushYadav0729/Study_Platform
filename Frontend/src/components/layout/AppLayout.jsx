import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

import Sidebar from "../Sidebar";
import { authService } from "../../services/authService";

function AppLayout({ subjects, onAddSubject, onClearSubjects }) {
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const response = await authService.getProfile();

        if (mounted) {
          setUser(response.data);
          setProfileError("");
        }
      } catch {
        if (mounted) {
          setProfileError(
            "We couldn't load your profile. Try refreshing the page."
          );
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    onClearSubjects();
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="app-shell flex min-h-screen bg-bg">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] shrink-0 transform flex-col border-r border-border bg-bg-alt transition-transform duration-200 ease-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          subjects={subjects}
          onAddSubject={onAddSubject}
          user={user}
          onLogout={handleLogout}
          onNavigate={() => setMobileOpen(false)}
          profileError={profileError}
        />
      </aside>

      {/* Main application area */}
      <main className="min-w-0 flex-1 overflow-hidden">
        <div className="flex h-screen min-h-0 flex-col">
          {/* Mobile header */}
          <header className="flex h-14 shrink-0 items-center border-b border-border bg-bg/95 px-4 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              <Menu className="h-5 w-5" />
            </button>

            <span
              className="ml-3 text-[17px] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Study-Stop
            </span>
          </header>

          {/* Page content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1280px] px-8 py-8 lg:px-10 lg:py-10 xl:px-12">
              <Outlet
                context={{
                  user,
                  profileError,
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;