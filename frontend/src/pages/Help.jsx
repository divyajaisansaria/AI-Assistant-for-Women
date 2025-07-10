import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { FiSend, FiCopy } from "react-icons/fi";
import { BsMic, BsStopCircle } from "react-icons/bs";
import { ToastContainer, toast } from "react-toastify";
import UserLayout from "../layout/UserLayout";
import 'react-toastify/dist/ReactToastify.css';

const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch {
    return null;
  }
};

const HelpContent = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);
  const isManuallyStoppedRef = useRef(false);

  const token = localStorage.getItem("token");
  const decoded = decodeToken(token);
  const userId = decoded?.user_id;

  useEffect(() => {
    const fetchWelcome = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/chat/welcome");
        setChatHistory([{ sender: "bot", text: res.data.message }]);
      } catch {
        setChatHistory([{ sender: "bot", text: "Hello! I’m your assistant. How can I help you today?" }]);
      }
    };
    fetchWelcome();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const userMessage = { sender: "user", text: query };
    setChatHistory((prev) => [...prev, userMessage]);
    setQuery("🤖 Thinking...");

    try {
      const res = await axios.post("http://127.0.0.1:8000/chat/ask", {
        user_id: userId,
        message: query,
      });

      const botMessage = {
        sender: "bot",
        text: res.data.response,
        lang: res.data.lang,
      };

      setChatHistory((prev) => [...prev, botMessage]);
    } catch {
      setChatHistory((prev) => [...prev, { sender: "bot", text: "❌ Failed to fetch response." }]);
    } finally {
      setQuery("");
      setLoading(false);
    }
  };

  const handleVoiceClick = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", blob, "voice.webm");

          try {
            setQuery("⏳ Transcribing...");
            const res = await axios.post("http://localhost:8000/api/speech-to-text", formData);
            setQuery(res.data.transcription || "");
            toast.success(`🎤 Detected: ${res.data.language}`);
          } catch {
            setQuery("");
            toast.error("❌ Voice to text failed");
          }
        };

        mediaRecorder.start();
        setQuery("Listening...");
        setIsRecording(true);
      } catch {
        toast.error("🎙️ Mic access denied");
      }
    } else {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  const langMap = {
    hi: "hi-IN", en: "en-US", gu: "gu-IN", ta: "ta-IN", mr: "mr-IN", bn: "bn-IN", te: "te-IN"
  };
  const getLang = (code) => langMap[code] || "en-US";

  const handlePlayAudio = (text, index, lang = "en-US") => {
    if (playingIndex === index) {
      isManuallyStoppedRef.current = true;
      synthRef.current.cancel();
      setPlayingIndex(null);
      return;
    }

    isManuallyStoppedRef.current = false;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    const voice = synthRef.current.getVoices().find(v => v.lang === lang);
    if (voice) utterance.voice = voice;

    utterance.onend = () => setPlayingIndex(null);
    utterance.onerror = () => {
      if (!isManuallyStoppedRef.current) toast.error("Speech error");
      setPlayingIndex(null);
    };

    synthRef.current.speak(utterance);
    setPlayingIndex(index);
  };

  const styles = {
    chatBox: { flex: 1, overflowY: "auto", marginBottom: "1rem" },
    message: { padding: "0.6rem", borderRadius: "10px", marginBottom: "0.5rem", maxWidth: "70%" },
    userMessage: { background: "#3b82f6", color: "#fff", alignSelf: "flex-end" },
    botMessage: { background: "#e5e7eb", color: "#111827", alignSelf: "flex-start" },
    inputForm: { display: "flex", gap: "0.5rem" },
    input: { flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #ccc" },
    button: { padding: "0.7rem", borderRadius: "8px", border: "none", cursor: "pointer" }
  };

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={2000} />
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={styles.chatBox} ref={chatBoxRef}>
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.message,
                ...(msg.sender === "user" ? styles.userMessage : styles.botMessage),
              }}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
              {msg.sender === "bot" && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                  {playingIndex === index ? (
                    <BsStopCircle
                      size={16}
                      onClick={() => handlePlayAudio(msg.text, index, getLang(msg.lang))}
                      style={{ cursor: "pointer", color: "red" }}
                    />
                  ) : (
                    <BsMic
                      size={16}
                      onClick={() => handlePlayAudio(msg.text, index, getLang(msg.lang))}
                      style={{ cursor: "pointer", color: "#2563eb" }}
                    />
                  )}
                  <FiCopy
                    size={14}
                    onClick={() => {
                      navigator.clipboard.writeText(msg.text);
                      toast.success("Copied!");
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.message, ...styles.botMessage }}>
              Typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} style={styles.inputForm}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something..."
            disabled={loading || isRecording}
            style={styles.input}
          />
          <button
            type="button"
            onClick={handleVoiceClick}
            style={{
              ...styles.button,
              background: isRecording ? "#ef4444" : "#e5e7eb",
              color: isRecording ? "#fff" : "#000"
            }}
          >
            <BsMic size={20} />
          </button>
          <button type="submit" style={{ ...styles.button, background: "#2563eb", color: "#fff" }}>
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </>
  );
};

const Help = () => <UserLayout><HelpContent /></UserLayout>;
export default Help;
