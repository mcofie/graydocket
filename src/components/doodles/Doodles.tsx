import styles from './doodles.module.css'

// Landing page doodles: one friendly character (a puffy cloud with a square, sleepy face) in each
// section's accent colour, with props that tell that section's story. Flat shapes, dark ink limbs.

const INK = '#333333'

type Palette = { light: string; face: string; pale: string; deep: string }

const GREEN: Palette = { light: '#8ddcae', face: '#44c67f', pale: '#d3f3e1', deep: '#2a9d5f' }

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

/** Compliance: meditating while the calendar, shield and clock take care of themselves */
export function ComplianceDoodle({ className, label }: DoodleProps) {
  const p = GREEN
  return (
    <svg viewBox="0 0 480 420" className={`${styles.doodle} ${className ?? ''}`} role="img" aria-label={label}>
      <Ground p={p} />
      <g>
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
      <g>
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
      <g>
        <path d="M 404 70 l 34 12 v 30 c 0 24 -16 40 -34 48 c -18 -8 -34 -24 -34 -48 v -30 z" fill={p.light} />
        <path d="M 404 70 l 34 12 v 30 c 0 24 -16 40 -34 48 z" fill={p.face} opacity={0.45} />
      </g>
      {/* Clock */}
      <g>
        <circle cx={420} cy={222} r={24} fill={p.pale} />
        <path d="M 420 208 v 15 l 10 7" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Sparkle x={360} y={150} size={9} color={p.light} />
      <Sparkle x={384} y={176} size={7} color={p.light} />
      <Sparkle x={90} y={232} size={8} color={p.light} />
    </svg>
  )
}
