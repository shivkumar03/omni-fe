import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Auth.css";
import axios from "axios";

const FACEAPI_CDN = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODEL_URL  = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

function Login() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [error, setError]         = useState("");
  const [faceMode, setFaceMode]   = useState(null); // null | 'register' | 'login'
  const [faceMsg, setFaceMsg]     = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [scanning, setScanning]   = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminError, setAdminError] = useState("");

  // ── Voice Registration states ──────────────────────────────────
  const [voiceMode, setVoiceMode]   = useState(null); // null | 'register' | 'login'
  const [voiceMsg, setVoiceMsg]     = useState("");
  const [voiceListening, setVoiceListening] = useState(false);
  const voiceRecRef = useRef(null);

  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const navigate   = useNavigate();
  const { login }  = useAuth();

  // ── load face-api.js script once ──────────────────────────────
  useEffect(() => {
    if (window.faceapi) { setModelsReady(false); return; }
    const script = document.createElement("script");
    script.src = FACEAPI_CDN;
    script.onload = () => setModelsReady(false); // script loaded, models not yet
    document.head.appendChild(script);
  }, []);

  // ── load models when face mode opens (login only, register needs admin verify first) ──
  useEffect(() => {
    if (!faceMode) return;
    if (faceMode === "login") loadModels();
    // register: wait for admin verify
  }, [faceMode]);

  const loadModels = async () => {
    setFaceMsg("Loading face models...");
    try {
      const fa = window.faceapi;
      await Promise.all([
        fa.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        fa.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsReady(true);
      setFaceMsg("Models ready. Starting camera...");
      startCamera();
    } catch (e) {
      setFaceMsg("Failed to load models: " + e.message);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setFaceMsg(faceMode === "register" ? "Position your face and click Register Face" : "Position your face and click Scan Face");
    } catch {
      setFaceMsg("Camera access denied. Allow camera in browser.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setFaceMode(null);
    setFaceMsg("");
    setModelsReady(false);
    setScanning(false);
    setAdminVerified(false);
    setAdminPass("");
    setAdminError("");
  };

  // ── capture descriptor from current video frame ───────────────
  const captureDescriptor = async () => {
    const fa = window.faceapi;
    const options = new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const result = await fa.detectSingleFace(videoRef.current, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return result ? result.descriptor : null;
  };

  // ── ADMIN VERIFY before register ─────────────────────────────
  const handleAdminVerify = () => {
    if (adminPass === "shiv@omni") {
      setAdminVerified(true);
      setAdminError("");
      loadModels();
    } else {
      setAdminError("Wrong admin password. Only admin can register a face.");
    }
  };

  // ── REGISTER: save face to localStorage ───────────────────────
  const handleRegisterFace = async () => {
    setScanning(true);
    setFaceMsg("Scanning your face...");
    try {
      const descriptor = await captureDescriptor();
      if (!descriptor) {
        setFaceMsg("No face detected. Look directly at the camera.");
        setScanning(false);
        return;
      }
      localStorage.setItem("omni_face", JSON.stringify(Array.from(descriptor)));
      setFaceMsg("✅ Face registered successfully! You can now use Face Login.");
      setScanning(false);
      setTimeout(stopCamera, 2000);
    } catch (e) {
      setFaceMsg("Error: " + e.message);
      setScanning(false);
    }
  };

  // ── LOGIN: compare face with stored descriptor ─────────────────
  const handleFaceLogin = async () => {
    const stored = localStorage.getItem("omni_face");
    if (!stored) {
      setFaceMsg("No face registered. Register your face first.");
      return;
    }
    setScanning(true);
    setFaceMsg("Scanning your face...");
    try {
      const descriptor = await captureDescriptor();
      if (!descriptor) {
        setFaceMsg("No face detected. Look directly at the camera.");
        setScanning(false);
        return;
      }
      const saved    = new Float32Array(JSON.parse(stored));
      const distance = window.faceapi.euclideanDistance(descriptor, saved);

      if (distance < 0.5) {
        setFaceMsg("✅ Face matched! Logging in...");
        stopCamera();
        login("shivprajapati2060@gmail.com", "");
        sendLoginNotification(); // fire-and-forget
        navigate("/app");
      } else {
        setFaceMsg(`❌ Face not recognized (distance: ${distance.toFixed(2)}). Try again.`);
        setScanning(false);
      }
    } catch (e) {
      setFaceMsg("Error: " + e.message);
      setScanning(false);
    }
  };

  // ── get best GPS fix within 15s, target ≤200m accuracy ────────
  const getLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ error: "Geolocation not supported" });
        return;
      }

      let best = null;
      let watchId = null;

      const done = () => {
        navigator.geolocation.clearWatch(watchId);
        if (best) {
          resolve({ latitude: best.latitude, longitude: best.longitude, accuracy: best.accuracy });
        } else {
          resolve({ error: "Could not get location" });
        }
      };

      // Stop after 15 seconds with best result so far
      const timer = setTimeout(done, 15000);

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (!best || accuracy < best.accuracy) {
            best = { latitude, longitude, accuracy };
          }
          // Resolve immediately if accuracy is good enough
          if (accuracy <= 200) {
            clearTimeout(timer);
            done();
          }
        },
        (err) => {
          clearTimeout(timer);
          navigator.geolocation.clearWatch(watchId);
          resolve(best
            ? { latitude: best.latitude, longitude: best.longitude, accuracy: best.accuracy }
            : { error: err.message }
          );
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  // ── send login notification with location ─────────────────────
  const sendLoginNotification = async () => {
    const location = await getLocation();
    try {
      await axios.post("http://127.0.0.1:5000/login_notify", { location });
    } catch (err) {
      console.error("Login notify failed:", err?.response?.data || err.message);
    }
  };

  // ── password login ─────────────────────────────────────────────
  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (email === "shivprajapati2060@gmail.com" && password === "shiv@omni") {
      login(email, password);
      sendLoginNotification(); // fire-and-forget
      navigate("/app");
    } else {
      setError("Invalid email or password");
    }
  };

  const hasFaceStored = !!localStorage.getItem("omni_face");

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AI Voice Assistant</h1>
        <h2>Login</h2>

        {/* ── PASSWORD FORM ── */}
        {!faceMode && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="auth-button">Login</button>
          </form>
        )}

        {/* ── DIVIDER ── */}
        {!faceMode && (
          <div className="face-divider">
            <span>or</span>
          </div>
        )}

        {/* ── FACE BUTTONS ── */}
        {!faceMode && (
          <div className="face-btn-row">
            <button className="face-btn" onClick={() => setFaceMode("login")}>
              <span className="face-icon">👤</span>
              {hasFaceStored ? "Login with Face" : "Face Login"}
            </button>
            <button className="face-btn face-btn-secondary" onClick={() => setFaceMode("register")}>
              <span className="face-icon">📷</span>
              Register Face
            </button>
          </div>
        )}

        {/* ── FACE CAMERA PANEL ── */}
        {faceMode && (
          <div className="face-panel">
            <h3 className="face-panel-title">
              {faceMode === "register" ? "📷 Register Your Face" : "👤 Face Login"}
            </h3>

            {/* Admin password gate — only for register */}
            {faceMode === "register" && !adminVerified && (
              <div className="admin-gate">
                <p className="admin-gate-label">🔐 Admin verification required to register a face</p>
                <input
                  type="password"
                  className="admin-gate-input"
                  placeholder="Enter admin password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminVerify()}
                />
                {adminError && <p className="face-msg face-msg-error">{adminError}</p>}
                <div className="face-action-row">
                  <button className="auth-button" onClick={handleAdminVerify}>Verify</button>
                  <button className="face-cancel-btn" onClick={stopCamera}>✕ Cancel</button>
                </div>
              </div>
            )}

            {/* Camera — show for login always, for register only after admin verify */}
            {(faceMode === "login" || adminVerified) && (
              <>
                <div className="face-video-wrapper">
                  <video ref={videoRef} className="face-video" autoPlay muted playsInline />
                  {scanning && <div className="face-scan-overlay"><div className="face-scan-line" /></div>}
                </div>

                {faceMsg && (
                  <p className={`face-msg ${
                    faceMsg.startsWith("✅") ? "face-msg-success" :
                    faceMsg.startsWith("❌") ? "face-msg-error" : ""
                  }`}>{faceMsg}</p>
                )}

                <div className="face-action-row">
                  {modelsReady && !scanning && (
                    <button className="auth-button" onClick={
                      faceMode === "register" ? handleRegisterFace : handleFaceLogin
                    }>
                      {faceMode === "register" ? "📸 Register Face" : "🔍 Scan Face"}
                    </button>
                  )}
                  <button className="face-cancel-btn" onClick={stopCamera}>✕ Cancel</button>
                </div>
              </>
            )}
          </div>
        )}

        {!faceMode && (
          <p style={{ textAlign: "center", marginTop: "16px", color: "#888", fontSize: "11px" }}>
            Use credentials or face recognition to login
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
