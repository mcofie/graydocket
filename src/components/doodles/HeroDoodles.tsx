import styles from './hero-doodles.module.css'

// Hero art in the spirit of family.co: two playful clusters flanking the headline on wide screens,
// and a row of four icons above it on small ones. Same character family as the section doodles.

const INK = '#333333'
const BEIGE = '#f3efe7'
const BEIGE_DARK = '#e6dfd2'
const C = {
  blue: '#4dafff', blueLight: '#7fc4ff', bluePale: '#cfe8ff',
  green: '#44c67f', greenLight: '#8ddcae',
  orange: '#ff5310', orangeLight: '#ff8a5c',
  gold: '#f5b442', goldLight: '#fbd38a', goldPale: '#fdecc8',
  red: '#ff4d2e',
}

/** Wraps an item so it pops in (after `delay` ms) and then floats on its own rhythm */
function Item({ delay, children, slow = false }: { delay: number; children: React.ReactNode; slow?: boolean }) {
  return (
    <g className={styles.pop} style={{ animationDelay: `${delay}ms` }}>
      <g className={slow ? styles.floatSlow : styles.float} style={{ animationDelay: `${delay + 600}ms` }}>
        {children}
      </g>
    </g>
  )
}

function Sparkle({ x, y, s = 10, fill = C.gold }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <path
      d={`M ${x} ${y - s} L ${x + s * 0.3} ${y - s * 0.3} L ${x + s} ${y} L ${x + s * 0.3} ${y + s * 0.3} L ${x} ${y + s} L ${x - s * 0.3} ${y + s * 0.3} L ${x - s} ${y} L ${x - s * 0.3} ${y - s * 0.3} Z`}
      fill={fill}
    />
  )
}

function Star({ x, y, r = 16, fill = C.gold }: { x: number; y: number; r?: number; fill?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.48
    return `${(x + rad * Math.cos(a)).toFixed(1)},${(y + rad * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return <polygon points={pts} fill={fill} strokeLinejoin="round" stroke={fill} strokeWidth={4} />
}

/** Gold cedi coin with a shine stripe */
function Coin({ x, y, r = 30 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x + 3} cy={y + 4} r={r} fill="#e9a228" />
      <circle cx={x} cy={y} r={r} fill={C.gold} />
      <circle cx={x} cy={y} r={r * 0.72} fill={C.goldLight} />
      <text x={x} y={y + r * 0.3} textAnchor="middle" fontSize={r * 0.9} fontWeight={700} fill="#d98f17" fontFamily="var(--font-sans), sans-serif">₵</text>
    </g>
  )
}

function Heart({ x, y, s = 1, fill = C.orange }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-8)`}>
      <path d="M 0 22 C -34 0 -32 -26 -14 -28 C -6 -29 -1 -23 0 -18 C 1 -23 6 -29 14 -28 C 32 -26 34 0 0 22 Z" fill={fill} />
      <ellipse cx={16} cy={-14} rx={5} ry={7} fill="#ffffff" opacity={0.55} transform="rotate(30 16 -14)" />
    </g>
  )
}

