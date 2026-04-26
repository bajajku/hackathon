'use client';

import * as React from 'react';

/**
 * Coda mark — abstract glyph evoking a musical coda (𝄌) crossed with a soundwave.
 * Lives as a decorative element on the landing hero and as a small wordmark companion.
 */
export function CodaMark({
  size = 96,
  drift = false,
  className,
}: {
  size?: number;
  drift?: boolean;
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label="Coda"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      style={drift ? { animation: 'codaDrift 18s ease-in-out infinite alternate' } : undefined}
    >
      <defs>
        <linearGradient id="codaMarkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff7a3d" />
          <stop offset="50%" stopColor="#ffb480" />
          <stop offset="100%" stopColor="#62e8ff" />
        </linearGradient>
        <radialGradient id="codaMarkGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,122,61,0.45)" />
          <stop offset="60%" stopColor="rgba(255,122,61,0.05)" />
          <stop offset="100%" stopColor="rgba(255,122,61,0)" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#codaMarkGlow)" />
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke="url(#codaMarkGrad)"
        strokeWidth="2.2"
        opacity="0.85"
      />
      <line x1="18" y1="60" x2="102" y2="60" stroke="url(#codaMarkGrad)" strokeWidth="2.2" />
      <line x1="60" y1="18" x2="60" y2="102" stroke="url(#codaMarkGrad)" strokeWidth="2.2" />
      <circle cx="60" cy="60" r="6" fill="#ff7a3d" />
    </svg>
  );
}

export function CodaWordmark({ className }: { className?: string }) {
  return (
    <span className={className} aria-label="Coda">
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4em' }}>
        <CodaMark size={22} />
        <span
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1',
            letterSpacing: '-0.01em',
          }}
        >
          Coda
        </span>
      </span>
    </span>
  );
}
