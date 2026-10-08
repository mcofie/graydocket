'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import styles from './Footer.module.css'

type Props = { title: string; links: Array<{ label: string; href: string }> }

/** A footer link group: a plain column on desktop, a tap-to-open section on phones. */
export default function FooterNavColumn({ title, links }: Props) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <div className={styles.navCol}>
      <h4 className={styles.navHeader}>
        <button
          type="button"
          className={styles.navToggle}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
        >
          {title}
          <ChevronDown size={18} className={styles.navChevron} aria-hidden="true" />
        </button>
      </h4>
      <ul id={listId} className={styles.navList} data-open={open}>
        {links.map((link) => (
          <li key={link.label}>
            {link.href.startsWith('mailto:') ? (
              <a href={link.href}>{link.label}</a>
            ) : (
              <Link href={link.href}>{link.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
