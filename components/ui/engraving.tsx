import type React from "react"

const CENTER = 200
const RAY_COUNT = 96
const TICK_COUNT = 48

// Deterministic pseudo-random in [0, 1): prerendered markup and client
// hydration must produce byte-identical coordinates.
const jitter = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const round = (n: number) => Math.round(n * 100) / 100

const radial = (angle: number, from: number, to: number) => ({
  x1: round(CENTER + Math.cos(angle) * from),
  y1: round(CENTER + Math.sin(angle) * from),
  x2: round(CENTER + Math.cos(angle) * to),
  y2: round(CENTER + Math.sin(angle) * to),
})

const rays = Array.from({ length: RAY_COUNT }, (_, i) =>
  radial(
    (i * Math.PI * 2) / RAY_COUNT,
    i % 2 === 0 ? 62 : 70,
    132 + jitter(i) * 62,
  ),
)

const ticks = Array.from({ length: TICK_COUNT }, (_, i) =>
  radial(((i + 0.5) * Math.PI * 2) / TICK_COUNT, 44, 54),
)

const Engraving: React.FC = () => (
  <svg viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <g stroke="currentColor" fill="none">
      <circle
        cx={CENTER}
        cy={CENTER}
        r={188}
        strokeWidth={0.5}
        strokeDasharray="1 6"
      />
      <circle cx={CENTER} cy={CENTER} r={178} strokeWidth={0.75} />
      <circle cx={CENTER} cy={CENTER} r={58} strokeWidth={0.75} />
      <circle
        cx={CENTER}
        cy={CENTER}
        r={38}
        strokeWidth={0.5}
        strokeDasharray="2 4"
      />
      {rays.map((line, i) => (
        <line key={i} {...line} strokeWidth={0.75} />
      ))}
      {ticks.map((line, i) => (
        <line key={i} {...line} strokeWidth={0.6} />
      ))}
      <circle cx={CENTER} cy={CENTER} r={3} fill="currentColor" stroke="none" />
    </g>
  </svg>
)

export default Engraving
