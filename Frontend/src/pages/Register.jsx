import { Link } from "react-router-dom";

function Register() {
  return (
    <div style={{ maxWidth: "350px", margin: "80px auto", color: "white" }}>
      <h2>Sign Up</h2>
      <form>
        <input type="text" placeholder="Full Name" style={inputStyle} />
        <input type="email" placeholder="Email" style={inputStyle} />
        <input type="password" placeholder="Password" style={inputStyle} />
        <button type="submit" style={buttonStyle}>Sign Up</button>
      </form>
      <p style={{ marginTop: "16px" }}>
        Already have an account? <Link to="/login" style={{ color: "#818cf8" }}>Login</Link>
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

export default Register;