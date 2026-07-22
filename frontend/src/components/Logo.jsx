import React from 'react';

export default function Logo({ size = 64, showWordmark = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8C874" />
            <stop offset="55%" stopColor="#C9962C" />
            <stop offset="100%" stopColor="#9C7118" />
          </linearGradient>
          <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F07A44" />
            <stop offset="100%" stopColor="#D14E1F" />
          </linearGradient>
        </defs>
        <path d="M32 3 L56 16 V40 C56 51 45 58 32 61 C19 58 8 51 8 40 V16 Z" fill="#241A10" stroke="url(#g1)" strokeWidth="1.6" />
        <g stroke="url(#g1)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85">
          <line x1="32" y1="32" x2="32" y2="14" />
          <line x1="32" y1="32" x2="46" y2="21" />
          <line x1="32" y1="32" x2="50" y2="32" />
          <line x1="32" y1="32" x2="46" y2="43" />
          <line x1="32" y1="32" x2="32" y2="50" />
          <line x1="32" y1="32" x2="18" y2="43" />
          <line x1="32" y1="32" x2="14" y2="32" />
          <line x1="32" y1="32" x2="18" y2="21" />
        </g>
        <circle cx="32" cy="32" r="12.5" fill="url(#g2)" />
        <circle cx="32" cy="32" r="12.5" fill="none" stroke="url(#g1)" strokeWidth="1" />
        <path d="M36.4 26.8c-0.6-1.4-2-2.3-4-2.3-2.5 0-4.1 1.3-4.1 3.1 0 2 1.7 2.7 4 3.3 3 0.8 5.7 1.7 5.7 4.9 0 2.9-2.4 4.7-5.8 4.7-2.9 0-5.1-1.2-6-3.4"
              fill="none" stroke="#FFFDF8" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.5, fontWeight: 700, color: 'var(--ink)' }}>
          Solstice<span style={{ color: 'var(--gold)' }}>.</span>
        </span>
      )}
    </div>
  );
}
