import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Input from "../components/Input";
import Button from "../components/Button";
import { validateEmail, validatePassword } from "../utils/validators";
import { authService } from "../services/authService";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
      e.preventDefault();

      const newErrors = {
        email: validateEmail(formData.email),
        password: validatePassword(formData.password),
      };

      setErrors(newErrors);

      const hasErrors = Object.values(newErrors).some(
        (msg) => msg !== ""
      );

      if (hasErrors) return;

      try {
        const response = await authService.login(
          formData.email,
          formData.password
        );

        localStorage.setItem(
          "authToken",
          response.data.access_token
        );

        navigate("/dashboard");

      } catch (error) {

        if (error.response) {
          alert(error.response.data.detail || "Login failed");
        } else {
          alert("Unable to connect to the server.");
        }

      }
  };
  return (
    <div className="max-w-[350px] mx-auto mt-20 text-white">
      <h2 className="text-2xl font-semibold mb-4">Login</h2>
      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Button type="submit">Login</Button>
      </form>
      <p className="mt-4">
        Don't have an account?{" "}
        <Link to="/register" className="text-indigo-400">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

export default Login;