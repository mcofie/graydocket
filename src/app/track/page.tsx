'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import styles from './track.module.css'

export default function TrackPage() {
  const router = useRouter()
  const [trackingId, setTrackingId] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const id = trackingId.trim().toUpperCase()
    if (id) router.push(`/track/${encodeURIComponent(id)}`)
  }

  return (
    <div className={styles.wrapper}>
      <Header />
      <main className={styles.main}>
        <div className={`${styles.column} ${styles.searchColumn}`}>
          <h1 className={styles.title}>Track your application</h1>
          <p className={styles.lead}>
            Enter the tracking ID from your confirmation message to see where your registration is.
          </p>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <label className={styles.inputWrap}>
              <Search size={18} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                placeholder="e.g. GD-7K2M9Q"
                aria-label="Tracking ID"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className={styles.input}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>
            <button type="submit" className={styles.searchBtn} disabled={!trackingId.trim()}>
              Track <ArrowRight size={16} />
            </button>
          </form>

          <p className={styles.hint}>
            Have an account? <Link href="/auth/login">Log in</Link> to see every application in one place.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
