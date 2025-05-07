import React from "react";

export default function ModernDropdownTrigger({ open = false }) {
  return (
    <div
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-full
        bg-gray-100
        transition-colors
        duration-150
        shadow-sm
        cursor-pointer
        hover:bg-[#E6F7F1]
        active:bg-[#D1F5E4]
      `}
      style={{
        border: open ? "2px solid #00A389" : "2px solid transparent",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }}
      >
        <path
          d="M7 10l5 5 5-5"
          stroke="#232B44"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
} 