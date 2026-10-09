import styles from './doodles.module.css'

// Landing page doodles: one friendly character (a puffy cloud with a square, sleepy face) in each
// section's accent colour, with props that tell that section's story. Flat shapes, dark ink limbs.

const INK = '#333333'

type Palette = { light: string; face: string; pale: string; deep: string }

const BLUE: Palette = { light: '#7fc4ff', face: '#4dafff', pale: '#cfe8ff', deep: '#2b8be0' }
const GREEN: Palette = { light: '#8ddcae', face: '#44c67f', pale: '#d3f3e1', deep: '#2a9d5f' }
const GOLD: Palette = { light: '#fbd38a', face: '#f5b442', pale: '#fdecc8', deep: '#d98f17' }

const CX = 240
const CY = 190

/** The puffy body and sleepy face, centred on (CX, CY) */
function Buddy({ p }: { p: Palette }) {
  const puffs: Array<[number, number]> = [
    [-62, -62], [0, -72], [62, -62],
    [-72, 0], [72, 0],
    [-62, 62], [0, 72], [62, 62],
  ]
  return (
    <g>
      {puffs.map(([dx, dy]) => (
        <circle key={`${dx}:${dy}`} cx={CX + dx} cy={CY + dy} r={48} fill={p.light} />
      ))}
      <circle cx={CX} cy={CY} r={72} fill={p.light} />
      <rect x={CX - 52} y={CY - 50} width={104} height={100} rx={12} fill={p.face} transform={`rotate(-2 ${CX} ${CY})`} />
      <g fill="none" stroke={INK} strokeWidth={6.5} strokeLinecap="round">
        <path d={`M ${CX - 32} ${CY - 10} q 10 12 20 0`} />
        <path d={`M ${CX + 10} ${CY - 10} q 10 12 20 0`} />
        <path d={`M ${CX - 9} ${CY + 14} q 9 10 18 0`} />
      </g>
    </g>
  )
}

/** Little feet poking out under the body */
function Feet({ p }: { p: Palette }) {
  return (
    <g>
      <rect x={CX - 34} y={CY + 108} width={22} height={34} rx={11} fill={p.face} transform={`rotate(12 ${CX - 23} ${CY + 125})`} />
      <rect x={CX + 12} y={CY + 108} width={22} height={34} rx={11} fill={p.light} transform={`rotate(-10 ${CX + 23} ${CY + 125})`} />
    </g>
  )
}

/** Puddle and pebbles the character floats above */
function Ground({ p }: { p: Palette }) {
  return (
    <g>
      <ellipse cx={CX} cy={CY + 190} rx={150} ry={15} fill={p.pale} />
      <path d={`M ${CX - 70} ${CY + 192} a 24 22 0 0 1 48 0 z`} fill={INK} />
      <path d={`M ${CX - 6} ${CY + 194} a 34 32 0 0 1 68 0 z`} fill="#555555" />
      <path d={`M ${CX + 58} ${CY + 190} a 16 14 0 0 1 32 0 z`} fill={INK} />
    </g>
  )
}

function Sparkle({ x, y, size = 10, color }: { x: number; y: number; size?: number; color: string }) {
  const s = size
  return (
    <path
      d={`M ${x} ${y - s} L ${x + s * 0.28} ${y - s * 0.28} L ${x + s} ${y} L ${x + s * 0.28} ${y + s * 0.28} L ${x} ${y + s} L ${x - s * 0.28} ${y + s * 0.28} L ${x - s} ${y} L ${x - s * 0.28} ${y - s * 0.28} Z`}
      fill={color}
    />
  )
}

