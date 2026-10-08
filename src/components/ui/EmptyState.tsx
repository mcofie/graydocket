import styles from './empty-state.module.css'

export type EmptyVariant = 'arrow' | 'documents' | 'progress' | 'people' | 'inbox'

type Props = {
  variant?: EmptyVariant
  message: string
  size?: 'md' | 'sm'
  /** Optional actions shown under the message */
  children?: React.ReactNode
}

/** Soft grey shapes shared by every illustration, behind the coloured hero shape. */
function Backdrop() {
  return (
    <g>
      <g transform="rotate(-10 150 80)">
        <rect x="96" y="26" width="108" height="108" rx="30" fill="#f2f2f3" />
        <path
          d="M150 52l9 20 22 3-16 15 4 22-19-11-19 11 4-22-16-15 22-3z"
          fill="#ffffff"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </g>
      <path d="M80 152c10-16 34-10 34 8 0 18-18 32-30 40-12-8-32-22-32-40 0-18 22-24 28-8z" fill="#f2f2f3" />
      <path d="M318 52l6 15 15 6-15 6-6 15-6-15-15-6 15-6z" fill="#f2f2f3" />
      <path d="M300 112l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#f2f2f3" />
      <path d="M126 214l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#f2f2f3" />
    </g>
  )
}

/** The coin sits in front of the hero shape, as in the reference style. */
function Coin() {
  return (
    <g>
      <ellipse cx="300" cy="214" rx="62" ry="40" fill="#efeff1" />
      <ellipse cx="300" cy="206" rx="62" ry="40" fill="#f7f7f8" />
      <path d="M262 182l58 58" stroke="#efeff1" strokeWidth="22" strokeLinecap="round" />
    </g>
  )
}

function Hero({ variant }: { variant: EmptyVariant }) {
  switch (variant) {
    case 'documents':
      return (
        <g>
          <path d="M168 56a16 16 0 0 1 16-16h66l36 36v120a16 16 0 0 1-16 16h-86a16 16 0 0 1-16-16z" fill="#5aa9f2" />
          <path d="M250 40v24a12 12 0 0 0 12 12h24z" fill="#9dcdfa" />
          <g stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity="0.9">
            <path d="M194 104h64" />
            <path d="M194 128h76" />
            <path d="M194 152h44" />
          </g>
        </g>
      )
    case 'progress':
      return (
        <g>
          <circle cx="226" cy="126" r="78" fill="#f5b041" />
          <circle cx="226" cy="126" r="58" fill="#f8c66f" />
          <path d="M226 92v38l26 18" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )
    case 'people':
      return (
        <g>
          <circle cx="226" cy="84" r="40" fill="#a78bfa" />
          <path d="M150 204c0-44 34-74 76-74s76 30 76 74z" fill="#a78bfa" />
          <circle cx="226" cy="84" r="18" fill="#c4b5fd" />
        </g>
      )
    case 'inbox':
      return (
        <g>
          <path d="M160 96l22-44h88l22 44v86a16 16 0 0 1-16 16H176a16 16 0 0 1-16-16z" fill="#45c47f" />
          <path d="M160 100h40l12 24h28l12-24h40v12H160z" fill="#7fd9a6" />
          <path d="M160 112h40l12 24h28l12-24h40" stroke="#ffffff" strokeWidth="8" strokeLinejoin="round" fill="none" opacity="0.85" />
        </g>
      )
    default:
      return (
        <g stroke="#45c47f" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M176 190l92-94" />
          <path d="M206 82l74 8-18 74" />
        </g>
      )
  }
}

export default function EmptyState({ variant = 'arrow', message, size = 'md', children }: Props) {
  return (
    <div className={`${styles.empty} ${size === 'sm' ? styles.sm : ''}`}>
      <svg className={styles.art} viewBox="40 20 340 240" fill="none" aria-hidden="true">
        <Backdrop />
        <Hero variant={variant} />
        <Coin />
      </svg>
      <p className={styles.message}>{message}</p>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  )
}
