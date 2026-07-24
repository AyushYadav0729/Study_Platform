import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { User, Mail, Lock } from "lucide-react";
import AuthLayout from "../components/layout/AuthLayout";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../utils/validators";
import { authService } from "../services/authService";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
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
      name: validateName(formData.name),
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
      confirmPassword: validateConfirmPassword(formData.password, formData.confirmPassword),
    };
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((msg) => msg !== "");
    if (hasErrors) return;

    setSubmitting(true);
    try {
      await authService.signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      if (error.response) {
        setFormError(error.response.data.detail || "We couldn't create your account.");
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
        Create your account
      </h2>
      <p className="mt-1.5 text-[14px] text-ink-dim">
        Set up Study-Stop for this semester in under a minute.
      </p>

      {formError && (
        <div className="mt-6">
          <Alert variant="error" onDismiss={() => setFormError("")}>
            {formError}
          </Alert>
        </div>
      )}
      {success && (
        <div className="mt-6">
          <Alert variant="success">Account created — taking you to login…</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6" noValidate>
        <Input
          label="Full name"
          name="name"
          icon={User}
          placeholder="Jordan Rivera"
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
        />
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
          placeholder="At least 6 characters"
          autoComplete="new-password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
        />
        <Input
          label="Confirm password"
          type="password"
          name="confirmPassword"
          icon={Lock}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />
        <Button type="submit" fullWidth loading={submitting} className="mt-2">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-ink-dim">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-accent hover:text-accent-strong">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