function Check({ x, y, color, width = 9 }: { x: number; y: number; color: string; width?: number }) {
  return <path d={`M ${x} ${y} l 14 14 l 26 -32`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
}

type DoodleProps = { className?: string; label: string }

/** Name search: holding a magnifying glass up to a name tag that's been approved */
export function NameDoodle({ className, label }: DoodleProps) {
  const p = BLUE
  return (
    <svg viewBox="0 0 480 420" className={`${styles.doodle} ${className ?? ''}`} role="img" aria-label={label}>
      <Ground p={p} />
      <g className={styles.float}>
        <Feet p={p} />
        {/* Left arm waving */}
        <path d={`M ${CX - 112} ${CY + 6} C ${CX - 140} ${CY - 4}, ${CX - 150} ${CY - 34}, ${CX - 146} ${CY - 60}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        {/* Right arm holding the glass */}
        <path d={`M ${CX + 112} ${CY + 8} C ${CX + 128} ${CY + 2}, ${CX + 134} ${CY - 10}, ${CX + 136} ${CY - 22}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <Buddy p={p} />
        <g className={styles.bob}>
          <line x1={CX + 136} y1={CY - 22} x2={CX + 152} y2={CY - 44} stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <circle cx={CX + 172} cy={CY - 70} r={30} fill="#ffffff" fillOpacity={0.75} stroke={INK} strokeWidth={8} />
          <path d={`M ${CX + 158} ${CY - 84} a 20 20 0 0 1 16 -6`} fill="none" stroke={p.face} strokeWidth={6} strokeLinecap="round" />
        </g>
      </g>
      {/* Name tag, approved */}
      <g className={styles.bobSlow}>
        <rect x={36} y={52} width={150} height={64} rx={14} fill={p.pale} transform="rotate(-6 111 84)" />
        <g transform="rotate(-6 111 84)">
          <circle cx={58} cy={84} r={7} fill="#ffffff" />
          <rect x={76} y={70} width={78} height={10} rx={5} fill={p.light} />
          <rect x={76} y={88} width={52} height={10} rx={5} fill={p.light} />
        </g>
        <circle cx={182} cy={58} r={20} fill={p.face} />
        <path d="M 172 58 l 7 7 l 13 -15" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={420} y={70} size={12} color={p.light} />
      <Sparkle x={446} y={110} size={8} color={p.light} />
      <Sparkle x={62} y={200} size={9} color={p.light} />
    </svg>
  )
}

/** Compliance: meditating while the calendar, shield and clock take care of themselves */
export function ComplianceDoodle({ className, label }: DoodleProps) {
  const p = GREEN
  return (
    <svg viewBox="0 0 480 420" className={`${styles.doodle} ${className ?? ''}`} role="img" aria-label={label}>
      <Ground p={p} />
      <g className={styles.float}>
        {/* Crossed legs under the body */}
        <path d={`M ${CX - 58} ${CY + 96} C ${CX - 30} ${CY + 140}, ${CX + 30} ${CY + 140}, ${CX + 58} ${CY + 96}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <rect x={CX - 30} y={CY + 118} width={20} height={32} rx={10} fill={p.face} transform={`rotate(14 ${CX - 20} ${CY + 134})`} />
        <rect x={CX + 10} y={CY + 118} width={20} height={32} rx={10} fill={p.light} transform={`rotate(-14 ${CX + 20} ${CY + 134})`} />
        {/* Arms raised in a calm pose */}
        <path d={`M ${CX - 110} ${CY + 18} C ${CX - 136} ${CY + 14}, ${CX - 142} ${CY - 14}, ${CX - 136} ${CY - 34}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d={`M ${CX + 110} ${CY + 18} C ${CX + 136} ${CY + 14}, ${CX + 142} ${CY - 14}, ${CX + 136} ${CY - 34}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <Buddy p={p} />
      </g>
      {/* Calendar with every date ticked */}
      <g className={styles.bobSlow}>
        <g transform="translate(-22 -6) rotate(-8 92 118)">
          <rect x={44} y={74} width={96} height={90} rx={14} fill={p.pale} />
          <rect x={44} y={74} width={96} height={26} rx={14} fill={p.face} />
          <rect x={44} y={88} width={96} height={12} fill={p.face} />
          <rect x={64} y={64} width={8} height={20} rx={4} fill={INK} />
          <rect x={112} y={64} width={8} height={20} rx={4} fill={INK} />
          <Check x={70} y={130} color={p.deep} width={8} />
        </g>
      </g>
      {/* Shield */}
      <g className={styles.bob}>
        <path d="M 404 70 l 34 12 v 30 c 0 24 -16 40 -34 48 c -18 -8 -34 -24 -34 -48 v -30 z" fill={p.light} />
        <path d="M 404 70 l 34 12 v 30 c 0 24 -16 40 -34 48 z" fill={p.face} opacity={0.45} />
      </g>
      {/* Clock */}
      <g className={styles.bobSlow}>
        <circle cx={420} cy={222} r={24} fill={p.pale} />
        <path d="M 420 208 v 15 l 10 7" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={360} y={150} size={9} color={p.light} />
      <Sparkle x={384} y={176} size={7} color={p.light} />
      <Sparkle x={90} y={232} size={8} color={p.light} />
    </svg>
  )
}

/** Document vault: hugging a folder of papers, with a padlock and a sealed certificate nearby */
export function VaultDoodle({ className, label }: DoodleProps) {
  const p = GOLD
  return (
    <svg viewBox="0 0 480 420" className={`${styles.doodle} ${className ?? ''}`} role="img" aria-label={label}>
      <Ground p={p} />
      <g className={styles.float}>
        <Feet p={p} />
        <Buddy p={p} />
        {/* Folder held in front (below the face), papers peeking out */}
        <g transform="translate(0 40)">
          <rect x={CX - 66} y={CY + 30} width={132} height={92} rx={10} fill={p.deep} />
          <rect x={CX - 66} y={CY + 22} width={52} height={18} rx={8} fill={p.deep} />
          <rect x={CX - 50} y={CY + 14} width={96} height={70} rx={6} fill="#ffffff" transform={`rotate(-5 ${CX} ${CY + 50})`} />
          <rect x={CX - 40} y={CY + 30} width={56} height={8} rx={4} fill={p.pale} transform={`rotate(-5 ${CX} ${CY + 50})`} />
          <rect x={CX - 40} y={CY + 46} width={70} height={8} rx={4} fill={p.pale} transform={`rotate(-5 ${CX} ${CY + 50})`} />
          <rect x={CX - 72} y={CY + 56} width={144} height={72} rx={12} fill={p.face} />
          <rect x={CX - 18} y={CY + 84} width={36} height={8} rx={4} fill={p.deep} opacity={0.5} />
        </g>
        {/* Arms wrapped around the folder */}
        <path d={`M ${CX - 112} ${CY + 30} C ${CX - 128} ${CY + 70}, ${CX - 106} ${CY + 118}, ${CX - 62} ${CY + 122}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
        <path d={`M ${CX + 112} ${CY + 30} C ${CX + 128} ${CY + 70}, ${CX + 106} ${CY + 118}, ${CX + 62} ${CY + 122}`} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
      </g>
      {/* Padlock */}
      <g className={styles.bobSlow}>
        <g transform="rotate(-10 92 140)">
          <path d="M 74 120 v -14 a 18 18 0 0 1 36 0 v 14" fill="none" stroke={p.light} strokeWidth={12} strokeLinecap="round" />
          <rect x={58} y={116} width={68} height={56} rx={14} fill={p.light} />
          <rect x={58} y={136} width={68} height={12} fill={p.face} opacity={0.35} transform="rotate(-20 92 142)" />
        </g>
      </g>
      {/* Certificate with a seal */}
      <g className={styles.bob}>
        <g transform="rotate(8 410 110)">
          <rect x={364} y={66} width={92} height={74} rx={10} fill={p.pale} />
          <rect x={378} y={82} width={52} height={7} rx={3.5} fill={p.light} />
          <rect x={378} y={96} width={38} height={7} rx={3.5} fill={p.light} />
          <path d="M 426 134 l -6 26 l 10 -6 l 8 8 l 2 -26 z" fill={p.deep} />
          <circle cx={432} cy={126} r={14} fill={p.face} />
        </g>
      </g>
      <Check x={392} y={214} color={p.light} width={8} />
      <Sparkle x={70} y={226} size={9} color={p.light} />
      <Sparkle x={96} y={254} size={6} color={p.light} />
    </svg>
  )
}
