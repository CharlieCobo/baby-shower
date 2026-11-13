// Decoración "confeti" de Stitch: puramente visual.
const SPRINKLES = [
  'top-2 left-6 bg-secondary-fixed-dim -rotate-12',
  'top-10 left-2 bg-tertiary-fixed-dim rotate-45',
  'top-24 left-10 bg-primary-fixed-dim rotate-12',
  'top-6 right-24 bg-secondary-fixed rotate-[60deg]',
  'top-28 right-8 bg-tertiary-container -rotate-45',
]

export function Sprinkles() {
  return (
    <>
      {SPRINKLES.map((classes) => (
        <span
          key={classes}
          aria-hidden="true"
          className={`pointer-events-none absolute h-[6px] w-[18px] rounded-full ${classes}`}
        />
      ))}
    </>
  )
}

export function Lollipop() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -top-1 right-0 z-10 drop-shadow-sm"
      width="84"
      height="92"
      viewBox="0 0 110 120"
      fill="none"
    >
      <line
        x1="52"
        y1="58"
        x2="88"
        y2="114"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="46" cy="46" r="34" fill="#F4A6C4" />
      <path
        d="M 46 22 A 24 24 0 0 1 70 46 A 18 18 0 0 1 52 64 A 12 12 0 0 1 40 48 A 6 6 0 0 1 46 42"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="34" cy="30" r="3.5" fill="#FFFFFF" opacity="0.8" />
    </svg>
  )
}

export function WrappedCandy() {
  return (
    <svg aria-hidden="true" width="124" height="68" viewBox="0 0 124 68" fill="none">
      <path
        d="M 40 34 L 10 16 C 7 14 4 17 6 21 L 12 34 L 6 47 C 4 51 7 54 10 52 Z"
        fill="#C9B3E6"
      />
      <path
        d="M 84 34 L 114 16 C 117 14 120 17 118 21 L 112 34 L 118 47 C 120 51 117 54 114 52 Z"
        fill="#C9B3E6"
      />
      <circle cx="62" cy="34" r="27" fill="#F4A6C4" />
      <path
        d="M 49 14 C 54 20 54 48 49 54"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M 62 7 C 68 15 68 53 62 61"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M 75 14 C 80 20 80 48 75 54"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="53" cy="22" r="2.5" fill="#FFFFFF" />
    </svg>
  )
}
