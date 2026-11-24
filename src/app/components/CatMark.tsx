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
      {/* Chef hat: a tall band-and-body with a puffy top */}
      <path d="M84 46 C70 46 64 32 72 22 C72 8 90 2 99 11 C108 1 128 6 127 22 C136 31 130 46 116 46" />
      <path d="M85 44 L84 62 M115 44 L116 62" />
      <path d="M82 61 L82 69 C94 66 106 66 118 69 L118 61 C106 58 94 58 82 61" />
      {/* Head and ears, rising from behind the counter */}
      <path d="M52 156 C40 147 33 130 35 113 C37 99 44 89 51 84 C50 75 52 66 57 62 C61 59 66 59 70 61 C74 63 78 65 82 67" />
      <path d="M118 67 C122 65 126 63 130 61 C134 59 139 59 143 62 C148 66 150 75 149 84 C156 89 163 99 165 113 C167 130 160 147 148 156" />
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
      {mood === "happy" ? (
        <>
          {/* Open mouth, ready for a bite */}
          <path d="M93 123 C93 132 96 137 100 137 C104 137 107 132 107 123" fill="#f2a593" fillOpacity={0.55} strokeWidth={3} />
          <path d="M89 120 Q94.5 127 100 121 Q105.5 127 111 120" strokeWidth={3} />
        </>
      ) : (
        <path d="M90 124 Q95 131 100 124 Q105 131 110 124" strokeWidth={3} />
      )}
      <ellipse cx="62" cy="126" rx="7" ry="4.5" fill="#f2a593" stroke="none" opacity={0.7} />
      <ellipse cx="138" cy="126" rx="7" ry="4.5" fill="#f2a593" stroke="none" opacity={0.7} />
      {/* Paws on the counter */}
      <path d="M62 156 C61 148 63 143 67 142 C68 138 72 137 74 139 C75 136 79 136 80 139 C82 137 86 138 86 142 C90 143 91 149 90 156" />
      <path d="M110 156 C109 148 111 143 115 142 C116 138 120 137 122 139 C123 136 127 136 128 139 C130 137 134 138 134 142 C138 143 139 149 138 156" />
      <ellipse cx="76" cy="150" rx="4" ry="3" fill="#f2a593" stroke="none" opacity={0.6} />
      <ellipse cx="124" cy="150" rx="4" ry="3" fill="#f2a593" stroke="none" opacity={0.6} />
      {counter && <path d="M26 157 L174 157" />}
    </svg>
  );
}
