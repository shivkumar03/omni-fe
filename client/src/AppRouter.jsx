import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import App from "./App";
import { useAuth } from "./context/AuthContext";

// Protected Route Component
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#020617", color: "white" }}>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <App />
          </ProtectedRoute>
        }
      />
      {/* Redirect root to login or app depending on auth */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
}

export default AppRouter;
