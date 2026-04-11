import React from "react";

interface CraftLandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export function CraftLandLogoIcon({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="cl-bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#E03A00" />
        </linearGradient>
        <linearGradient id="cl-top" x1="10" y1="8" x2="34" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE0A0" />
          <stop offset="100%" stopColor="#FFB340" />
        </linearGradient>
        <linearGradient id="cl-left" x1="8" y1="20" x2="22" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6A00" />
          <stop offset="100%" stopColor="#B83000" />
        </linearGradient>
        <linearGradient id="cl-right" x1="22" y1="20" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF8C20" />
          <stop offset="100%" stopColor="#CC4400" />
        </linearGradient>
        <filter id="cl-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Background rounded square */}
      <rect width="44" height="44" rx="11" fill="url(#cl-bg)" />
      <rect width="44" height="44" rx="11" fill="white" fillOpacity="0.06" />

      {/* Isometric cube — top face */}
      <path
        d="M22 9 L35 16.5 L22 24 L9 16.5 Z"
        fill="url(#cl-top)"
        filter="url(#cl-shadow)"
      />
      {/* Cube edge highlight on top */}
      <path
        d="M22 9 L35 16.5 L22 24 L9 16.5 Z"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        strokeOpacity="0.4"
      />

      {/* Left face */}
      <path
        d="M9 16.5 L22 24 L22 36 L9 28.5 Z"
        fill="url(#cl-left)"
      />

      {/* Right face */}
      <path
        d="M22 24 L35 16.5 L35 28.5 L22 36 Z"
        fill="url(#cl-right)"
      />

      {/* Top edge center shine */}
      <path
        d="M22 9 L22 11"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />

      {/* Bottom face edges */}
      <path
        d="M9 28.5 L22 36 L35 28.5"
        stroke="white"
        strokeWidth="0.4"
        strokeOpacity="0.15"
        fill="none"
      />
    </svg>
  );
}

export function CraftLandLogo({ showText = true, textClassName = "" }: CraftLandLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <CraftLandLogoIcon size={36} />
      {showText && (
        <span className={`font-extrabold text-lg tracking-tight ${textClassName}`}>
          CraftLand <span className="text-primary">Hub</span>
        </span>
      )}
    </div>
  );
}
