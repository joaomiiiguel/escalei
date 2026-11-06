/** Marcações do campo traçadas a giz, com o mesmo traço irregular da landing. */
export function PitchLines() {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 150" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-giz/35">
      <defs>
        <filter id="giz-campo" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale={0.9} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" filter="url(#giz-campo)">
        <rect x="3" y="3" width="94" height="144" rx="1" vectorEffect="non-scaling-stroke" />
        <path d="M3 75 H97" vectorEffect="non-scaling-stroke" />
        <ellipse cx="50" cy="75" rx="14" ry="9.5" vectorEffect="non-scaling-stroke" />
        <path d="M24 3 V24 H76 V3 M37 3 V10 H63 V3" vectorEffect="non-scaling-stroke" />
        <path d="M24 147 V126 H76 V147 M37 147 V140 H63 V147" vectorEffect="non-scaling-stroke" />
        <path d="M41 24 Q50 30 59 24 M41 126 Q50 120 59 126" vectorEffect="non-scaling-stroke" />
      </g>
      <circle cx="50" cy="75" r="0.9" fill="currentColor" />
    </svg>
  );
}
