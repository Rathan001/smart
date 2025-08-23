import React from "react";

export const Toaster = () => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        backgroundColor: "#2d5a27",
        color: "white",
        padding: "1rem 1.5rem",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 9999,
        display: "none", // toggle to "block" when you want to show it
      }}
      id="grow-smart-toast"
    >
      This is a sample toast notification!
    </div>
  );
};
