import { useId } from "react";

// The C&C's Kitchen logo: a thin, hand-drawn slice of toast winking with his
// tongue out. The crust is a second outline set down and to the right behind
// him, like a soft shadow. Drawn with `currentColor` so it takes the text colour.

const BLUSH = "#f2a593";
const TONGUE = "#ee8f86";
const SLICE =
  "M52 130 L52 85 C41 83 35 74 35 64 C35 48 62 39 100 39 C138 39 165 48 165 64 C165 74 159 83 148 85 L148 130 C148 136 144 140 138 140 L62 140 C56 140 52 136 52 130 Z";

interface ToastMarkProps {
  className?: string;
  title?: string;
}

export function ToastMark({ className, title = "C&C's Kitchen toast" }: ToastMarkProps) {
  const maskId = "toast-crust-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox="26 15.5 148 148"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="translate(-4 -3.5)">
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
          <rect width="200" height="200" fill="#fff" />
          <path d={SLICE} fill="#000" stroke="#000" strokeWidth={7} />
        </mask>
        {/* Crust, peeking out behind the slice */}
        <g mask={`url(#${maskId})`}>
          <path d={SLICE} transform="translate(8 7)" strokeWidth={2.8} opacity={0.55} />
        </g>
        <path d={SLICE} />
        {/* Wink and open eye */}
        <path d="M73 95 L86 91 L73 87" strokeWidth={3} />
        <circle cx="120" cy="93" r="4.2" fill="currentColor" stroke="none" />
        <ellipse cx="72" cy="108" rx="6.5" ry="4" fill={BLUSH} stroke="none" opacity={0.75} />
        <ellipse cx="128" cy="108" rx="6.5" ry="4" fill={BLUSH} stroke="none" opacity={0.75} />
        {/* Tongue out to the side */}
        <g transform="translate(0 -20)">
          <path d="M100 131 C101 144 114 144 112 128" fill={TONGUE} />
          <path d="M106 132 L107 136" strokeWidth={2} />
          <path d="M88 125 Q100 134 114 124" />
        </g>
      </g>
    </svg>
  );
}
