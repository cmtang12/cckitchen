import { useId } from "react";

// The CC's Kitchen cat: a thin, hand-drawn line cat in a tall chef hat.
// Drawn with `currentColor` so it takes the text colour it's placed in.
//
// Poses:
// - "counter": head and paws peeking up over the counter (greetings, empty states)
// - "pot": only the hat, ears, sly eyes and whiskers peeking out of a pot (the logo)

interface CatMarkProps {
  className?: string;
  /** "happy" for greetings, "sleepy" for empty states, "sly" for the pot logo. */
  mood?: "happy" | "sleepy" | "sly";
  pose?: "counter" | "pot";
  /** Show the counter line the paws rest on (counter pose only). */
  counter?: boolean;
  title?: string;
}

const BLUSH = "#f2a593";

function Hat() {
  return (
    <>
      <path d="M84 46 C70 46 64 32 72 22 C72 8 90 2 99 11 C108 1 128 6 127 22 C136 31 130 46 116 46" />
      <path d="M85 44 L84 62 M115 44 L116 62" />
      <path d="M82 61 L82 69 C94 66 106 66 118 69 L118 61 C106 58 94 58 82 61" />
    </>
  );
}

function HeadOutline() {
  return (
    <>
      <path d="M52 156 C40 147 33 130 35 113 C37 99 44 89 51 84 C50 75 52 66 57 62 C61 59 66 59 70 61 C74 63 78 65 82 67" />
      <path d="M118 67 C122 65 126 63 130 61 C134 59 139 59 143 62 C148 66 150 75 149 84 C156 89 163 99 165 113 C167 130 160 147 148 156" />
    </>
  );
}

function Eyes({ mood }: { mood: "happy" | "sleepy" | "sly" }) {
  if (mood === "sleepy") {
    return (
      <>
        <path d="M72 111 Q80 117 88 111" />
        <path d="M112 111 Q120 117 128 111" />
      </>
    );
  }
  if (mood === "sly") {
    // Half-closed lids tilted the same way, eyes sneaking a glance to the side.
    return (
      <>
        <path d="M70 105 Q80 105 90 109" />
        <path d="M110 105 Q120 105 130 109" />
        <circle cx="85" cy="111" r="4.5" fill="currentColor" stroke="none" />
        <circle cx="125" cy="111" r="4.5" fill="currentColor" stroke="none" />
      </>
    );
  }
  return (
    <>
      <circle cx="80" cy="110" r="4" fill="currentColor" stroke="none" />
      <circle cx="120" cy="110" r="4" fill="currentColor" stroke="none" />
    </>
  );
}

function Whiskers() {
  return (
    <g strokeWidth={2.6}>
      <path d="M50 117 C40 114 31 112 22 112" />
      <path d="M50 124 C40 124 31 125 22 128" />
      <path d="M150 117 C160 114 169 112 178 112" />
      <path d="M150 124 C160 124 169 125 178 128" />
    </g>
  );
}

export function CatMark({
  className,
  mood,
  pose = "counter",
  counter = true,
  title = "CC's Kitchen cat",
}: CatMarkProps) {
  const clipId = "cat-clip-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const svgProps = {
    viewBox: "0 0 200 200",
    className,
    role: "img",
    "aria-label": title,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (pose === "pot") {
    const face = mood ?? "sly";
    // Everything below the rim (y = 122) is hidden inside the pot.
    return (
      <svg {...svgProps}>
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="200" height="121" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <g transform="translate(100 112) scale(0.9) translate(-100 -110)">
            <Hat />
            <HeadOutline />
            <Eyes mood={face} />
          </g>
        </g>
        {/* Whiskers poke out over the rim */}
        <g strokeWidth={2.6}>
          <path d="M58 113 C46 110 34 107 20 106" />
          <path d="M58 118 C46 117 34 117 18 119" />
          <path d="M142 113 C154 110 166 107 180 106" />
          <path d="M142 118 C154 117 166 117 182 119" />
        </g>
        {/* The pot */}
        <path d="M24 122 L176 122" />
        <path d="M34 124 L38 166 C39 175 45 180 54 180 L146 180 C155 180 161 175 162 166 L166 124" />
        <path d="M35 132 C22 131 18 147 33 148" />
        <path d="M165 132 C178 131 182 147 167 148" />
      </svg>
    );
  }

  const face = mood ?? "happy";
  return (
    <svg {...svgProps}>
      <Hat />
      <HeadOutline />
      <Eyes mood={face} />
      <Whiskers />
      {face === "sleepy" ? (
        <path d="M90 124 Q95 131 100 124 Q105 131 110 124" strokeWidth={3} />
      ) : (
        <>
          {/* Open mouth, ready for a bite */}
          <path d="M93 123 C93 132 96 137 100 137 C104 137 107 132 107 123" fill={BLUSH} fillOpacity={0.55} strokeWidth={3} />
          <path d="M89 120 Q94.5 127 100 121 Q105.5 127 111 120" strokeWidth={3} />
        </>
      )}
      <ellipse cx="62" cy="128" rx="6.5" ry="4" fill={BLUSH} stroke="none" opacity={0.7} />
      <ellipse cx="138" cy="128" rx="6.5" ry="4" fill={BLUSH} stroke="none" opacity={0.7} />
      {/* Paws on the counter */}
      <path d="M62 156 C61 148 63 143 67 142 C68 138 72 137 74 139 C75 136 79 136 80 139 C82 137 86 138 86 142 C90 143 91 149 90 156" />
      <path d="M110 156 C109 148 111 143 115 142 C116 138 120 137 122 139 C123 136 127 136 128 139 C130 137 134 138 134 142 C138 143 139 149 138 156" />
      <ellipse cx="76" cy="150" rx="4" ry="3" fill={BLUSH} stroke="none" opacity={0.6} />
      <ellipse cx="124" cy="150" rx="4" ry="3" fill={BLUSH} stroke="none" opacity={0.6} />
      {counter && <path d="M26 157 L174 157" />}
    </svg>
  );
}
