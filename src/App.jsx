import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = import.meta.env.PROD
  ? "https://omni-be-vsqx.onrender.com"
  : "http://127.0.0.1:5000";

const LOCAL_AGENT = "http://127.0.0.1:5001";

const SYSTEM_KEYWORDS = [
  "shutdown", "restart", "lock", "volume up", "volume down", "mute",
  "brightness", "minimize", "maximize", "wifi on", "wifi off",
  "close ", "play ", "settings"
];

let localAgentAvailable = false;

// Check if local agent is running
axios.get(`${LOCAL_AGENT}/ping`, { timeout: 1500 })
  .then(() => { localAgentAvailable = true; })
  .catch(() => { localAgentAvailable = false; });

const isSystemCommand = (text) =>
  SYSTEM_KEYWORDS.some(k => text.toLowerCase().includes(k));

const sendToAgent = async (text) => {
  if (localAgentAvailable && isSystemCommand(text)) {
    try {
      const res = await axios.post(`${LOCAL_AGENT}/system_command`, { command: text }, { timeout: 5000 });
      const { status, url } = res.data;
      if (status === "Command not recognized locally") return null;
      if (url) window.open(url, "_blank");
      return status;
    } catch {
      // agent went offline, fall through to cloud
    }
  }
  return null;
};

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

