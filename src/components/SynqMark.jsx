import React from "react";

export function SynqMark({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5,16.5 A9.5,9.5 0 0 1 21.5,16.5" opacity="0.5" />
      <path d="M6.2,16.5 A5.8,5.8 0 0 1 17.8,16.5" opacity="0.78" />
      <path d="M9.9,16.5 A2.1,2.1 0 0 1 14.1,16.5" />
      <circle cx="12" cy="16.5" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
