import Sidebar from "../components/Sidebar";

function Home({ subjects, onAddSubject }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar subjects={subjects} onAddSubject={onAddSubject} />
      <div style={{ padding: "30px", color: "white" }}>
        <h1>Welcome 👋</h1>
        <p>Select a subject from the sidebar, or add a new one to get started.</p>
      </div>
    </div>
  );
}

export default Home;