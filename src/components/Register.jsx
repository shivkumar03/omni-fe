import "../styles/Auth.css";

function Register() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AI Voice Assistant</h1>
        <h2>Registration Disabled</h2>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "20px" }}>
          Registration is not available. Please contact the administrator for access.
        </p>
        <a 
          onClick={() => window.location.href = "/login"}
          style={{
            display: "block",
            textAlign: "center",
            color: "#0f3460",
            cursor: "pointer",
            fontWeight: "600",
            textDecoration: "none"
          }}
        >
          ← Back to Login
        </a>
      </div>
    </div>
  );
}

export default Register;
