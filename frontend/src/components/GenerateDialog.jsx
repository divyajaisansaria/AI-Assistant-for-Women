import React, { useRef, useState } from "react";
import axios from "axios";
import {
  faMicrophone,
  faTimes,
  faCheck,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const BackendURL = "http://localhost:8000";

export default function GenerateDialog({ onClose, onResult }) {
  const [images, setImages] = useState([]);
  const [recording, setRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleImageDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    setImages((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files).filter((file) =>
      file.type.startsWith("image/")
    );
    setImages((prev) => [...prev, ...selectedFiles]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setTranscription("");
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(false);
    setTranscription("");
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        transcribeAudio(blob);
      };
    }
    setRecording(false);
  };

  const transcribeAudio = async (blob) => {
    setIsTranscribing(true);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      const res = await axios.post(`${BackendURL}/transcribe`, formData);
      setTranscription(res.data.transcription || "");
    } catch (err) {
      alert("Transcription failed");
    }
    setLoading(false);
    setIsTranscribing(false);
  };

  const generateDescription = async () => {
    if (images.length === 0 || !transcription.trim()) {
      alert("Please upload at least one image and record your voice.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      images.forEach((img) => formData.append("images", img));
      formData.append("voice_text", transcription);
      const res = await axios.post(`${BackendURL}/describe`, formData);
      onResult({ images, transcription, description: res.data });
      onClose();
    } catch (err) {
      alert("Failed to generate description");
    }
    setLoading(false);
  };

  return (
    <div style={modalOverlay} onDragOver={(e) => e.preventDefault()} onDrop={handleImageDrop}>
      <div style={modalContent}>
        <button style={closeBtn} onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h3 style={{ marginTop: 0, color: "#222", fontSize: 17, fontWeight: 600 }}>
          Upload Product & Voice Description
        </h3>

        <div style={dropZone} onClick={() => document.getElementById("imageInput").click()}>
          {images.length > 0 ? (
            <div style={imagePreviewGrid}>
              {images.map((img, idx) => (
                <div key={idx} style={imageItem}>
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`preview-${idx}`}
                    style={previewImg}
                  />
                  <button
                    style={removePreviewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ color: "#888", fontSize: 14 }}>Click or drag & drop image(s)</span>
          )}
          <input
            type="file"
            id="imageInput"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
        </div>

        <div style={centeredRow}>
          {!recording ? (
            <button style={micBtn} onClick={startRecording}>
              <FontAwesomeIcon icon={faMicrophone} />
            </button>
          ) : (
            <div style={recordingControls}>
              <div className="waveform" style={waveform}>
                {[...Array(6)].map((_, i) => (
                  <span key={i} style={waveBar(i)}></span>
                ))}
              </div>
              <button style={sendBtn} onClick={stopAndSendRecording}>
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button style={cancelBtn} onClick={cancelRecording}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          )}
        </div>

        <textarea
          value={isTranscribing ? "Transcribing..." : transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Voice transcription will appear here..."
          style={textarea}
          disabled={isTranscribing}
        />

        <button style={generateBtn} onClick={generateDescription} disabled={loading}>
          {loading ? "Generating..." : "Generate Description"}
        </button>
      </div>
    </div>
  );
}

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.3)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  fontFamily: "'Inter', sans-serif",
};

const modalContent = {
  position: "relative",
  background: "#fff",
  padding: "26px 32px",
  borderRadius: 14,
  width: 580,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  boxShadow: "0 12px 36px rgba(0,0,0,0.25)",
};

const closeBtn = {
  position: "absolute",
  top: 12,
  right: 16,
  fontSize: 18,
  border: "none",
  background: "none",
  cursor: "pointer",
  color: "#555",
};

const dropZone = {
  border: "2px dashed #ccc",
  borderRadius: 10,
  padding: 24,
  background: "#f9f9f9",
  textAlign: "center",
  cursor: "pointer",
  minHeight: 160,
};

const imagePreviewGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "center",
};

const imageItem = {
  position: "relative",
  width: 80,
  height: 80,
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #ccc",
  backgroundColor: "#fff",
};

const previewImg = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const removePreviewBtn = {
  position: "absolute",
  top: 4,
  right: 4,
  background: "rgba(220, 53, 69, 0.9)",
  border: "none",
  borderRadius: "50%",
  width: 20,
  height: 20,
  color: "white",
  fontSize: 10,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const centeredRow = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 10,
};

const micBtn = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  backgroundColor: "#007bff",
  border: "none",
  color: "#fff",
  fontSize: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const recordingControls = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const waveform = {
  display: "flex",
  alignItems: "center",
  gap: 2,
};

const waveBar = (i) => ({
  width: 3,
  height: `${8 + (i % 4) * 4}px`,
  background: "#007bff",
  borderRadius: 2,
  animation: "wave 1s infinite ease-in-out",
  animationDelay: `${i * 0.1}s`,
});

const sendBtn = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "#28a745",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const cancelBtn = {
  width: 36,
  height: 36,
  borderRadius: "50%",
  backgroundColor: "#dc3545",
  border: "none",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const textarea = {
  width: "100%",
  minHeight: 90,
  padding: 12,
  border: "1px solid #ccc",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "inherit",
};

const generateBtn = {
  padding: "12px",
  background: "#28a745",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  fontWeight: "bold",
  cursor: "pointer",
};