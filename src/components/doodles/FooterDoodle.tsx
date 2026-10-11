import { BeanBuddy, Calendar, CloudBuddy, Sparkle } from './HeroDoodles'

/** A registered founder opening for business, with ongoing filings taken care of. */
export default function FooterDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 330"
      className={className}
      role="img"
      aria-label="A happy doodle founder opening a shop with an approved registration certificate and a checked compliance calendar."
    >
      <circle cx={165} cy={174} r={115} fill="#f1eade" />
      <circle cx={389} cy={174} r={104} fill="#f1eade" />
      <ellipse cx={282} cy={305} rx={232} ry={10} fill="#e6dfd2" opacity={0.65} />

      <g transform="translate(245 90) rotate(9)">
        <rect x={-49} y={-65} width={98} height={128} rx={12} fill="#ffffff" />
        <rect x={-30} y={-44} width={60} height={7} rx={3.5} fill="#e6dfd2" />
        <rect x={-22} y={-27} width={44} height={6} rx={3} fill="#e6dfd2" />
        <path d="M -12 24 l -5 37 l 17 -10 l 17 10 l -5 -37" fill="#f5b442" />
        <circle cy={16} r={23} fill="#fbd38a" />
        <path d="M -10 16 l 7 7 l 14 -15" fill="none" stroke="#a9670a" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g transform="translate(304 117)">
        <rect y={24} width={160} height={142} rx={16} fill="#ffffff" />
        <rect x={15} y={83} width={56} height={64} rx={7} fill="#cfe8ff" />
        <path d="M 43 86 V 145 M 18 115 H 68" stroke="#ffffff" strokeWidth={5} />
        <rect x={90} y={83} width={48} height={83} rx={7} fill="#4dafff" />
        <circle cx={129} cy={126} r={3} fill="#ffffff" />
        <rect x={18} y={-13} width={124} height={31} rx={10} fill="#fbd38a" />
        <path d="M -6 28 H 166 L 153 58 H 7 Z" fill="#8ddcae" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M ${-5 + i * 34} 28 h 34 l ${i === 0 ? 4 : i === 4 ? -12 : -4} 30 h -26 Z`} fill={i % 2 === 0 ? '#44c67f' : '#ffffff'} />
        ))}
        <rect x={-6} y={54} width={172} height={11} rx={5.5} fill="#2a9d5f" />
        <path d="M 45 9 V 25" stroke="#d98f17" strokeWidth={3} strokeLinecap="round" />
        <text x={80} y={8} textAnchor="middle" fontFamily="sans-serif" fontSize={15} fontWeight={700} letterSpacing={2} fill="#644216">OPEN</text>
      </g>

      <CloudBuddy x={147} y={186} s={0.73} />
      <g transform="translate(478 265) scale(.6)"><BeanBuddy x={0} y={0} /></g>
      <g transform="translate(475 61) scale(.7)"><Calendar x={0} y={0} /></g>
      <Sparkle x={77} y={61} s={12} fill="#f5b442" />
      <Sparkle x={349} y={65} s={9} fill="#44c67f" />
      <Sparkle x={524} y={165} s={10} fill="#4dafff" />
    </svg>
  )
}
