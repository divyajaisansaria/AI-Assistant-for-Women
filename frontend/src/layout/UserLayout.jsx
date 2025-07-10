import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaMicrophone } from "react-icons/fa"; // Mic icon
import "../index.css";

const layoutStyles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "Segoe UI, sans-serif",
  },
  sidebar: {
    width: "240px",
    backgroundColor: "#2c3e50",
    color: "#ecf0f1",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 10px",
  },
  sidebarTop: {
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  sidebarItem: (isActive) => ({
    padding: "12px 16px",
    marginBottom: 10,
    backgroundColor: isActive ? "#1abc9c" : "#34495e",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  }),
  logoutButton: {
    padding: "10px 14px",
    backgroundColor: "#6c757d",
    border: "none",
    color: "white",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    marginTop: 20,
    width: "90%",
    alignSelf: "center",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f5f5f5",
  },
  mainContent: {
    padding: 20,
    overflowY: "auto",
    flex: 1,
    backgroundColor: "#fff",
  },
};

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Description Generate", path: "/home" },
    { label: "Products", path: "/products" },
    { label: "Help", path: "/help" },
  ];

  return (
    <>
      <div style={layoutStyles.container}>
        <aside style={layoutStyles.sidebar}>
          <div style={layoutStyles.sidebarTop}>
            <div style={layoutStyles.sidebarHeader}>User Panel</div>
            {navItems.map((item) => (
              <div
                key={item.label}
                style={layoutStyles.sidebarItem(location.pathname === item.path)}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </div>
            ))}
          </div>

          <button
            style={layoutStyles.logoutButton}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#dc3545")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#6c757d")}
            onClick={() => alert("Logged out")}
          >
            Logout
          </button>
        </aside>

        <main style={layoutStyles.content}>
          <div style={layoutStyles.mainContent}>{children}</div>
        </main>
      </div>

      {/* 🎤 Mic Icon (Bottom Right) */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          backgroundColor: "#1abc9c",
          color: "white",
          borderRadius: "50%",
          width: 60,
          height: 60,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          zIndex: 1000,
        }}
        onClick={() => alert("Mic clicked")}
        title="Start Voice Input"
      >
        <FaMicrophone size={24} />
      </div>
    </>
  );
}
