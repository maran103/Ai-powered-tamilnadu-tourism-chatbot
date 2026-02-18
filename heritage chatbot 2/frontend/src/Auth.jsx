import { useState } from "react";
import "./Auth.css";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      // Save user info and login
      localStorage.setItem("heritage_user_id", data.user_id);
      localStorage.setItem("heritage_user_name", data.name);
      localStorage.setItem("heritage_user_email", data.email || formData.email);

      onLogin({
        userId: data.user_id,
        name: data.name,
        email: data.email || formData.email
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Tamil Nadu Heritage AI</h1>
          <p>Discover the rich heritage of Tamil Nadu</p>
        </div>

        <div className="auth-tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            Login
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            {!isLogin && (
              <small>Password must be at least 6 characters</small>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? "Please wait..." : (isLogin ? "Login" : "Sign Up")}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Auth;
