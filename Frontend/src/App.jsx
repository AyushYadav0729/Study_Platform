import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Subject from "./pages/Subject";

function App() {
  const [subjects, setSubjects] = useState([]);

  const handleAddSubject = (name) => {
    const newSubject = { id: Date.now().toString(), name };
    setSubjects([...subjects, newSubject]);
  };

  return (
    <BrowserRouter>
      <div style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={<Home subjects={subjects} onAddSubject={handleAddSubject} />}
          />
          <Route
            path="/subject/:id"
            element={<Subject subjects={subjects} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;