function Shield({ x, y, s = 1, fill = C.green }: { x: number; y: number; s?: number; fill?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(10)`}>
      <path d="M 0 -34 L 30 -24 V 0 C 30 22 16 34 0 42 C -16 34 -30 22 -30 0 V -24 Z" fill={fill} />
      <path d="M 0 -34 L 30 -24 V 0 C 30 22 16 34 0 42 Z" fill="#ffffff" opacity={0.18} />
    </g>
  )
}

type Eyes = 'open' | 'sleepy' | 'happy'

function Face({ x, y, eyes, gap = 18 }: { x: number; y: number; eyes: Eyes; gap?: number }) {
  if (eyes === 'open') {
    return (
      <g fill={INK}>
        <ellipse cx={x - gap / 2} cy={y} rx={6} ry={8} />
        <ellipse cx={x + gap / 2 + 4} cy={y - 2} rx={6} ry={8} />
      </g>
    )
  }
  const d = eyes === 'sleepy' ? 8 : -8
  return (
    <g fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round">
      <path d={`M ${x - gap - 6} ${y} q 8 ${d} 16 0`} />
      <path d={`M ${x + gap - 10} ${y} q 8 ${d} 16 0`} />
      <path d={`M ${x - 7} ${y + 14} q 7 8 14 0`} />
    </g>
  )
}

/** Short legs with coloured shoes, stepping */
function Legs({ x, y, shoe }: { x: number; y: number; shoe: string }) {
  return (
    <g>
      <path d={`M ${x - 14} ${y} q -4 18 -16 26`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d={`M ${x + 14} ${y} q 6 16 2 30`} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <rect x={x - 42} y={y + 20} width={20} height={12} rx={6} fill={shoe} />
      <rect x={x + 2} y={y + 26} width={20} height={12} rx={6} fill={shoe} />
    </g>
  )
}

/** The big puffy buddy from the section doodles, walking in */
function CloudBuddy({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const puffs: Array<[number, number]> = [[-62, -62], [0, -72], [62, -62], [-72, 0], [72, 0], [-62, 62], [0, 72], [62, 62]]
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-10)`}>
      <Legs x={0} y={110} shoe={C.goldLight} />
      <path d="M -96 60 q -30 30 -50 34" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
      <path d="M 104 -10 q 26 -6 36 -26" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
      {puffs.map(([dx, dy]) => (
        <circle key={`${dx}:${dy}`} cx={dx} cy={dy} r={48} fill={C.blueLight} />
      ))}
      <circle r={72} fill={C.blueLight} />
      <rect x={-54} y={-52} width={108} height={104} rx={12} fill={C.blue} transform="rotate(-6)" />
      <Face x={-2} y={-8} eyes="open" gap={30} />
    </g>
  )
}

/** Green bean-shaped buddy with a happy face */
function BeanBuddy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-6)`}>
      <Legs x={0} y={38} shoe={C.red} />
      <path d="M 54 6 q 22 6 30 20" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M -40 -40 q 8 -14 18 -8 q 8 -12 18 -2 q 10 -8 16 4" fill={C.orangeLight} />
      <rect x={-60} y={-42} width={120} height={84} rx={42} fill={C.green} />
      <Face x={0} y={-6} eyes="happy" gap={14} />
    </g>
  )
}

/** Orange flower-shaped buddy, eyes closed, running */
function FlowerBuddy({ x, y }: { x: number; y: number }) {
  const petals = Array.from({ length: 7 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 7
    return [Math.cos(a) * 30, Math.sin(a) * 30]
  })
  return (
    <g transform={`translate(${x} ${y}) rotate(8)`}>
      <path d="M -10 52 q -6 18 -20 24" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M 20 48 q 22 12 30 26" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M 44 10 q 22 4 30 18" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <rect x={-40} y={70} width={18} height={11} rx={5.5} fill={C.goldLight} />
      <rect x={42} y={70} width={18} height={11} rx={5.5} fill={C.goldLight} />
      {petals.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={26} fill={C.red} />
      ))}
      <circle r={36} fill={C.red} />
      <Face x={0} y={0} eyes="sleepy" gap={12} />
    </g>
  )
}

/** Gold rounded-triangle buddy */
function TriangleBuddy({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-4)`}>
      <Legs x={0} y={46} shoe={C.green} />
      <path d="M 44 14 q 20 10 26 26" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M 0 -62 C 8 -62 64 30 58 40 C 54 50 -54 50 -58 40 C -64 30 -8 -62 0 -62 Z" fill={C.goldLight} />
      <circle cx={34} cy={-6} r={8} fill={C.red} />
      <Face x={0} y={14} eyes="open" gap={16} />
    </g>
  )
}

/** Little shop with a striped awning: "start your business" */
function Shop({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-6)`}>
      <rect x={-44} y={-44} width={88} height={88} rx={20} fill={BEIGE} />
      <rect x={-28} y={-6} width={56} height={34} rx={4} fill="#ffffff" />
      <rect x={-8} y={6} width={16} height={22} rx={3} fill={C.blue} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M ${-32 + i * 16} -24 h 16 v 10 a 8 8 0 0 1 -16 0 z`} fill={i % 2 === 0 ? C.green : '#ffffff'} />
      ))}
      <rect x={-34} y={-30} width={68} height={8} rx={4} fill={C.green} />
    </g>
  )
}

