import { useParams } from "react-router-dom";
import { useState } from "react";

const UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function Subject({ subjects }) {
  const { id } = useParams();
  const subject = subjects.find((s) => s.id === id);

  const [selectedUnit, setSelectedUnit] = useState(UNITS[0]);
  const [notes, setNotes] = useState([]);
  const [file, setFile] = useState(null);

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

    setNotes((prev) => [
    ...prev,
    {
        unit: selectedUnit,
        fileName: file.name,
    },
    ]);
    setFile(null);
    e.target.reset();
  };

  if (!subject) {
    return <div style={{ padding: "30px", color: "white" }}>Subject not found.</div>;
  }

  return (
    <div style={{ padding: "30px", color: "white" }}>
      <h1>{subject.name}</h1>

      <form onSubmit={handleUpload} style={{ margin: "20px 0" }}>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          style={selectStyle}
        >
          {UNITS.map((unit) => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ display: "block", margin: "10px 0" }}
        />

        <button type="submit" style={buttonStyle}>Upload Note</button>
      </form>

      <h3>Uploaded Notes</h3>
      {UNITS.map((unit) => (
        <div key={unit} style={{ marginBottom: "16px" }}>
          <strong>{unit}</strong>
          <ul>
            {notes
              .filter((n) => n.unit === unit)
              .map((n, index) => (
                <li key={index}>{n.fileName}</li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const selectStyle = {
  padding: "8px",
  backgroundColor: "#1e1e1e",
  border: "1px solid #333",
  color: "white",
  borderRadius: "6px",
};

const buttonStyle = {
  padding: "8px 16px",
  backgroundColor: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Subject;