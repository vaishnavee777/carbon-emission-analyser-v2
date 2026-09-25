import { AnimatePresence, motion, useReducedMotion } from "motion/react"

interface CarbonTreeProps {
  emissions: number
  goal: number
}

const GROUND_Y = 205
const LEAF_COUNT = 42

const BRANCHES = [
  "M120 205 C 118 175, 122 150, 120 118",
  "M120 152 C 105 142, 90 130, 78 110",
  "M120 142 C 135 132, 150 120, 162 102",
  "M120 122 C 119 106, 121 90, 120 70",
  "M120 118 C 110 104, 100 94, 92 80",
  "M120 114 C 132 102, 140 92, 148 78",
]

const CLUSTERS = [
  { x: 78, y: 104, r: 20 },
  { x: 162, y: 96, r: 20 },
  { x: 120, y: 64, r: 24 },
  { x: 92, y: 76, r: 18 },
  { x: 148, y: 72, r: 18 },
  { x: 120, y: 92, r: 22 },
]

// Deterministic PRNG so the tree looks the same on every render.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LEAVES = (() => {
  const random = mulberry32(7)
  return Array.from({ length: LEAF_COUNT }, (_, id) => {
    const cluster = CLUSTERS[id % CLUSTERS.length]
    const angle = random() * Math.PI * 2
    const distance = Math.sqrt(random()) * cluster.r
    const x = cluster.x + Math.cos(angle) * distance
    const y = cluster.y + Math.sin(angle) * distance
    return {
      id,
      x,
      y,
      size: 5 + random() * 3,
      rotation: random() * 360,
      drift: (random() - 0.5) * 60,
      spin: (random() - 0.5) * 540,
      fall: GROUND_Y - y - 4,
    }
  })
})()

const HEALTHY = [159, 216, 174]
const DRY = [232, 195, 168]
const DEAD = [168, 135, 106]

function mix(a: number[], b: number[], t: number) {
  const [r, g, bl] = a.map((value, i) => Math.round(value + (b[i] - value) * t))
  return `rgb(${r}, ${g}, ${bl})`
}

function leafColor(health: number) {
  return health >= 0.5
    ? mix(DRY, HEALTHY, (health - 0.5) * 2)
    : mix(DEAD, DRY, health * 2)
}

function treeStatus(health: number) {
  if (health > 0.8) return "Thriving"
  if (health > 0.5) return "Healthy"
  if (health > 0.2) return "Wilting"
  return "Bare"
}

function CarbonTree({ emissions, goal }: CarbonTreeProps) {
  const reduceMotion = useReducedMotion()

  const ratio = goal > 0 ? emissions / goal : 0
  const health = Math.min(1, Math.max(0, 1.5 - ratio))
  const visibleLeaves = LEAVES.slice(0, Math.round(health * LEAF_COUNT))
  const color = leafColor(health)

  return (
    <section
      className="relative mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] p-5"
      aria-label={`Your tree is ${treeStatus(health).toLowerCase()}: ${emissions.toFixed(1)} of ${goal} kg CO2e weekly goal`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            Your tree
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {treeStatus(health)}
          </p>
        </div>
        <p className="text-right text-sm text-[var(--text-muted)]">
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {emissions.toFixed(1)}
          </span>
          {" / "}
          {goal} kg
          <br />
          this week
        </p>
      </div>

      <svg
        viewBox="0 0 240 220"
        className="mx-auto mt-2 block w-full max-w-[280px]"
        role="img"
        aria-hidden="true"
      >
        <motion.circle
          cx={120}
          cy={88}
          r={70}
          fill={color}
          animate={{ opacity: health * 0.12 }}
          transition={{ duration: 1 }}
          style={{ filter: "blur(18px)" }}
        />

        <ellipse cx={120} cy={GROUND_Y} rx={70} ry={7} fill="white" opacity={0.06} />

        <motion.g
          style={{ transformOrigin: "120px 205px", transformBox: "view-box" }}
          animate={reduceMotion ? undefined : { rotate: [-1.2, 1.2] }}
          transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        >
          {BRANCHES.map((d, index) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="#8a6f8f"
              strokeWidth={index === 0 ? 9 : 4.5 - index * 0.4}
              strokeLinecap="round"
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, delay: index === 0 ? 0 : 0.5 + index * 0.12, ease: "easeOut" }}
            />
          ))}

          <AnimatePresence>
            {visibleLeaves.map((leaf) => (
              <motion.g
                key={leaf.id}
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        y: leaf.fall,
                        x: leaf.drift,
                        rotate: leaf.spin,
                        opacity: [1, 1, 0],
                        transition: { duration: 1.8, ease: "easeIn" },
                      }
                }
                transition={{ type: "spring", stiffness: 180, damping: 14, delay: 1.1 + leaf.id * 0.015 }}
              >
                <motion.ellipse
                  cx={leaf.x}
                  cy={leaf.y}
                  rx={leaf.size}
                  ry={leaf.size * 0.55}
                  transform={`rotate(${leaf.rotation} ${leaf.x} ${leaf.y})`}
                  initial={{ fill: color }}
                  animate={{ fill: color }}
                  transition={{ duration: 1.2 }}
                />
              </motion.g>
            ))}
          </AnimatePresence>
        </motion.g>
      </svg>

      <p className="mt-1 text-center text-xs text-[var(--text-muted)]">
        {health >= 1
          ? "Under half your weekly goal. Full canopy."
          : `${LEAF_COUNT - visibleLeaves.length} of ${LEAF_COUNT} leaves lost. Cut this week's emissions to regrow them.`}
      </p>
    </section>
  )
}

export default CarbonTree
