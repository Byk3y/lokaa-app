import React from "react";

export default function MinimalUpDownChevronIcon({ size = 32, color = "#979BAA" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Up chevron */}
      <path
        d="M12 18L16 14L20 18"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Down chevron */}
      <path
        d="M12 14L16 18L20 14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
} 