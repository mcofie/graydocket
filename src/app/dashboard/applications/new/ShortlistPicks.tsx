'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import type { NameIdea } from '@/lib/name-ideas'
import { mergeShortlists, readAccountShortlist, readLocalShortlist, writeAccountShortlist } from '@/lib/name-shortlist'
import styles from './new.module.css'

// Names kept in the name finder, offered as one-tap choices for the business name. Opening the form
// signed in also saves this browser's shortlist to the account, so names picked before sign-up
// aren't lost.

export default function ShortlistPicks({ current, onPick }: { current: string; onPick: (name: string) => void }) {
  const [names, setNames] = useState<NameIdea[]>([])

  useEffect(() => {
    let live = true
    const local = readLocalShortlist()
    void readAccountShortlist().then((account) => {
      const merged = mergeShortlists(local, account ?? [])
      if (account && merged.length > account.length) void writeAccountShortlist(merged)
      if (live) setNames(merged)
    })
    return () => {
      live = false
    }
  }, [])

  const base = (n: string) => n.toLowerCase().replace(/\s+(limited|ltd|lbg)\.?$/i, '').trim()
  const options = names.filter((n) => base(n.name) !== base(current)).slice(0, 6)
  if (options.length === 0) return null

  return (
    <div className={styles.shortlistPicks}>
      <span className={styles.shortlistLabel}><Heart size={13} /> From your shortlist</span>
      {options.map((n) => (
        <button key={n.name} type="button" className={styles.shortlistChip} onClick={() => onPick(n.name)}>
          {n.name}
        </button>
      ))}
    </div>
  )
}
