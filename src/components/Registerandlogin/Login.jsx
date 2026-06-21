import { useState } from "react";
import { FiMail, FiLock } from "react-icons/fi";
import { signInUser } from "../../utils/firebasefunction";
import { useNavigate } from "react-router-dom";

function LoginForm() {
  const [inputs, setInputs] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) =>
    setInputs({
      ...inputs,
      [e.target.name]: e.target.value,
    });

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    const res = await signInUser(
      inputs.email,
      inputs.password
    );

    if (res.success) {
      navigate("/");
    } else {
      setError(res.error);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="form-auth">
      <div className="form-group">
        <div className="input-wrapper">
          <FiMail className="input-icon" />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={inputs.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <div className="input-wrapper">
          <FiLock className="input-icon" />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={inputs.password}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="form-button"
        disabled={loading}
      >
        {loading
          ? "Signing In..."
          : "Sign In"}
      </button>
    </form>
  );
}

export default LoginForm;