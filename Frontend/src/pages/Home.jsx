import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import Sidebar from "../components/Sidebar";
import SubjectCard from "../components/SubjectCard";
import AddSubjectModal from "../components/AddSubjectModal";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import DashboardLayout from "../components/layout/DashboardLayout";
import { authService } from "../services/authService";

function Home({ subjects, subjectsLoading, onAddSubject }) {
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await authService.getProfile();
        setUser(response.data);
      } catch {
        setProfileError("We couldn't load your profile. Try refreshing the page.");
      }
    };
    loadProfile();
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const firstName = user?.name?.split(" ")[0];

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          subjects={subjects}
          onAddSubject={onAddSubject}
          user={user}
          onLogout={handleLogout}
        />
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-[1.9rem] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-dim">
            Pick up a subject, or start a new one for this semester.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New subject
        </Button>
      </div>

      {profileError && (
        <div className="mt-6">
          <Alert variant="error" onDismiss={() => setProfileError("")}>
            {profileError}
          </Alert>
        </div>
      )}

      <div className="mt-8">
        {subjectsLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[148px] animate-pulse rounded-xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="ruled-paper flex flex-col items-center rounded-xl border border-border bg-bg-alt px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft text-teal">
              <Sparkles className="h-5 w-5" />
            </span>
            <h3
              className="mt-4 text-[1.2rem] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              No subjects yet
            </h3>
            <p className="mt-1.5 max-w-xs text-[14px] text-ink-dim">
              Add your first subject to start uploading notes and generating
              summaries and quizzes.
            </p>
            <Button className="mt-5" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add a subject
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        )}
      </div>

      <AddSubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAddSubject}
      />
    </DashboardLayout>
  );
}

export default Home;
