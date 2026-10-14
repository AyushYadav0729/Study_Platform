import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Subject from "./pages/Subject";
import Unit from "./pages/Unit";
import Landing from "./pages/landing/Landing";

import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import { useSubjects } from "./hooks/useSubjects";

function AppRoutes() {
  const { pathname } = useLocation();
  const isPublicRoute = ["/", "/login", "/register"].includes(pathname);

  // Do not request authenticated subject data while showing public pages.
  const {
    subjects,
    loading,
    addSubject,
    updateSubject,
    removeSubject,
    clearSubjects,
  } = useSubjects({ enabled: !isPublicRoute });

  return (
    <div className="min-h-screen bg-bg">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout
                subjects={subjects}
                onAddSubject={addSubject}
                onClearSubjects={clearSubjects}
              />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <Home
                subjects={subjects}
                subjectsLoading={loading}
                onAddSubject={addSubject}
                onRemoveSubject={removeSubject}
              />
            }
          />
          <Route
            path="/subject/:id"
            element={
              <Subject
                subjects={subjects}
                onRemoveSubject={removeSubject}
                onUpdateSubject={updateSubject}
              />
            }
          />
          <Route path="/subject/:id/unit/:unitId" element={<Unit subjects={subjects} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;