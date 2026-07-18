import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: friend will replace this with real API call (authService.js)
    navigate("/dashboard");
  };

  return (
    <div style={{ maxWidth: "350px", margin: "80px auto", color: "white" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" style={inputStyle} />
        <input type="password" placeholder="Password" style={inputStyle} />
        <button type="submit" style={buttonStyle}>Login</button>
      </form>
      <p style={{ marginTop: "16px" }}>
        Don't have an account? <Link to="/register" style={{ color: "#818cf8" }}>Sign Up</Link>
      </p>
    </div>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginBottom: "12px",
  backgroundColor: "#1e1e1e",
  border: "1px solid #333",
  color: "white",
  borderRadius: "6px",
};

const buttonStyle = {
  width: "100%",
  padding: "10px",
  backgroundColor: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default Login;