// The CC's Kitchen cat: a thin, hand-drawn line cat in a little chef hat,
// peeking up over the edge with its paws on the counter. Drawn with
// `currentColor` so it takes the text colour it's placed in.

interface CatMarkProps {
  className?: string;
  /** "happy" for the logo and greetings, "sleepy" for empty states. */
  mood?: "happy" | "sleepy";
  /** Show the counter line the paws rest on. */
  counter?: boolean;
  title?: string;
}

export function CatMark({ className, mood = "happy", counter = true, title = "CC's Kitchen cat" }: CatMarkProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Chef hat */}
      <path d="M80 62 C66 60 62 44 72 36 C76 24 92 22 98 30 C104 20 122 22 126 34 C138 38 136 58 120 62" />
      <path d="M82 60 L82 68 C94 65 106 65 118 68 L118 60" />
      {/* Head and ears, rising from behind the counter */}
      <path d="M52 156 C40 147 33 130 35 113 C37 99 44 89 51 84 C50 76 51 67 55 61 C58 57 62 56 66 58 C72 61 77 64 82 67" />
      <path d="M118 67 C123 64 128 61 134 58 C138 56 142 57 145 61 C149 67 150 76 149 84 C156 89 163 99 165 113 C167 130 160 147 148 156" />
      {/* Inner ear blush */}
      <path d="M58 64 C56.5 68 56.5 73 57.5 78 C61 76 64 73 67 69 C64 66 61 64 58 64 Z" fill="#f2a593" stroke="none" opacity={0.9} />
      {/* Face */}
      {mood === "happy" ? (
        <>
          <circle cx="80" cy="110" r="4" fill="currentColor" stroke="none" />
          <circle cx="120" cy="110" r="4" fill="currentColor" stroke="none" />
        </>
      ) : (
        <>
          <path d="M72 111 Q80 117 88 111" />
          <path d="M112 111 Q120 117 128 111" />
        </>
      )}
      <path d="M90 124 Q95 131 100 124 Q105 131 110 124" strokeWidth={3} />
      <ellipse cx="62" cy="126" rx="7" ry="4.5" fill="#f2a593" stroke="none" opacity={0.7} />
      <ellipse cx="138" cy="126" rx="7" ry="4.5" fill="#f2a593" stroke="none" opacity={0.7} />
      {/* Paws on the counter */}
      <path d="M62 156 C62 144 70 140 76 140 C82 140 90 144 90 156" />
      <path d="M110 156 C110 144 118 140 124 140 C130 140 138 144 138 156" />
      <path d="M72 148 L72 153 M80 148 L80 153" strokeWidth={2.6} />
      <path d="M120 148 L120 153 M128 148 L128 153" strokeWidth={2.6} />
      {counter && <path d="M26 157 L174 157" />}
    </svg>
  );
}
