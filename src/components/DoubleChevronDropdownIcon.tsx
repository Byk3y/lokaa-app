import React from "react";

export default function DoubleChevronDropdownIcon() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "#979BAA", // Muted grayish background
      }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path
          d="M10 13L16 19L22 13"
          stroke="#232B44"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10 9L16 15L22 9"
          stroke="#232B44"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
} 