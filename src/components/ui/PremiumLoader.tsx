import React from 'react'
import styles from './premium-loader.module.css'

interface PremiumLoaderProps {
  message?: string
}

export default function PremiumLoader({ message = 'Loading securely...' }: PremiumLoaderProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.glassBackdrop} />
      <div className={styles.logoWrapper}>
        <div className={styles.spinnerWrapper}>
          <div className={styles.outerGlowRing} />
          <div className={styles.spinnerRing} />
          <div className={styles.logoIcon}>G</div>
        </div>
        <span className={styles.brandName}>GrayDocket</span>
        <div className={styles.messageWrapper}>
          <span className={styles.messageText}>{message}</span>
          <span className={styles.dotFlow}>
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>
      </div>
    </div>
  )
}