// ─── THEMES ────────────────────────────────────────────────────────────────
const THEMES = [
  {
    name: "Cyber Blue",
    icon: "🔵",
    bg: "#020617",
    glow: "#0ea5e9",
    accent: "#22d3ee",
    accent2: "#3b82f6",
    grid: "rgba(255,255,255,0.05)",
    cardBg: "rgba(255,255,255,0.05)",
    coreBg: "radial-gradient(circle at 30% 30%, #ffffff44, transparent), radial-gradient(circle, #22d3ee, #1e3a8a)",
    titleColor: "#38bdf8",
    btnBg: "linear-gradient(135deg, #06b6d4, #3b82f6)",
  },
  {
    name: "Neon Purple",
    icon: "🟣",
    bg: "#0d0014",
    glow: "#a855f7",
    accent: "#d946ef",
    accent2: "#7c3aed",
    grid: "rgba(168,85,247,0.07)",
    cardBg: "rgba(168,85,247,0.07)",
    coreBg: "radial-gradient(circle at 30% 30%, #ffffff33, transparent), radial-gradient(circle, #d946ef, #4c1d95)",
    titleColor: "#e879f9",
    btnBg: "linear-gradient(135deg, #a855f7, #7c3aed)",
  },
  {
    name: "Matrix Green",
    icon: "🟢",
    bg: "#000d00",
    glow: "#22c55e",
    accent: "#4ade80",
    accent2: "#16a34a",
    grid: "rgba(34,197,94,0.07)",
    cardBg: "rgba(34,197,94,0.06)",
    coreBg: "radial-gradient(circle at 30% 30%, #ffffff33, transparent), radial-gradient(circle, #4ade80, #14532d)",
    titleColor: "#86efac",
    btnBg: "linear-gradient(135deg, #22c55e, #15803d)",
  },
  {
    name: "Solar Amber",
    icon: "🟠",
    bg: "#0c0800",
    glow: "#f59e0b",
    accent: "#fbbf24",
    accent2: "#d97706",
    grid: "rgba(245,158,11,0.07)",
    cardBg: "rgba(245,158,11,0.06)",
    coreBg: "radial-gradient(circle at 30% 30%, #ffffff33, transparent), radial-gradient(circle, #fbbf24, #78350f)",
    titleColor: "#fde68a",
    btnBg: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  {
    name: "Rose Crimson",
    icon: "🔴",
    bg: "#0d0005",
    glow: "#f43f5e",
    accent: "#fb7185",
    accent2: "#e11d48",
    grid: "rgba(244,63,94,0.07)",
    cardBg: "rgba(244,63,94,0.06)",
    coreBg: "radial-gradient(circle at 30% 30%, #ffffff33, transparent), radial-gradient(circle, #fb7185, #881337)",
    titleColor: "#fda4af",
    btnBg: "linear-gradient(135deg, #f43f5e, #be123c)",
  },
];
// ────────────────────────────────────────────────────────────────────────────

function App() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [themeIdx, setThemeIdx] = useState(() => {
    const saved = localStorage.getItem("omni_theme");
    return saved ? parseInt(saved) : 0;
  });
  const theme = THEMES[themeIdx];
  const cycleTheme = () => {
    const next = (themeIdx + 1) % THEMES.length;
    setThemeIdx(next);
    localStorage.setItem("omni_theme", next);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  // Existing states
  const [command, setCommand] = useState("");
  const [status, setStatus] = useState("⚡ System Ready");
  const [sessionHistory, setSessionHistory] = useState([]); // current session only, clears on refresh
  const [calDate, setCalDate] = useState(new Date());
  const [showCal, setShowCal] = useState(false);
  const [localHistory, setLocalHistory] = useState({});

  // Load persistent history from backend on mount (calendar only)
  useEffect(() => {
    axios.get(`${API_URL}/get_history`)
      .then(res => setLocalHistory(res.data))
      .catch(() => {});
  }, []);
const [pulse, setPulse] = useState(false);
  const [isListeningIcon, setIsListeningIcon] = useState(false);
  const [chatMode, setChatMode] = useState(false);

  // UPLOAD STATES
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadQuestion, setUploadQuestion] = useState("");
  const [uploadAnswer, setUploadAnswer] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // SYSTEM STATS
  const [cpuLoad, setCpuLoad] = useState(0);
  const [memoryUsage, setMemoryUsage] = useState({ used: 0, total: 0 });
  const [activeProcesses, setActiveProcesses] = useState([]);

  // Voice states
  const [voices, setVoices] = useState([]);
  const [currentVoiceId, setCurrentVoiceId] = useState(0);

  // MIC & FILE
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        // Filter and categorize 5-6 voices
        const filteredVoices = allVoices
          .filter(voice => voice.lang.startsWith('en-') || voice.lang === 'en-IN')
          .filter(voice => {
            const name = voice.name.toLowerCase();
            return name.includes('female') || name.includes('girl') || name.includes('boy') || 
                   name.includes('male') || name.includes('man') || name.includes('child') ||
                   name.includes('zira') || name.includes('samantha') || name.includes('hazel') ||
                   name.includes('susan') || name.includes('david') || name.includes('mark');
          })
          .slice(0, 6); // Top 6 matching voices
        
        setVoices(filteredVoices);
        
        // Load saved voice
        const savedId = localStorage.getItem('selectedVoiceId');
        if (savedId && parseInt(savedId) < filteredVoices.length) {
          setCurrentVoiceId(parseInt(savedId));
        }
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Save voice selection
  const handleVoiceChange = (e) => {
    const id = parseInt(e.target.value);
    setCurrentVoiceId(id);
    localStorage.setItem('selectedVoiceId', id);
  };

  // SPEAK FUNCTION - Updated with voice selection
  const speak = (text) => {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en-IN";
    
    // Apply selected voice if available
    if (voices.length > 0 && currentVoiceId < voices.length) {
      speech.voice = voices[currentVoiceId];
    }
    
    speech.onstart = () => setPulse(true);
    speech.onend = () => setPulse(false);
    window.speechSynthesis.speak(speech);
  };

  // INIT MIC
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("❌ Use Google Chrome");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const voiceText = event.results[0][0].transcript;
      setCommand(voiceText);
      handleVoiceCommand(voiceText);
    };

    recognition.onerror = (event) => {
      console.log("Mic Error:", event.error);

      if (event.error === "not-allowed") {
        setStatus("❌ Microphone permission denied");
      } else if (event.error === "audio-capture") {
        setStatus("❌ No microphone detected");
      } else if (event.error === "no-speech") {
        setStatus("⚠️ No speech detected");
      } else if (event.error === "network") {
        setStatus("❌ Network error");
      } else {
        setStatus("❌ Mic error: " + event.error);
      }

      isListeningRef.current = false;
      setPulse(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setPulse(false);
      setIsListeningIcon(false);
    };

    recognitionRef.current = recognition;
  }, []);

  // START LISTENING
  const startListening = () => {
    if (!recognitionRef.current) return;
    window.speechSynthesis.cancel();
    if (isListeningRef.current) return;

    try {
      recognitionRef.current.start();
      isListeningRef.current = true;
      setStatus("🔴 Listening...");
      setPulse(true);
      setIsListeningIcon(true);
    } catch (e) {
      console.log("Start error:", e);
    }
  };

  const getHistoryDate = () => {
    const now = new Date();
    return toDateKey(now);
  };

  const toDateKey = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const saveToLocalHistory = (cmd) => {
    const key = getHistoryDate();
    // Save to backend (persistent, for calendar)
    axios.post(`${API_URL}/save_history`, { date: key, command: cmd })
      .then(() => axios.get(`${API_URL}/get_history`))
      .then(res => setLocalHistory(res.data))
      .catch(() => {});
    // Session history: only lives until page refresh
    setSessionHistory((prev) => [cmd, ...prev].slice(0, 100));
  };

  // VOICE COMMAND
  const handleVoiceCommand = async (voiceText) => {
    setStatus("⚡ Processing...");
    try {
      const local = await sendToAgent(voiceText);
      if (local) {
        setStatus("🗣️ " + local);
        speak(local);
        saveToLocalHistory(voiceText);
        return;
      }
      const res = await axios.post(`${API_URL}/command`, { command: voiceText });
      const { status: msg, url } = res.data;
      if (url) window.open(url, "_blank");
      setStatus("🗣️ " + msg);
      speak(msg);
      saveToLocalHistory(voiceText);
    } catch {
      setStatus("❌ Backend error");
    }
  };

  // TEXT COMMAND
  const sendCommand = async (cmd = null) => {
    const cmdToSend = cmd || command;
    if (!cmdToSend.trim()) return;
    setStatus("⚡ Processing...");
    setPulse(true);
    try {
      const local = await sendToAgent(cmdToSend);
      if (local) {
        setStatus("✅ " + local);
        speak(local);
        saveToLocalHistory(cmdToSend);
        if (!cmd) setCommand("");
        return;
      }
      const res = await axios.post(`${API_URL}/command`, { command: cmdToSend });
      const { status: msg, url } = res.data;
      if (url) window.open(url, "_blank");
      setStatus("✅ " + msg);
      speak(msg);
      saveToLocalHistory(cmdToSend);
    } catch {
      setStatus("❌ Backend not connected");
    }
    if (!cmd) setCommand("");
  };

  // FETCH SYSTEM STATS + HISTORY
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/system_stats`);
        setCpuLoad(res.data.cpu);
        setMemoryUsage(res.data.memory);
        setActiveProcesses(res.data.processes.slice(0, 5));
      } catch (e) {
        console.log("Stats fetch error:", e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Delete single item from persistent history
  const deleteLocalHistoryItem = (dateKey, index) => {
    const cmd = localHistory[dateKey]?.[index];
    if (!cmd) return;
    axios.post(`${API_URL}/delete_history_item`, { date: dateKey, command: cmd })
      .then(() => axios.get(`${API_URL}/get_history`))
      .then(res => setLocalHistory(res.data))
      .catch(() => {});
  };

  // Clear all history for selected date
  const clearDateHistory = (dateKey) => {
    const items = localHistory[dateKey] || [];
    Promise.all(items.map(cmd =>
      axios.post(`${API_URL}/delete_history_item`, { date: dateKey, command: cmd })
    )).then(() => axios.get(`${API_URL}/get_history`))
      .then(res => setLocalHistory(res.data))
      .catch(() => {});
    speak("History cleared");
  };

  // UPLOAD HANDLER
  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadAnswer("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("question", uploadQuestion || "Analyze this file and give a detailed summary.");
      const res = await axios.post(`${API_URL}/upload_analyze`, formData);
      if (res.data.error) {
        setUploadAnswer("❌ " + res.data.error);
      } else {
        setUploadAnswer(res.data.answer);
        speak("File analyzed. Here is the result.");
      }
    } catch {
      setUploadAnswer("❌ Upload failed. Make sure backend is running.");
    }
    setUploadLoading(false);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setUploadFile(f);
  };

  // WELCOME ON FIRST CLICK
  useEffect(() => {
    const handleFirstClick = () => {
      const welcome = "Hello , welcome. What can I help you with today?";
      setStatus("🟢 " + welcome);
      speak(welcome);
      document.removeEventListener("click", handleFirstClick);
    };
    document.addEventListener("click", handleFirstClick);
  }, []);

  // ── theme-aware dynamic styles ──
  const dynContainer = { ...styles.container, background: theme.bg };
  const dynGrid = { ...styles.grid, backgroundImage: `linear-gradient(${theme.grid} 1px, transparent 1px), linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)` };
  const dynGlow = { ...styles.bgGlow, background: `radial-gradient(circle, ${theme.glow}, transparent)` };
  const dynCard = { ...styles.card, background: theme.cardBg, borderColor: `${theme.accent}22` };
  const dynTitle = { ...styles.title, color: theme.titleColor };
  const dynBtn = { ...styles.button, background: theme.btnBg };
  const dynMic = (listening) => ({ ...styles.mic, background: listening ? "#ef4444" : theme.glow, boxShadow: `0 0 20px ${listening ? "#ef4444" : theme.glow}` });
  const dynCore = { ...styles.core, background: theme.coreBg };
  const dynPulse = { ...styles.pulse, borderColor: theme.accent };
  const dynPanelTitle = { ...styles.panelTitle, color: theme.accent };
  const dynRightPanel = { ...styles.rightPanel, borderColor: `${theme.accent}26`, boxShadow: `0 0 40px ${theme.glow}14`, borderLeftColor: `${theme.accent}40` };
  const dynHistoryHeader = { ...styles.historyHeader, background: `${theme.accent}0f`, borderColor: `${theme.accent}1f` };
  const dynHistoryTitle = { ...styles.historyTitle, color: theme.accent };
  const dynHistoryBadge = { ...styles.historyTotalBadge, background: theme.btnBg };
  const dynDatebarDot = { ...styles.datebarDot, background: theme.accent, boxShadow: `0 0 6px ${theme.accent}` };
  const dynDatebarCount = { ...styles.datebarCount, color: theme.accent, background: `${theme.accent}1a` };
  const dynHistoryIndex = { ...styles.historyIndex, color: theme.accent };
  const dynUploadToggle = { ...styles.uploadToggleBtn, background: theme.btnBg, boxShadow: `0 0 20px ${theme.glow}80` };
  const dynUploadAnswer = { ...styles.uploadAnswer, background: `${theme.accent}14`, borderColor: `${theme.accent}33` };

  return (
    <div style={dynContainer}>
      <div style={dynGrid}></div>
      <div style={dynGlow}></div>

      {/* LEFT PANEL: SYSTEM STATS + QUICK MANAGE */}
      <div style={styles.sidebar}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
          <span style={{ fontSize: "14px" }}>🖥️</span>
          <span style={{ ...dynPanelTitle, margin: 0, fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>System Stats</span>
        </div>

        {/* Theme switcher buttons */}
        <div style={{ display: "flex", gap: "5px", marginBottom: "12px", justifyContent: "center" }}>
          {THEMES.map((t, i) => (
            <button
              key={i}
              title={t.name}
              onClick={() => { setThemeIdx(i); localStorage.setItem("omni_theme", i); }}
              style={{
                width: "22px", height: "22px", borderRadius: "50%",
                cursor: "pointer",
                background: i === themeIdx
                  ? `radial-gradient(circle, ${t.glow}, ${t.accent2})`
                  : `${t.glow}40`,
                boxShadow: i === themeIdx ? `0 0 8px ${t.glow}` : "none",
                border: i === themeIdx ? `2px solid ${t.accent}` : "2px solid transparent",
                transform: i === themeIdx ? "scale(1.2)" : "scale(1)",
                transition: "all 0.25s ease",
                fontSize: "10px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        {/* CPU Bar */}
        <div style={styles.statBlock}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.5px" }}>CPU</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: theme.accent }}>{cpuLoad}%</span>
          </div>
          <div style={styles.barTrack}>
            <div style={{
              ...styles.barFill,
              width: `${cpuLoad}%`,
              background: cpuLoad > 80 ? "linear-gradient(90deg,#ef4444,#f97316)" : `linear-gradient(90deg,${theme.accent2},${theme.accent})`,
              boxShadow: `0 0 8px ${theme.accent}80`,
            }} />
          </div>
        </div>

        {/* Memory Bar */}
        <div style={styles.statBlock}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8", letterSpacing: "0.5px" }}>RAM</span>
            <span style={{ fontSize: "10px", fontWeight: 700, color: theme.accent }}>
              {memoryUsage.used}/{memoryUsage.total}GB
            </span>
          </div>
          <div style={styles.barTrack}>
            <div style={{
              ...styles.barFill,
              width: `${memoryUsage.total ? Math.round((memoryUsage.used / memoryUsage.total) * 100) : 0}%`,
              background: `linear-gradient(90deg,${theme.accent2},${theme.accent})`,
              boxShadow: `0 0 8px ${theme.accent}80`,
            }} />
          </div>
        </div>

        {/* Active Processes */}
        <div style={{ marginBottom: "10px" }}>
          <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>Processes</span>
          <div style={{ marginTop: "5px", display: "flex", flexDirection: "column", gap: "3px" }}>
            {activeProcesses.map((p, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "3px 6px", borderRadius: "6px",
                background: `${THEMES[i % THEMES.length].glow}18`,
                border: `1px solid ${THEMES[i % THEMES.length].glow}30`,
              }}>
                <div style={{
                  width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                  background: THEMES[i % THEMES.length].glow,
                  boxShadow: `0 0 4px ${THEMES[i % THEMES.length].glow}`,
                }} />
                <span style={{ fontSize: "10px", color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: `${theme.accent}22`, margin: "8px 0" }} />

        {/* Quick Manage */}
        <span style={{ fontSize: "10px", color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>Quick Manage</span>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
          <button style={{ ...dynBtn, padding: "8px", fontSize: "11px" }} onClick={() => sendCommand("shutdown")}>🔴 Shutdown</button>
          <button style={{ ...dynBtn, padding: "8px", fontSize: "11px" }} onClick={() => sendCommand("restart")}>🔄 Restart</button>
          <button style={{ ...dynBtn, padding: "8px", fontSize: "11px" }} onClick={() => sendCommand("lock")}>🔒 Lock</button>
          <button style={{ ...dynBtn, padding: "8px", fontSize: "11px", background: "linear-gradient(135deg,#ef4444,#dc2626)", marginTop: "4px" }} onClick={handleLogout}>🚪 Logout</button>
        </div>
      </div>

      {/* RIGHT PANEL: CALENDAR + HISTORY - collapsible side drawer */}
      <div style={dynRightPanel}>
        {/* Header */}
        <div style={dynHistoryHeader} onClick={() => setShowCal((v) => !v)}>
          <div style={styles.historyHeaderLeft}>
            <span style={styles.historyIcon}>⚡</span>
            <span style={dynHistoryTitle}>Command Log</span>
          </div>
          <div style={styles.historyHeaderRight}>
            <span style={dynHistoryBadge}>
              {sessionHistory.length}
            </span>
            <span style={styles.historyChevron}>{showCal ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* Calendar */}
        {showCal && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.calendarWrapper}
          >
            <Calendar
              onChange={(d) => setCalDate(d)}
              value={calDate}
              tileClassName={({ date }) =>
                localHistory[toDateKey(date)]?.length ? "has-history" : null
              }
            />
          </motion.div>
        )}

        {/* Date bar */}
        {/* Session history (clears on refresh) */}
        <div style={styles.datebar}>
          <div style={styles.datebarLeft}>
            <span style={dynDatebarDot} />
            <span style={styles.datebarLabel}>This Session</span>
            <span style={dynDatebarCount}>{sessionHistory.length}</span>
          </div>
        </div>

        <div style={styles.historyList}>
          {sessionHistory.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={{ fontSize: "28px" }}>🌙</span>
              <p style={{ margin: "6px 0 0", color: "#475569", fontSize: "12px" }}>No commands yet</p>
            </div>
          ) : (
            sessionHistory.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                style={styles.historyCard}
              >
                <span style={dynHistoryIndex}>{String(i + 1).padStart(2, "0")}</span>
                <span style={styles.historyText}>{h}</span>
              </motion.div>
            ))
          )}
        </div>

        {/* Calendar date history (persistent) */}
        {showCal && (() => {
          const dateKey = toDateKey(calDate);
          const items = localHistory[dateKey] || [];
          const isToday = dateKey === toDateKey(new Date());
          return (
            <>
              <div style={{ ...styles.datebar, marginTop: "10px" }}>
                <div style={styles.datebarLeft}>
                  <span style={dynDatebarDot} />
                  <span style={styles.datebarLabel}>{isToday ? "Today" : dateKey}</span>
                  <span style={dynDatebarCount}>{items.length}</span>
                </div>
                {items.length > 0 && (
                  <button style={styles.clearBtn} onClick={() => clearDateHistory(dateKey)} title="Clear all">🗑</button>
                )}
              </div>
              <div style={{ ...styles.historyList, maxHeight: "200px" }}>
                {items.length === 0 ? (
                  <div style={styles.emptyState}>
                    <span style={{ fontSize: "20px" }}>📭</span>
                    <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "11px" }}>No history for this date</p>
                  </div>
                ) : (
                  items.map((h, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }} style={styles.historyCard}>
                      <span style={dynHistoryIndex}>{String(i + 1).padStart(2, "00")}</span>
                      <span style={styles.historyText}>{h}</span>
                      <button style={styles.deleteBtn} onClick={() => deleteLocalHistoryItem(dateKey, i)} title="Delete">✕</button>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* UPLOAD PANEL */}
      <div style={dynUploadToggle} onClick={() => setShowUpload(!showUpload)}>
        {showUpload ? "✕ Close" : "📂 Upload & Analyze"}
      </div>

      {showUpload && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.uploadPanel}
        >
          <h3 style={dynPanelTitle}>📁 File Analyzer</h3>

          {/* Drop Zone */}
          <div
            style={{
              ...styles.dropZone,
              borderColor: dragOver ? "#22d3ee" : "rgba(255,255,255,0.2)",
              background: dragOver ? "rgba(34,211,238,0.1)" : "rgba(255,255,255,0.03)",
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept=".pdf,.docx,.txt,.csv,.json,.js,.py,.html,.css,.png,.jpg,.jpeg,.webp,.gif"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
            {uploadFile ? (
              <div>
                <p style={{ color: "#22d3ee", margin: 0 }}>📄 {uploadFile.name}</p>
                <p style={{ color: "#94a3b8", fontSize: "12px", margin: "4px 0 0" }}>
                  {(uploadFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: "#94a3b8", margin: 0 }}>📤 Drop file here or click</p>
                <p style={{ color: "#64748b", fontSize: "11px", margin: "4px 0 0" }}>PDF, DOCX, TXT, CSV, JSON, Images, Code</p>
              </div>
            )}
          </div>

          {/* Question Input */}
          <input
            style={{ ...styles.input, width: "100%", boxSizing: "border-box", marginBottom: "10px", fontSize: "13px" }}
            placeholder="Ask something about the file... (optional)"
            value={uploadQuestion}
            onChange={(e) => setUploadQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUpload()}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{ ...styles.button, flex: 1, opacity: uploadLoading ? 0.6 : 1 }}
              onClick={handleUpload}
              disabled={uploadLoading || !uploadFile}
            >
              {uploadLoading ? "⏳ Analyzing..." : "🤖 Analyze"}
            </button>
            {uploadFile && (
              <button
                style={{ ...styles.button, background: "rgba(255,255,255,0.1)", padding: "12px" }}
                onClick={() => { setUploadFile(null); setUploadAnswer(""); }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Answer */}
          {uploadAnswer && (
            <div style={dynUploadAnswer}>
              <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{uploadAnswer}</p>
              <button
                style={{ ...styles.button, marginTop: "10px", fontSize: "12px", padding: "8px 14px", background: "rgba(255,255,255,0.1)" }}
                onClick={() => speak(uploadAnswer)}
              >
                🔊 Read Aloud
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* CENTRAL CARD: OMNI CORE */}
      <motion.div style={dynCard}>
        {/* VERSION BADGE */}
        <div style={{
          position: "absolute",
          top: "14px",
          right: "16px",
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "1.5px",
          padding: "4px 10px",
          borderRadius: "20px",
          background: `linear-gradient(135deg, ${theme.accent2}, ${theme.glow}, ${theme.accent})`,
          backgroundSize: "200% 200%",
          color: "#fff",
          boxShadow: `0 0 10px ${theme.glow}99, 0 0 20px ${theme.accent}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
          border: "1px solid rgba(255,255,255,0.2)",
          textShadow: `0 0 8px ${theme.glow}`,
          cursor: "default",
          userSelect: "none",
          animation: "badgeShimmerApp 3s ease infinite",
          zIndex: 10,
        }}>V-3.O</div>
        <h1 style={dynTitle}>OMNI</h1>
        <div style={styles.coreWrapper}>
          <motion.div
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={dynPulse}
          />
          <motion.div
            animate={{
              scale: pulse ? 1.25 : 1,
              boxShadow: pulse
                ? `0 0 150px ${theme.accent}`
                : `0 0 80px ${theme.glow}`,
            }}
            transition={{ duration: 0.5 }}
            style={dynCore}
          />
        </div>

        <p style={styles.status}>{status}</p>

        <input
          style={styles.input}
          placeholder="Type command..."
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendCommand()}
        />

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Chat Mode Toggle */}
          <motion.button 
            style={{
              ...dynBtn,
              background: chatMode ? 'linear-gradient(135deg, #10b981, #059669)' : theme.btnBg
            }}
            onClick={() => setChatMode(!chatMode)}
            whileTap={{ scale: 0.95 }}
          >
            🤖 {chatMode ? 'System' : 'Chat'}
          </motion.button>

          <button style={dynBtn} onClick={sendCommand}>
            {chatMode ? '💬 AI' : '⚡ Execute'}
          </button>

          {/* Voice Selector */}
          <div style={styles.voiceSelectorWrapper}>
            <label style={styles.voiceLabel}>Voice:</label>
            <select 
              value={currentVoiceId} 
              onChange={handleVoiceChange}
              style={styles.voiceSelect}
              disabled={voices.length === 0}
            >
              {voices.length === 0 ? (
                <option>Loading voices...</option>
              ) : (
                voices.map((voice, id) => (
                  <option key={id} value={id}>
                    {voice.name} ({voice.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          <motion.button
            whileTap={{ scale: 0.8 }}
            style={dynMic(isListeningIcon)}
            onClick={startListening}
            animate={isListeningIcon ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: isListeningIcon ? Infinity : 0 }}
          >
            {isListeningIcon ? '●' : '🎤'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default App;

const styles = {
  container: {
    height: "100vh",
    background: "#020617",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "white",
    fontFamily: "Arial",
    overflow: "hidden",
  },
  grid: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  bgGlow: {
    position: "absolute",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, #0ea5e9, transparent)",
    filter: "blur(120px)",
    opacity: 0.4,
  },
  sidebar: {
    position: "fixed",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "160px",
    backdropFilter: "blur(10px)",
    background: "rgba(255,255,255,0.05)",
    padding: "12px",
    borderRadius: "15px",
    zIndex: 0,
  },
  rightPanel: {
    position: "fixed",
    right: 0,
    top: 0,
    height: "100vh",
    width: "220px",
    backdropFilter: "blur(20px)",
    background: "rgba(2, 8, 20, 0.92)",
    borderLeft: "1px solid rgba(34,211,238,0.25)",
    padding: "12px 10px",
    borderRadius: "0",
    overflowY: "auto",
    boxShadow: "-4px 0 30px rgba(14,165,233,0.1)",
    zIndex: 0,
    display: "flex",
    flexDirection: "column",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
    marginBottom: "12px",
    padding: "8px 10px",
    borderRadius: "12px",
    background: "rgba(34,211,238,0.06)",
    border: "1px solid rgba(34,211,238,0.12)",
  },
  historyHeaderLeft: { display: "flex", alignItems: "center", gap: "8px" },
  historyHeaderRight: { display: "flex", alignItems: "center", gap: "8px" },
  historyIcon: { fontSize: "16px" },
  historyTitle: { fontSize: "11px", fontWeight: "700", color: "#22d3ee", letterSpacing: "1px", textTransform: "uppercase" },
  historyTotalBadge: {
    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "20px",
    minWidth: "20px",
    textAlign: "center",
  },
  historyChevron: { fontSize: "10px", color: "#64748b" },
  calendarWrapper: {
    borderRadius: "12px",
    overflow: "hidden",
    fontSize: "11px",
    marginBottom: "12px",
    border: "1px solid rgba(34,211,238,0.1)",
  },
  datebar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
    padding: "6px 10px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  datebarLeft: { display: "flex", alignItems: "center", gap: "8px" },
  datebarDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#22d3ee",
    boxShadow: "0 0 6px #22d3ee",
    flexShrink: 0,
  },
  datebarLabel: { fontSize: "12px", color: "#94a3b8", fontWeight: "600" },
  datebarCount: {
    fontSize: "11px",
    color: "#22d3ee",
    background: "rgba(34,211,238,0.1)",
    padding: "1px 7px",
    borderRadius: "10px",
  },
  clearBtn: {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "8px",
    color: "#f87171",
    cursor: "pointer",
    fontSize: "13px",
    padding: "3px 7px",
    lineHeight: 1,
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
    overflowY: "auto",
    paddingRight: "2px",
  },
  historyCard: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 8px",
    borderRadius: "8px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    transition: "background 0.2s",
  },
  historyIndex: {
    fontSize: "10px",
    color: "#22d3ee",
    fontWeight: "700",
    fontFamily: "monospace",
    minWidth: "20px",
    opacity: 0.7,
  },
  historyText: {
    fontSize: "11px",
    color: "#cbd5e1",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#475569",
    cursor: "pointer",
    fontSize: "12px",
    padding: "2px 4px",
    borderRadius: "4px",
    lineHeight: 1,
    flexShrink: 0,
    transition: "color 0.2s",
  },
  emptyState: {
    textAlign: "center",
    padding: "30px 0",
  },
  panelTitle: { color: "#22d3ee", marginBottom: "10px" },
  statBlock: { marginBottom: "10px" },
  barTrack: {
    height: "5px",
    borderRadius: "10px",
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "10px",
    transition: "width 0.6s ease",
  },
  card: {
    backdropFilter: "blur(25px)",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "25px",
    padding: "40px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.1)",
    position: "relative",
    zIndex: 10,
  },
  title: { fontSize: "44px", letterSpacing: "6px", color: "#38bdf8" },
  coreWrapper: { position: "relative", width: "180px", height: "180px", margin: "30px auto" },
  core: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 30% 30%, #ffffff44, transparent), radial-gradient(circle, #22d3ee, #1e3a8a)",
  },
  pulse: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "2px solid #22d3ee",
  },
  status: { marginBottom: "20px", color: "#cbd5e1" },
  input: {
    padding: "14px",
    width: "260px",
    borderRadius: "10px",
    border: "none",
    marginBottom: "15px",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    outline: "none",
  },
  button: {
    padding: "12px 20px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
  },
  mic: {
    padding: "12px",
    borderRadius: "50%",
    border: "none",
    background: "#0ea5e9",
    color: "white",
    cursor: "pointer",
    width: "48px",
    height: "48px",
  },
  voiceSelectorWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    minWidth: "140px",
  },
  voiceLabel: {
    fontSize: "12px",
    color: "#cbd5e1",
    fontWeight: "500",
  },
  voiceSelect: {
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    fontSize: "12px",
    minWidth: "120px",
    backdropFilter: "blur(10px)",
    cursor: "pointer",
  },
  uploadToggleBtn: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 22px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    zIndex: 100,
    userSelect: "none",
    boxShadow: "0 0 20px rgba(124,58,237,0.5)",
  },
  uploadPanel: {
    position: "fixed",
    bottom: "70px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "420px",
    maxHeight: "70vh",
    overflowY: "auto",
    backdropFilter: "blur(20px)",
    background: "rgba(15,15,30,0.95)",
    border: "1px solid rgba(124,58,237,0.4)",
    borderRadius: "20px",
    padding: "20px",
    zIndex: 99,
    boxShadow: "0 0 40px rgba(124,58,237,0.3)",
  },
  dropZone: {
    border: "2px dashed",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "12px",
    transition: "all 0.2s",
  },
  uploadAnswer: {
    marginTop: "14px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(34,211,238,0.08)",
    border: "1px solid rgba(34,211,238,0.2)",
    color: "#e2e8f0",
    fontSize: "13px",
    maxHeight: "200px",
    overflowY: "auto",
  },
};
