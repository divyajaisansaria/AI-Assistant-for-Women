import React, { useState } from "react";
import GenerateDialog from "../components/GenerateDialog";
import UserLayout from "../layout/UserLayout";

export default function Home() {
  const [showDialog, setShowDialog] = useState(false);
  const [result, setResult] = useState(null);

  const capitalizeLabel = (str) =>
    str
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const renderValue = (val) => {
    if (typeof val === "string" || typeof val === "number") return val;

    if (
      Array.isArray(val) &&
      val.length &&
      typeof val[0] === "object" &&
      "Name" in val[0] &&
      "Values" in val[0]
    ) {
      return val.map((opt) => `${opt.Name}: ${opt.Values.join(", ")}`).join(" | ");
    }

    if (Array.isArray(val)) return val.join(", ");

    if (typeof val === "object" && val !== null) {
      return Object.entries(val)
        .map(([k, v]) => `${capitalizeLabel(k)}: ${renderValue(v)}`)
        .join("\n");
    }

    return "";
  };

  const renderDescriptionForm = (description) => {
    const cleaned = description["Structured Data"] || description.structured_data || description;

    return Object.entries(cleaned).map(([key, value], idx) => (
      <div
        key={idx}
        style={{
          marginBottom: 12,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <label
          style={{
            fontWeight: 600,
            minWidth: 140,
            color: "#2e2e2e",
          }}
        >
          {capitalizeLabel(key)}:
        </label>
        <div
          style={{
            flex: 1,
            color: "#555",
            whiteSpace: "pre-wrap",
            lineHeight: 1.5,
          }}
        >
          {renderValue(value)}
        </div>
      </div>
    ));
  };

  return (
    <UserLayout>
      <div style={{ fontFamily: "Segoe UI", padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#333",
            }}
          >
            Smart Product Description Generator
          </h1>

          <button
            style={{
              padding: "10px 20px",
              backgroundColor: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
              fontWeight: 500,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              transition: "all 0.2s ease-in-out",
            }}
            onClick={() => setShowDialog(true)}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#5a6268")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#6c757d")}
          >
            Generate Description
          </button>
        </div>

        {showDialog && (
          <GenerateDialog
            onClose={() => setShowDialog(false)}
            onResult={(data) => setResult(data)}
          />
        )}

        {result && (
          <div
            style={{
              marginTop: 20,
              backgroundColor: "#f5f5f5",
              padding: 24,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h2
              style={{
                marginBottom: 16,
                fontSize: 20,
                fontWeight: 600,
                color: "#444",
              }}
            >
              Generated Result
            </h2>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              {result.images.map((img, idx) => (
                <img
                  key={idx}
                  src={URL.createObjectURL(img)}
                  alt={`Uploaded ${idx}`}
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}
                />
              ))}
            </div>

            <p
              style={{
                marginBottom: 16,
                fontSize: 15,
                color: "#555",
              }}
            >
              <strong style={{ color: "#2e2e2e" }}>Transcription:</strong>{" "}
              {result.transcription}
            </p>

            <div>
              <h3
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  marginBottom: 14,
                  color: "#2e2e2e",
                }}
              >
                Generated Description
              </h3>

              <div>{renderDescriptionForm(result.description)}</div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "12px",
                  marginTop: 20,
                  flexWrap: "wrap",
                }}
              >
                <button
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#343a40",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const formData = new FormData();
                    result.images.forEach((img) => {
                      formData.append("images", img);
                    });
                    formData.append("description", JSON.stringify(result.description));

                    await fetch("http://localhost:8000/save-to-db", {
                      method: "POST",
                      body: formData,
                    });

                    alert("Saved to DB with images");
                  }}
                >
                  Save to DB
                </button>

                <button
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#495057",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const formData = {
                      description: result.description,
                    };

                    await fetch("http://localhost:8000/save-to-sheet", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(formData),
                    });

                    alert("Saved to Google Sheets");
                  }}
                >
                  Save to Google Sheets
                </button>

                <button
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                  onClick={() => setResult(null)}
                >
                  Clear
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
