import { BeanBuddy, Calendar, ChatBubble, CheckBadge, CloudBuddy, Heart, PaperPlane, Shield, Sparkle } from './HeroDoodles'
import styles from './bento-doodles.module.css'

// Doodle vignettes for the landing page feature grid, drawn with the same characters and props as
// the hero. Items pop in when the grid scrolls into view (Reveal sets data-reveal on the grid).

const INK = '#333333'
const BEIGE = '#f3efe7'
const BEIGE_DARK = '#e6dfd2'
const GREEN = '#44c67f'
const GOLD = '#f5b442'
const GOLD_LIGHT = '#fbd38a'
const ORANGE = '#ff5310'

/** Pops in after `delay` ms once the grid is revealed */
function Pop({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <g className={styles.pop} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </g>
  )
}

type Props = { className?: string }

const HANDLED = ['Registration', 'Name search', 'Compliance', 'Documents']
const DOTS = ['#4dafff', GREEN, GOLD, ORANGE]

/** Easy: the buddy beside a clipboard that ticks off everything we handle */
export function EasyDoodle({ className }: Props) {
  return (
    <svg viewBox="0 0 320 300" className={`${styles.art} ${className ?? ''}`} role="img" aria-label={`We handle ${HANDLED.join(', ')}`}>
      <circle cx={70} cy={70} r={46} fill={BEIGE} />
      <circle cx={290} cy={250} r={30} fill={BEIGE} />
      {/* Clipboard */}
      <g transform="rotate(4 220 150)">
        <rect x={130} y={36} width={168} height={224} rx={20} fill={BEIGE_DARK} />
        <rect x={142} y={56} width={144} height={192} rx={12} fill="#ffffff" />
        <rect x={184} y={26} width={60} height={22} rx={11} fill={INK} />
        {HANDLED.map((label, i) => {
          const y = 92 + i * 42
          return (
            <g key={label}>
              <circle cx={162} cy={y} r={7} fill={DOTS[i]} />
              <text x={174} y={y + 5} fontSize={13} fontWeight={600} fill="#111827" fontFamily="var(--font-sans), sans-serif">
                {label}
              </text>
              <Pop delay={500 + i * 220}>
                <path d={`M 266 ${y - 1} l 5 5 l 10 -11`} fill="none" stroke={GREEN} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              </Pop>
            </g>
          )
        })}
      </g>
      {/* Buddy, waving, in front */}
      <g className={styles.float}>
        <CloudBuddy x={84} y={186} s={0.48} />
      </g>
      <Pop delay={300}><Sparkle x={36} y={150} s={8} fill={GOLD} /></Pop>
      <Pop delay={360}><Sparkle x={118} y={24} s={7} fill="#4dafff" /></Pop>
    </svg>
  )
}

/** Fast: a stopwatch at 15 minutes, with a paper plane already on its way */
export function FastDoodle({ className }: Props) {
  return (
    <svg viewBox="0 0 280 120" className={`${styles.art} ${className ?? ''}`} role="img" aria-label="About 15 minutes, then it's submitted">
      <circle cx={232} cy={86} r={22} fill={BEIGE} />
      <g className={styles.float}>
        <g transform="translate(92 64) rotate(-8)">
          <rect x={-8} y={-52} width={16} height={12} rx={4} fill={INK} />
          <circle r={42} fill={GOLD} />
          <circle r={32} fill="#ffffff" />
          <path d="M 0 0 L 0 -22" stroke={INK} strokeWidth={5} strokeLinecap="round" />
          <path d="M 0 0 L 16 0" stroke={ORANGE} strokeWidth={5} strokeLinecap="round" />
          <circle r={4} fill={INK} />
        </g>
      </g>
      {/* Speed lines */}
      <g stroke={GOLD_LIGHT} strokeWidth={6} strokeLinecap="round">
        <line x1={22} y1={46} x2={40} y2={46} />
        <line x1={14} y1={64} x2={38} y2={64} />
        <line x1={22} y1={82} x2={40} y2={82} />
      </g>
      <Pop delay={500}>
        <g className={styles.fly}>
          <PaperPlane x={196} y={44} />
        </g>
      </Pop>
      <Pop delay={600}>
        <rect x={158} y={78} width={58} height={24} rx={12} fill={BEIGE} />
        <text x={187} y={95} textAnchor="middle" fontSize={13} fontWeight={700} fill="#111827" fontFamily="var(--font-sans), sans-serif">15 min</text>
      </Pop>
    </svg>
  )
}

/** Handled: the bean buddy taking it easy between a shield and a tick */
export function HandledDoodle({ className }: Props) {
  return (
    <svg viewBox="0 0 280 120" className={`${styles.art} ${className ?? ''}`} role="img" aria-label="Filed for you, kept compliant">
      <circle cx={140} cy={66} r={50} fill={BEIGE} />
      <Pop delay={300}><Shield x={50} y={58} s={0.9} /></Pop>
      <g className={styles.float}>
        <g transform="translate(140 50) scale(0.62)">
          <BeanBuddy x={0} y={0} />
        </g>
      </g>
      <Pop delay={500}><CheckBadge x={232} y={56} /></Pop>
      <Pop delay={650}><Sparkle x={250} y={18} s={7} fill={GOLD} /></Pop>
    </svg>
  )
}

/** Reliable: the calendar rings well before anything is due */
export function ReliableDoodle({ className }: Props) {
  return (
    <svg viewBox="0 0 280 120" className={`${styles.art} ${className ?? ''}`} role="img" aria-label="Every deadline tracked, with early reminders">
      <circle cx={70} cy={86} r={24} fill={BEIGE} />
      <g className={styles.float}>
        <Calendar x={128} y={62} />
      </g>
      <Pop delay={400}>
        <g className={styles.ring}>
          <g transform="translate(200 44)">
            <path d="M -18 10 C -18 -14 -10 -22 0 -22 C 10 -22 18 -14 18 10 L 24 18 H -24 Z" fill={GOLD} />
            <circle cy={-25} r={5} fill={GOLD} />
            <circle cy={22} r={6} fill={INK} />
          </g>
        </g>
        <g fill="none" stroke={GOLD_LIGHT} strokeWidth={4} strokeLinecap="round">
          <path d="M 232 22 q 8 10 0 22" />
          <path d="M 242 16 q 12 16 0 34" />
        </g>
      </Pop>
      <Pop delay={600}><Sparkle x={58} y={30} s={8} fill={GOLD} /></Pop>
    </svg>
  )
}

/** Supported: a quick question, a friendly answer */
export function SupportedDoodle({ className }: Props) {
  return (
    <svg viewBox="0 0 280 120" className={`${styles.art} ${className ?? ''}`} role="img" aria-label="Talk to a real person on WhatsApp or email">
      <Pop delay={200}>
        <g transform="rotate(-6 90 44)">
          <rect x={40} y={20} width={100} height={46} rx={23} fill={BEIGE_DARK} />
          <path d="M 120 58 l 10 16 l -24 -10 z" fill={BEIGE_DARK} />
          <text x={90} y={51} textAnchor="middle" fontSize={22} fontWeight={700} fill="#111827" fontFamily="var(--font-sans), sans-serif">?</text>
        </g>
      </Pop>
      <Pop delay={700}>
        <g className={styles.float}>
          <ChatBubble x={186} y={78} />
        </g>
      </Pop>
      <Pop delay={900}><Heart x={252} y={34} s={0.7} /></Pop>
    </svg>
  )
}
