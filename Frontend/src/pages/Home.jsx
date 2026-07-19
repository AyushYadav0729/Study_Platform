import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { authService } from "../services/authService";
import { useNavigate } from "react-router-dom";

function Home({ subjects, onAddSubject }) {

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {

    const loadProfile = async () => {

      try {

        const response = await authService.getProfile();
        setUser(response.data);

      } catch (error) {

        localStorage.removeItem("authToken");
        navigate("/login");

      }

    };

    loadProfile();

  }, [navigate]);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar subjects={subjects} onAddSubject={onAddSubject} />

      <div style={{ padding: "30px", color: "white" }}>

        <h1>Welcome {user ? user.name : "Loading..."} 👋</h1>

        <p>{user?.email}</p>

        <p>
          Select a subject from the sidebar, or add a new one to get started.
        </p>

        <button
          onClick={() => {
            localStorage.removeItem("authToken");
            navigate("/login");
          }}
        >
          Logout
        </button>

      </div>
    </div>
  );
}

export default Home;