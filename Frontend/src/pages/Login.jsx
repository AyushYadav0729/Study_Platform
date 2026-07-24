import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { validateEmail, validatePassword } from "../utils/validators";
import { authService } from "../services/authService";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (formError) setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((msg) => msg !== "");
    if (hasErrors) return;

    setSubmitting(true);
    try {
      const response = await authService.login(formData.email, formData.password);
      localStorage.setItem("authToken", response.data.access_token);
      navigate("/dashboard");
    } catch (error) {
      if (error.response) {
        setFormError(error.response.data.detail || "That email or password doesn't match our records.");
      } else {
        setFormError("Can't reach the server. Check your connection and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2
        className="text-[1.7rem] text-ink"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Welcome back
      </h2>
      <p className="mt-1.5 text-[14px] text-ink-dim">
        Log in to pick up where you left off.
      </p>

      {formError && (
        <div className="mt-6">
          <Alert variant="error" onDismiss={() => setFormError("")}>
            {formError}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6" noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          icon={Mail}
          placeholder="you@college.edu"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          name="password"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="current-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-dim">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-accent hover:text-accent-strong">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