function Magnifier({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-20)`}>
      <circle r={26} fill="none" stroke={C.blue} strokeWidth={12} />
      <path d="M -10 -12 a 14 14 0 0 1 12 -4" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
      <rect x={-7} y={30} width={14} height={34} rx={7} fill={C.blue} />
    </g>
  )
}

function Padlock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-12)`}>
      <path d="M -16 -8 v -12 a 16 16 0 0 1 32 0 v 12" fill="none" stroke={C.goldLight} strokeWidth={11} strokeLinecap="round" />
      <rect x={-30} y={-12} width={60} height={50} rx={12} fill={C.goldLight} />
      <rect x={-30} y={6} width={60} height={10} fill={C.gold} opacity={0.4} transform="rotate(-20)" />
    </g>
  )
}

function Calendar({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(8)`}>
      <rect x={-42} y={-38} width={84} height={80} rx={18} fill={BEIGE} />
      <rect x={-28} y={-22} width={56} height={52} rx={8} fill="#ffffff" />
      <rect x={-28} y={-22} width={56} height={14} rx={7} fill={C.orange} />
      <path d="M -12 10 l 8 8 l 16 -18" fill="none" stroke={C.green} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function CheckBadge({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={30} fill={BEIGE} />
      <path d={`M ${x - 14} ${y + 1} l 9 9 l 19 -20`} fill="none" stroke={C.green} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function ChatBubble({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(14)`}>
      <rect x={-46} y={-24} width={92} height={48} rx={24} fill={C.green} />
      <path d="M -30 18 l -6 18 l 18 -12 z" fill={C.green} />
      {[-18, 0, 18].map((cx) => (
        <circle key={cx} cx={cx} cy={0} r={6} fill="#ffffff" />
      ))}
    </g>
  )
}

function Document({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-10)`}>
      <rect x={-50} y={-62} width={100} height={124} rx={12} fill={BEIGE} />
      {[-34, -14, 6, 26].map((ly, i) => (
        <rect key={ly} x={-34} y={ly} width={i === 3 ? 40 : 68} height={8} rx={4} fill={BEIGE_DARK} />
      ))}
    </g>
  )
}

function PaperPlane({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-20)`}>
      <path d="M -26 4 L 30 -18 L 8 24 L 2 8 Z" fill={C.blue} />
      <path d="M 2 8 L 30 -18 L 8 24 Z" fill={C.blueLight} />
    </g>
  )
}

function Gear({ x, y, r = 30 }: { x: number; y: number; r?: number }) {
  const teeth = Array.from({ length: 8 }, (_, i) => (360 / 8) * i)
  return (
    <g transform={`translate(${x} ${y})`}>
      {teeth.map((deg) => (
        <rect key={deg} x={-7} y={-r - 8} width={14} height={18} rx={4} fill={BEIGE_DARK} transform={`rotate(${deg})`} />
      ))}
      <circle r={r} fill={BEIGE_DARK} />
      <circle r={r * 0.38} fill="#ffffff" />
    </g>
  )
}

type ArtProps = { className?: string }

