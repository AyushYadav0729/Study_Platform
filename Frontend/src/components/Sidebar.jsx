import { Link } from "react-router-dom";
import { useState } from "react";

function Sidebar({ subjects, onAddSubject }) {
  const [name, setName] = useState("");

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSubject(name);
    setName("");
  };

  return (
    <div style={sidebarStyle}>
      <h3>My Subjects</h3>

      <form onSubmit={handleAdd} style={{ marginTop: "16px" }}>
        <input
          type="text"
          placeholder="New subject name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle}>+ Add Subject</button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, marginTop: "20px" }}>
        {subjects.map((subject) => (
          <li key={subject.id} style={{ marginBottom: "10px" }}>
            <Link to={`/subject/${subject.id}`} style={linkStyle}>
              {subject.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const sidebarStyle = {
  width: "240px",
  minHeight: "100vh",
  backgroundColor: "#1a1a1a",
  padding: "20px",
  color: "white",
  borderRight: "1px solid #2a2a2a",
  boxSizing: "border-box",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "8px",
  marginBottom: "10px",
  backgroundColor: "#1e1e1e",
  border: "1px solid #333",
  color: "white",
  borderRadius: "6px",
  boxSizing: "border-box",
};

const buttonStyle = {
  width: "100%",
  padding: "8px",
  backgroundColor: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const linkStyle = {
  color: "#e0e0e0",
  textDecoration: "none",
  fontSize: "15px",
};

export default Sidebar;