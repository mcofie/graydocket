import { Building2, CalendarClock, Check, CheckCircle2, Download, FileText, FolderLock, Lock, Search, ShieldCheck } from 'lucide-react'
import Reveal from '@/components/ui/Reveal'
import styles from './product-cards.module.css'

// Product visuals for the landing page: small "screens" in the app's own light style. The grid
// cards are static; the two section visuals play a short sequence once when scrolled into view.
// They sit between the doodle moments (hero, compliance section, footer) and show what GrayDocket
// actually looks like.

const tint = (accent: string) => ({ '--tint': accent }) as React.CSSProperties

/** Easy: everything we take off your plate */
export function HandledListCard() {
  const rows = [
    { icon: Building2, title: 'Registration', sub: 'We file with the ORC for you', accent: 'var(--accent-blue)' },
    { icon: Search, title: 'Name search', sub: 'We check your name is free first', accent: 'var(--accent-green)' },
    { icon: ShieldCheck, title: 'Compliance', sub: 'Annual returns and renewals, filed', accent: 'var(--accent-gold)' },
    { icon: FolderLock, title: 'Documents', sub: 'Every certificate, kept safe', accent: 'var(--accent-orange)' },
  ]
  return (
    <div className={styles.panel}>
      <p className={styles.kicker}>We handle</p>
      <ul className={styles.list}>
        {rows.map(({ icon: Icon, title, sub, accent }) => (
          <li key={title} className={styles.listRow}>
            <span className={styles.icon} style={tint(accent)}>
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className={styles.text}>
              <strong>{title}</strong>
              <small>{sub}</small>
            </span>
            <Check size={16} strokeWidth={2.75} className={styles.tick} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Fast: a few days from details to certificate */
export function TimelineCard() {
  const steps = [
    { title: 'Name cleared', day: 'Mon' },
    { title: 'Filed with ORC', day: 'Tue' },
    { title: 'Certificate issued', day: 'Thu' },
  ]
  return (
    <div className={`${styles.panel} ${styles.compact}`}>
      <ol className={styles.timeline}>
        {steps.map((s) => (
          <li key={s.title}>
            <CheckCircle2 size={16} strokeWidth={2.25} className={styles.timelineCheck} />
            <span>{s.title}</span>
            <small>{s.day}</small>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Handled: a filing done without the customer lifting a finger */
export function FiledCard() {
  return (
    <div className={`${styles.panel} ${styles.row}`}>
      <span className={styles.icon} style={tint('var(--accent-green)')}>
        <FileText size={16} strokeWidth={2} />
      </span>
      <span className={styles.text}>
        <strong>Annual return</strong>
        <small>Filed for you</small>
      </span>
      <span className={`${styles.badge} ${styles.badgeGreen}`}>
        <Check size={12} strokeWidth={3} /> Compliant
      </span>
    </div>
  )
}

/** Reliable: deadlines watched well in advance */
export function DeadlineCard() {
  return (
    <div className={`${styles.panel} ${styles.row}`}>
      <span className={styles.icon} style={tint('var(--accent-orange)')}>
        <CalendarClock size={16} strokeWidth={2} />
      </span>
      <span className={styles.text}>
        <strong>Name renewal</strong>
        <small>Due in 14 days</small>
      </span>
      <span className={`${styles.badge} ${styles.badgeGold}`}>We&apos;re on it</span>
    </div>
  )
}

/** Supported: real people, quick answers */
export function ChatCard() {
  return (
    <div className={styles.chat}>
      <span className={`${styles.bubble} ${styles.bubbleMe}`}>Is my name approved?</span>
      <span className={`${styles.bubble} ${styles.bubbleUs}`}>
        <span className={styles.agentDot} aria-hidden="true" />
        Yes! We&apos;re filing today.
      </span>
    </div>
  )
}

type VisualProps = { label: string; className?: string }

/** Name search section: a name checked against the register */
export function NameCheckVisual({ label, className }: VisualProps) {
  return (
    <div className={`${styles.stage} ${className ?? ''}`} style={tint('var(--accent-blue)')} role="img" aria-label={label}>
      {/* Plays once on scroll: the name types in, the check runs, the result lands */}
      <Reveal className={`${styles.screen} ${styles.nameScreen}`} threshold={0.4}>
        <span className={styles.fieldLabel}>Business name</span>
        <span className={styles.field}>
          <Search size={16} className={styles.fieldIcon} />
          <span className={styles.typed}>Ama&apos;s Kitchen</span>
          <span className={styles.caret} aria-hidden="true" />
        </span>
        <div className={styles.resultSlot}>
          <div className={styles.checking} aria-hidden="true">
            <span className={styles.spinner} />
            Checking the ORC register…
          </div>
          <div className={styles.result}>
            <CheckCircle2 size={16} strokeWidth={2.25} />
            <span>
              <strong>Looks available</strong>
              <small>No conflicts found in the ORC register</small>
            </span>
          </div>
        </div>
        <div className={styles.alsoChecked}>
          <p className={styles.smallLabel}>Also checked</p>
          <ul className={styles.mini}>
            <li><span>Ama Kitchen Supplies</span><small>Different enough</small></li>
            <li><span>Amah&apos;s Catering</span><small>Different enough</small></li>
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

/** Vault section: every document, organised and ready */
export function DocumentsVisual({ label, className }: VisualProps) {
  const docs = [
    { name: 'Certificate of Registration', meta: 'PDF · Issued by the ORC' },
    { name: 'Company constitution', meta: 'PDF · Filed copy' },
    { name: 'TIN certificate', meta: 'PDF · GRA' },
    { name: 'Annual return 2026', meta: 'PDF · Filed by GrayDocket' },
  ]
  return (
    <div className={`${styles.stage} ${className ?? ''}`} style={tint('var(--accent-gold)')} role="img" aria-label={label}>
      {/* Plays once on scroll: documents slide in, the newest one is tagged */}
      <Reveal className={`${styles.screen} ${styles.docsScreen}`} threshold={0.4}>
        <div className={styles.screenHead}>
          <strong>Documents</strong>
          <span className={styles.lockBadge}>
            <Lock size={12} strokeWidth={2.5} /> Encrypted
          </span>
        </div>
        <ul className={styles.docs}>
          {docs.map((d, i) => (
            <li key={d.name}>
              <span className={styles.icon} style={tint('var(--accent-gold)')}>
                <FileText size={16} strokeWidth={2} />
              </span>
              <span className={styles.text}>
                <strong>{d.name}</strong>
                <small>{d.meta}</small>
              </span>
              {i === docs.length - 1 && <span className={styles.newTag}>New</span>}
              <Download size={16} className={styles.download} />
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  )
}
