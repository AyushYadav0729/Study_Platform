import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Subject from "./pages/Subject";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSubjects } from "./hooks/useSubjects";
import { authService } from "./services/authService";

function App() {
  const {
  subjects,
  loading,
  addSubject,
  refreshSubjects,
  removeSubject,
  clearSubjects,
  } = useSubjects();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg">
        <Routes>
          <Route
            path="/"
            element={
              <Navigate
                to={authService.isAuthenticated() ? "/dashboard" : "/login"}
                replace
              />
            }
          />
          <Route
            path="/login"
            element={<Login onLogin={refreshSubjects} />}
          />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home
                  subjects={subjects}
                  subjectsLoading={loading}
                  onAddSubject={addSubject}
                  onRefreshSubjects={refreshSubjects}
                  onClearSubjects={clearSubjects}
                  onRemoveSubject={removeSubject}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subject/:id"
            element={
              <ProtectedRoute>
                 <Subject subjects={subjects} onRemoveSubject={removeSubject} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