export function HeroArtLeft({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 420 500" className={`${styles.art} ${className ?? ''}`} aria-hidden="true">
      <circle cx={300} cy={160} r={70} fill={BEIGE} />
      <circle cx={70} cy={420} r={62} fill={BEIGE} />
      <circle cx={300} cy={340} r={56} fill={BEIGE} />
      <Item delay={0}><Document x={20} y={280} /></Item>
      <Item delay={120} slow><CloudBuddy x={180} y={250} s={0.92} /></Item>
      <Item delay={220}><Coin x={176} y={64} r={32} /></Item>
      <Item delay={300} slow><Shield x={340} y={110} fill={C.goldLight} /></Item>
      <Item delay={360}><Heart x={350} y={250} s={1.25} /></Item>
      <Item delay={420}><PaperPlane x={392} y={170} /></Item>
      <Item delay={480} slow><Coin x={330} y={330} r={28} /></Item>
      <Item delay={520}><Gear x={290} y={430} r={26} /></Item>
      <Item delay={560}><Star x={286} y={210} r={16} /></Item>
      <Item delay={600}><Sparkle x={300} y={60} s={10} /></Item>
      <Item delay={620}><Sparkle x={120} y={130} s={8} fill={C.blue} /></Item>
      <Item delay={640}><Sparkle x={150} y={112} s={7} fill={C.blue} /></Item>
      <Item delay={660}><Sparkle x={200} y={440} s={9} /></Item>
      <circle cx={64} cy={92} r={18} fill={C.green} />
      <circle cx={18} cy={330} r={11} fill={C.red} />
      <circle cx={196} cy={470} r={22} fill={C.orange} />
      <circle cx={256} cy={420} r={10} fill={C.blue} />
      <Item delay={700}><Shield x={380} y={420} s={0.7} fill={C.blue} /></Item>
    </svg>
  )
}

export function HeroArtRight({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 460 500" className={`${styles.art} ${className ?? ''}`} aria-hidden="true">
      <circle cx={130} cy={330} r={76} fill={BEIGE} />
      <circle cx={360} cy={330} r={62} fill={BEIGE} />
      <circle cx={250} cy={110} r={50} fill={BEIGE} />
      <Item delay={60}><Shop x={150} y={80} /></Item>
      <Item delay={140}><CheckBadge x={330} y={60} /></Item>
      <Item delay={200}><ChatBubble x={440} y={110} /></Item>
      <Item delay={260} slow><BeanBuddy x={110} y={200} /></Item>
      <Item delay={320}><Padlock x={240} y={170} /></Item>
      <Item delay={380} slow><FlowerBuddy x={350} y={190} /></Item>
      <Item delay={440}><Magnifier x={190} y={300} /></Item>
      <Item delay={500}><Coin x={330} y={300} r={30} /></Item>
      <Item delay={560} slow><TriangleBuddy x={270} y={380} /></Item>
      <Item delay={620}><Calendar x={110} y={430} /></Item>
      <Item delay={660}><Star x={260} y={260} r={13} /></Item>
      <Item delay={680}><Sparkle x={40} y={110} s={9} fill={BEIGE_DARK} /></Item>
      <Item delay={700}><Sparkle x={420} y={240} s={10} /></Item>
      <Item delay={720}><Sparkle x={380} y={460} s={9} /></Item>
      <circle cx={60} cy={300} r={14} fill={C.blue} />
      <circle cx={200} cy={400} r={10} fill={C.green} />
      <circle cx={430} cy={380} r={12} fill={C.gold} />
      <circle cx={300} cy={20} r={9} fill={BEIGE_DARK} />
    </svg>
  )
}

/** Phones and small tablets: four icons in a row above the headline */
export function HeroArtRow({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 280 72" className={`${styles.row} ${className ?? ''}`} aria-hidden="true">
      <Item delay={0}><Coin x={36} y={36} r={28} /></Item>
      <Item delay={100}><Heart x={104} y={38} s={1.15} /></Item>
      <Item delay={200} slow>
        <g transform="translate(176 36) scale(0.26)">
          {[[-62, -62], [0, -72], [62, -62], [-72, 0], [72, 0], [-62, 62], [0, 72], [62, 62]].map(([dx, dy]) => (
            <circle key={`${dx}:${dy}`} cx={dx} cy={dy} r={48} fill={C.blueLight} />
          ))}
          <circle r={72} fill={C.blueLight} />
          <rect x={-54} y={-52} width={108} height={104} rx={12} fill={C.blue} transform="rotate(-6)" />
          <Face x={-2} y={-8} eyes="sleepy" gap={30} />
        </g>
      </Item>
      <Item delay={300}><Shield x={244} y={34} s={0.82} /></Item>
    </svg>
  )
}
