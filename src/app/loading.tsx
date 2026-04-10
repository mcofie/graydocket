import styles from './loading.module.css'

export default function Loading() {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.logoWrapper}>
        <div className={styles.logoIcon}>G</div>
        <span className={styles.brandName}>GrayDocket</span>
      </div>
    </div>
  )
}
